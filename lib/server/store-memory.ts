import "server-only";
import { randomUUID } from "node:crypto";
import type { Activity, Goal } from "../types";
import { generateCode, INVITE_TTL_MS } from "../link-code";
import type { AthleteRow, Store } from "./store";

interface Db {
  athletes: Map<number, AthleteRow>;
  goals: Map<number, Goal[]>;
  activities: Map<number, Map<number, Activity>>;
  invites: Map<string, { from: number; expiresAt: number }>;
  /** atleta → su pareja (se guarda en ambas direcciones). */
  links: Map<number, number>;
}

// Singleton en globalThis para sobrevivir al HMR en desarrollo.
const g = globalThis as unknown as { __sgMemDb?: Db };

export function createMemoryStore(): Store {
  const db: Db = (g.__sgMemDb ??= { athletes: new Map(), goals: new Map(), activities: new Map(), invites: new Map(), links: new Map() });
  return {
    async getAthlete(id) {
      return db.athletes.get(id) ?? null;
    },
    async upsertAthlete(row) {
      db.athletes.set(row.id, row);
    },
    async setSynced(id, at) {
      const a = db.athletes.get(id);
      if (a) a.syncedAt = at;
    },
    async deleteAthlete(id) {
      const partner = db.links.get(id);
      if (partner !== undefined) db.links.delete(partner);
      db.links.delete(id);
      for (const [code, inv] of db.invites) if (inv.from === id) db.invites.delete(code);
      db.athletes.delete(id);
      db.goals.delete(id);
      db.activities.delete(id);
    },
    async listGoals(athleteId) {
      return [...(db.goals.get(athleteId) ?? [])];
    },
    async createGoal(athleteId, input) {
      const goal: Goal = { ...input, id: randomUUID(), status: "active", createdAt: new Date().toISOString() };
      db.goals.set(athleteId, [goal, ...(db.goals.get(athleteId) ?? [])]);
      return goal;
    },
    async updateGoal(athleteId, id, patch) {
      const list = db.goals.get(athleteId) ?? [];
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return null;
      list[i] = { ...list[i], ...patch };
      return list[i];
    },
    async deleteGoal(athleteId, id) {
      const list = db.goals.get(athleteId) ?? [];
      const next = list.filter((x) => x.id !== id);
      db.goals.set(athleteId, next);
      return next.length !== list.length;
    },
    async listActivities(athleteId, sinceDate) {
      return [...(db.activities.get(athleteId)?.values() ?? [])].filter((a) => a.date >= sinceDate);
    },
    async createInvite(athleteId) {
      for (const [code, inv] of db.invites) if (inv.from === athleteId) db.invites.delete(code);
      let code = generateCode();
      while (db.invites.has(code)) code = generateCode();
      const expiresAt = Date.now() + INVITE_TTL_MS;
      db.invites.set(code, { from: athleteId, expiresAt });
      return { code, expiresAt: new Date(expiresAt).toISOString() };
    },
    async acceptInvite(code, accepterId) {
      const inv = db.invites.get(code);
      if (!inv || inv.expiresAt < Date.now() || !db.athletes.has(inv.from)) {
        if (inv) db.invites.delete(code);
        return { ok: false, reason: "invalid" };
      }
      if (inv.from === accepterId) return { ok: false, reason: "own" };
      if (db.links.has(inv.from) || db.links.has(accepterId)) return { ok: false, reason: "linked" };
      db.links.set(inv.from, accepterId);
      db.links.set(accepterId, inv.from);
      for (const [c, i] of db.invites) if (i.from === inv.from || i.from === accepterId) db.invites.delete(c);
      const p = db.athletes.get(inv.from)!;
      return { ok: true, partner: { id: p.id, name: p.name, avatar: p.avatar } };
    },
    async getLink(athleteId) {
      const partnerId = db.links.get(athleteId);
      const p = partnerId === undefined ? undefined : db.athletes.get(partnerId);
      return p ? { id: p.id, name: p.name, avatar: p.avatar } : null;
    },
    async deleteLink(athleteId) {
      const partner = db.links.get(athleteId);
      if (partner !== undefined) db.links.delete(partner);
      db.links.delete(athleteId);
    },
    async syncActivities(athleteId, fromDate, fresh) {
      const map = db.activities.get(athleteId) ?? new Map<number, Activity>();
      const keep = new Set(fresh.map((a) => a.id));
      for (const [id, a] of map) if (a.date >= fromDate && !keep.has(id)) map.delete(id);
      for (const a of fresh) map.set(a.id, a);
      db.activities.set(athleteId, map);
    },
  };
}
