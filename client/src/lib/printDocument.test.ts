import { describe, expect, it } from "vitest";
import { buildPrintDocumentHtml } from "./printDocument";

describe("documento de impressão privado", () => {
  it("escapa conteúdo informado antes de construir o HTML de PDF", () => {
    const html = buildPrintDocumentHtml("PDI <privado>", "Plano", [{ title: "Ação", text: "Praticar <script>alert(1)</script>" }]);
    expect(html).toContain("PDI &lt;privado&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
