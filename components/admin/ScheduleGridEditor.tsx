"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { blackoutForSlot, slotToScheduledTime } from "@/lib/scheduling/autoSchedule";

export interface SlotWithCourt {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  code?: string | null;
  court_id?: string | null;
  court?: { name?: string } | null;
}

export interface MatchForGrid {
  id: string;
  player1_id?: string | null;
  player2_id?: string | null;
  slot_id?: string | null;
  scheduled_time?: string | null;
  status?: string;
  round: number;
  match_number: number;
  player1?: { name?: string } | null;
  player2?: { name?: string } | null;
}

export interface BlackoutTemplateForGrid {
  player_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ScheduleGridEditorProps {
  eventId: string;
  slots: SlotWithCourt[];
  matches: MatchForGrid[];
  blackoutTemplates: BlackoutTemplateForGrid[];
  onScheduleChange?: () => void;
}

type TimeBlockKey = string;

interface ColSpec {
  courtId: string | null;
  courtName: string;
}

function buildGrid(slots: SlotWithCourt[]): {
  rowKeys: TimeBlockKey[];
  rows: Map<TimeBlockKey, SlotWithCourt[]>;
  columns: ColSpec[];
  slotByRowCol: Map<string, SlotWithCourt>;
} {
  const blockToSlots = new Map<string, SlotWithCourt[]>();
  for (const slot of slots) {
    const key = `${slot.slot_date}#${slot.start_time}#${slot.end_time}`;
    if (!blockToSlots.has(key)) blockToSlots.set(key, []);
    blockToSlots.get(key)!.push(slot);
  }
  const rowKeys = Array.from(blockToSlots.keys()).sort();

  const courtSet = new Map<string, ColSpec>();
  slots.forEach((slot) => {
    const id = slot.court_id ?? "";
    const name = slot.court?.name?.trim() || "未指定";
    if (!courtSet.has(id)) courtSet.set(id, { courtId: slot.court_id ?? null, courtName: name });
  });
  const columns = Array.from(courtSet.values()).sort((a, b) =>
    a.courtName === "未指定" ? 1 : b.courtName === "未指定" ? -1 : a.courtName.localeCompare(b.courtName)
  );
  if (!columns.some((c) => c.courtName === "未指定")) {
    columns.push({ courtId: null, courtName: "未指定" });
  }

  blockToSlots.forEach((list) => {
    list.sort((a, b) => {
      const na = a.court?.name?.trim() || "\uFFFF";
      const nb = b.court?.name?.trim() || "\uFFFF";
      return na.localeCompare(nb) || a.id.localeCompare(b.id);
    });
  });

  const slotByRowCol = new Map<string, SlotWithCourt>();
  blockToSlots.forEach((list, rowKey) => {
    list.forEach((slot) => {
      const colKey = slot.court_id ?? "__none__";
      slotByRowCol.set(`${rowKey}#${colKey}`, slot);
    });
  });

  return { rowKeys, rows: blockToSlots, columns, slotByRowCol };
}

function formatRowLabel(rowKey: TimeBlockKey): string {
  const [date, start, end] = rowKey.split("#");
  const startShort = start?.slice(0, 5) || "";
  const endShort = end?.slice(0, 5) || "";
  return `${date} ${startShort}–${endShort}`;
}

export default function ScheduleGridEditor({
  eventId,
  slots,
  matches,
  blackoutTemplates,
  onScheduleChange,
}: ScheduleGridEditorProps) {
  const supabase = createClient();

  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    matches.forEach((match) => {
      if (match.slot_id) m[match.slot_id] = match.id;
    });
    return m;
  });
  const [draggingMatchId, setDraggingMatchId] = useState<string | null>(null);
  const [dropTargetCell, setDropTargetCell] = useState<string | null>(null);
  const [dropTargetUnassign, setDropTargetUnassign] = useState(false);
  const [saving, setSaving] = useState(false);

  const { rowKeys, rows, columns, slotByRowCol } = useMemo(() => buildGrid(slots), [slots]);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slotById = useMemo(() => {
    const m = new Map<string, SlotWithCourt>();
    slots.forEach((s) => m.set(s.id, s));
    return m;
  }, [slots]);

  const matchById = useMemo(() => {
    const m = new Map<string, MatchForGrid>();
    matches.forEach((match) => m.set(match.id, match));
    return m;
  }, [matches]);

  const assignmentsBySlot = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(assignments).forEach(([slotId, matchId]) => {
      m[slotId] = matchId;
    });
    return m;
  }, [assignments]);

  // Show in unscheduled: not in grid, OR delayed (so delayed can be re-scheduled even if they have slot/time)
  const unassignedMatches = useMemo(() => {
    const assigned = new Set(Object.values(assignments));
    return matches
      .filter((m) => m.player1_id || m.player2_id)
      .filter((m) => !assigned.has(m.id) || m.status === "delayed");
  }, [matches, assignments]);

  const checkConflict = useCallback(
    (slot: SlotWithCourt, player1Id: string | null, player2Id: string | null): boolean => {
      const blackout = blackoutForSlot(
        { slot_date: slot.slot_date, start_time: slot.start_time, end_time: slot.end_time },
        blackoutTemplates
      );
      if (player1Id && blackout.has(player1Id)) return true;
      if (player2Id && blackout.has(player2Id)) return true;
      return false;
    },
    [blackoutTemplates]
  );

  useEffect(() => {
    if (!draggingMatchId) {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      return;
    }
    const STEP = 12;
    const ZONE = 80;
    const onMove = (e: MouseEvent) => {
      const el = gridScrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const y = e.clientY;
      const atTop = y < rect.top + ZONE;
      const atBottom = y > rect.bottom - ZONE;
      if (!atTop && !atBottom) {
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
        return;
      }
      if (scrollIntervalRef.current) return;
      scrollIntervalRef.current = setInterval(() => {
        if (!gridScrollRef.current) return;
        gridScrollRef.current.scrollTop += atTop ? -STEP : STEP;
      }, 16);
    };
    const onUp = () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("dragend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("dragend", onUp);
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [draggingMatchId]);

  const handleDragStart = (e: React.DragEvent, matchId: string) => {
    setDraggingMatchId(matchId);
    e.dataTransfer.setData("matchId", matchId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingMatchId(null);
    setDropTargetCell(null);
    setDropTargetUnassign(false);
  };

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetCell(slotId);
  };

  const handleDragLeave = () => {
    setDropTargetCell(null);
  };

  const handleDrop = (e: React.DragEvent, slot: SlotWithCourt) => {
    e.preventDefault();
    setDropTargetCell(null);
    setDraggingMatchId(null);
    const matchId = e.dataTransfer.getData("matchId");
    if (!matchId) return;
    const match = matchById.get(matchId);
    if (!match) return;

    const conflict = checkConflict(slot, match.player1_id ?? null, match.player2_id ?? null);
    if (conflict) {
      toast("此時段為其中一隊的不可出賽時段，仍已放入；請確認是否保留。", { icon: "⚠️" });
    }

    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sid) => {
        if (next[sid] === matchId) delete next[sid];
      });
      next[slot.id] = matchId;
      return next;
    });
  };

  const handleRemoveFromSlot = (slotId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleDropUnassign = (e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetUnassign(false);
    setDraggingMatchId(null);
    const matchId = e.dataTransfer.getData("matchId");
    if (!matchId) return;
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sid) => {
        if (next[sid] === matchId) delete next[sid];
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const assignedMatchIds = new Set<string>(Object.values(assignments));
      for (const slot of slots) {
        const matchId = assignments[slot.id];
        if (matchId) {
          const scheduledTime = slotToScheduledTime(slot);
          await supabase
            .from("matches")
            .update({
              slot_id: slot.id,
              scheduled_time: scheduledTime,
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchId);
        }
      }
      for (const match of matches) {
        if (!(match.player1_id || match.player2_id)) continue;
        if (assignedMatchIds.has(match.id)) continue;
        // Clear slot only; leave scheduled_time so manually-entered times are not wiped
        await supabase
          .from("matches")
          .update({
            slot_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", match.id);
      }
      toast.success("已儲存排程");
      onScheduleChange?.();
    } catch (e: any) {
      toast.error(e?.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p>尚無可用時段，請先至排程頁建立「所有可用時段」後再使用此編輯器。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          將左側未排程的比賽拖曳到下方格子的時段中。若放入的時段為某隊的不可出賽，格子會顯示警示（橘框）。
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "儲存中…" : "儲存排程"}
        </button>
      </div>

      <div className="flex gap-6 flex-wrap">
        <div className="w-64 shrink-0">
          <h3 className="font-semibold text-gray-700 mb-2">未排程 ({unassignedMatches.length})</h3>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDropTargetUnassign(true);
            }}
            onDragLeave={() => setDropTargetUnassign(false)}
            onDrop={handleDropUnassign}
            className={`min-h-[120px] rounded-xl border-2 border-dashed p-3 transition-colors ${
              dropTargetUnassign ? "border-ntu-green bg-ntu-green/10" : "border-gray-300 bg-gray-50"
            }`}
          >
            <p className="text-xs text-gray-500 mb-2">拖曳比賽到此處可取消排程</p>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {unassignedMatches.map((match) => (
                <li
                  key={match.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, match.id)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-grab rounded-lg border-2 border-gray-200 bg-white p-2 text-sm shadow-sm active:cursor-grabbing ${draggingMatchId === match.id ? "opacity-50" : ""}`}
                >
                  <span className="font-medium text-gray-800">
                    {match.player1?.name ?? "—"} vs {match.player2?.name ?? "—"}
                  </span>
                  <span className="ml-1 text-gray-500">R{match.round}-{match.match_number}</span>
                  {match.status === "delayed" && (
                    <span className="ml-1 text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">延遲</span>
                  )}
                  {match.scheduled_time && !match.slot_id && match.status !== "delayed" && (
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {new Date(match.scheduled_time).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          ref={gridScrollRef}
          className="flex-1 min-w-0 overflow-auto max-h-[70vh] border border-gray-200 rounded-lg"
        >
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 w-40">
                  時段
                </th>
                {columns.map((col) => (
                  <th key={col.courtId ?? "none"} className="border border-gray-300 px-2 py-2 font-semibold text-gray-700 min-w-[140px]">
                    {col.courtName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowKeys.map((rowKey) => (
                <tr key={rowKey}>
                  <td className="border border-gray-300 bg-gray-50 px-2 py-1.5 font-medium text-gray-600 whitespace-nowrap">
                    {formatRowLabel(rowKey)}
                  </td>
                  {columns.map((col) => {
                    const colKey = col.courtId ?? "__none__";
                    const slot = slotByRowCol.get(`${rowKey}#${colKey}`);
                    const matchId = slot ? assignmentsBySlot[slot.id] : undefined;
                    const match = matchId ? matchById.get(matchId) : null;
                    const isDropTarget = slot && dropTargetCell === slot.id;
                    const conflict =
                      slot && match
                        ? checkConflict(slot, match.player1_id ?? null, match.player2_id ?? null)
                        : false;

                    if (!slot) {
                      return (
                        <td key={`${rowKey}-${colKey}`} className="border border-gray-200 bg-gray-50/50 p-1 min-w-[140px]" />
                      );
                    }

                    return (
                      <td
                        key={slot.id}
                        className={`border p-1 min-w-[140px] align-top ${
                          conflict
                            ? "bg-amber-100 border-amber-400 border-2"
                            : "bg-white border-gray-200"
                        } ${isDropTarget ? "ring-2 ring-ntu-green ring-offset-1" : ""}`}
                        onDragOver={(e) => handleDragOver(e, slot.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, slot)}
                      >
                        <div
                          className="min-h-[60px] rounded p-2"
                          onDragOver={(e) => {
                            e.preventDefault();
                            handleDragOver(e, slot.id);
                          }}
                          onDrop={(e) => handleDrop(e, slot)}
                        >
                          {match ? (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, match.id)}
                              onDragEnd={handleDragEnd}
                              className="cursor-grab active:cursor-grabbing flex flex-col gap-1 rounded border border-transparent hover:border-gray-300 p-1 -m-1"
                            >
                              <div className="font-medium text-gray-800 text-xs leading-tight">
                                {match.player1?.name ?? "—"} vs {match.player2?.name ?? "—"}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">R{match.round}-{match.match_number}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromSlot(slot.id)}
                                  className="text-red-600 hover:text-red-700 text-xs font-medium"
                                >
                                  移除
                                </button>
                              </div>
                              {conflict && (
                                <span className="text-amber-700 text-xs">⚠ 不可出賽時段</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">拖放比賽至此</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {columns.length === 1 && (
        <p className="text-xs text-amber-700 mt-2">
          若有多個場地，請在排程頁為每個時段建立多筆可用時段（每場地一筆），此處會依實際有建立的場地顯示多欄。
        </p>
      )}
    </div>
  );
}
