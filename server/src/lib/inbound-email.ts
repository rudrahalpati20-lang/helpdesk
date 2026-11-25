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

  sendAutoResolveJob(ticket).catch((error) => {
    Sentry.captureException(error, { tags: { component: "inbound-email", job: "auto-resolve", ticketId: ticket.id } });
    console.error(`Failed to enqueue auto-resolve job for ticket ${ticket.id}:`, error);
  });

  return { ticket, isNew: true };
}
