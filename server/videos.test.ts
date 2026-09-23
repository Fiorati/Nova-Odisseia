import { describe, expect, it } from "vitest";
import { parseVideoUrl, saveVideoSchema, videoForUser, type PlatformVideo } from "../shared/videos";

describe("parseVideoUrl", () => {
  it("aceita os formatos do YouTube, inclusive não listado e shorts", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(parseVideoUrl(url)).toEqual({ kind: "youtube", id: "dQw4w9WgXcQ", embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1" });
    }
  });
  it("aceita Vimeo público e privado com hash", () => {
    expect(parseVideoUrl("https://vimeo.com/76979871")?.embedUrl).toBe("https://player.vimeo.com/video/76979871");
    expect(parseVideoUrl("https://vimeo.com/76979871/abc123def0")?.embedUrl).toBe("https://player.vimeo.com/video/76979871?h=abc123def0");
    expect(parseVideoUrl("https://player.vimeo.com/video/76979871?h=ff00aa")?.embedUrl).toBe("https://player.vimeo.com/video/76979871?h=ff00aa");
  });
  it("aceita mp4 direto e recusa o resto", () => {
    expect(parseVideoUrl("https://cdn.exemplo.com/intro.mp4")?.kind).toBe("file");
    expect(parseVideoUrl("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(parseVideoUrl("javascript:alert(1)")).toBeNull();
    expect(parseVideoUrl("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseVideoUrl("https://youtube.com/watch?v=curto")).toBeNull();
    expect(parseVideoUrl("não é link")).toBeNull();
  });
});

describe("videoForUser", () => {
  const base = { placement: "jornada_intro" as const, url: "https://youtu.be/dQw4w9WgXcQ" };
  const videos: PlatformVideo[] = [
    { ...base, id: 1, title: "Geral antigo", audience: "all", userIds: [], updatedAt: "2026-09-01T00:00:00.000Z" },
    { ...base, id: 2, title: "Geral novo", audience: "all", userIds: [], updatedAt: "2026-09-10T00:00:00.000Z" },
    { ...base, id: 3, title: "Do Kaike", audience: "users", userIds: [7], updatedAt: "2026-09-05T00:00:00.000Z" },
  ];
  it("prioriza o vídeo feito para a pessoa", () => expect(videoForUser(videos, 7)?.title).toBe("Do Kaike"));
  it("os demais veem o liberado para todos mais recente", () => expect(videoForUser(videos, 8)?.title).toBe("Geral novo"));
  it("sem vídeo liberado, quem não foi escolhido não vê nada", () => expect(videoForUser(videos.filter(v => v.id === 3), 8)).toBeNull());
});

describe("saveVideoSchema", () => {
  it("exige usuários quando não é para todos", () => {
    expect(saveVideoSchema.safeParse({ placement: "ulisses_intro", title: "Aula", url: "https://youtu.be/dQw4w9WgXcQ", audience: "users", userIds: [] }).success).toBe(false);
    expect(saveVideoSchema.safeParse({ placement: "ilha:pessoal", title: "Aula", url: "https://youtu.be/dQw4w9WgXcQ", audience: "all" }).success).toBe(true);
    expect(saveVideoSchema.safeParse({ placement: "outro", title: "Aula", url: "https://youtu.be/dQw4w9WgXcQ", audience: "all" }).success).toBe(false);
  });
});
