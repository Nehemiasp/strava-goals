import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatCode, generateCode, INVITE_TTL_MS, normalizeCode } from "@/lib/link-code";
import { createMemoryStore } from "@/lib/server/store-memory";
import type { AthleteRow, Store } from "@/lib/server/store";

const athlete = (id: number, name: string): AthleteRow => ({
  id, name, avatar: null, accessTokenEnc: "", refreshTokenEnc: "", expiresAt: 0, syncedAt: null,
});

describe("códigos de invitación", () => {
  it("tienen 8 caracteres sin ambiguos (sin I, O, 0, 1)", () => {
    for (let i = 0; i < 500; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });
  it("no se repiten en una muestra grande", () => {
    expect(new Set(Array.from({ length: 2000 }, generateCode)).size).toBe(2000);
  });
  it("normalizan mayúsculas, guiones y espacios", () => {
    expect(normalizeCode("abcd-efgh")).toBe("ABCDEFGH");
    expect(normalizeCode("  ABCD EFGH ")).toBe("ABCDEFGH");
    expect(formatCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });
  it.each([["ABCD-EFG"], ["ABCD-EFGHI"], ["ABCD-EFG0"], ["ABCD-EFGO"], ["ABCD-EFG1"], [""], [null], [42], [undefined]])("rechaza %j", (v) => {
    expect(normalizeCode(v)).toBeNull();
  });
});

describe("vínculo (store en memoria)", () => {
  let store: Store;
  beforeEach(async () => {
    (globalThis as { __sgMemDb?: unknown }).__sgMemDb = undefined;
    store = createMemoryStore();
    await store.upsertAthlete(athlete(1, "Ana"));
    await store.upsertAthlete(athlete(2, "Beto"));
    await store.upsertAthlete(athlete(3, "Carla"));
  });

  it("flujo completo: invitar, aceptar, ambos ven al otro, desvincular", async () => {
    const { code } = await store.createInvite(1);
    const r = await store.acceptInvite(code, 2);
    expect(r).toEqual({ ok: true, partner: { id: 1, name: "Ana", avatar: null } });
    expect((await store.getLink(1))?.name).toBe("Beto");
    expect((await store.getLink(2))?.name).toBe("Ana");
    await store.deleteLink(2);
    expect(await store.getLink(1)).toBeNull();
    expect(await store.getLink(2)).toBeNull();
  });

  it("el código es de un solo uso", async () => {
    const { code } = await store.createInvite(1);
    expect((await store.acceptInvite(code, 2)).ok).toBe(true);
    expect(await store.acceptInvite(code, 3)).toEqual({ ok: false, reason: "invalid" });
  });

  it("un código inexistente es inválido", async () => {
    expect(await store.acceptInvite("ZZZZ2222", 2)).toEqual({ ok: false, reason: "invalid" });
  });

  it("no se puede aceptar el propio código", async () => {
    const { code } = await store.createInvite(1);
    expect(await store.acceptInvite(code, 1)).toEqual({ ok: false, reason: "own" });
    expect(await store.getLink(1)).toBeNull();
  });

  it("un código nuevo reemplaza al anterior", async () => {
    const first = await store.createInvite(1);
    const second = await store.createInvite(1);
    expect(await store.acceptInvite(first.code, 2)).toEqual({ ok: false, reason: "invalid" });
    expect((await store.acceptInvite(second.code, 2)).ok).toBe(true);
  });

  it("caduca a las 24 h", async () => {
    vi.useFakeTimers();
    try {
      const { code } = await store.createInvite(1);
      vi.advanceTimersByTime(INVITE_TTL_MS + 1000);
      expect(await store.acceptInvite(code, 2)).toEqual({ ok: false, reason: "invalid" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("si alguno ya tiene vínculo no se puede crear otro", async () => {
    const a = await store.createInvite(1);
    await store.acceptInvite(a.code, 2);
    const b = await store.createInvite(3);
    expect(await store.acceptInvite(b.code, 1)).toEqual({ ok: false, reason: "linked" });
    expect(await store.acceptInvite((await store.createInvite(3)).code, 2)).toEqual({ ok: false, reason: "linked" });
  });

  it("borrar los datos de un atleta elimina el vínculo y sus invitaciones", async () => {
    const inv = await store.createInvite(3);
    const { code } = await store.createInvite(1);
    await store.acceptInvite(code, 2);
    await store.deleteAthlete(1);
    expect(await store.getLink(2)).toBeNull();
    await store.deleteAthlete(3);
    expect(await store.acceptInvite(inv.code, 2)).toEqual({ ok: false, reason: "invalid" });
  });
});
