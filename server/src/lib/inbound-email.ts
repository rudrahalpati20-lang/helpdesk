import prisma from "../db";
import Sentry from "./sentry";
import { sendClassifyJob } from "./classify-ticket";
import { sendAutoResolveJob } from "./auto-resolve-ticket";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

export function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim();
}

export function parseFromField(from: string): { email: string; name: string } {
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1]!.trim() || match[2]!, email: match[2]! };
  }
  return { name: from, email: from };
}

export interface InboundEmailPayload {
  from: string;
  fromName?: string;
  subject: string;
  body: string;
  bodyHtml?: string | null;
}

export async function processInboundEmail(data: InboundEmailPayload) {
  const normalizedSubject = stripSubjectPrefixes(data.subject);

  // Check for existing open ticket from same sender with matching subject
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      senderEmail: data.from,
      status: { notIn: ["resolved", "closed"] },
      subject: { equals: normalizedSubject, mode: "insensitive" },
    },
  });

  if (existingTicket) {
    const reply = await prisma.reply.create({
      data: {
        body: data.body,
        bodyHtml: data.bodyHtml ?? null,
        senderType: "customer",
        ticketId: existingTicket.id,
        userId: null,
      },
    });

    // Count how many customer messages have been received for this ticket
    const customerRepliesCount = await prisma.reply.count({
      where: { ticketId: existingTicket.id, senderType: "customer" },
    });
    // Initial email is 1, so if customerRepliesCount >= 1, this is the 2nd (or more) email from customer
    const shouldResolve = customerRepliesCount >= 1;

    // Send polished auto-reply for this 2nd incoming email as well
    try {
      const firstName = (existingTicket.senderName || "there").trim().split(" ")[0] || "there";
      const userMessage = data.body.trim();
      const polishedReply =
        `Hi ${firstName},\n\n` +
        `Thanks for following up with Code with Mosh Support. We're happy to help you with this!\n\n` +
        `${userMessage.charAt(0).toUpperCase() + userMessage.slice(1)}${/[.!?]$/.test(userMessage) ? "" : "."}\n\n` +
        `We want to make sure you have a smooth and enjoyable learning experience. If you have any other questions, need further clarification, or run into any trouble, please feel free to reach out to us anytime — we're always here to help!\n\n` +
        `Best regards,\nCode with Mosh Support`;

      await prisma.reply.create({
        data: {
          body: polishedReply,
          senderType: "agent",
          ticketId: existingTicket.id,
          userId: null,
        },
      });

      if (shouldResolve) {
        await prisma.ticket.update({
          where: { id: existingTicket.id },
          data: { status: "resolved" },
        });
        console.log(`[Auto-Reply] Ticket #${existingTicket.id} marked RESOLVED after 2nd email.`);
      }

      const { sendEmailJob } = await import("./send-email");
      await sendEmailJob({
        to: existingTicket.senderEmail,
        subject: `Re: ${existingTicket.subject}`,
        body: polishedReply,
      });
    } catch (err: any) {
      console.error("[Auto-Reply] Failed to send reply for followup email:", err?.message || err);
    }

    return { ticket: existingTicket, reply, isNew: false };
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: normalizedSubject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      senderName: data.fromName || data.from,
      senderEmail: data.from,
      assignedToId: AI_AGENT_ID,
    },
  });

  sendClassifyJob(ticket).catch((error) => {
    Sentry.captureException(error, { tags: { component: "inbound-email", job: "classify", ticketId: ticket.id } });
    console.error(`Failed to enqueue classify job for ticket ${ticket.id}:`, error);
  });

  // Automatically send polished auto-reply immediately
  try {
    const firstName = (ticket.senderName || "there").trim().split(" ")[0] || "there";
    const userMessage = ticket.body.trim();
    const polishedReply =
      `Hi ${firstName},\n\n` +
      `Thanks for reaching out to Code with Mosh Support. We're happy to help you with this!\n\n` +
      `${userMessage.charAt(0).toUpperCase() + userMessage.slice(1)}${/[.!?]$/.test(userMessage) ? "" : "."}\n\n` +
      `We want to make sure you have a smooth and enjoyable learning experience. If you have any other questions, need further clarification, or run into any trouble, please feel free to reach out to us anytime — we're always here to help!\n\n` +
      `Best regards,\nCode with Mosh Support`;

    // 1. Save reply into database
    await prisma.reply.create({
      data: {
        body: polishedReply,
        senderType: "agent",
        ticketId: ticket.id,
        userId: null,
      },
    });

    // Pehle email par Resolved nahi karna (Open / Processing rakhna hai, 2nd email par resolved hoga)
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "open" },
    });

    // 3. Immediately send email directly via SMTP/SendGrid
    const { sendEmailJob } = await import("./send-email");
    await sendEmailJob({
      to: ticket.senderEmail,
      subject: `Re: ${ticket.subject}`,
      body: polishedReply,
    });
    console.log(`[Auto-Reply] Polished reply sent instantly to ${ticket.senderEmail} for ticket #${ticket.id}`);
  } catch (err: any) {
    console.error(`[Auto-Reply] Failed to send instant reply:`, err?.message || err);
    sendAutoResolveJob(ticket).catch(() => {});
  }

  return { ticket, isNew: true };
}
