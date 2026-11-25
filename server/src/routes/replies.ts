import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import { parseId } from "../lib/parse-id";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createReplySchema, polishReplySchema } from "core/schemas/replies.ts";
import prisma from "../db";
import Sentry from "../lib/sentry";
import { sendEmailJob } from "../lib/send-email";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  res.json({ replies });
});

function formatCustomerReply(draft: string, senderName: string): string {
  const firstName = senderName.trim().split(" ")[0] || "there";
  let body = draft.trim();

  // If the draft is already formatted with greeting and Code with Mosh sign-off, preserve it as-is
  if (
    /^hi\s+[^\n,]+,\s*\n/i.test(body) &&
    /best regards,\s*\n+\s*code with mosh support\s*$/i.test(body)
  ) {
    return body;
  }

  // Strip leading greeting if present (e.g. "Hi,", "Hi Alok,\n", "Hello Rahul,")
  body = body
    .replace(/^(?:hi|hello|hey|dear)(?:\s+[^\n,.!?]{1,30})?,\s*/i, "")
    .replace(/^(?:hi|hello|hey|dear)(?:\s+[^\n,.!?]{1,30})?\s*\n+/i, "")
    .trim();

  // Strip boilerplate opening/closing paragraphs if partially copied
  body = body
    .replace(
      /^thanks? (?:for|you for) reaching out to code with mosh support[.]?\s*(?:we're happy to help you with this[!.]?)?\s*/i,
      ""
    )
    .replace(
      /\n*we want to make sure you have a smooth and enjoyable learning experience\.[\s\S]*?we're always here to help!\s*/i,
      ""
    )
    .replace(
      /(?:^|\n)\s*if you (?:have any|need)(?: other| further)? questions[,\s]*feel free to reach out[.]?\s*$/i,
      ""
    )
    .trim();

  // Strip trailing sign-off ONLY when it appears on its own line(s) at the end
  body = body
    .replace(
      /(?:^|\n)\s*(?:best regards|warm regards|regards|sincerely|cheers|thanks|thank you)[,!]?(?:\s*\n+\s*[^\n]{1,40})?\s*$/i,
      ""
    )
    .replace(/(?:^|\n)\s*code with mosh support\s*$/i, "")
    .trim();

  if (body.length > 0) {
    body = body.charAt(0).toUpperCase() + body.slice(1);
    if (!/[.!?]$/.test(body)) {
      body += ".";
    }
  } else {
    body = "Thank you for contacting us. How can we assist you further?";
  }

  return `Hi ${firstName},\n\nThanks for reaching out to Code with Mosh Support. We're happy to help you with this!\n\n${body}\n\nWe want to make sure you have a smooth and enjoyable learning experience. If you have any other questions, need further clarification, or run into any trouble, please feel free to reach out to us anytime — we're always here to help!\n\nBest regards,\nCode with Mosh Support`;
}

router.post("/", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const data = validate(createReplySchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const formattedBody = formatCustomerReply(data.body, ticket.senderName);

  const reply = await prisma.reply.create({
    data: {
      body: formattedBody,
      senderType: "agent",
      ticketId,
      userId: req.user.id,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await sendEmailJob({
    to: ticket.senderEmail,
    subject: `Re: ${ticket.subject}`,
    body: formattedBody,
  });

  res.status(201).json(reply);
});

function formatTicketSummary(
  ticket: { subject: string; body: string },
  replies: Array<{ senderType: string; body: string; user?: { name: string } | null }>
): string {
  if (replies.length === 0) {
    return `Customer reported: "${ticket.subject}". The initial inquiry states: "${ticket.body.slice(0, 140)}...". No replies have been sent yet.`;
  }
  const lastReply = replies[replies.length - 1];
  return `Customer opened ticket regarding "${ticket.subject}". Support agent investigated the issue and provided an update: "${lastReply.body.slice(0, 140)}...". Total replies: ${replies.length}.`;
}

router.post("/summarize", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });

  const conversation = replies
    .map((r) => {
      const sender =
        r.senderType === "agent" ? (r.user?.name ?? "Agent") : ticket.senderName;
      return `${sender}: ${r.body}`;
    })
    .join("\n\n");

  if (process.env.OPENAI_API_KEY) {
    try {
      const { text } = await generateText({
        model: openai("gpt-5-nano"),
        system:
          "You are a helpful assistant that summarizes support ticket conversations. " +
          "Provide a clear, concise summary that captures the customer's issue, any actions taken, and the current status. " +
          "Keep the summary to 2-4 sentences. Return only the summary with no preamble.",
        prompt:
          `Subject: ${ticket.subject}\n\n` +
          `Customer message:\n${ticket.body}\n\n` +
          (conversation ? `Conversation:\n${conversation}` : "No replies yet."),
      });

      res.json({ summary: text });
      return;
    } catch (error: any) {
      Sentry.captureException(error, { tags: { route: "replies/summarize", ticketId } });
      console.warn("OpenAI API call failed, using fallback summary:", error?.message || error);
    }
  }

  const summary = formatTicketSummary(ticket, replies);
  res.json({ summary });
});

router.post("/polish", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const data = validate(polishReplySchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const firstName = ticket.senderName.trim().split(" ")[0] || "there";

  if (process.env.OPENAI_API_KEY) {
    try {
      const { text } = await generateText({
        model: openai("gpt-5-nano"),
        system:
          "You are a friendly, highly knowledgeable, and empathetic senior customer support specialist for Code with Mosh.\n" +
          "Your mission is to transform the agent's draft or bullet points into a comprehensive, warm, professional, well-detailed, and helpful response.\n\n" +
          "Strictly follow this structure:\n" +
          `1. Greeting: "Hi ${firstName},"\n\n` +
          "2. Acknowledgment & Warm Welcome: Thank them warmly for reaching out to Code with Mosh Support and express genuine happiness in assisting them.\n\n" +
          "3. Thorough & Clear Explanation: Provide a comprehensive, detailed, and reassuring explanation based on the agent's notes. Explain the context clearly and outline helpful steps, recommendations, or solutions with clean paragraph spacing so the customer feels completely guided.\n\n" +
          "4. Supportive Closing: Reassure the customer that we care about their learning progress: 'We want to make sure you have a smooth and enjoyable learning experience. If you have any other questions, need further clarification, or run into any trouble, please feel free to reach out to us anytime — we're always here to help!'\n\n" +
          "5. Sign-off:\nBest regards,\nCode with Mosh Support\n\n" +
          "Formatting Guidelines:\n" +
          "- Write thorough, detailed, and engaging paragraphs separated by empty lines.\n" +
          "- Keep the tone empowering, polite, and customer-first.\n" +
          "- Return ONLY the final email response text without any preamble, title headers, or markdown labels.",
        prompt: data.body,
      });

      res.json({ body: text });
      return;
    } catch (error: any) {
      Sentry.captureException(error, { tags: { route: "replies/polish", ticketId } });
      console.warn("OpenAI API call failed, using fallback polished response:", error?.message || error);
    }
  }

  const polished = formatCustomerReply(data.body, ticket.senderName);
  res.json({ body: polished });
});

export default router;
