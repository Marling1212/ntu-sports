"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Player } from "@/types/database";
import { checkAndAnnounceRoundCompletion } from "@/lib/utils/checkRoundCompletion";
import { syncLockedPlayoffSeeds } from "@/lib/actions/syncLockedPlayoffSeeds";
import * as XLSX from 'xlsx';
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { formatScheduledTimeAsStored } from "@/lib/utils/formatScheduledTime";
import {
  datetimeLocalValueToUtcIso,
  utcIsoToDatetimeLocalValue,
  rehomeDatetimeLocalValue,
  readStoredScheduleInputTimezone,
  writeStoredScheduleInputTimezone,
  DEFAULT_SCHEDULE_INPUT_TIMEZONE,
} from "@/lib/utils/adminScheduleTimezone";
import ScheduleInputTimezoneField from "@/components/admin/ScheduleInputTimezoneField";
import { DRAW_WINNER_ID, isDrawOption, isDrawMatch } from "@/lib/constants/matchConstants";
import CreateMatchModal from "@/components/admin/CreateMatchModal";

interface SlotOption {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  code?: string | null;
  court_id?: string | null;
}

const normalizeTime = (time?: string | null): string => {
  if (!time) return "";
  const [hour = "00", minute = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
};

const normalizeTimeWithSeconds = (time?: string | null): string => {
  if (!time) return "00:00:00";
  const [hour = "00", minute = "00", second = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`;
};

/** Normalize date to YYYY/MM/DD so it matches formatScheduledTimeAsStored. Never return undefined so we don't trigger fallback to single-time display. */
const normalizeSlotDateForDisplay = (slotDate?: string | null): string => {
  if (!slotDate || typeof slotDate !== "string") return "";
  const trimmed = slotDate.trim();
  const parts = trimmed.split(/[-/T]/);
  const dateParts = parts.filter((p) => /^\d+$/.test(p) && p.length <= 4);
  if (dateParts.length >= 3) {
    const [y, m, d] = dateParts;
    return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
  }
  return trimmed.slice(0, 10);
};

const formatSlotScheduleRange = (slot: SlotOption): string => {
  const start = normalizeTime(slot.start_time);
  const end = normalizeTime(slot.end_time);
  const range = end ? `${start}-${end}` : start;
  const dateStr = normalizeSlotDateForDisplay(slot.slot_date);
  return dateStr ? `${dateStr} ${range}` : range;
};

const formatSlotLabel = (slot: SlotOption): string => {
  const base = formatSlotScheduleRange(slot);
  return slot.code ? `${slot.code} · ${base}` : base;
};

const formatDateTimeDisplay = (iso?: string | null): string => {
  return formatScheduledTimeAsStored(iso ?? null);
};

const deriveIsoFromSlot = (slot?: SlotOption | null): string | null => {
  if (!slot) return null;
  const base = `${slot.slot_date}T${normalizeTimeWithSeconds(slot.start_time)}`;
  if (base.includes("Z") || base.includes("+")) return base;
  return `${base}+08:00`;
};

interface Match {
  id: string;
  event_id: string;
  division_id?: string | null;
  round: number;
  match_number: number;
  player1_id?: string;
  player2_id?: string;
  score1?: string;
  score2?: string;
  winner_id?: string;
  court?: string;
  scheduled_time?: string | null;
  slot_id?: string | null;
  slot?: SlotOption | null;
  status: string;
  forfeit_team_id?: string | null;
  forfeit_reason?: string | null;
  event_note?: string | null;
  event_note_public?: boolean;
  court_name?: string | null; // For display consistency
  player1?: Player;
  player2?: Player;
  winner?: Player;
}

interface MatchesTableProps {
  eventId: string;
  initialMatches: Match[];
  players: Player[];
  slots?: SlotOption[];
  courts?: Array<{ id: string; name: string }>;
  tournamentType?: "single_elimination" | "season_play" | null;
  registrationType?: 'player' | 'team';
  matchPlayerStats?: Array<{
    id: string;
    match_id: string;
    player_id: string;
    team_member_id?: string | null;
    stat_name: string;
    stat_value?: string;
    created_at?: string;
    updated_at?: string;
  }>;
  divisions?: Array<{ id: string; sport: string; name?: string | null }>;
  defaultDivisionId?: string | null;
}

export default function MatchesTable({
  eventId,
  initialMatches,
  players,
  slots = [],
  courts = [],
  tournamentType,
  registrationType = 'player',
  matchPlayerStats = [],
  divisions = [],
  defaultDivisionId = null,
}: MatchesTableProps) {
  const { t, locale } = useI18n();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const router = useRouter();
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [initialEditForm, setInitialEditForm] = useState<any>(null);
  const supabase = createClient();

  // Determine if the current match edit form has unsaved modifications
  const isDirty = useMemo(() => {
    if (!editingMatch || !initialEditForm) return false;
    return (
      String(editForm.score1 ?? "") !== String(initialEditForm.score1 ?? "") ||
      String(editForm.score2 ?? "") !== String(initialEditForm.score2 ?? "") ||
      String(editForm.winner_id ?? "") !== String(initialEditForm.winner_id ?? "") ||
      String(editForm.court ?? "") !== String(initialEditForm.court ?? "") ||
      String(editForm.status ?? "") !== String(initialEditForm.status ?? "") ||
      String(editForm.scheduled_time ?? "") !== String(initialEditForm.scheduled_time ?? "") ||
      String(editForm.slot_id ?? "") !== String(initialEditForm.slot_id ?? "")
    );
  }, [editingMatch, editForm, initialEditForm]);

  // Unsaved changes protection: browser close / reload and client-side link navigation
  useEffect(() => {
    if (!isDirty) return;

    // 1. Native browser close / reload / URL navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    // 2. Client-side link clicks (Next.js Link or standard <a>)
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target || !target.href) return;

      // Ignore pure hash anchors within the current page (e.g. #players-table)
      const currentUrlWithoutHash = window.location.href.split("#")[0];
      if (target.href.startsWith(`${currentUrlWithoutHash}#`)) return;

      // Ignore links opened in a new tab
      if (target.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const confirmLeave = window.confirm(
        locale === "zh"
          ? "⚠️ 您有尚未儲存的賽程或比分變更！\n\n如果直接離開，剛才輸入的內容將會遺失。\n確定要放棄並離開此頁嗎？"
          : "⚠️ You have unsaved match changes!\n\nIf you leave now, your changes will be lost.\nAre you sure you want to discard them and leave?"
      );

      if (!confirmLeave) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleAnchorClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [isDirty, locale]);

  const getStatusLabel = (status: string) => {
    const key = `admin.matchStatus.${status}` as const;
    const known = ["upcoming", "live", "completed", "delayed", "bye", "forfeit", "walkover"];
    return known.includes(status) ? t(key) : status;
  };

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courtFilter, setCourtFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [roundFilter, setRoundFilter] = useState<string>("all");
  const [showMobileExtraFilters, setShowMobileExtraFilters] = useState(false);

  // Batch operation states
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchOperation, setBatchOperation] = useState<"score" | "court" | "status" | null>(null);
  const [batchForm, setBatchForm] = useState({ court: "", status: "", customCourt: "" });

  // Create match modal state
  const [showCreateMatch, setShowCreateMatch] = useState(false);

  // Recently saved match state for 10-second quick re-edit floating bar
  const [recentlySavedMatch, setRecentlySavedMatch] = useState<{
    id: string;
    p1: string;
    p2: string;
    round: number;
    matchNumber: number;
    score?: string | null;
    announcementId?: string | null;
  } | null>(null);
  const recentTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recentTimerRef.current) {
        clearTimeout(recentTimerRef.current);
      }
    };
  }, []);

  const handleReEditRecent = async () => {
    if (!recentlySavedMatch) return;
    const targetId = recentlySavedMatch.id;
    const annId = recentlySavedMatch.announcementId;

    if (recentTimerRef.current) {
      clearTimeout(recentTimerRef.current);
    }
    setRecentlySavedMatch(null);

    // Retract auto-published announcement if one was created
    if (annId) {
      try {
        const { error: delError } = await supabase
          .from("announcements")
          .delete()
          .eq("id", annId);
        if (!delError) {
          toast.success(t("admin.matchesTable.retractSuccess") || "已收回剛才發布的公告");
        } else {
          console.error("Failed to delete retracted announcement:", delError);
        }
      } catch (err) {
        console.error("Error retracting announcement:", err);
      }
    }

    const targetMatch = matches.find(m => m.id === targetId);
    if (targetMatch) {
      if (statusFilter !== "all" && statusFilter !== targetMatch.status) {
        setStatusFilter("all");
      }
      handleEdit(targetMatch);
      setTimeout(() => {
        const el = document.getElementById(`match-card-${targetId}`) || document.getElementById(`match-row-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(40);
      }
    }
  };

  const handleDismissRecent = () => {
    if (recentTimerRef.current) {
      clearTimeout(recentTimerRef.current);
    }
    setRecentlySavedMatch(null);
  };

  const [scheduleInputTz, setScheduleInputTz] = useState(DEFAULT_SCHEDULE_INPUT_TIMEZONE);
  useEffect(() => {
    setScheduleInputTz(readStoredScheduleInputTimezone());
  }, []);

  const handleScheduleInputTzChange = (next: string) => {
    const prev = scheduleInputTz;
    writeStoredScheduleInputTimezone(next);
    setScheduleInputTz(next);
    setEditForm((prevForm: any) => {
      if (!editingMatch || !prevForm?.scheduled_time) return prevForm;
      return {
        ...prevForm,
        scheduled_time: rehomeDatetimeLocalValue(prevForm.scheduled_time, prev, next),
      };
    });
  };

  const slotMap = useMemo(() => {
    const map = new Map<string, SlotOption>();
    slots.forEach((slot) => map.set(slot.id, slot));
    return map;
  }, [slots]);

  const availableCourts = useMemo(() => {
    const set = new Set<string>();
    // 1. Configured event courts from event_courts table
    courts.forEach((c) => {
      if (c.name?.trim()) set.add(c.name.trim());
    });
    // 2. Any courts already assigned to matches in this tournament (e.g. from Match Day ad-hoc entries)
    matches.forEach((m) => {
      if (m.court?.trim()) set.add(m.court.trim());
    });
    return Array.from(set);
  }, [courts, matches]);

  const quickCourtChips = availableCourts;

  // Check if match has individual player stats entered (for team events)
  // Changed: Now checks if ANY player-level stat exists with actual values, not just empty records
  const hasIndividualStats = useMemo(() => {
    const statsMap = new Map<string, boolean>();

    if (registrationType !== 'team') return statsMap;

    matches.forEach(match => {
      // Get any player-level stats for this match (with team_member_id) that have actual values
      const matchStats = matchPlayerStats.filter(s =>
        s.match_id === match.id &&
        s.team_member_id !== null &&
        s.team_member_id !== undefined && // Has team_member_id means it's a player-level stat
        s.stat_value !== null &&
        s.stat_value !== undefined &&
        s.stat_value !== "" // Must have an actual value, not just an empty record
      );

      // If any player-level stats with values exist, mark as having individual stats
      statsMap.set(match.id, matchStats.length > 0);
    });

    return statsMap;
  }, [matches, matchPlayerStats, registrationType]);

  // Filter matches based on search and filters
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      // Search query filter (player names)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const player1Name = match.player1?.name?.toLowerCase() || "";
        const player2Name = match.player2?.name?.toLowerCase() || "";
        const winner = match.winner_id ? players.find(p => p.id === match.winner_id) : null;
        const winnerName = winner?.name?.toLowerCase() || "";
        if (!player1Name.includes(query) && !player2Name.includes(query) && !winnerName.includes(query)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && match.status !== statusFilter) {
        return false;
      }

      // Court filter
      if (courtFilter !== "all") {
        if (courtFilter === "none" && match.court) return false;
        if (courtFilter !== "none" && match.court !== courtFilter) return false;
      }

      // Date filter
      if (dateFilter) {
        const matchDate = match.scheduled_time ? new Date(match.scheduled_time).toISOString().split("T")[0] : null;
        if (matchDate !== dateFilter) return false;
      }

      // Round filter
      if (roundFilter !== "all") {
        if (roundFilter === "regular" && match.round !== 0) return false;
        if (roundFilter === "playoffs" && match.round === 0) return false;
        if (roundFilter !== "regular" && roundFilter !== "playoffs" && match.round.toString() !== roundFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // In tournament / single elimination brackets, preserve bracket round & match number order
      // so completed matches stay firmly in place and NEVER jump to the bottom!
      if (tournamentType === "single_elimination" || (!tournamentType && a.round && b.round)) {
        if (a.round !== b.round) return a.round - b.round;
        if (a.match_number !== b.match_number) return a.match_number - b.match_number;
        if (a.scheduled_time && b.scheduled_time) {
          return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
        }
        return 0;
      }

      // Default sorting for non-bracket / league formats (e.g. season play):
      // Upcoming/live/delayed first (so 接下來的比賽 on top), then completed
      const aUpcoming = a.status === "upcoming" || a.status === "live" || a.status === "delayed";
      const bUpcoming = b.status === "upcoming" || b.status === "live" || b.status === "delayed";
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      // Within same group: delayed/unscheduled to bottom of that group
      const aDelayedOrUnscheduled = a.status === "delayed" || !a.scheduled_time;
      const bDelayedOrUnscheduled = b.status === "delayed" || !b.scheduled_time;
      if (aDelayedOrUnscheduled && !bDelayedOrUnscheduled) return 1;
      if (!aDelayedOrUnscheduled && bDelayedOrUnscheduled) return -1;
      // Then by scheduled time (soonest first for upcoming, past first for completed)
      if (a.scheduled_time && b.scheduled_time) {
        return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
      }
      if (a.round !== b.round) return a.round - b.round;
      return a.match_number - b.match_number;
    });
  }, [matches, searchQuery, statusFilter, courtFilter, dateFilter, roundFilter, players]);

  const handleEdit = (match: Match) => {
    // If user is editing another match with unsaved modifications, confirm before switching
    if (editingMatch && editingMatch !== match.id && isDirty) {
      const confirmSwitch = window.confirm(
        locale === "zh"
          ? "您正在編輯另一場比賽且尚未儲存，切換將會放棄該場變更，確定要繼續嗎？"
          : "You have unsaved changes on another match. Switching will discard them. Continue?"
      );
      if (!confirmSwitch) return;
    }

    const slotCandidate = match.slot_id ? slotMap.get(match.slot_id) || match.slot || null : match.slot || null;
    const scheduledSource = match.scheduled_time || deriveIsoFromSlot(slotCandidate);
    setEditingMatch(match.id);
    const formValues = {
      score1: match.score1 || "",
      score2: match.score2 || "",
      winner_id: (() => {
        // Check if match is a draw (completed, no winner, equal scores)
        const isMatchDraw = match.status === "completed" && !match.winner_id &&
          match.score1 && match.score2 && match.score1 === match.score2;
        return isMatchDraw ? DRAW_WINNER_ID : (match.winner_id || "");
      })(),
      court: match.court || "",
      status: match.status || "upcoming",
      scheduled_time: utcIsoToDatetimeLocalValue(scheduledSource, scheduleInputTz),
      slot_id: match.slot_id || "",
    };
    setEditForm(formValues);
    setInitialEditForm(formValues);
  };

  const handleSave = async (matchId: string) => {
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;

    // Scores: both blank → null in DB (do not write "0", so delayed edits don't fake a result).
    // One side filled without the other → error.
    const s1 = String(editForm.score1 ?? "").trim();
    const s2 = String(editForm.score2 ?? "").trim();

    let score1Val: string | null;
    let score2Val: string | null;
    let raw1 = 0;
    let raw2 = 0;
    let hasBothScores = false;

    if (s1 === "" && s2 === "") {
      score1Val = null;
      score2Val = null;
    } else if (s1 === "" || s2 === "") {
      toast.error("請兩邊都填寫比分，或兩邊都留空。");
      return;
    } else {
      raw1 = parseInt(s1, 10);
      raw2 = parseInt(s2, 10);
      if (Number.isNaN(raw1) || Number.isNaN(raw2)) {
        toast.error("比分必須為有效數字。");
        return;
      }
      if (raw1 < 0 || raw2 < 0) {
        toast.error(t("admin.matchScoreNegative") || "Score cannot be negative.");
        return;
      }
      hasBothScores = true;
      score1Val = String(raw1);
      score2Val = String(raw2);
    }

    const slotIdValue: string | null = editForm.slot_id ? editForm.slot_id : null;
    const selectedSlot = slotIdValue ? slotMap.get(slotIdValue) || null : null;
    let scheduledIso = editForm.scheduled_time
      ? datetimeLocalValueToUtcIso(editForm.scheduled_time, scheduleInputTz)
      : null;
    if (!scheduledIso && selectedSlot) {
      scheduledIso = deriveIsoFromSlot(selectedSlot);
    }

    // Auto-decide winner from scores when both scores are present.
    // For ties, treat as draw (winner_id = null).
    const inferredWinnerId = hasBothScores
      ? raw1 === raw2
        ? DRAW_WINNER_ID
        : raw1 > raw2
          ? (currentMatch.player1_id || null)
          : (currentMatch.player2_id || null)
      : null;

    const chosenWinnerId = inferredWinnerId ?? (editForm.winner_id || null);

    let winnerIdValue: string | null;
    if (hasBothScores) {
      winnerIdValue = chosenWinnerId === DRAW_WINNER_ID ? null : chosenWinnerId;
    } else if (editForm.status === "forfeit" || editForm.status === "walkover") {
      const w = editForm.winner_id || null;
      winnerIdValue = w === DRAW_WINNER_ID || !w ? null : w;
    } else {
      winnerIdValue = null;
    }

    // Infer status so user doesn't have to set it manually: real score + winner = completed (unless forfeit/walkover)
    const needsCompleted =
      (hasBothScores && inferredWinnerId === DRAW_WINNER_ID) ||
      (!!winnerIdValue && ["upcoming", "live", "delayed"].includes(editForm.status)) ||
      (hasBothScores && ["upcoming", "live", "delayed"].includes(editForm.status));
    const finalStatus = needsCompleted ? "completed" : editForm.status;

    // Update current match
    const { data, error } = await supabase
      .from("matches")
      .update({
        score1: score1Val,
        score2: score2Val,
        winner_id: winnerIdValue,
        court: editForm.court || null,
        scheduled_time: scheduledIso,
        slot_id: slotIdValue,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select(`
        *,
        player1:players!matches_player1_id_fkey(id, name, seed),
        player2:players!matches_player2_id_fkey(id, name, seed),
        winner:players!matches_winner_id_fkey(id, name, seed),
        slot:event_slots(id, slot_date, start_time, end_time, code, court_id)
      `)
      .single();

    if (error) {
      toast.error(`Error: ${error.message}`);
      return;
    }

    // After updating a regular-season result, sync locked playoff slots (auto-fill bracket)
    if (currentMatch.round === 0) {
      syncLockedPlayoffSeeds(eventId).catch((err) => console.warn("syncLockedPlayoffSeeds:", err));
    }

    // Auto-publish announcement for match changes (status, date, score, court)
    let createdAnnouncementId: string | null = null;
    if (data.player1 && data.player2) {
      const player1Name = data.player1.name || "TBD";
      const player2Name = data.player2.name || "TBD";
      const roundLabel = getRoundName(currentMatch.round);
      const matchLabel = `${roundLabel} M${currentMatch.match_number}: ${player1Name} vs ${player2Name}`;
      const changeItems: string[] = [];

      const statusLabels: { [key: string]: string } = {
        upcoming: "即將開始",
        live: "進行中",
        completed: "已完成",
        delayed: "延遲",
        bye: "輪空",
        forfeit: "棄權",
        walkover: "不戰而勝",
      };

      // Check status change
      const isStatusChanged = editForm.status !== currentMatch.status;
      const originalStatus = statusLabels[currentMatch.status] || currentMatch.status;
      const newStatus = statusLabels[editForm.status || ""] || editForm.status || "";

      // Check date/time change
      const oldDate = currentMatch.scheduled_time ? formatDateTimeDisplay(currentMatch.scheduled_time) : "未排定";
      const newDate = scheduledIso ? formatDateTimeDisplay(scheduledIso) : "未排定";
      const isDateChanged = oldDate !== newDate;

      // Check score change
      const oldScore = currentMatch.score1 != null && currentMatch.score2 != null
        ? `${currentMatch.score1}-${currentMatch.score2}`
        : "未記錄";
      const newScore =
        score1Val != null && score2Val != null ? `${score1Val}-${score2Val}` : "未記錄";
      const isScoreChanged = oldScore !== newScore && newScore !== "未記錄";

      // Check court change
      const oldCourt = currentMatch.court || "未分配";
      const newCourt = editForm.court || "未分配";
      const isCourtChanged = oldCourt !== newCourt;

      let announcementTitle = "";
      let announcementContent = "";

      if (editForm.status === "live" && currentMatch.status !== "live") {
        announcementTitle = `🎾 ${matchLabel} 比賽開始！`;
        announcementContent = `🎾 ${matchLabel}\n比賽現在開始！\n場地：${editForm.court || oldCourt || "現場公布"}\n請選手迅速就位，歡迎前往觀賽！`;
      } else if (finalStatus === "completed" && (isStatusChanged || isScoreChanged)) {
        const winnerObj = winnerIdValue
          ? (winnerIdValue === data.player1.id ? data.player1 : winnerIdValue === data.player2.id ? data.player2 : null)
          : null;
        const winnerName = winnerObj?.name;
        announcementTitle = `🏆 ${matchLabel} 比賽結束`;
        announcementContent = `🏆 ${matchLabel}\n結果：${winnerName ? `${winnerName} 勝出` : "已完成"}${newScore !== "未記錄" ? `\n比數：${newScore}` : ""}${newCourt !== "未分配" ? `\n場地：${newCourt}` : ""}`;
      } else {
        if (isStatusChanged) {
          changeItems.push(`狀態：${originalStatus} → ${newStatus}`);
        }
        if (isCourtChanged) {
          changeItems.push(`場地：${oldCourt} → ${newCourt}`);
        }
        if (isScoreChanged) {
          changeItems.push(`比數：${oldScore} → ${newScore}`);
        }
        if (isDateChanged) {
          changeItems.push(`時間：${oldDate} → ${newDate}`);
        }

        if (changeItems.length > 0) {
          announcementTitle = `📢 ${matchLabel} 更新`;
          announcementContent = `📢 ${matchLabel}\n\n更新項目：\n` + changeItems.map(item => `• ${item}`).join("\n");
        }
      }

      if (announcementTitle && announcementContent) {
        try {
          const { data: annData, error: annError } = await supabase
            .from("announcements")
            .insert({
              event_id: eventId,
              title: announcementTitle,
              content: announcementContent,
              created_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (!annError && annData) {
            createdAnnouncementId = annData.id;
          } else if (annError) {
            console.error("Error auto-publishing announcement:", annError);
          }
        } catch (annErr) {
          console.error("Auto-publishing announcement failed:", annErr);
        }
      }
    }

    let bracketMatchesSynced = false;

    // Sync next-round slot when winner is set/changed/cleared.
    if (currentMatch.round) {
      const nextRound = currentMatch.round + 1;
      const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);
      // Odd match numbers (1, 3, 5...) feed into player1; even (2, 4, 6...) into player2
      const isPlayer1Slot = currentMatch.match_number % 2 === 1;

      let nextMatch = matches.find(
        m =>
          m.round === nextRound &&
          m.match_number === nextMatchNumber &&
          (currentMatch.division_id ? m.division_id === currentMatch.division_id : !m.division_id)
      );

      if (!nextMatch) {
        let nextMatchQuery = supabase
          .from("matches")
          .select(`
            *,
            player1:players!matches_player1_id_fkey(id, name, seed),
            player2:players!matches_player2_id_fkey(id, name, seed),
            winner:players!matches_winner_id_fkey(id, name, seed)
          `)
          .eq("event_id", eventId)
          .eq("round", nextRound)
          .eq("match_number", nextMatchNumber);

        if (currentMatch.division_id) {
          nextMatchQuery = nextMatchQuery.eq("division_id", currentMatch.division_id);
        } else {
          nextMatchQuery = nextMatchQuery.is("division_id", null);
        }

        const { data: dbNextMatch } = await nextMatchQuery.maybeSingle();
        if (dbNextMatch) {
          nextMatch = dbNextMatch as Match;
        }
      }

      if (nextMatch) {
        const slotKey = isPlayer1Slot ? "player1_id" : "player2_id";
        const existingSlotValue = isPlayer1Slot ? nextMatch.player1_id : nextMatch.player2_id;
        const shouldClearSlot = !winnerIdValue && !!currentMatch.winner_id && existingSlotValue === currentMatch.winner_id;

        const updateData = winnerIdValue
          ? { [slotKey]: winnerIdValue, updated_at: new Date().toISOString() }
          : shouldClearSlot
            ? { [slotKey]: null, updated_at: new Date().toISOString() }
            : null;

        if (updateData) {
          const { data: nextMatchData, error: nextMatchError } = await supabase
            .from("matches")
            .update(updateData)
            .eq("id", nextMatch.id)
            .select(`
              *,
              player1:players!matches_player1_id_fkey(id, name, seed),
              player2:players!matches_player2_id_fkey(id, name, seed),
              winner:players!matches_winner_id_fkey(id, name, seed)
            `)
            .single();

          if (nextMatchError) {
            toast.error(`Failed to sync next round: ${nextMatchError.message}`);
          } else {
            // Check if this is a semifinal match - if so, advance loser to 3rd place match
            const maxRound = Math.max(...matches.map(m => m.round));
            const isSemifinal = currentMatch.round === maxRound - 1;

            if (isSemifinal && winnerIdValue) {
              // Find loser
              const loserId = currentMatch.player1_id === winnerIdValue
                ? currentMatch.player2_id
                : currentMatch.player1_id;

              if (loserId) {
                // Find 3rd place match (match_number = 2 in final round)
                const thirdPlaceMatch = matches.find(
                  m =>
                    m.round === maxRound &&
                    m.match_number === 2 &&
                    (currentMatch.division_id ? m.division_id === currentMatch.division_id : !m.division_id)
                );

                if (thirdPlaceMatch) {
                  // Determine which slot to fill (fill player1 first, then player2)
                  const slotToFill = !thirdPlaceMatch.player1_id ? "player1_id" : "player2_id";

                  const { data: thirdPlaceData, error: thirdPlaceError } = await supabase
                    .from("matches")
                    .update({
                      [slotToFill]: loserId,
                      updated_at: new Date().toISOString()
                    })
                    .eq("id", thirdPlaceMatch.id)
                    .select(`
                      *,
                      player1:players!matches_player1_id_fkey(id, name, seed),
                      player2:players!matches_player2_id_fkey(id, name, seed),
                      winner:players!matches_winner_id_fkey(id, name, seed)
                    `)
                    .single();

                  if (!thirdPlaceError) {
                    bracketMatchesSynced = true;
                    setMatches(matches.map(m => {
                      if (m.id === matchId) return data;
                      if (m.id === nextMatch.id) return nextMatchData;
                      if (m.id === thirdPlaceMatch.id) return thirdPlaceData;
                      return m;
                    }));
                  }
                }
              }
            } else {
              // Update local state with both matches
              bracketMatchesSynced = true;
              setMatches(matches.map(m => {
                if (m.id === matchId) return data;
                if (m.id === nextMatch.id) return nextMatchData;
                return m;
              }));
            }

            setEditingMatch(null);
            setEditForm({});
            setInitialEditForm(null);
          }
        }
      }
    }

    // If bracket sync was not performed, update current match in state
    if (!bracketMatchesSynced) {
      setMatches(matches.map(m => m.id === matchId ? data : m));
    }
    setEditingMatch(null);
    setEditForm({});
    setInitialEditForm(null);

    // Check if this round is now completed and create announcement (use finalStatus so inferred "completed" counts)
    if (finalStatus === "completed" && winnerIdValue) {
      checkAndAnnounceRoundCompletion(eventId, currentMatch.round).then((announced) => {
        if (announced) {
          toast.success("🎉 Round completed! Announcement posted.");
        }
      });
    }

    toast.success("Match updated successfully!");

    // Trigger 10-second quick re-edit floating bar
    if (recentTimerRef.current) {
      clearTimeout(recentTimerRef.current);
    }
    const p1Name = data.player1?.name || "Player 1";
    const p2Name = data.player2?.name || "Player 2";
    const scoreStr = score1Val != null && score2Val != null ? `${score1Val}-${score2Val}` : null;
    setRecentlySavedMatch({
      id: matchId,
      p1: p1Name,
      p2: p2Name,
      round: currentMatch.round,
      matchNumber: currentMatch.match_number,
      score: scoreStr,
      announcementId: createdAnnouncementId,
    });
    recentTimerRef.current = setTimeout(() => {
      setRecentlySavedMatch(null);
    }, 10000);
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        locale === "zh"
          ? "確定要取消編輯嗎？剛才輸入的變更將會放棄。"
          : "Discard unsaved changes?"
      );
      if (!confirmDiscard) return;
    }
    setEditingMatch(null);
    setEditForm({});
    setInitialEditForm(null);
  };

  // Batch operations
  const toggleMatchSelection = (matchId: string) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(matchId)) {
      newSelected.delete(matchId);
    } else {
      newSelected.add(matchId);
    }
    setSelectedMatches(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedMatches.size === filteredMatches.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(filteredMatches.map(m => m.id)));
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedMatches.size === 0) {
      toast.error("請選擇至少一場比賽");
      return;
    }

    if (batchOperation === "court") {
      const courtValue = batchForm.court === "OTHER" ? batchForm.customCourt : batchForm.court;
      if (!courtValue) {
        toast.error("請選擇或輸入場地");
        return;
      }
    }

    if (batchOperation === "status" && !batchForm.status) {
      toast.error("請選擇狀態");
      return;
    }

    // Get original match data before update for announcement drafts
    const selectedMatchesArray = Array.from(selectedMatches);
    const originalMatches = matches.filter(m => selectedMatchesArray.includes(m.id));

    const updates: any[] = [];
    for (const matchId of selectedMatches) {
      const updateData: any = { updated_at: new Date().toISOString() };

      if (batchOperation === "court") {
        updateData.court = batchForm.court === "OTHER" ? batchForm.customCourt : batchForm.court;
      }

      if (batchOperation === "status") {
        updateData.status = batchForm.status;
      }

      updates.push(
        supabase
          .from("matches")
          .update(updateData)
          .eq("id", matchId)
      );
    }

    try {
      await Promise.all(updates);

      // Refresh matches
      const { data: updatedMatches } = await supabase
        .from("matches")
        .select(`
          *,
          player1:players!matches_player1_id_fkey(id, name, seed),
          player2:players!matches_player2_id_fkey(id, name, seed),
          winner:players!matches_winner_id_fkey(id, name, seed),
          slot:event_slots(id, slot_date, start_time, end_time, code, court_id)
        `)
        .eq("event_id", eventId)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });

      if (updatedMatches) {
        setMatches(updatedMatches);

        // Auto-publish announcement for batch updates (status or court)
        if (batchOperation) {
          const changedMatchSummaries: string[] = [];

          for (const originalMatch of originalMatches) {
            const updatedMatch = updatedMatches.find(m => m.id === originalMatch.id);
            if (!updatedMatch || !updatedMatch.player1 || !updatedMatch.player2) continue;

            const player1Name = updatedMatch.player1.name || "TBD";
            const player2Name = updatedMatch.player2.name || "TBD";
            const roundLabel = getRoundName(updatedMatch.round);
            const matchInfo = `${roundLabel} M${updatedMatch.match_number}: ${player1Name} vs ${player2Name}`;

            if (batchOperation === "status") {
              const statusLabels: { [key: string]: string } = {
                upcoming: "即將開始",
                live: "進行中",
                completed: "已完成",
                delayed: "延遲",
                bye: "輪空",
                forfeit: "棄權",
                walkover: "不戰而勝",
              };
              const originalStatus = statusLabels[originalMatch.status] || originalMatch.status;
              const newStatus = statusLabels[batchForm.status] || batchForm.status;

              if (originalStatus !== newStatus) {
                const court = updatedMatch.court || "未分配";
                if (batchForm.status === "live" && originalMatch.status !== "live") {
                  changedMatchSummaries.push(`🎾 ${matchInfo}\n比賽現在開始！場地：${court}\n請前往場地觀賽！`);
                } else {
                  changedMatchSummaries.push(`• ${matchInfo}：狀態更新 ${originalStatus} → ${newStatus}`);
                }
              }
            } else if (batchOperation === "court") {
              const courtValue = batchForm.court === "OTHER" ? batchForm.customCourt : batchForm.court;
              const originalCourt = originalMatch.court || "未分配";
              const newCourt = courtValue || "未分配";

              if (originalCourt !== newCourt) {
                changedMatchSummaries.push(`• ${matchInfo}：場地更新 ${originalCourt} → ${newCourt}`);
              }
            }
          }

          if (changedMatchSummaries.length > 0) {
            const batchTitle = batchOperation === "status"
              ? `📢 批次狀態更新 (${changedMatchSummaries.length} 場比賽)`
              : `🏟️ 批次場地更新 (${changedMatchSummaries.length} 場比賽)`;
            const batchContent = changedMatchSummaries.join("\n\n");

            try {
              await supabase.from("announcements").insert({
                event_id: eventId,
                title: batchTitle,
                content: batchContent,
                created_at: new Date().toISOString(),
              });
            } catch (err) {
              console.error("Error publishing batch announcement:", err);
            }
          }
        }
      }

      toast.success(
        locale === "zh"
          ? `成功更新 ${selectedMatches.size} 場比賽並已自動發布公告`
          : `Updated ${selectedMatches.size} matches and published announcement`
      );

      setSelectedMatches(new Set());
      setBatchMode(false);
      setBatchOperation(null);
      setBatchForm({ court: "", status: "", customCourt: "" });
    } catch (error: any) {
      toast.error(`更新失敗: ${error.message}`);
    }
  };

  // Batch export function
  const handleBatchExport = () => {
    if (selectedMatches.size === 0) {
      toast.error("請選擇至少一場比賽");
      return;
    }

    try {
      const selectedMatchesData = filteredMatches.filter(m => selectedMatches.has(m.id));

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Prepare data
      const data: any[][] = [];
      data.push(["比賽匯出資料"]);
      data.push([`匯出時間: ${new Date().toLocaleString('zh-TW')}`]);
      data.push([`共 ${selectedMatchesData.length} 場比賽`]);
      data.push([]);

      // Headers
      data.push([
        "Round",
        "Match #",
        "Player 1",
        "Player 2",
        "Score",
        "Winner",
        "Court",
        "Scheduled Time",
        "Status"
      ]);

      // Match rows
      selectedMatchesData.forEach(match => {
        const matchData = match as any;
        data.push([
          getRoundName(match.round),
          formatMatchNumber(match),
          match.player1?.name || "TBD",
          match.player2?.name || "TBD",
          match.score1 && match.score2 ? `${match.score1}-${match.score2}` : "-",
          (match.winner_id ? players.find(p => p.id === match.winner_id)?.name : null) || "-",
          match.court || "-",
          matchData.scheduled_time ? formatDateTimeDisplay(matchData.scheduled_time) : "-",
          match.status
        ]);
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 15 }, // Round
        { wch: 10 }, // Match #
        { wch: 20 }, // Player 1
        { wch: 20 }, // Player 2
        { wch: 12 }, // Score
        { wch: 20 }, // Winner
        { wch: 15 }, // Court
        { wch: 25 }, // Scheduled Time
        { wch: 12 }  // Status
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Matches");

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Matches_Export_${timestamp}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
      toast.success(`📥 已匯出 ${selectedMatchesData.length} 場比賽`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("匯出失敗，請稍後再試");
    }
  };

  // Calculate dynamic round names based on actual bracket
  const maxRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
  const playoffMatches = matches.filter(match => match.round > 0);
  const maxPlayoffRound = playoffMatches.length > 0 ? Math.max(...playoffMatches.map(match => match.round)) : 0;

  const describeEliminationRound = (round: number, referenceMaxRound: number): string => {
    if (referenceMaxRound === 0) {
      return `Round ${round}`;
    }
    if (round === referenceMaxRound) return "Final";
    if (round === referenceMaxRound - 1) return "Semifinals";
    if (round === referenceMaxRound - 2) return "Quarterfinals";

    const playersInRound = Math.pow(2, referenceMaxRound - round + 1);
    return `Round of ${playersInRound}`;
  };

  const getRoundName = (round: number): string => {
    if (tournamentType === "season_play") {
      if (round === 0) return "Regular Season";
      return describeEliminationRound(round, maxPlayoffRound);
    }
    return describeEliminationRound(round, maxRound);
  };

  // Check if a match is the 3rd place match
  const isThirdPlaceMatch = (match: Match): boolean => {
    if (tournamentType === "season_play") {
      return maxPlayoffRound > 0 && match.round > 0 && match.round === maxPlayoffRound && match.match_number === 2;
    }
    return match.round === maxRound && match.match_number === 2;
  };

  // Format match number with round prefix
  const formatMatchNumber = (match: Match): string => {
    if (isThirdPlaceMatch(match)) {
      return "3rd";
    }
    if (tournamentType === "season_play" && match.round === 0) {
      return `RS-${match.match_number}`;
    }
    return `R${match.round}-${match.match_number}`;
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-visible md:overflow-hidden">
        {/* Mobile Sticky Quick-Filter Bar (< md) */}
        <div className="sticky top-[var(--admin-nav-height,3.5rem)] z-30 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-200 shadow-xs md:hidden">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="search"
                placeholder={registrationType === 'team' ? "搜尋隊伍名稱..." : "搜尋選手名稱..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-9 pr-8 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-ntu-green focus:outline-none"
              />
              <span className="absolute left-3 top-3 text-gray-400 text-sm">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 px-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 focus:bg-white focus:ring-2 focus:ring-ntu-green"
            >
              <option value="all">{t("admin.matchStatus.all")}</option>
              <option value="upcoming">{t("admin.matchStatus.upcoming")}</option>
              <option value="live">🎾 {t("admin.matchStatus.live")}</option>
              <option value="completed">✓ {t("admin.matchStatus.completed")}</option>
              <option value="delayed">⏳ {t("admin.matchStatus.delayed")}</option>
              <option value="forfeit">{t("admin.matchStatus.forfeit")}</option>
              <option value="walkover">{t("admin.matchStatus.walkover")}</option>
            </select>

            <button
              type="button"
              onClick={() => setShowMobileExtraFilters(!showMobileExtraFilters)}
              className={`h-11 px-3 border rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${showMobileExtraFilters || courtFilter !== "all" || dateFilter || roundFilter !== "all"
                ? "bg-ntu-green/10 border-ntu-green text-ntu-green"
                : "bg-gray-50 border-gray-300 text-gray-700"
                }`}
              title="更多篩選"
            >
              <span>篩選</span>
              <span>{showMobileExtraFilters ? "▲" : "▼"}</span>
            </button>
          </div>

          {/* Expandable extra filters on mobile */}
          {showMobileExtraFilters && (
            <div className="grid grid-cols-1 gap-2.5 mt-3 pt-3 border-t border-gray-100">
              <select
                value={courtFilter}
                onChange={(e) => setCourtFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="all">所有場地</option>
                <option value="none">未分配</option>
                {availableCourts.map((court) => (
                  <option key={court} value={court}>{court}</option>
                ))}
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-xs bg-white"
              />

              {tournamentType === "season_play" && (
                <select
                  value={roundFilter}
                  onChange={(e) => setRoundFilter(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-xs bg-white"
                >
                  <option value="all">所有輪次</option>
                  <option value="regular">常規賽</option>
                  <option value="playoffs">季後賽</option>
                  {Array.from(new Set(matches.filter(m => m.round > 0).map(m => m.round))).sort((a, b) => a - b).map((round) => (
                    <option key={round} value={round.toString()}>
                      {describeEliminationRound(round, maxPlayoffRound)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {(searchQuery || statusFilter !== "all" || courtFilter !== "all" || dateFilter || roundFilter !== "all") && (
            <div className="flex items-center justify-between mt-2 pt-1 text-xs text-gray-500">
              <span>顯示 {filteredMatches.length} / {matches.length} 場比賽</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCourtFilter("all");
                  setDateFilter("");
                  setRoundFilter("all");
                }}
                className="text-ntu-green font-semibold hover:underline"
              >
                ✕ 清除所有篩選
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-ntu-green mb-2">Matches & Results</h2>
              <p className="text-sm text-gray-600">
                💡 Click the <span className="font-semibold text-ntu-green">&quot;Edit&quot;</span> button on any match to update scores, winner, and court.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCreateMatch(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                ➕ 創建比賽
              </button>
              <div className="text-sm text-gray-500">
                顯示 {filteredMatches.length} / {matches.length} 場比賽
              </div>
            </div>
          </div>

          {/* Search and Filter Controls (Desktop) */}
          <div id="search-filters" className="hidden md:block scroll-mt-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <input
                  type="text"
                  placeholder={registrationType === 'team' ? "搜尋隊伍名稱..." : "搜尋選手名稱..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
                >
                  <option value="all">{t("admin.matchStatus.all")}</option>
                  <option value="upcoming">{t("admin.matchStatus.upcoming")}</option>
                  <option value="live">{t("admin.matchStatus.live")}</option>
                  <option value="completed">{t("admin.matchStatus.completed")}</option>
                  <option value="delayed">{t("admin.matchStatus.delayed")}</option>
                  <option value="forfeit">{t("admin.matchStatus.forfeit")}</option>
                  <option value="walkover">{t("admin.matchStatus.walkover")}</option>
                </select>
              </div>

              {/* Court Filter */}
              <div>
                <select
                  value={courtFilter}
                  onChange={(e) => setCourtFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
                >
                  <option value="all">所有場地</option>
                  <option value="none">未分配</option>
                  {availableCourts.map((court) => (
                    <option key={court} value={court}>
                      {court}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
                />
              </div>
            </div>
          </div>

          {/* Round Filter (for season play) */}
          {tournamentType === "season_play" && (
            <div className="mt-4">
              <select
                value={roundFilter}
                onChange={(e) => setRoundFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              >
                <option value="all">所有輪次</option>
                <option value="regular">常規賽</option>
                <option value="playoffs">季後賽</option>
                {Array.from(new Set(matches.filter(m => m.round > 0).map(m => m.round))).sort((a, b) => a - b).map((round) => (
                  <option key={round} value={round.toString()}>
                    {describeEliminationRound(round, maxPlayoffRound)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-xl">
            <ScheduleInputTimezoneField
              id="schedule-input-tz-matches"
              value={scheduleInputTz}
              onChange={handleScheduleInputTzChange}
              locale="zh"
            />
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || statusFilter !== "all" || courtFilter !== "all" || dateFilter || roundFilter !== "all") && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCourtFilter("all");
                  setDateFilter("");
                  setRoundFilter("all");
                }}
                className="text-sm text-ntu-green hover:underline"
              >
                ✕ 清除所有篩選
              </button>
            </div>
          )}

          {/* Batch Operations */}
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBatchMode(!batchMode);
                if (batchMode) {
                  setSelectedMatches(new Set());
                  setBatchOperation(null);
                  setBatchForm({ court: "", status: "", customCourt: "" });
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${batchMode
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
            >
              {batchMode ? "✕ 取消批量操作" : "📋 批量操作"}
            </button>

            {batchMode && selectedMatches.size > 0 && (
              <span className="text-sm text-gray-600">
                已選擇 {selectedMatches.size} 場比賽
              </span>
            )}
          </div>

          {/* Batch Operation Controls */}
          {batchMode && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作類型</label>
                  <select
                    value={batchOperation || ""}
                    onChange={(e) => setBatchOperation(e.target.value as "score" | "court" | "status" | null)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">選擇操作...</option>
                    <option value="court">批量分配場地</option>
                    <option value="status">批量更新狀態</option>
                  </select>
                </div>

                {batchOperation === "court" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">場地</label>
                    <select
                      value={batchForm.court}
                      onChange={(e) => setBatchForm({ ...batchForm, court: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">選擇場地...</option>
                      {courts.map((court) => (
                        <option key={court.id} value={court.name}>{court.name}</option>
                      ))}
                      <option value="OTHER">其他（手動輸入）</option>
                    </select>
                    {batchForm.court === "OTHER" && (
                      <input
                        type="text"
                        placeholder="輸入場地名稱"
                        value={batchForm.customCourt}
                        onChange={(e) => setBatchForm({ ...batchForm, customCourt: e.target.value })}
                        className="mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                      />
                    )}
                  </div>
                )}

                {batchOperation === "status" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                    <select
                      value={batchForm.status}
                      onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">選擇狀態...</option>
                      <option value="upcoming">{t("admin.matchStatus.upcoming")}</option>
                      <option value="live">{t("admin.matchStatus.live")}</option>
                      <option value="completed">{t("admin.matchStatus.completed")}</option>
                      <option value="delayed">{t("admin.matchStatus.delayed")}</option>
                      <option value="forfeit">{t("admin.matchStatus.forfeit")}</option>
                      <option value="walkover">{t("admin.matchStatus.walkover")}</option>
                    </select>
                  </div>
                )}

                {batchOperation && (
                  <button
                    onClick={handleBatchUpdate}
                    disabled={selectedMatches.size === 0}
                    className="px-4 py-2 bg-ntu-green text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    執行批量更新 ({selectedMatches.size})
                  </button>
                )}

                {batchMode && selectedMatches.size > 0 && (
                  <button
                    onClick={handleBatchExport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <span>📥</span>
                    <span>匯出選中比賽 ({selectedMatches.size})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div id="matches-table" className="hidden md:block scroll-mt-24">
          <div>
            <table className="w-full table-fixed" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {batchMode && (
                    <th className="px-2 py-3 text-center" style={{ width: '4%', minWidth: '50px' }}>
                      <input
                        type="checkbox"
                        checked={selectedMatches.size === filteredMatches.length && filteredMatches.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-ntu-green focus:ring-ntu-green cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: batchMode ? '11%' : '12%' }}>Round</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '8%' }}>Match #</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '10%' }}>Player 1</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '10%' }}>Score</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '10%' }}>Player 2</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '9%' }}>Winner</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '15%', minWidth: '120px' }}>Schedule</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '8%' }}>Court</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '8%' }}>Status</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase" style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMatches.length === 0 ? (
                  <tr>
                    <td colSpan={batchMode ? 11 : 10} className="px-3 py-12 text-center text-gray-500">
                      {matches.length === 0
                        ? "No matches created yet."
                        : "No matches match your filters. Try adjusting your search criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map((match) => {
                    const hasStats = hasIndividualStats.get(match.id) || false;
                    return (
                      <tr
                        key={match.id}
                        id={`match-row-${match.id}`}
                        className={`scroll-mt-28 hover:bg-gray-50 ${selectedMatches.has(match.id) ? 'bg-blue-50' : ''} ${hasStats ? 'bg-green-50 border-l-4 border-green-500' : ''
                          }`}
                      >
                        {batchMode && (
                          <td className="px-2 py-4 text-center" style={{ width: '4%', minWidth: '50px' }}>
                            <input
                              type="checkbox"
                              checked={selectedMatches.has(match.id)}
                              onChange={() => toggleMatchSelection(match.id)}
                              className="rounded border-gray-300 text-ntu-green focus:ring-ntu-green cursor-pointer"
                            />
                          </td>
                        )}
                        {editingMatch === match.id ? (
                          // Edit mode
                          <>
                            <td className="px-3 py-4 text-sm" style={{ minWidth: '100px' }}>
                              {isThirdPlaceMatch(match) ? (
                                <span className="text-amber-600 font-semibold">🥉 3rd Place</span>
                              ) : (
                                <span className="whitespace-nowrap">{getRoundName(match.round)}</span>
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-mono">
                              {formatMatchNumber(match)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm">{match.player1?.name || "TBD"}</td>
                            <td className="px-3 py-4 whitespace-nowrap overflow-hidden">
                              <div className="flex gap-0.5 items-center min-w-0 w-full">
                                <input
                                  type="number"
                                  min={0}
                                  value={editForm.score1}
                                  onChange={(e) => setEditForm({ ...editForm, score1: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); handleSave(match.id); }
                                    if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                                  }}
                                  className="w-[3.25rem] px-1 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="0"
                                />
                                <span className="py-1">-</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={editForm.score2}
                                  onChange={(e) => setEditForm({ ...editForm, score2: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); handleSave(match.id); }
                                    if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                                  }}
                                  className="w-[3.25rem] px-1 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="0"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm">{match.player2?.name || "TBD"}</td>
                            <td className="px-3 py-4">
                              <span className="block text-xs text-gray-500 mb-1">{t("admin.winnerRequired") || "Winner (required)"}</span>
                              <select
                                value={editForm.winner_id || ""}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); handleSave(match.id); }
                                  if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev: typeof editForm) => ({
                                    ...prev,
                                    winner_id: val,
                                    // Auto-set status to completed when picking a winner so user doesn't have to
                                    ...(val && val !== DRAW_WINNER_ID ? { status: "completed" as const } : {}),
                                  }));
                                }}
                                className="w-full max-w-[120px] px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">No winner</option>
                                <option value={DRAW_WINNER_ID}>Draw</option>
                                {match.player1_id && <option value={match.player1_id}>{match.player1?.name}</option>}
                                {match.player2_id && <option value={match.player2_id}>{match.player2?.name}</option>}
                              </select>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex flex-col gap-2 min-w-0">
                                <input
                                  type="datetime-local"
                                  value={editForm.scheduled_time || ""}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); handleSave(match.id); }
                                    if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                                  }}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      scheduled_time: e.target.value,
                                      slot_id: "",
                                    })
                                  }
                                  className="w-full max-w-[180px] px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                {slots.length > 0 && (
                                  <select
                                    value={editForm.slot_id || ""}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") { e.preventDefault(); handleSave(match.id); }
                                      if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                                    }}
                                    onChange={(e) => {
                                      const newSlotId = e.target.value;
                                      if (!newSlotId) {
                                        setEditForm({
                                          ...editForm,
                                          slot_id: "",
                                        });
                                        return;
                                      }
                                      const slot = slotMap.get(newSlotId) || null;
                                      setEditForm({
                                        ...editForm,
                                        slot_id: newSlotId,
                                        scheduled_time: utcIsoToDatetimeLocalValue(deriveIsoFromSlot(slot), scheduleInputTz),
                                      });
                                    }}
                                    className="w-full max-w-[180px] px-2 py-1 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="">選擇時段代號</option>
                                    {slots.map((slot) => (
                                      <option key={slot.id} value={slot.id}>
                                        {formatSlotLabel(slot)}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex flex-col gap-2 min-w-0">
                                <select
                                  value={
                                    editForm.court && courts.find((c: any) => c.name === editForm.court)
                                      ? courts.find((c: any) => c.name === editForm.court)!.id
                                      : editForm.court === "" ? "" : "OTHER"
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); handleSave(match.id); }
                                    if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "") {
                                      setEditForm({ ...editForm, court: "" });
                                    } else if (val === "OTHER") {
                                      // leave court as-is for manual input
                                      if (!editForm.court) setEditForm({ ...editForm, court: "" });
                                    } else {
                                      const selected = courts.find((c: any) => c.id === val);
                                      setEditForm({ ...editForm, court: selected?.name || "" });
                                    }
                                  }}
                                  className="w-full max-w-[150px] px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="">選擇場地</option>
                                  {courts.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                  <option value="OTHER">其他（手動輸入）</option>
                                </select>
                                <input
                                  type="text"
                                  value={editForm.court}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); handleSave(match.id); }
                                    if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                                  }}
                                  onChange={(e) => setEditForm({ ...editForm, court: e.target.value })}
                                  className="w-full max-w-[150px] px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Court"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <select
                                value={editForm.status}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); handleSave(match.id); }
                                  if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
                                }}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full max-w-[120px] px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="upcoming">{t("admin.matchStatus.upcoming")}</option>
                                <option value="live">{t("admin.matchStatus.live")}</option>
                                <option value="delayed">{t("admin.matchStatus.delayed")}</option>
                                <option value="forfeit">{t("admin.matchStatus.forfeit")}</option>
                                <option value="walkover">{t("admin.matchStatus.walkover")}</option>
                                <option value="completed">{t("admin.matchStatus.completed")}</option>
                                <option value="bye" disabled>
                                  {t("admin.matchStatus.bye")} (auto)
                                </option>
                              </select>
                            </td>
                            <td className="px-3 py-4 text-right text-sm font-medium">
                              <div className="flex flex-col gap-2 items-end">
                                <button
                                  onClick={() => handleSave(match.id)}
                                  className="bg-ntu-green text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-semibold text-xs whitespace-nowrap"
                                >
                                  ✓ Save
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-xs whitespace-nowrap"
                                >
                                  ✕ Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // View mode
                          <>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                              {isThirdPlaceMatch(match) ? (
                                <span className="text-amber-600 font-semibold">🥉 3rd Place</span>
                              ) : (
                                getRoundName(match.round)
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-mono">
                              {formatMatchNumber(match)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              {match.player1?.seed && (
                                <span className="text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded mr-2">
                                  {match.player1.seed}
                                </span>
                              )}
                              <span className="text-sm">{match.player1?.name || "TBD"}</span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                              {match.score1 && match.score2 ? `${match.score1} - ${match.score2}` : "—"}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              {match.player2?.seed && (
                                <span className="text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded mr-2">
                                  {match.player2.seed}
                                </span>
                              )}
                              <span className="text-sm">{match.player2?.name || "TBD"}</span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm">
                              {isDrawMatch(match.winner_id, match.status, match.score1, match.score2) ? (
                                <span className="text-gray-600 font-semibold">Draw</span>
                              ) : (match.winner_id ? players.find(p => p.id === match.winner_id)?.name : null) || "—"}
                            </td>
                            <td className="px-3 py-4 text-sm min-w-[120px]">
                              {match.slot ? (
                                (() => {
                                  // 如果有 slot，但 formatSlotScheduleRange 返回 undefined，則使用 scheduled_time
                                  const slotRange = formatSlotScheduleRange(match.slot);

                                  // 如果 slotRange 是 undefined 或包含 "undefined"，使用 scheduled_time 來顯示
                                  if ((!slotRange || slotRange.includes('undefined')) && match.scheduled_time) {
                                    const formatted = formatScheduledTimeAsStored(match.scheduled_time);
                                    if (formatted !== "—") {
                                      const parts = formatted.split(" ");
                                      return (
                                        <div className="flex flex-col">
                                          {match.slot.code && (
                                            <span className="text-sm font-semibold text-ntu-green">
                                              {match.slot.code}
                                            </span>
                                          )}
                                          <span className="text-sm text-gray-700 whitespace-nowrap">{parts[0] ?? formatted}</span>
                                          {parts[1] && <span className="text-xs text-gray-500 whitespace-nowrap">{parts[1]}</span>}
                                        </div>
                                      );
                                    }
                                  }

                                  return (
                                    <div className="flex flex-col">
                                      {match.slot.code && (
                                        <span className="text-sm font-semibold text-ntu-green">
                                          {match.slot.code}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500">
                                        {slotRange || '—'}
                                      </span>
                                    </div>
                                  );
                                })()
                              ) : match.scheduled_time ? (
                                (() => {
                                  const formatted = formatScheduledTimeAsStored(match.scheduled_time);
                                  if (formatted === "—") return <span className="text-sm text-gray-400">未排定</span>;
                                  const parts = formatted.split(" ");
                                  const dateStr = parts[0] ?? formatted;
                                  const timeStr = parts[1] ?? "";
                                  return (
                                    <div className="flex flex-col">
                                      <span className="text-sm text-gray-700 whitespace-nowrap">{dateStr}</span>
                                      {timeStr && <span className="text-xs text-gray-500 whitespace-nowrap">{timeStr}</span>}
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="text-sm text-gray-400">未排定</span>
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm">
                              {getCourtDisplay(match)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${match.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : match.status === 'live'
                                    ? 'bg-red-100 text-red-800'
                                    : match.status === 'delayed'
                                      ? 'bg-amber-100 text-amber-800'
                                      : match.status === 'forfeit'
                                        ? 'bg-orange-100 text-orange-800'
                                        : match.status === 'walkover'
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-gray-100 text-gray-800'
                                  }`}
                              >
                                {getStatusLabel(match.status)}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex gap-1 justify-end">
                                <a
                                  href={`/admin/${eventId}/matches/${match.id}`}
                                  className={`${hasStats ? 'bg-green-500' : 'bg-blue-500'
                                    } text-white px-2 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-semibold text-xs`}
                                  title={hasStats ? "已輸入個別資料" : "查看詳情"}
                                >
                                  📊
                                </a>
                                <button
                                  onClick={() => handleEdit(match)}
                                  className="bg-ntu-green text-white px-2 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-semibold text-xs"
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredMatches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {matches.length === 0
                ? "No matches created yet."
                : "No matches match your filters. Try adjusting your search criteria."}
            </div>
          ) : (
            filteredMatches.map((match) => {
              const hasStats = hasIndividualStats.get(match.id) || false;
              return (
                <div
                  key={match.id}
                  id={`match-card-${match.id}`}
                  className={`scroll-mt-28 bg-white border rounded-lg p-4 ${selectedMatches.has(match.id) ? 'border-blue-500 bg-blue-50' :
                    hasStats ? 'border-green-500 bg-green-50 border-l-4' :
                      'border-gray-200'
                    }`}
                >
                  {batchMode && (
                    <label className="flex items-center gap-2 mb-3 cursor-pointer select-none p-1">
                      <input
                        type="checkbox"
                        checked={selectedMatches.has(match.id)}
                        onChange={() => toggleMatchSelection(match.id)}
                        className="w-5 h-5 rounded border-gray-300 text-ntu-green focus:ring-ntu-green cursor-pointer"
                      />
                      <span className="text-xs text-gray-600 font-medium">選取此比賽</span>
                    </label>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {isThirdPlaceMatch(match) ? (
                            <span className="text-amber-600">🥉 3rd Place</span>
                          ) : (
                            getRoundName(match.round)
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{formatMatchNumber(match)}</div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${match.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : match.status === 'live'
                            ? 'bg-red-100 text-red-800'
                            : match.status === 'delayed'
                              ? 'bg-amber-100 text-amber-800'
                              : match.status === 'forfeit'
                                ? 'bg-orange-100 text-orange-800'
                                : match.status === 'walkover'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {getStatusLabel(match.status)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-y border-gray-100">
                      <div className="flex-1 text-center">
                        <div className="text-sm font-semibold">{match.player1?.name || "TBD"}</div>
                        {match.player1?.seed && (
                          <div className="text-xs text-ntu-green">Seed {match.player1.seed}</div>
                        )}
                      </div>
                      <div className="px-3 text-gray-400">vs</div>
                      <div className="flex-1 text-center">
                        <div className="text-sm font-semibold">{match.player2?.name || "TBD"}</div>
                        {match.player2?.seed && (
                          <div className="text-xs text-ntu-green">Seed {match.player2.seed}</div>
                        )}
                      </div>
                    </div>

                    {match.score1 && match.score2 && (
                      <div className="text-center text-lg font-bold text-ntu-green">
                        {match.score1} - {match.score2}
                      </div>
                    )}

                    {(match.winner_id || isDrawMatch(match.winner_id, match.status, match.score1, match.score2)) && (() => {
                      if (isDrawMatch(match.winner_id, match.status, match.score1, match.score2)) {
                        return (
                          <div className="text-center text-sm">
                            <span className="text-gray-600 font-semibold">Draw</span>
                          </div>
                        );
                      }
                      const winner = players.find(p => p.id === match.winner_id);
                      return winner ? (
                        <div className="text-center text-sm">
                          <span className="text-gray-600">Winner: </span>
                          <span className="font-semibold text-ntu-green">{winner.name}</span>
                        </div>
                      ) : null;
                    })()}

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                      <div>
                        <span className="font-medium">Court:</span> {getCourtDisplay(match)}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span>{" "}
                        {(() => {
                          const slotCandidate = match.slot || (match.slot_id ? slotMap.get(match.slot_id) : null);
                          if (slotCandidate) {
                            return (
                              <span className="text-gray-700">
                                {formatSlotScheduleRange(slotCandidate)}
                              </span>
                            );
                          }
                          const scheduledTime = match.scheduled_time;
                          if (scheduledTime === null ||
                            scheduledTime === undefined ||
                            scheduledTime === '' ||
                            (typeof scheduledTime === 'string' && (
                              scheduledTime.toLowerCase() === 'undefined' ||
                              scheduledTime.toLowerCase() === 'null' ||
                              scheduledTime.trim() === ''
                            ))) {
                            return "—";
                          }
                          try {
                            return (
                              <span className="text-gray-700">
                                {formatDateTimeDisplay(scheduledTime)}
                              </span>
                            );
                          } catch (e) {
                            console.error('[Date Error] Match', match.id, 'Date formatting error:', e, 'scheduled_time:', scheduledTime);
                            return "—";
                          }
                        })()}
                      </div>
                    </div>

                    {editingMatch !== match.id && (
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/admin/${eventId}/matches/${match.id}`}
                          className={`flex-1 min-h-[44px] flex items-center justify-center ${hasStats ? 'bg-green-500' : 'bg-blue-500'
                            } text-white px-4 py-2.5 rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all text-center text-sm`}
                        >
                          📊 詳情
                        </Link>
                        <button
                          onClick={() => handleEdit(match)}
                          className="flex-1 min-h-[44px] flex items-center justify-center bg-ntu-green text-white px-4 py-2.5 rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all text-sm"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    )}

                    {editingMatch === match.id && (
                      <div className="mt-3 space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        {/* 1. Score Steppers */}
                        <div>
                          <span className="block text-xs font-semibold text-gray-700 mb-2">比分輸入 (Scores)</span>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Player 1 Stepper */}
                            <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-center shadow-xs">
                              <div className="text-xs font-semibold text-gray-700 truncate mb-1.5" title={match.player1?.name || "Player 1"}>
                                {match.player1?.name || "Player 1"}
                              </div>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
                                    setEditForm((f: any) => ({
                                      ...f,
                                      score1: String(Math.max(0, (parseInt(String(f.score1 ?? "0"), 10) || 0) - 1)),
                                    }));
                                  }}
                                  className="w-11 h-11 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg text-xl font-bold text-gray-700 select-none"
                                  aria-label="Decrease score 1"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={editForm.score1 ?? ""}
                                  onChange={(e) => setEditForm({ ...editForm, score1: e.target.value })}
                                  className="w-14 h-11 text-center font-bold text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green"
                                  placeholder="0"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
                                    setEditForm((f: any) => ({
                                      ...f,
                                      score1: String((parseInt(String(f.score1 ?? "0"), 10) || 0) + 1),
                                    }));
                                  }}
                                  className="w-11 h-11 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg text-xl font-bold text-gray-700 select-none"
                                  aria-label="Increase score 1"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Player 2 Stepper */}
                            <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-center shadow-xs">
                              <div className="text-xs font-semibold text-gray-700 truncate mb-1.5" title={match.player2?.name || "Player 2"}>
                                {match.player2?.name || "Player 2"}
                              </div>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
                                    setEditForm((f: any) => ({
                                      ...f,
                                      score2: String(Math.max(0, (parseInt(String(f.score2 ?? "0"), 10) || 0) - 1)),
                                    }));
                                  }}
                                  className="w-11 h-11 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg text-xl font-bold text-gray-700 select-none"
                                  aria-label="Decrease score 2"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={editForm.score2 ?? ""}
                                  onChange={(e) => setEditForm({ ...editForm, score2: e.target.value })}
                                  className="w-14 h-11 text-center font-bold text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green"
                                  placeholder="0"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
                                    setEditForm((f: any) => ({
                                      ...f,
                                      score2: String((parseInt(String(f.score2 ?? "0"), 10) || 0) + 1),
                                    }));
                                  }}
                                  className="w-11 h-11 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg text-xl font-bold text-gray-700 select-none"
                                  aria-label="Increase score 2"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. One-Tap Winner Selection Chips */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold text-gray-700">{t("admin.winnerRequired") || "獲勝者 (Winner)"}</span>
                            {editForm.winner_id && (
                              <button
                                type="button"
                                onClick={() => setEditForm((f: any) => ({ ...f, winner_id: "" }))}
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                清除獲勝者
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(25);
                                setEditForm((f: any) => ({
                                  ...f,
                                  winner_id: f.winner_id === match.player1_id ? "" : (match.player1_id || ""),
                                  status: f.winner_id === match.player1_id ? f.status : "completed",
                                }));
                              }}
                              className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold truncate border transition-all active:scale-95 ${editForm.winner_id === match.player1_id
                                ? "bg-ntu-green text-white border-ntu-green shadow-xs"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                              {match.player1?.name || "Player 1"} 勝
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(25);
                                setEditForm((f: any) => ({
                                  ...f,
                                  winner_id: f.winner_id === DRAW_WINNER_ID ? "" : DRAW_WINNER_ID,
                                  status: f.winner_id === DRAW_WINNER_ID ? f.status : "completed",
                                }));
                              }}
                              className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${editForm.winner_id === DRAW_WINNER_ID
                                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                              平局 (Draw)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(25);
                                setEditForm((f: any) => ({
                                  ...f,
                                  winner_id: f.winner_id === match.player2_id ? "" : (match.player2_id || ""),
                                  status: f.winner_id === match.player2_id ? f.status : "completed",
                                }));
                              }}
                              className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold truncate border transition-all active:scale-95 ${editForm.winner_id === match.player2_id
                                ? "bg-ntu-green text-white border-ntu-green shadow-xs"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                              {match.player2?.name || "Player 2"} 勝
                            </button>
                          </div>
                        </div>

                        {/* 3. Status Dropdown */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">賽事狀態 (Status)</label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full min-h-[44px] px-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-ntu-green font-medium"
                          >
                            <option value="upcoming">{t("admin.matchStatus.upcoming")}</option>
                            <option value="live">🎾 {t("admin.matchStatus.live")}</option>
                            <option value="completed">✓ {t("admin.matchStatus.completed")}</option>
                            <option value="delayed">⏳ {t("admin.matchStatus.delayed")}</option>
                            <option value="forfeit">{t("admin.matchStatus.forfeit")}</option>
                            <option value="walkover">{t("admin.matchStatus.walkover")}</option>
                          </select>
                        </div>

                        {/* 4. Smart Court Assignment with Text Input & Quick Chips (Match Day Friendly) */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-xs font-semibold text-gray-700">{t('admin.matchesTable.court')}</label>
                            {editForm.court && (
                              <button
                                type="button"
                                onClick={() => setEditForm((f: any) => ({ ...f, court: "" }))}
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                {t('admin.matchesTable.clearCourt')}
                              </button>
                            )}
                          </div>

                          {/* Direct Court Text Input */}
                          <div className="relative">
                            <input
                              type="text"
                              value={editForm.court || ""}
                              onChange={(e) => setEditForm({ ...editForm, court: e.target.value })}
                              placeholder={t('admin.matchesTable.courtPlaceholder')}
                              className="w-full min-h-[44px] pl-3 pr-8 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-ntu-green focus:outline-none"
                            />
                            {editForm.court && (
                              <button
                                type="button"
                                onClick={() => setEditForm((f: any) => ({ ...f, court: "" }))}
                                className="absolute right-2.5 top-2.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* 1-Tap Quick Court Chips (dynamically learned from event courts and assigned matches) */}
                          {quickCourtChips.length > 0 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto mt-2 pb-1 scrollbar-hide">
                              {quickCourtChips.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => {
                                    if (typeof window !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
                                    setEditForm((f: any) => ({ ...f, court: f.court === c ? "" : c }));
                                  }}
                                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all active:scale-95 ${editForm.court === c
                                    ? "bg-ntu-green text-white border-ntu-green shadow-xs"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 4. Large Save and Cancel Action Buttons with Haptic Feedback */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== "undefined" && "vibrate" in navigator) {
                                navigator.vibrate(40);
                              }
                              handleSave(match.id);
                            }}
                            className="min-h-[48px] bg-ntu-green text-white rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-xs text-base hover:opacity-90 transition-all"
                          >
                            <span>✓</span>
                            <span>{t("admin.save") || "儲存"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="min-h-[48px] bg-gray-200 text-gray-700 rounded-xl font-semibold flex items-center justify-center active:scale-95 hover:bg-gray-300 text-base transition-all"
                          >
                            {t("admin.cancel") || "取消"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Match Modal */}
      {showCreateMatch && (
        <CreateMatchModal
          eventId={eventId}
          players={players}
          onMatchCreated={() => {
            router.refresh();
          }}
          onClose={() => setShowCreateMatch(false)}
          divisions={divisions}
          defaultDivisionId={defaultDivisionId}
          scheduleInputTimeZone={scheduleInputTz}
          onScheduleInputTimezoneChange={handleScheduleInputTzChange}
        />
      )}

      {/* 10-Second Quick Re-Edit Floating Bar */}
      {recentlySavedMatch && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-50 animate-bounce-once">
          <div className="bg-gray-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-gray-700/60 flex items-center justify-between gap-3 min-w-[320px] max-w-lg mx-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-emerald-400 text-base shrink-0">
                {recentlySavedMatch.announcementId ? "📢" : "✓"}
              </span>
              <div className="min-w-0 text-xs">
                <div className="font-semibold text-white truncate">
                  {recentlySavedMatch.announcementId
                    ? (t("admin.matchesTable.savedAndAnnounced") || "已儲存並發布公告")
                    : (t("admin.matchesTable.savedOnly") || "已儲存")}: {recentlySavedMatch.p1} vs {recentlySavedMatch.p2}
                  {recentlySavedMatch.score ? ` (${recentlySavedMatch.score})` : ""}
                </div>
                <div className="text-gray-400 text-[10px]">
                  {getRoundName(recentlySavedMatch.round)} M{recentlySavedMatch.matchNumber} · {t("admin.matchesTable.tenSecondsHint") || "10秒內可收回公告並重新編輯"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleReEditRecent}
                className="bg-ntu-green hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1 whitespace-nowrap"
              >
                <span>✏️</span>
                <span>
                  {recentlySavedMatch.announcementId
                    ? (t("admin.matchesTable.reEditWithRetract") || "再次修改（含收回公告）")
                    : (t("admin.matchesTable.reEdit") || "再次修改")}
                </span>
              </button>
              <button
                type="button"
                onClick={handleDismissRecent}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-full text-xs"
                title={t("admin.matchesTable.closeBar") || "關閉"}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

