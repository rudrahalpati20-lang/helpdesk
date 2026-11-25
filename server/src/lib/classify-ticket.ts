import type { PgBoss } from "pg-boss";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  ticketCategories,
  type TicketCategory,
} from "core/constants/ticket-category.ts";
import Sentry from "./sentry";
import prisma from "../db";

const QUEUE_NAME = "classify-ticket";

interface ClassifyJobData {
  ticketId: number;
  subject: string;
  body: string;
}

export async function registerClassifyWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await (boss as any).work(QUEUE_NAME, async (jobs: any) => {
    const { ticketId, subject, body } = jobs[0]!.data;

    let category: TicketCategory;
    try {
      const { text } = await generateText({
        model: openai("gpt-5-nano"),
        system:
          "You are a support ticket classifier. " +
          "Classify the ticket into exactly one of these categories: " +
          `${ticketCategories.join(", ")}. ` +
          "Return only the category value with no extra text.",
        prompt: `Subject: ${subject}\n\nBody: ${body}`,
      });

      category = text.trim() as TicketCategory;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME, ticketId },
      });
      console.warn(
        `Classify AI call failed for ticket ${ticketId}, using rule-based fallback:`,
        error instanceof Error ? error.message : error
      );
      const combined = `${subject} ${body}`.toLowerCase();
      if (/refund|billing|charge|invoice|payment|money|cost|price/.test(combined)) {
        category = "refund_request";
      } else if (/error|bug|issue|crash|fail|api|timeout|500|404|token|code/.test(combined)) {
        category = "technical_question";
      } else {
        category = "general_question";
      }
    }

    if (!ticketCategories.includes(category)) {
      category = "general_question";
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { category },
    });
  });
}

export async function sendClassifyJob(ticket: {
  id: number;
  subject: string;
  body: string;
}): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, {
    ticketId: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
  });
}
