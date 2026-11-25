import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import type { PgBoss } from "pg-boss";
import Sentry from "./sentry";

const QUEUE_NAME = "send-email";

interface SendEmailJobData {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
}

function getMailTransporter() {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  return null;
}

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function registerSendEmailWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await (boss as any).work(QUEUE_NAME, async (jobs: any) => {
    const { to, subject, body, bodyHtml } = jobs[0]!.data;
    const htmlContent = bodyHtml || textToHtml(body);

    try {
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        // Send via SendGrid (Primary)
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
          to,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: "Code with Mosh Support",
          },
          replyTo: process.env.SENDGRID_FROM_EMAIL,
          subject,
          text: body,
          html: htmlContent,
        });
        console.log(`[SendGrid] Email successfully sent to ${to} — "${subject}"`);
        return;
      }

      const transporter = getMailTransporter();
      if (transporter) {
        // Fallback: Send directly using Gmail SMTP
        await transporter.sendMail({
          from: `"Code with Mosh Support" <${process.env.GMAIL_USER}>`,
          replyTo: process.env.GMAIL_USER,
          to,
          subject,
          text: body,
          html: htmlContent,
        });
        console.log(`[Gmail SMTP] Email successfully sent to ${to} — "${subject}"`);
        return;
      }

      console.warn(
        `[Email Worker] Neither SENDGRID_API_KEY nor GMAIL credentials configured. Skipped sending email to ${to}.`
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME },
      });
      console.error(`[Email Worker] Failed to send email to ${to}:`, error);
      throw error;
    }
  });
}

export async function sendEmailJob(data: SendEmailJobData): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, data);
}
