import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ALL_SPORTS, type Activity, type Goal, type Sport } from "../types";
import { required } from "./env";
import type { AthleteRow, GoalPatch, Store } from "./store";

type Row = Record<string, unknown>;

/** Lee `sports`; si la fila es anterior a la migración 0002 cae a la columna `sport` antigua. */
function sportsFrom(r: Row): Sport[] {
  if (Array.isArray(r.sports) && r.sports.length > 0) return ALL_SPORTS.filter((s) => (r.sports as string[]).includes(s));
  return r.sport === "ride" ? ["ride"] : r.sport === "run" ? ["run"] : ["run", "ride"];
}

const goalFrom = (r: Row): Goal => ({
  id: r.id as string,
  title: r.title as string,
  metric: r.metric as Goal["metric"],
  sports: sportsFrom(r),
  target: r.target as number,
  period: r.period as Goal["period"],
  startDate: r.start_date as string,
  endDate: r.end_date as string,
  status: r.status as Goal["status"],
  createdAt: r.created_at as string,
});

const activityFrom = (r: Row): Activity => ({
  id: Number(r.id),
  name: r.name as string,
  sport: r.sport as Activity["sport"],
  sportType: r.sport_type as string,
  date: r.date as string,
  startedAt: r.started_at as string,
  distance: r.distance as number,
  movingTime: r.moving_time as number,
  elevation: r.elevation as number,
  avgSpeed: r.avg_speed as number,
  avgHr: (r.avg_hr as number | null) ?? null,
  polyline: (r.polyline as string | null) ?? null,
});

const activityTo = (athleteId: number, a: Activity): Row => ({
  athlete_id: athleteId,
  id: a.id,
  name: a.name,
  sport: a.sport,
  sport_type: a.sportType,
  date: a.date,
  started_at: a.startedAt,
  distance: a.distance,
  moving_time: Math.round(a.movingTime),
  elevation: a.elevation,
  avg_speed: a.avgSpeed,
  avg_hr: a.avgHr,
  polyline: a.polyline,
});

function fail(op: string, error: { message: string } | null): asserts error is null {
  if (error) throw new Error(`Supabase (${op}): ${error.message}`);
}

export function createSupabaseStore(): Store {
  const db = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async getAthlete(id) {
      const { data, error } = await db.from("athletes").select("*").eq("id", id).maybeSingle();
      fail("getAthlete", error);
      if (!data) return null;
      return {
        id: Number(data.id),
        name: data.name,
        avatar: data.avatar,
        accessTokenEnc: data.access_token_enc,
        refreshTokenEnc: data.refresh_token_enc,
        expiresAt: Number(data.expires_at),
        syncedAt: data.synced_at,
      } satisfies AthleteRow;
    },
    async upsertAthlete(row) {
      const { error } = await db.from("athletes").upsert({
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        access_token_enc: row.accessTokenEnc,
        refresh_token_enc: row.refreshTokenEnc,
        expires_at: row.expiresAt,
        synced_at: row.syncedAt,
      });
      fail("upsertAthlete", error);
    },
    async setSynced(id, at) {
      const { error } = await db.from("athletes").update({ synced_at: at }).eq("id", id);
      fail("setSynced", error);
    },
    async deleteAthlete(id) {
      // goals y activity_cache caen en cascada.
      const { error } = await db.from("athletes").delete().eq("id", id);
      fail("deleteAthlete", error);
    },
    async listGoals(athleteId) {
      const { data, error } = await db
        .from("goals")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });
      fail("listGoals", error);
      return (data ?? []).map(goalFrom);
    },
    async createGoal(athleteId, g) {
      const { data, error } = await db
        .from("goals")
        .insert({
          athlete_id: athleteId,
          title: g.title,
          metric: g.metric,
          sports: g.sports,
          target: g.target,
          period: g.period,
          start_date: g.startDate,
          end_date: g.endDate,
        })
        .select("*")
        .single();
      fail("createGoal", error);
      return goalFrom(data!);
    },
    async updateGoal(athleteId, id, patch: GoalPatch) {
      const update: Row = {};
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.target !== undefined) update.target = patch.target;
      if (patch.status !== undefined) update.status = patch.status;
      if (patch.startDate !== undefined) update.start_date = patch.startDate;
      if (patch.endDate !== undefined) update.end_date = patch.endDate;
      const { data, error } = await db
        .from("goals")
        .update(update)
        .eq("athlete_id", athleteId)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      fail("updateGoal", error);
      return data ? goalFrom(data) : null;
    },
    async deleteGoal(athleteId, id) {
      const { data, error } = await db.from("goals").delete().eq("athlete_id", athleteId).eq("id", id).select("id");
      fail("deleteGoal", error);
      return (data?.length ?? 0) > 0;
    },
    async listActivities(athleteId, sinceDate) {
      const { data, error } = await db
        .from("activity_cache")
        .select("*")
        .eq("athlete_id", athleteId)
        .gte("date", sinceDate)
        .order("started_at", { ascending: false })
        .limit(2000);
      fail("listActivities", error);
      return (data ?? []).map(activityFrom);
    },
    async syncActivities(athleteId, fromDate, fresh) {
      if (fresh.length > 0) {
        const { error } = await db
          .from("activity_cache")
          .upsert(fresh.map((a) => activityTo(athleteId, a)), { onConflict: "athlete_id,id" });
        fail("syncActivities.upsert", error);
      }
      // Elimina de la caché lo que ya no está en Strava dentro de la ventana sincronizada.
      const { data, error } = await db
        .from("activity_cache")
        .select("id")
        .eq("athlete_id", athleteId)
        .gte("date", fromDate);
      fail("syncActivities.list", error);
      const keep = new Set(fresh.map((a) => a.id));
      const stale = (data ?? []).map((r) => Number(r.id)).filter((id) => !keep.has(id));
      if (stale.length > 0) {
        const { error: delErr } = await db.from("activity_cache").delete().eq("athlete_id", athleteId).in("id", stale);
        fail("syncActivities.delete", delErr);
      }
    },
  };
}
