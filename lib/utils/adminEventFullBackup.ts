import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_BACKUP_SCHEMA_VERSION = 2;
export const SUPPORTED_BACKUP_VERSIONS = [1, 2] as const;

export function cellStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function cellBool(v: unknown): boolean | null {
  const s = cellStr(v);
  if (s === null) return null;
  if (s === "TRUE" || s === "true" || s === "1") return true;
  if (s === "FALSE" || s === "false" || s === "0") return false;
  return null;
}

export function cellInt(v: unknown): number | null {
  const s = cellStr(v);
  if (s === null) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function readMetaSheet(ws: XLSX.WorkSheet | undefined): Record<string, string> {
  if (!ws) return {};
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false }) as string[][];
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (!row || row.length < 2) continue;
    const k = String(row[0] ?? "").trim();
    const v = String(row[1] ?? "").trim();
    if (k) map[k] = v;
  }
  return map;
}

export function jsonSheetToRecords(ws: XLSX.WorkSheet | undefined): Record<string, unknown>[] {
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: false });
}

export function buildMetaAoA(params: {
  eventId: string;
  eventName: string;
  schemaVersion: number;
}): (string | number)[][] {
  const ts = new Date().toISOString();
  return [
    ["key", "value"],
    ["schema_version", String(params.schemaVersion)],
    ["event_id", params.eventId],
    ["event_name", params.eventName],
    ["exported_at", ts],
    [
      "notes",
      "Admin 完整備份：還原時依相依順序匯入 (Settings -> Divisions -> Courts -> Players -> Matches -> Stats -> Announcements)，以確保籤表戰績與晉級完整性。",
    ],
  ];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * 完整匯出賽事備份 Excel
 * 包含：_Meta, EventSettings, Divisions, Courts, EventSlots, Players, TeamMembers, Matches, MatchPlayerStats, Announcements, ScheduleItems
 */
export async function downloadEventFullBackup(
  supabase: SupabaseClient,
  eventId: string,
  eventName?: string
): Promise<string> {
  const { data: eventData, error: evErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (evErr) throw evErr;

  const resolvedName: string =
    eventName?.trim() || (eventData as { name?: string } | null)?.name || "Event";

  const [
    { data: divisions, error: divErr },
    { data: courts, error: courtErr },
    { data: slots, error: slotErr },
    { data: players, error: playerErr },
    { data: matches, error: matchErr },
    { data: announcements, error: annErr },
    { data: scheduleItems, error: schedErr },
  ] = await Promise.all([
    supabase
      .from("event_divisions")
      .select("*")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true }),
    supabase.from("event_courts").select("*").eq("event_id", eventId).order("name", { ascending: true }),
    supabase
      .from("event_slots")
      .select("*")
      .eq("event_id", eventId)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("players")
      .select("*")
      .eq("event_id", eventId)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("matches")
      .select("*")
      .eq("event_id", eventId)
      .order("round", { ascending: true })
      .order("match_number", { ascending: true }),
    supabase.from("announcements").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase
      .from("schedule_items")
      .select("*")
      .eq("event_id", eventId)
      .order("day_number", { ascending: true })
      .order("order_number", { ascending: true }),
  ]);

  if (divErr) throw divErr;
  if (courtErr) throw courtErr;
  if (slotErr) throw slotErr;
  if (playerErr) throw playerErr;
  if (matchErr) throw matchErr;
  if (annErr) throw annErr;
  if (schedErr) throw schedErr;

  const plist = (players ?? []) as Record<string, unknown>[];
  const mlist = (matches ?? []) as Record<string, unknown>[];
  const matchIds = mlist.map((m) => String(m.id)).filter(Boolean);

  let stats: Record<string, unknown>[] = [];
  if (matchIds.length) {
    const { data: st, error: stErr } = await supabase
      .from("match_player_stats")
      .select("*")
      .in("match_id", matchIds);
    if (stErr) throw stErr;
    stats = (st ?? []) as Record<string, unknown>[];
  }

  const teamIds = plist.filter((p) => p.type === "team").map((p) => String(p.id)).filter(Boolean);
  let members: Record<string, unknown>[] = [];
  if (teamIds.length) {
    const { data: tm, error: tmErr } = await supabase
      .from("team_members")
      .select("*")
      .in("player_id", teamIds);
    if (tmErr) throw tmErr;
    members = (tm ?? []) as Record<string, unknown>[];
  }

  const wb = XLSX.utils.book_new();

  // 1. _Meta
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      buildMetaAoA({
        eventId,
        eventName: resolvedName,
        schemaVersion: ADMIN_BACKUP_SCHEMA_VERSION,
      })
    ),
    "_Meta"
  );

  // 2. EventSettings
  if (eventData) {
    const { tiebreaker_config, ...otherSettings } = eventData as Record<string, unknown>;
    const settingsRow = {
      ...otherSettings,
      tiebreaker_config_json: tiebreaker_config ? JSON.stringify(tiebreaker_config) : null,
    };
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([settingsRow]), "EventSettings");
  }

  // 3. Divisions
  const divList = (divisions ?? []) as Record<string, unknown>[];
  if (divList.length) {
    const divRows = divList.map((d) => {
      const { scoring_config, ...rest } = d;
      return {
        ...rest,
        scoring_config_json: scoring_config ? JSON.stringify(scoring_config) : null,
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(divRows), "Divisions");
  }

  // 4. Courts
  const courtList = (courts ?? []) as Record<string, unknown>[];
  if (courtList.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(courtList), "Courts");
  }

  // 5. EventSlots
  const slotList = (slots ?? []) as Record<string, unknown>[];
  if (slotList.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(slotList), "EventSlots");
  }

  // 6. Players
  const playerRows = plist.map((p) => {
    const { custom_fields, ...rest } = p;
    return {
      ...rest,
      custom_fields_json: custom_fields ? JSON.stringify(custom_fields) : null,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playerRows), "Players");

  // 7. TeamMembers
  if (members.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(members), "TeamMembers");
  }

  // 8. Matches
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mlist), "Matches");

  // 9. MatchPlayerStats
  if (stats.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stats), "MatchPlayerStats");
  }

  // 10. Announcements
  const annList = (announcements ?? []) as Record<string, unknown>[];
  if (annList.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(annList), "Announcements");
  }

  // 11. ScheduleItems
  const schedList = (scheduleItems ?? []) as Record<string, unknown>[];
  if (schedList.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(schedList), "ScheduleItems");
  }

  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `${resolvedName.replace(/\s+/g, "_")}_完整備份_${ts}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

export interface RestoreEventResult {
  matchesRestored: number;
  playersRestored: number;
  divisionsRestored: number;
  courtsRestored: number;
  slotsRestored: number;
  statsRestored: number;
  teamMembersRestored: number;
  announcementsRestored: number;
  scheduleItemsRestored: number;
  bracketWinnersAdvanced: number;
}

/**
 * 依嚴格相依性順序還原賽事資料庫：
 * 1. Event / Settings
 * 2. Event Divisions (建立 oldDivisionId -> newDivisionId 對照)
 * 3. Event Courts & Event Slots (建立 oldCourtId -> newCourtId, oldSlotId -> newSlotId 對照)
 * 4. Players & Team Members (建立 oldPlayerId -> newPlayerId, oldTeamMemberId -> newTeamMemberId 對照)
 * 5. Matches (清空現有比賽避免混亂，嚴格重新對應所有外鍵，依批次寫入並在失敗時拋出明確錯誤)
 * 6. Match Player Stats (重新對應 match_id, player_id, team_member_id)
 * 7. Announcements & Schedule Items
 * 8. 籤表晉級完整性校驗與自動推進（確保第 1 輪已完賽的勝者正確傳遞至第 2 輪與後續籤位）
 */
export async function restoreEventFullBackup(
  supabase: SupabaseClient,
  targetEventId: string,
  workbook: XLSX.WorkBook
): Promise<RestoreEventResult> {
  const meta = readMetaSheet(workbook.Sheets["_Meta"]);
  const ver = parseInt(meta.schema_version || "1", 10);
  if (Number.isNaN(ver) || ver < 1) {
    throw new Error(`不支援的備份版本：${meta.schema_version ?? "未知"}`);
  }

  // -------------------------------------------------------------
  // 1. Event Settings
  // -------------------------------------------------------------
  const eventSettingsSheet = workbook.Sheets["EventSettings"];
  if (eventSettingsSheet) {
    const records = jsonSheetToRecords(eventSettingsSheet);
    if (records.length > 0) {
      const s = records[0];
      const settingsUpdate: Record<string, unknown> = {};

      if (s.tournament_type) settingsUpdate.tournament_type = cellStr(s.tournament_type);
      if (s.registration_type) settingsUpdate.registration_type = cellStr(s.registration_type);
      if (s.bracket_split_mode) settingsUpdate.bracket_split_mode = cellStr(s.bracket_split_mode);
      if (s.bracket_generation_method) settingsUpdate.bracket_generation_method = cellStr(s.bracket_generation_method);
      if (s.bracket_generated_at) settingsUpdate.bracket_generated_at = cellStr(s.bracket_generated_at);
      if (s.bracket_locked !== undefined && s.bracket_locked !== null) {
        settingsUpdate.bracket_locked = cellBool(s.bracket_locked);
      }
      if (s.public_check_in_enabled !== undefined && s.public_check_in_enabled !== null) {
        settingsUpdate.public_check_in_enabled = cellBool(s.public_check_in_enabled);
      }
      if (s.has_third_place_match !== undefined && s.has_third_place_match !== null) {
        settingsUpdate.has_third_place_match = cellBool(s.has_third_place_match);
      }
      if (s.blackout_limit !== undefined && s.blackout_limit !== null) {
        settingsUpdate.blackout_limit = cellInt(s.blackout_limit);
      }
      if (s.captain_blackouts_open !== undefined && s.captain_blackouts_open !== null) {
        settingsUpdate.captain_blackouts_open = cellBool(s.captain_blackouts_open);
      }

      const tc =
        cellStr(s.tiebreaker_config_json) ||
        (typeof s.tiebreaker_config === "string" ? s.tiebreaker_config : null);
      if (tc) {
        try {
          settingsUpdate.tiebreaker_config = JSON.parse(tc);
        } catch {
          /* skip */
        }
      } else if (s.tiebreaker_config && typeof s.tiebreaker_config === "object") {
        settingsUpdate.tiebreaker_config = s.tiebreaker_config;
      }

      if (Object.keys(settingsUpdate).length > 0) {
        settingsUpdate.updated_at = new Date().toISOString();
        const { error: evErr } = await supabase
          .from("events")
          .update(settingsUpdate)
          .eq("id", targetEventId);
        if (evErr) {
          console.warn("還原賽事設定警告:", evErr.message);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Event Divisions
  // -------------------------------------------------------------
  const divisionIdMap = new Map<string, string>();
  const { data: existingDivs, error: fetchDivErr } = await supabase
    .from("event_divisions")
    .select("*")
    .eq("event_id", targetEventId)
    .order("display_order", { ascending: true });
  if (fetchDivErr) throw fetchDivErr;

  let divisionsRestored = 0;
  const divisionRows = workbook.Sheets["Divisions"]
    ? jsonSheetToRecords(workbook.Sheets["Divisions"])
    : [];

  if (divisionRows.length > 0) {
    for (const row of divisionRows) {
      const oldId = cellStr(row.id);
      if (!oldId) continue;
      const sport = cellStr(row.sport) || "tennis";
      const name = cellStr(row.name);
      const display_order = cellInt(row.display_order) ?? 0;
      const tournament_type = cellStr(row.tournament_type);
      const registration_type = cellStr(row.registration_type);
      const bracket_split_mode = cellStr(row.bracket_split_mode);

      let scoring_config: unknown = null;
      const sc =
        cellStr(row.scoring_config_json) ||
        (typeof row.scoring_config === "string" ? cellStr(row.scoring_config) : null);
      if (sc) {
        try {
          scoring_config = JSON.parse(sc);
        } catch {
          /* skip */
        }
      } else if (row.scoring_config && typeof row.scoring_config === "object") {
        scoring_config = row.scoring_config;
      }

      const existing = existingDivs?.find(
        (d) =>
          d.id === oldId ||
          (d.sport.toLowerCase() === sport.toLowerCase() && (d.name || null) === (name || null))
      );

      if (existing) {
        divisionIdMap.set(oldId, existing.id);
        const updatePayload: Record<string, unknown> = {
          name,
          display_order,
          updated_at: new Date().toISOString(),
        };
        if (tournament_type) updatePayload.tournament_type = tournament_type;
        if (registration_type) updatePayload.registration_type = registration_type;
        if (bracket_split_mode) updatePayload.bracket_split_mode = bracket_split_mode;
        if (scoring_config) updatePayload.scoring_config = scoring_config;

        const { error: updErr } = await supabase
          .from("event_divisions")
          .update(updatePayload)
          .eq("id", existing.id);
        if (!updErr) divisionsRestored++;
      } else {
        const insertPayload: Record<string, unknown> = {
          id: oldId,
          event_id: targetEventId,
          sport,
          name,
          display_order,
          ...(tournament_type ? { tournament_type } : {}),
          ...(registration_type ? { registration_type } : {}),
          ...(bracket_split_mode ? { bracket_split_mode } : {}),
          ...(scoring_config ? { scoring_config } : {}),
        };

        const { data: upserted, error: divErr } = await supabase
          .from("event_divisions")
          .upsert(insertPayload, { onConflict: "id" })
          .select("id")
          .maybeSingle();

        if (!divErr && upserted?.id) {
          divisionIdMap.set(oldId, upserted.id);
          divisionsRestored++;
        } else {
          delete insertPayload.id;
          const { data: ins, error: insErr } = await supabase
            .from("event_divisions")
            .insert(insertPayload)
            .select("id")
            .single();
          if (insErr) {
            throw new Error(`還原組別失敗 (${sport}): ${insErr.message}`);
          }
          divisionIdMap.set(oldId, ins.id);
          divisionsRestored++;
        }
      }
    }
  } else if (existingDivs && existingDivs.length > 0) {
    for (const d of existingDivs) {
      divisionIdMap.set(d.id, d.id);
    }
  }

  // -------------------------------------------------------------
  // 3. Event Courts & Event Slots
  // -------------------------------------------------------------
  const courtIdMap = new Map<string, string>();
  const { data: existingCourts } = await supabase
    .from("event_courts")
    .select("*")
    .eq("event_id", targetEventId);

  let courtsRestored = 0;
  const courtRows = workbook.Sheets["Courts"] ? jsonSheetToRecords(workbook.Sheets["Courts"]) : [];
  for (const row of courtRows) {
    const oldId = cellStr(row.id);
    const name = cellStr(row.name);
    if (!name) continue;
    const surface = cellStr(row.surface);
    const notes = cellStr(row.notes);

    const existing = existingCourts?.find(
      (c) => (oldId && c.id === oldId) || c.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      if (oldId) courtIdMap.set(oldId, existing.id);
      await supabase
        .from("event_courts")
        .update({ surface, notes, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      courtsRestored++;
    } else {
      const payload: Record<string, unknown> = {
        event_id: targetEventId,
        name,
        surface,
        notes,
      };
      if (oldId) payload.id = oldId;

      const { data: ins, error: cErr } = await supabase
        .from("event_courts")
        .upsert(payload, { onConflict: "id" })
        .select("id")
        .maybeSingle();

      if (!cErr && ins?.id) {
        if (oldId) courtIdMap.set(oldId, ins.id);
        courtsRestored++;
      } else {
        delete payload.id;
        const { data: ins2, error: cErr2 } = await supabase
          .from("event_courts")
          .insert(payload)
          .select("id")
          .single();
        if (cErr2) throw new Error(`還原場地失敗 (${name}): ${cErr2.message}`);
        if (oldId) courtIdMap.set(oldId, ins2.id);
        courtsRestored++;
      }
    }
  }

  const slotIdMap = new Map<string, string>();
  let slotsRestored = 0;
  const slotRows = workbook.Sheets["EventSlots"]
    ? jsonSheetToRecords(workbook.Sheets["EventSlots"])
    : [];
  for (const row of slotRows) {
    const oldId = cellStr(row.id);
    const oldCourtId = cellStr(row.court_id);
    const remappedCourtId = oldCourtId ? courtIdMap.get(oldCourtId) ?? oldCourtId : null;
    const slot_date = cellStr(row.slot_date);
    const start_time = cellStr(row.start_time);
    const end_time = cellStr(row.end_time);
    if (!slot_date || !start_time || !end_time) continue;

    const slotPayload: Record<string, unknown> = {
      event_id: targetEventId,
      court_id: remappedCourtId,
      slot_date,
      start_time,
      end_time,
      capacity: cellInt(row.capacity),
      notes: cellStr(row.notes),
      code: cellStr(row.code),
    };
    if (oldId) slotPayload.id = oldId;

    const { data: ins, error: sErr } = await supabase
      .from("event_slots")
      .upsert(slotPayload, { onConflict: "id" })
      .select("id")
      .maybeSingle();

    if (!sErr && ins?.id) {
      if (oldId) slotIdMap.set(oldId, ins.id);
      slotsRestored++;
    } else {
      delete slotPayload.id;
      const { data: ins2 } = await supabase
        .from("event_slots")
        .insert(slotPayload)
        .select("id")
        .maybeSingle();
      if (ins2?.id && oldId) slotIdMap.set(oldId, ins2.id);
      slotsRestored++;
    }
  }

  // -------------------------------------------------------------
  // 4. Players & Team Members
  // -------------------------------------------------------------
  const playerIdMap = new Map<string, string>();
  const playerRows = jsonSheetToRecords(workbook.Sheets["Players"]);
  if (!playerRows.length) throw new Error("缺少 Players 工作表或無選手資料");

  const { data: currentDivs } = await supabase
    .from("event_divisions")
    .select("id")
    .eq("event_id", targetEventId)
    .order("display_order", { ascending: true });
  const fallbackDivisionId = currentDivs?.[0]?.id ?? null;

  let playersRestored = 0;
  for (const row of playerRows) {
    const oldId = cellStr(row.id);
    const name = cellStr(row.name);
    if (!oldId || !name) continue;

    const rawDivId = cellStr(row.division_id);
    const resolvedDivId = rawDivId
      ? divisionIdMap.get(rawDivId) ??
        (currentDivs?.some((d) => d.id === rawDivId) ? rawDivId : fallbackDivisionId)
      : fallbackDivisionId;

    let customFields: Record<string, unknown> | null = null;
    const cf = cellStr(row.custom_fields_json);
    if (cf) {
      try {
        customFields = JSON.parse(cf);
      } catch {
        /* skip */
      }
    } else if (row.custom_fields && typeof row.custom_fields === "object") {
      customFields = row.custom_fields as Record<string, unknown>;
    }

    const playerPayload: Record<string, unknown> = {
      id: oldId,
      event_id: targetEventId,
      name,
      department: cellStr(row.department),
      seed: cellInt(row.seed),
      eliminated_round: cellInt(row.eliminated_round),
      type: cellStr(row.type) || "player",
      division_id: resolvedDivId,
      email: cellStr(row.email),
      email_opt_in: cellBool(row.email_opt_in) ?? false,
      checked_in_at: cellStr(row.checked_in_at),
      checked_in_by: cellStr(row.checked_in_by),
      check_in_note: cellStr(row.check_in_note),
      custom_fields: customFields,
      updated_at: new Date().toISOString(),
    };

    const { data: upsertedPlayer, error: pErr } = await supabase
      .from("players")
      .upsert(playerPayload, { onConflict: "id" })
      .select("id")
      .maybeSingle();

    if (!pErr && upsertedPlayer?.id) {
      playerIdMap.set(oldId, upsertedPlayer.id);
      playersRestored++;
    } else {
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("id")
        .eq("event_id", targetEventId)
        .eq("name", name)
        .maybeSingle();

      if (existingPlayer?.id) {
        playerIdMap.set(oldId, existingPlayer.id);
        delete playerPayload.id;
        await supabase.from("players").update(playerPayload).eq("id", existingPlayer.id);
        playersRestored++;
      } else {
        delete playerPayload.id;
        const { data: insPlayer, error: insErr } = await supabase
          .from("players")
          .insert(playerPayload)
          .select("id")
          .single();
        if (insErr) {
          throw new Error(`還原選手失敗 (${name}): ${insErr.message}`);
        }
        playerIdMap.set(oldId, insPlayer.id);
        playersRestored++;
      }
    }
  }

  const teamMemberIdMap = new Map<string, string>();
  let teamMembersRestored = 0;
  const memberRows = workbook.Sheets["TeamMembers"]
    ? jsonSheetToRecords(workbook.Sheets["TeamMembers"])
    : [];
  for (const row of memberRows) {
    const oldId = cellStr(row.id);
    const oldPlayerId = cellStr(row.player_id);
    const name = cellStr(row.name);
    if (!oldPlayerId || !name) continue;

    const remappedPlayerId = playerIdMap.get(oldPlayerId);
    if (!remappedPlayerId) continue;

    const memberPayload: Record<string, unknown> = {
      player_id: remappedPlayerId,
      name,
      jersey_number: cellInt(row.jersey_number),
      is_captain: cellBool(row.is_captain) ?? false,
      updated_at: new Date().toISOString(),
    };
    if (oldId) memberPayload.id = oldId;

    const { data: insMember, error: mErr } = await supabase
      .from("team_members")
      .upsert(memberPayload, { onConflict: "id" })
      .select("id")
      .maybeSingle();

    if (!mErr && insMember?.id) {
      if (oldId) teamMemberIdMap.set(oldId, insMember.id);
      teamMembersRestored++;
    } else {
      delete memberPayload.id;
      const { data: insMember2, error: mErr2 } = await supabase
        .from("team_members")
        .insert(memberPayload)
        .select("id")
        .single();
      if (!mErr2 && insMember2?.id) {
        if (oldId) teamMemberIdMap.set(oldId, insMember2.id);
        teamMembersRestored++;
      }
    }
  }

  // -------------------------------------------------------------
  // 5. Matches (Strict Insertion & Duplicate Prevention)
  // -------------------------------------------------------------
  const matchRows = jsonSheetToRecords(workbook.Sheets["Matches"]);
  if (!matchRows.length) throw new Error("缺少 Matches 工作表或無比賽資料列");

  // 清除現有比賽以防止新舊 ID 重複混淆、造成 Round 2 TBD / 籤位錯亂
  const { error: delMatchesErr } = await supabase
    .from("matches")
    .delete()
    .eq("event_id", targetEventId);
  if (delMatchesErr) {
    throw new Error(`清除現有比賽失敗: ${delMatchesErr.message}`);
  }

  const matchIdMap = new Map<string, string>();
  const preparedMatches: Record<string, unknown>[] = [];

  for (const row of matchRows) {
    const oldId = cellStr(row.id);
    const round = cellInt(row.round);
    const match_number = cellInt(row.match_number);
    const status = cellStr(row.status) || "upcoming";
    if (round === null || match_number === null) {
      throw new Error("無效的比賽資料列：缺少 round 或 match_number");
    }

    const rawDivId = cellStr(row.division_id);
    const resolvedDivId = rawDivId
      ? divisionIdMap.get(rawDivId) ??
        (currentDivs?.some((d) => d.id === rawDivId) ? rawDivId : fallbackDivisionId)
      : fallbackDivisionId;

    const p1Raw = cellStr(row.player1_id);
    const p2Raw = cellStr(row.player2_id);
    const winRaw = cellStr(row.winner_id);
    const forfeitRaw = cellStr(row.forfeit_team_id);
    const slotRaw = cellStr(row.slot_id);

    const player1_id = p1Raw ? playerIdMap.get(p1Raw) ?? p1Raw : null;
    const player2_id = p2Raw ? playerIdMap.get(p2Raw) ?? p2Raw : null;
    const winner_id = winRaw ? playerIdMap.get(winRaw) ?? winRaw : null;
    const forfeit_team_id = forfeitRaw ? playerIdMap.get(forfeitRaw) ?? forfeitRaw : null;
    const slot_id = slotRaw ? slotIdMap.get(slotRaw) ?? slotRaw : null;

    const matchPayload: Record<string, unknown> = {
      event_id: targetEventId,
      division_id: resolvedDivId,
      round,
      match_number,
      group_number: cellInt(row.group_number),
      player1_id,
      player2_id,
      score1: cellStr(row.score1),
      score2: cellStr(row.score2),
      winner_id,
      court: cellStr(row.court),
      scheduled_time: cellStr(row.scheduled_time),
      slot_id,
      status,
      slot1_seed: cellInt(row.slot1_seed),
      slot1_group: cellInt(row.slot1_group),
      slot2_seed: cellInt(row.slot2_seed),
      slot2_group: cellInt(row.slot2_group),
      forfeit_team_id,
      forfeit_reason: cellStr(row.forfeit_reason),
      event_note: cellStr(row.event_note),
      event_note_public: cellBool(row.event_note_public) ?? false,
      reminder_sent_48h: cellBool(row.reminder_sent_48h) ?? false,
      created_at: cellStr(row.created_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (oldId) {
      matchPayload.id = oldId;
    }

    preparedMatches.push(matchPayload);
  }

  let matchesRestored = 0;
  for (const batch of chunk(preparedMatches, 50)) {
    const { data: insertedList, error: matchInsertErr } = await supabase
      .from("matches")
      .insert(batch)
      .select("id, round, match_number");

    if (matchInsertErr) {
      console.error("Match batch insert failed:", matchInsertErr, batch);
      throw new Error(
        `還原比賽失敗（第 ${batch[0]?.round} 輪 #${batch[0]?.match_number} 起）：${matchInsertErr.message}`
      );
    }

    if (insertedList) {
      for (let i = 0; i < insertedList.length; i++) {
        const orig = batch[i];
        if (orig.id && insertedList[i]?.id) {
          matchIdMap.set(String(orig.id), String(insertedList[i].id));
        }
      }
      matchesRestored += insertedList.length;
    }
  }

  // -------------------------------------------------------------
  // 6. Match Player Stats
  // -------------------------------------------------------------
  let statsRestored = 0;
  const statRows = workbook.Sheets["MatchPlayerStats"]
    ? jsonSheetToRecords(workbook.Sheets["MatchPlayerStats"])
    : [];
  if (statRows.length > 0) {
    const statInserts: Record<string, unknown>[] = [];
    for (const r of statRows) {
      const oldId = cellStr(r.id);
      const oldMatchId = cellStr(r.match_id);
      const oldPlayerId = cellStr(r.player_id);
      const stat_name = cellStr(r.stat_name);
      if (!oldMatchId || !oldPlayerId || !stat_name) continue;

      const match_id = matchIdMap.get(oldMatchId) ?? oldMatchId;
      const player_id = playerIdMap.get(oldPlayerId) ?? oldPlayerId;
      const oldTm = cellStr(r.team_member_id);
      const team_member_id = oldTm ? teamMemberIdMap.get(oldTm) ?? oldTm : null;

      const row: Record<string, unknown> = {
        match_id,
        player_id,
        stat_name,
        stat_value: cellStr(r.stat_value),
      };
      if (team_member_id) row.team_member_id = team_member_id;
      if (oldId) row.id = oldId;
      statInserts.push(row);
    }

    for (const batch of chunk(statInserts, 100)) {
      const { error: stErr } = await supabase.from("match_player_stats").insert(batch);
      if (stErr) {
        console.warn("還原球員統計警告:", stErr.message);
      } else {
        statsRestored += batch.length;
      }
    }
  }

  // -------------------------------------------------------------
  // 7. Announcements & Schedule Items
  // -------------------------------------------------------------
  let announcementsRestored = 0;
  const announcementRows = workbook.Sheets["Announcements"]
    ? jsonSheetToRecords(workbook.Sheets["Announcements"])
    : [];
  for (const r of announcementRows) {
    const oldId = cellStr(r.id);
    const title = cellStr(r.title);
    const content = cellStr(r.content);
    if (!title || !content) continue;

    const payload: Record<string, unknown> = {
      event_id: targetEventId,
      title,
      content,
      is_pinned: cellBool(r.is_pinned) ?? false,
      pinned_order: cellInt(r.pinned_order),
      created_at: cellStr(r.created_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (oldId) payload.id = oldId;

    const { error: aErr } = await supabase
      .from("announcements")
      .upsert(payload, { onConflict: "id" });
    if (!aErr) announcementsRestored++;
  }

  let scheduleItemsRestored = 0;
  const scheduleRows = workbook.Sheets["ScheduleItems"]
    ? jsonSheetToRecords(workbook.Sheets["ScheduleItems"])
    : [];
  for (const r of scheduleRows) {
    const oldId = cellStr(r.id);
    const day_number = cellInt(r.day_number) ?? 1;
    const day_title = cellStr(r.day_title) || `Day ${day_number}`;
    const order_number = cellInt(r.order_number) ?? 1;

    const payload: Record<string, unknown> = {
      event_id: targetEventId,
      day_number,
      day_title,
      location: cellStr(r.location),
      order_number,
      group_name: cellStr(r.group_name),
      round_name: cellStr(r.round_name),
      match_count: cellInt(r.match_count),
      scheduled_time: cellStr(r.scheduled_time),
      created_at: cellStr(r.created_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (oldId) payload.id = oldId;

    const { error: sErr } = await supabase
      .from("schedule_items")
      .upsert(payload, { onConflict: "id" });
    if (!sErr) scheduleItemsRestored++;
  }

  // -------------------------------------------------------------
  // 8. 籤表晉級完整性校驗與自動推進（Bracket State Integrity）
  // -------------------------------------------------------------
  let bracketWinnersAdvanced = 0;
  const { data: allRestoredMatches, error: fetchAllErr } = await supabase
    .from("matches")
    .select("id, round, match_number, status, winner_id, player1_id, player2_id, division_id, group_number")
    .eq("event_id", targetEventId)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  if (!fetchAllErr && allRestoredMatches && allRestoredMatches.length > 0) {
    const WINNER_STATUSES = new Set(["completed", "bye", "forfeit", "walkover"]);

    // 分組（按 division_id）分別檢查淘汰賽樹狀晉級
    const divGroups = new Map<string, typeof allRestoredMatches>();
    for (const m of allRestoredMatches) {
      const key = m.division_id || "__default__";
      const list = divGroups.get(key) || [];
      list.push(m);
      divGroups.set(key, list);
    }

    for (const [, divMatches] of divGroups.entries()) {
      // 僅針對 knockout / playoff 比賽（group_number 為空），不影響例行循環賽
      const bracketMatches = divMatches.filter(
        (m) => m.group_number === null || m.group_number === undefined
      );
      if (!bracketMatches.length) continue;

      const maxRound = Math.max(...bracketMatches.map((m) => m.round));

      for (let r = 1; r < maxRound; r++) {
        const roundMatches = bracketMatches.filter((m) => m.round === r);
        for (const m of roundMatches) {
          if (!m.winner_id || !WINNER_STATUSES.has(m.status || "")) continue;

          const nextRound = r + 1;
          const nextMatchNum = Math.ceil(m.match_number / 2);
          const isPlayer1Slot = m.match_number % 2 === 1;

          // 若為決賽輪且 match_number 為 2，通常為季軍賽（非勝者晉級），跳過
          if (nextRound === maxRound && nextMatchNum === 2) continue;

          const nextMatch = bracketMatches.find(
            (nm) => nm.round === nextRound && nm.match_number === nextMatchNum
          );

          if (nextMatch) {
            const currentSlotValue = isPlayer1Slot ? nextMatch.player1_id : nextMatch.player2_id;
            if (currentSlotValue !== m.winner_id) {
              const slotKey = isPlayer1Slot ? "player1_id" : "player2_id";
              const { error: syncErr } = await supabase
                .from("matches")
                .update({ [slotKey]: m.winner_id, updated_at: new Date().toISOString() })
                .eq("id", nextMatch.id);

              if (syncErr) {
                console.warn(`籤表晉級校驗警告 (Match ${nextMatch.id}):`, syncErr.message);
              } else {
                if (isPlayer1Slot) {
                  nextMatch.player1_id = m.winner_id;
                } else {
                  nextMatch.player2_id = m.winner_id;
                }
                bracketWinnersAdvanced++;
              }
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 9. 鎖定籤表並記錄歷史，避免 auto-bracket regeneration 覆蓋
  // -------------------------------------------------------------
  await supabase
    .from("events")
    .update({
      bracket_generation_method: "imported",
      bracket_locked: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetEventId);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("bracket_edit_history").insert({
        event_id: targetEventId,
        admin_id: user.id,
        action: "save",
        changes: {
          action: "restore_backup",
          matches_restored: matchesRestored,
          players_restored: playersRestored,
          bracket_winners_advanced: bracketWinnersAdvanced,
        },
        reason: "Restored from Excel full backup",
      });
    }
  } catch {
    /* skip edit history if unauthorized */
  }

  return {
    matchesRestored,
    playersRestored,
    divisionsRestored,
    courtsRestored,
    slotsRestored,
    statsRestored,
    teamMembersRestored,
    announcementsRestored,
    scheduleItemsRestored,
    bracketWinnersAdvanced,
  };
}
