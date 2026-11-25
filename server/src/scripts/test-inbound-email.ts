import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const port = process.env.PORT || 3000;
const secret = process.env.WEBHOOK_SECRET || "dev-webhook-secret-key";

const fromEmail = process.argv[2] || "student.test@gmail.com";
const fromName = process.argv[3] || "Aman Kumar";
const subject = process.argv[4] || "Cannot download course videos after renewal";
const body =
  process.argv[5] ||
  "Hi, I recently renewed my subscription but I am having trouble downloading the offline course videos for React. Could you please guide me on how to access them?";

console.log("Simulating Inbound Email via SendGrid Webhook format...");
console.log(`From: "${fromName}" <${fromEmail}>`);
console.log(`Subject: "${subject}"`);
console.log(`Message: "${body}"\n`);

const formData = new FormData();
formData.append("from", `"${fromName}" <${fromEmail}>`);
formData.append("to", "support@helpdesk.local");
formData.append("subject", subject);
formData.append("text", body);

try {
  const response = await fetch(`http://localhost:${port}/api/webhooks/inbound-email`, {
    method: "POST",
    headers: {
      "x-webhook-secret": secret,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Webhook error (${response.status}):`, errorText);
  } else {
    const result = await response.json();
    console.log("✅ Success! Ticket created in Helpdesk:");
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nView the ticket at: http://localhost:5173/tickets/${result.ticket?.id}`);
  }
} catch (error: any) {
  console.error("❌ Failed to connect to server:", error.message);
  console.log("Make sure backend server is running on port 3000 (`cd server && bun run dev`)");
}
