import { describe, expect, it } from "vitest";

const integrationIt = process.env.RUN_EMAIL_DELIVERY_TESTS === "true" && process.env.RESEND_API_KEY ? it : it.skip;

function senderDomain(value: string) {
  const match = value.match(/@([^>\s]+)/);
  return match?.[1]?.toLowerCase() ?? "";
}

describe("integração de entrega de e-mail", () => {
  integrationIt("valida a chave Resend e o domínio do remetente configurado", async () => {
    const apiKey = process.env.RESEND_API_KEY!;
    const from = process.env.EMAIL_FROM ?? "";
    const domain = senderDomain(from);
    expect(domain).toBeTruthy();

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.ok).toBe(true);
    const payload = await response.json() as { data?: Array<{ name?: string; status?: string }> };
    if (domain === "resend.dev") {
      // Remetente sandbox oficial; a própria API já validou a chave acima.
      expect(response.ok).toBe(true);
      return;
    }
    const configuredDomain = payload.data?.find(item => item.name?.toLowerCase() === domain);
    expect(configuredDomain?.status).toBe("verified");
  }, 15_000);
});
