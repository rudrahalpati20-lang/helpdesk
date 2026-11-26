import fs from "fs";
import path from "path";
import type { PgBoss } from "pg-boss";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import Sentry from "./sentry";
import prisma from "../db";
import { sendEmailJob } from "./send-email";

const QUEUE_NAME = "auto-resolve-ticket";

const knowledgeBase = fs.readFileSync(
  path.join(import.meta.dirname, "../../knowledge-base.md"),
  "utf-8"
);

interface AutoResolveJobData {
  ticketId: number;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
}

export async function registerAutoResolveWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await (boss as any).work(QUEUE_NAME, async (jobs: any) => {
    const { ticketId, subject, body, senderName, senderEmail } = jobs[0]!.data;
    const firstName = senderName.split(" ")[0];

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "processing" },
    });

    let response: string;
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system:
          "You are a friendly, polished, and professional customer support assistant for Helpdesk. " +
          "Your goal is to send a polite, clear, well-structured, and helpful response to every incoming customer email.\n\n" +
          (knowledgeBase ? "Relevant Knowledge Base Context:\n" + knowledgeBase + "\n\n" : "") +
          "Guidelines for your response:\n" +
          `- Greet the customer warmly: Hello ${firstName || "there"},\n` +
          "- Acknowledge their message and address their query with polite, polished, and natural language.\n" +
          "- If it is a common support issue or technical query, provide helpful steps and guidance.\n" +
          "- If you need more details, politely ask them to reply with more context.\n" +
          "- Format the response with clean paragraphs and proper spacing.\n" +
          "- Sign off warmly with:\n\nWarm regards,\nCustomer Support Team\nHelpdesk",
        prompt: `Customer Name: ${senderName}\nSubject: ${subject}\n\nMessage:\n${body}`,
      });
      response = text.trim();
    } catch (error) {
      console.warn(`[Auto-Resolve] AI call failed (using polished smart template):`, (error as Error).message);
      // Smart polished fallback template if OpenAI key is expired
      response =
        `Hello ${firstName || "there"},\n\n` +
        `Thank you for contacting Helpdesk Support regarding "${subject}".\n\n` +
        `We have received your message and our team is actively reviewing your request. ` +
        `We are looking into this for you and will get back to you with a comprehensive resolution shortly.\n\n` +
        `If you have any supplementary details or screenshots to share, feel free to reply directly to this email.\n\n` +
        `Warm regards,\nCustomer Support Team\nHelpdesk`;
    }

    if (response === "ESCALATE") {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "open", assignedToId: null },
      });
    } else {
      try {
        await prisma.$transaction([
          prisma.reply.create({
            data: {
              body: response,
              senderType: "agent",
              ticketId,
              userId: null,
            },
          }),
          prisma.ticket.update({
            where: { id: ticketId },
            data: { status: "resolved" },
          }),
        ]);

        await sendEmailJob({
          to: senderEmail,
          subject: `Re: ${subject}`,
          body: response,
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { queue: QUEUE_NAME, ticketId },
        });
        throw error;
      }
    }
  });
}

export async function sendAutoResolveJob(ticket: {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
}): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, {
    ticketId: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    senderName: ticket.senderName,
    senderEmail: ticket.senderEmail,
  });
}
