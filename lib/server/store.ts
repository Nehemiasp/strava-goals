import "server-only";
import type { Activity, Goal, NewGoal } from "../types";
import { hasSupabase, isDemo } from "./env";

export interface AthleteRow {
  id: number;
  name: string;
  avatar: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  /** Epoch en segundos. */
  expiresAt: number;
  syncedAt: string | null;
}

export type GoalPatch = Partial<Pick<Goal, "title" | "target" | "status" | "sports" | "period" | "startDate" | "endDate">>;

export interface LinkedPartner {
  id: number;
  name: string;
  avatar: string | null;
}

export type AcceptResult =
  | { ok: true; partner: LinkedPartner }
  /** `invalid` cubre código inexistente, caducado o ya usado: no se distingue a propósito. */
  | { ok: false; reason: "invalid" | "own" | "linked" };

export interface Store {
  getAthlete(id: number): Promise<AthleteRow | null>;
  upsertAthlete(row: AthleteRow): Promise<void>;
  setSynced(id: number, at: string): Promise<void>;
  /** Borra al atleta y todos sus datos (goals y caché). */
  deleteAthlete(id: number): Promise<void>;
  listGoals(athleteId: number): Promise<Goal[]>;
  createGoal(athleteId: number, g: NewGoal): Promise<Goal>;
  updateGoal(athleteId: number, id: string, patch: GoalPatch): Promise<Goal | null>;
  deleteGoal(athleteId: number, id: string): Promise<boolean>;
  listActivities(athleteId: number, sinceDate: string): Promise<Activity[]>;
  /** Crea una invitación de 24 h para este atleta, reemplazando la anterior. */
  createInvite(athleteId: number): Promise<{ code: string; expiresAt: string }>;
  /** Consume una invitación y crea el vínculo. `code` ya viene normalizado. */
  acceptInvite(code: string, accepterId: number): Promise<AcceptResult>;
  getLink(athleteId: number): Promise<LinkedPartner | null>;
  deleteLink(athleteId: number): Promise<void>;
  /** Inserta/actualiza y elimina las actividades con `date >= fromDate` que ya no vienen de Strava. */
  syncActivities(athleteId: number, fromDate: string, fresh: Activity[]): Promise<void>;
}

let instance: Store | null = null;

export async function getStore(): Promise<Store> {
  if (instance) return instance;
  if (!isDemo() && hasSupabase()) {
    instance = (await import("./store-supabase")).createSupabaseStore();
  } else if (isDemo()) {
    instance = (await import("./store-memory")).createMemoryStore();
  } else {
    throw new Error("Falta configurar Supabase (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)");
  }
  return instance;
}
