import { randomInt, randomUUID } from "node:crypto";
import { createPassword } from "./credentials";

export const SYSTEM_ADMIN_EMAIL = "fiorati@novaodisseia.com";
export const TEST_ADMIN_EMAIL = "fioratigabriel.8@gmail.com";

export function isSystemAdminEmail(email: string) {
  return email === SYSTEM_ADMIN_EMAIL || email === TEST_ADMIN_EMAIL;
}

export function isAllowedRegistrationEmail(email: string) {
  const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "stone.com.br";
  return isSystemAdminEmail(email) || email.endsWith(`@${domain}`);
}

export async function createVerificationCode() {
  const code = String(randomInt(100000, 1_000_000));
  return { code, ...(await createPassword(code)) };
}

export async function createVerificationToken() {
  const token = randomUUID();
  return { token, ...(await createPassword(token)) };
}

export async function sendRegistrationCode(input: { email: string; name: string; code: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("O envio de e-mail ainda não está configurado.");
  if (from.trim().toLowerCase() === "onboarding@resend.dev" && input.email.endsWith("@stone.com.br")) {
    throw new Error("O remetente de teste da Resend não entrega para e-mails Stone. Configure um domínio verificado para ativar o cadastro da equipe.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Seu código de acesso — Nova Odisseia: Fiorati",
      text: `Olá, ${input.name}. Seu código de confirmação é ${input.code}. Ele expira em 15 minutos. Se você não solicitou este acesso, ignore este e-mail.`,
    }),
  });
  if (!response.ok) throw new Error("Não foi possível enviar o código de confirmação. Tente novamente em alguns minutos.");
}

export async function sendPasswordResetCode(input: { email: string; name: string; code: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("O envio de e-mail ainda não está configurado.");
  if (from.trim().toLowerCase() === "onboarding@resend.dev" && input.email.endsWith("@stone.com.br")) {
    throw new Error("O remetente de teste da Resend não entrega para e-mails Stone. Configure um domínio verificado para ativar a redefinição de senha da equipe.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Redefinição de senha — Nova Odisseia: Fiorati",
      text: `Olá, ${input.name}. Seu código para redefinir a senha é ${input.code}. Ele expira em 15 minutos. Se você não solicitou essa alteração, ignore este e-mail.`,
    }),
  });
  if (!response.ok) throw new Error("Não foi possível enviar o código de redefinição. Tente novamente em alguns minutos.");
}
