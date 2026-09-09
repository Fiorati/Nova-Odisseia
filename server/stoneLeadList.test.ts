import { describe, expect, it } from "vitest";
import { deduplicateLeadListRows, isAuthorizedStoneGoogleHtmlUrl, parseAuthorizedStoneLeadListUrl, stoneLeadListSourceOrigin } from "../shared/stoneLeadList";

const googleHtmlUrl = `https://${"a".repeat(56)}-apidata.googleusercontent.com/download/storage/v1/b/cartao-super-zap-1/o/tam-leads-report%2Ftam-leads---agente.teste---2026-08-27-1249.html?jk=${"B".repeat(64)}&isca=1`;

describe("Lista Inteligente Stone", () => {
  it("aceita somente HTTPS em domínio Stone e não permite porta alternativa", () => {
    expect(parseAuthorizedStoneLeadListUrl("https://lista.stone.com.br/export.csv").hostname).toBe("lista.stone.com.br");
    expect(() => parseAuthorizedStoneLeadListUrl("http://lista.stone.com.br/export.csv")).toThrow(/HTTPS/i);
    expect(() => parseAuthorizedStoneLeadListUrl("https://stone.com.br.evil.example/export.csv")).toThrow(/Stone/i);
    expect(() => parseAuthorizedStoneLeadListUrl("https://lista.stone.com.br:8443/export.csv")).toThrow(/Stone/i);
  });

  it("aceita somente o padrão HTML temporário oficial hospedado pelo Google", () => {
    const parsed = parseAuthorizedStoneLeadListUrl(googleHtmlUrl);
    expect(isAuthorizedStoneGoogleHtmlUrl(parsed)).toBe(true);
    expect(stoneLeadListSourceOrigin(parsed)).toBe("apidata.googleusercontent.com");
    expect(() => parseAuthorizedStoneLeadListUrl(googleHtmlUrl.replace("cartao-super-zap-1", "outro-bucket"))).toThrow(/oficial/i);
    expect(() => parseAuthorizedStoneLeadListUrl(googleHtmlUrl.replace(".html", ".csv"))).toThrow(/oficial/i);
    expect(() => parseAuthorizedStoneLeadListUrl(googleHtmlUrl.replace(/\?jk=.*/, "?isca=1"))).toThrow(/oficial/i);
    expect(() => parseAuthorizedStoneLeadListUrl(`${googleHtmlUrl}&redirect=https://evil.example`)).toThrow(/oficial/i);
    expect(() => parseAuthorizedStoneLeadListUrl(`https://storage.googleapis.com/arquivo.html?jk=${"B".repeat(64)}&isca=1`)).toThrow(/oficial/i);
  });

  it("deduplica por documento, telefone ou cliente e cidade dentro da mesma rota", () => {
    const result = deduplicateLeadListRows([
      { route: "Rota Norte", clientName: "Loja A", document: "12.345.678/0001-90" },
      { route: "Rota Norte", clientName: "Loja A duplicada", document: "12345678000190" },
      { route: "Rota Norte", clientName: "Loja B", phone: "(11) 99999-9999" },
      { route: "Rota Norte", clientName: "Loja B", phone: "11999999999" },
      { route: "Rota Sul", clientName: "Loja A", document: "12.345.678/0001-90" },
    ]);
    expect(result.duplicates).toBe(2);
    expect(result.uniqueRows).toHaveLength(3);
  });
});
