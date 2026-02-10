"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";

export interface PreviewSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
}

export interface PreviewMatch {
  id: string;
  round: number;
  match_number: number;
  player1_name: string;
  player2_name: string;
}

export interface Assignment {
  matchId: string;
  slotId: string;
  scheduledTime: string;
}

function slotToScheduledTime(slot: PreviewSlot): string {
  const start = slot.start_time.slice(0, 8);
  return `${slot.slot_date}T${start}`;
}

function formatSlotLabel(slot: PreviewSlot): string {
  const d = new Date(slot.slot_date + "T12:00:00");
  const dateStr = d.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", weekday: "short" });
  const timeStr = `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`;
  return `${dateStr} ${timeStr}`;
}

interface SchedulePreviewEditorProps {
  eventId: string;
  slots: PreviewSlot[];
  matches: PreviewMatch[];
  initialAssignments: Assignment[];
  initialUnassignedIds: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function SchedulePreviewEditor({
  eventId,
  slots,
  matches,
  initialAssignments,
  initialUnassignedIds,
  onClose,
  onSaved,
}: SchedulePreviewEditorProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [saving, setSaving] = useState(false);
  const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);

  const matchById = useCallback((id: string) => matches.find((m) => m.id === id) ?? null, [matches]);
  const assignedToSlot = useCallback(
    (slotId: string) => assignments.filter((a) => a.slotId === slotId),
    [assignments],
  );
  const unassignedIds = useCallback(() => {
    const assigned = new Set(assignments.map((a) => a.matchId));
    return matches.map((m) => m.id).filter((id) => !assigned.has(id));
  }, [assignments, matches]);

  const handleDragStart = (e: React.DragEvent, matchId: string) => {
    setDraggedMatchId(matchId);
    e.dataTransfer.setData("application/json", JSON.stringify({ matchId }));
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnd = () => setDraggedMatchId(null);

  const handleDropOnSlot = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    let data: { matchId?: string };
    try {
      data = JSON.parse(e.dataTransfer.getData("application/json") || "{}");
    } catch {
      return;
    }
    const matchId = data.matchId;
    if (!matchId) return;
    const currentInSlot = assignments.filter((a) => a.slotId === slotId).length;
    if (currentInSlot >= slot.capacity) {
      toast.error("此時段已滿（已達場地數上限）");
      return;
    }
    const scheduledTime = slotToScheduledTime(slot);
    setAssignments((prev) => [
      ...prev.filter((a) => a.matchId !== matchId),
      { matchId, slotId, scheduledTime },
    ]);
    setDraggedMatchId(null);
  };
  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    let data: { matchId?: string };
    try {
      data = JSON.parse(e.dataTransfer.getData("application/json") || "{}");
    } catch {
      return;
    }
    const matchId = data.matchId;
    if (!matchId) return;
    setAssignments((prev) => prev.filter((a) => a.matchId !== matchId));
    setDraggedMatchId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/auto-schedule/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      let data: { message?: string; applied?: number; cleared?: number; ok?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        if (res.status === 404) {
          toast.error("找不到儲存 API，請確認已部署 auto-schedule/apply 路由並重新整理頁面");
          return;
        }
        toast.error("儲存失敗：伺服器回傳格式錯誤");
        return;
      }
      if (!res.ok) {
        toast.error(data.message || "儲存失敗");
        return;
      }
      toast.success(`已儲存排程（${data.applied ?? 0} 場已排入，${data.cleared ?? 0} 場已清除）`);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "儲存失敗";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ntu-green">排程預覽與編輯</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="關閉"
          >
            ×
          </button>
        </div>
        <p className="px-6 py-2 text-sm text-gray-600 border-b border-gray-100">
          可拖曳比賽到不同時段或「未排入」；每個時段最多可排入的場數已標示。確認後按「儲存排程」。
        </p>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {slots.map((slot) => {
            const inSlot = assignedToSlot(slot.id);
            const isFull = inSlot.length >= slot.capacity;
            return (
              <div
                key={slot.id}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => handleDropOnSlot(e, slot.id)}
                className={`border-2 rounded-lg p-3 min-h-[72px] transition-colors ${
                  isFull ? "border-gray-200 bg-gray-50" : "border-dashed border-emerald-300 bg-emerald-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{formatSlotLabel(slot)}</span>
                  <span className="text-xs text-gray-500">已排 {inSlot.length} / {slot.capacity} 場</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inSlot.map((a) => {
                    const m = matchById(a.matchId);
                    if (!m) return null;
                    return (
                      <div
                        key={a.matchId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, a.matchId)}
                        onDragEnd={handleDragEnd}
                        className={`px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing text-sm ${
                          draggedMatchId === a.matchId ? "opacity-50" : ""
                        }`}
                      >
                        R{m.round} M{m.match_number}: {m.player1_name} vs {m.player2_name}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={handleDropOnUnassigned}
            className="border-2 border-dashed border-amber-300 rounded-lg p-4 bg-amber-50/50 min-h-[80px]"
          >
            <div className="text-sm font-medium text-amber-800 mb-2">未排入的比賽（拖曳至此可取消排程）</div>
            <div className="flex flex-wrap gap-2">
              {unassignedIds().map((id) => {
                const m = matchById(id);
                if (!m) return null;
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, id)}
                    onDragEnd={handleDragEnd}
                    className={`px-3 py-2 rounded-lg bg-white border border-amber-200 shadow-sm cursor-grab active:cursor-grabbing text-sm ${
                      draggedMatchId === id ? "opacity-50" : ""
                    }`}
                  >
                    R{m.round} M{m.match_number}: {m.player1_name} vs {m.player2_name}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "儲存中…" : "儲存排程"}
          </button>
        </div>
      </div>
    </div>
  );
}
