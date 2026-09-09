import { TRPCError } from "@trpc/server";

export type NotificationPayload = { title: string; content: string };

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (!payload.title.trim() || !payload.content.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title and content are required." });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.SYSTEM_ADMIN_EMAIL || "fiorati@novaodisseia.com";
  if (!apiKey || !from) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Resend is not configured." });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: payload.title.slice(0, 120), text: payload.content.slice(0, 20000) }),
  });
  if (!response.ok) return false;
  return true;
}
