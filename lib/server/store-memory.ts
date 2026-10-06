import "server-only";
import { randomUUID } from "node:crypto";
import type { Activity, Goal } from "../types";
import type { AthleteRow, Store } from "./store";

interface Db {
  athletes: Map<number, AthleteRow>;
  goals: Map<number, Goal[]>;
  activities: Map<number, Map<number, Activity>>;
}

// Singleton en globalThis para sobrevivir al HMR en desarrollo.
const g = globalThis as unknown as { __sgMemDb?: Db };

export function createMemoryStore(): Store {
  const db: Db = (g.__sgMemDb ??= { athletes: new Map(), goals: new Map(), activities: new Map() });
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
    async syncActivities(athleteId, fromDate, fresh) {
      const map = db.activities.get(athleteId) ?? new Map<number, Activity>();
      const keep = new Set(fresh.map((a) => a.id));
      for (const [id, a] of map) if (a.date >= fromDate && !keep.has(id)) map.delete(id);
      for (const a of fresh) map.set(a.id, a);
      db.activities.set(athleteId, map);
    },
  };
}
