import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseSpreadsheetLeads, removeItemById, selectImageFiles as selectStrategyImages } from "../client/src/pages/NordicStrategyPanel";
import { selectImageFiles as selectOperationalImages } from "../client/src/pages/OperationalExcellencePanel";

describe("upload de imagens da estratégia", () => {
  it("permite até 8 imagens por seleção", () => {
    const files = Array.from({ length: 10 }, (_, index) =>
      new File([`image-${index}`], `image-${index}.png`, { type: "image/png" })
    );

    expect(selectStrategyImages(files, 8)).toHaveLength(8);
  });

  it("mantém todas as imagens quando a seleção é menor que 8", () => {
    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
    ];

    expect(selectStrategyImages(files, 8)).toHaveLength(2);
  });
});

describe("upload de imagens da excelência operacional", () => {
  it("mantém o limite de 8 imagens e ignora arquivos não imagem", () => {
    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.pdf", { type: "application/pdf" }),
      new File(["c"], "c.jpeg", { type: "image/jpeg" }),
      new File(["d"], "d.png", { type: "image/png" }),
      new File(["e"], "e.png", { type: "image/png" }),
      new File(["f"], "f.png", { type: "image/png" }),
      new File(["g"], "g.png", { type: "image/png" }),
      new File(["h"], "h.png", { type: "image/png" }),
      new File(["i"], "i.png", { type: "image/png" }),
    ];

    expect(selectOperationalImages(files, 8)).toHaveLength(8);
    expect(selectOperationalImages(files, 8).every(file => file.type.startsWith("image/"))).toBe(true);
  });
});

describe("importação de planilha do Sparta", () => {
  it("lê clientes por nome e TPV em CSV/XLSX", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      {
        Nome: "Loja Centro",
        MCC: "123",
        Segmento: "Varejo",
        TPV: 15000,
        Rota: "Rota A",
        "Data movimentação": "2026-09-01",
        Status: "Mapeado",
        "último tpv": 12000,
        TPV2: 18000,
      },
      {
        Nome: "Loja Norte",
        MCC: "456",
        Segmento: "Serviços",
        TPV: 23000,
        Rota: "Rota B",
        "Data movimentação": "2026-09-07",
        Status: "Qualificando",
        "último tpv": 19000,
        TPV2: 26000,
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Planilha");

    const file = new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "sparta.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const rows = await parseSpreadsheetLeads(file);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      clientName: "Loja Centro",
      projectedTpv: 15000,
      stage: "Mapeado",
      temperature: "frio",
    });
    expect(rows[1].clientName).toBe("Loja Norte");
  });

  it("remove clientes adicionados ao funil e ao checklist por id", () => {
    const funnel = [
      { id: 1, clientName: "Loja A", projectedTpv: 1000 },
      { id: 2, clientName: "Loja B", projectedTpv: 2000 },
      { id: 3, clientName: "Loja C", projectedTpv: 3000 },
    ];

    expect(removeItemById(funnel, 2)).toEqual([
      { id: 1, clientName: "Loja A", projectedTpv: 1000 },
      { id: 3, clientName: "Loja C", projectedTpv: 3000 },
    ]);

    const checklist = [
      { id: 10, clientName: "Ativação A" },
      { id: 20, clientName: "Ativação B" },
    ];

    expect(removeItemById(checklist, 10)).toEqual([
      { id: 20, clientName: "Ativação B" },
    ]);
  });
});
