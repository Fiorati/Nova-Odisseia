import { describe, expect, it } from "vitest";
import { MIGRATION_NOTICE_SUBJECT, MIGRATION_NOTICE_TEXT } from "./migrationNotice";

describe("approved migration notice", () => {
  it("keeps the approved recipient-facing copy and corrected surname", () => {
    expect(MIGRATION_NOTICE_SUBJECT).toBe("Nova Odisseia será atualizada até 25 de setembro");
    expect(MIGRATION_NOTICE_TEXT).toContain("Gabriel Fiorati");
    expect(MIGRATION_NOTICE_TEXT).not.toContain("Fioratti");
    expect(MIGRATION_NOTICE_TEXT).toContain("salve até 24 de setembro");
  });
});
