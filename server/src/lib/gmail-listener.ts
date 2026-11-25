import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import Sentry from "./sentry";
import { processInboundEmail } from "./inbound-email";

let imapClient: ImapFlow | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let isChecking = false;
let minUid = 0;
const processedMessageIds = new Set<string>();

async function checkNewEmails(client: ImapFlow, userEmail: string) {
  if (isChecking) return;
  isChecking = true;

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // If minUid is not initialized, set it to uidNext so we only process new emails arriving after start
      if (minUid === 0) {
        const status = await client.status("INBOX", { uidNext: true });
        minUid = status.uidNext || 1;
        console.log(`[Gmail IMAP] Initialized. Monitoring incoming emails with UID >= ${minUid}`);
        return;
      }

      // Search for unseen messages with UID >= minUid
      const messages = await client.search({ seen: false, uid: `${minUid}:*` }, { uid: true });
      if (!messages || messages.length === 0) {
        return;
      }

      for (const uid of messages) {
        if (uid >= minUid) {
          minUid = uid + 1;
        }

        try {
          const downloadResult = await client.download(uid.toString(), undefined, { uid: true });
          if (!downloadResult?.content) continue;

          const parsed = await simpleParser(downloadResult.content);

          const messageId = parsed.messageId || `${uid}`;
          if (processedMessageIds.has(messageId)) {
            continue;
          }
          processedMessageIds.add(messageId);

          const rawFromEmail = parsed.from?.value[0]?.address?.toLowerCase().trim();
          const replyToEmail = parsed.replyTo?.value?.[0]?.address?.toLowerCase().trim();
          const fromEmail = replyToEmail || rawFromEmail;
          const fromName =
            parsed.replyTo?.value?.[0]?.name ||
            parsed.from?.value[0]?.name ||
            fromEmail ||
            "";
          const subject = parsed.subject || "(No Subject)";
          const body = parsed.text || "";
          const bodyHtml = typeof parsed.html === "string" ? parsed.html : null;

          if (!fromEmail) {
            continue;
          }

          // Skip self-sent emails from the helpdesk address itself
          if (rawFromEmail === userEmail.toLowerCase()) {
            console.log(`[Gmail IMAP] Skipping self-sent email: "${subject}"`);
            await client.messageFlagsAdd(uid.toString(), ["\\Seen"], { uid: true });
            continue;
          }

          console.log(`[Gmail IMAP] 📩 Inbound email from "${fromName}" <${fromEmail}>: "${subject}"`);

          const result = await processInboundEmail({
            from: fromEmail,
            fromName,
            subject,
            body,
            bodyHtml,
          });

          await client.messageFlagsAdd(uid.toString(), ["\\Seen"], { uid: true });

          if (result.isNew) {
            console.log(`[Gmail IMAP] ✅ Created new ticket #${result.ticket.id} from ${fromEmail}!`);
          } else {
            console.log(`[Gmail IMAP] ✅ Added reply to existing ticket #${result.ticket.id}.`);
          }
        } catch (msgErr) {
          Sentry.captureException(msgErr, { tags: { component: "gmail-imap", uid } });
          console.error(`[Gmail IMAP] Error parsing message UID ${uid}:`, msgErr);
        }
      }
    } finally {
      lock.release();
    }
  } catch (err: any) {
    Sentry.captureException(err, { tags: { component: "gmail-imap", phase: "poll" } });
    console.error("[Gmail IMAP] Check error:", err?.message || err);
  } finally {
    isChecking = false;
  }
}

export async function startGmailListener() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    console.log("[Gmail IMAP] GMAIL_USER or GMAIL_APP_PASSWORD not set. Skipping Gmail listener.");
    return;
  }

  try {
    console.log(`[Gmail IMAP] Connecting to imap.gmail.com for ${user}...`);

    imapClient = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });

    imapClient.on("error", (err) => {
      Sentry.captureException(err, { tags: { component: "gmail-imap", phase: "socket" } });
      console.error("[Gmail IMAP] Error:", err.message);
    });

    imapClient.on("close", () => {
      console.log("[Gmail IMAP] Connection closed.");
    });

    await imapClient.connect();
    console.log(`[Gmail IMAP] ✅ Connected to Gmail! Listening for incoming emails on ${user}...`);

    // Initialize baseline UID
    await checkNewEmails(imapClient, user);

    // Poll every 10 seconds for new incoming emails
    pollTimer = setInterval(() => {
      if (imapClient && imapClient.usable) {
        checkNewEmails(imapClient, user).catch(console.error);
      }
    }, 10000);
  } catch (err: any) {
    Sentry.captureException(err, { tags: { component: "gmail-imap", phase: "connect" } });
    console.error("[Gmail IMAP] Connection failed:", err?.message || err);
    console.error(
      "Tip: Ensure 2-Step Verification is enabled and a 16-character Google App Password is used."
    );
  }
}

export async function stopGmailListener() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (imapClient) {
    try {
      await imapClient.logout();
    } catch {}
    imapClient = null;
  }
}
