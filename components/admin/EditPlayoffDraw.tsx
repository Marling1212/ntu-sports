"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface EditPlayoffDrawProps {
  eventId: string;
  numGroups: number;
  qualifiersPerGroup: number;
}

interface R1Match {
  id: string;
  match_number: number;
  slot1_seed: number | null;
  slot1_group: number | null;
  slot2_seed: number | null;
  slot2_group: number | null;
}

export default function EditPlayoffDraw({ eventId, numGroups, qualifiersPerGroup }: EditPlayoffDrawProps) {
  const [matches, setMatches] = useState<R1Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, match_number, slot1_seed, slot1_group, slot2_seed, slot2_group")
        .eq("event_id", eventId)
        .eq("round", 1)
        .order("match_number", { ascending: true });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setMatches((data || []) as R1Match[]);
      setLoading(false);
    })();
  }, [eventId]);

  const handleSave = async (m: R1Match, slot1: { seed: number; group: number }, slot2: { seed: number; group: number }) => {
    setSavingId(m.id);
    const { error } = await supabase
      .from("matches")
      .update({
        slot1_seed: slot1.seed,
        slot1_group: slot1.group,
        slot2_seed: slot2.seed,
        slot2_group: slot2.group,
      })
      .eq("id", m.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("已儲存");
    setMatches((prev) =>
      prev.map((x) =>
        x.id === m.id
          ? { ...x, slot1_seed: slot1.seed, slot1_group: slot1.group, slot2_seed: slot2.seed, slot2_group: slot2.group }
          : x
      )
    );
  };

  if (loading) return <div className="text-sm text-gray-500">載入中…</div>;
  if (matches.length === 0) return null;

  const seeds = Array.from({ length: qualifiersPerGroup }, (_, i) => i + 1);
  const groups = Array.from({ length: numGroups }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mt-6">
      <h3 className="text-lg font-semibold text-ntu-green mb-2">編輯季後賽籤表（第一輪）</h3>
      <p className="text-sm text-gray-600 mb-4">調整各場對戰的「種子／組別」位置，觀眾端將顯示為 Seed N Group X，或依戰績顯示隊名。</p>
      <div className="space-y-3">
        {matches.map((m) => (
          <EditPlayoffRow
            key={m.id}
            match={m}
            seeds={seeds}
            groups={groups}
            saving={savingId === m.id}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}

function EditPlayoffRow({
  match,
  seeds,
  groups,
  saving,
  onSave,
}: {
  match: R1Match;
  seeds: number[];
  groups: number[];
  saving: boolean;
  onSave: (m: R1Match, slot1: { seed: number; group: number }, slot2: { seed: number; group: number }) => void;
}) {
  const [s1, setS1] = useState(match.slot1_seed ?? 1);
  const [g1, setG1] = useState(match.slot1_group ?? 1);
  const [s2, setS2] = useState(match.slot2_seed ?? 1);
  const [g2, setG2] = useState(match.slot2_group ?? 1);

  useEffect(() => {
    setS1(match.slot1_seed ?? 1);
    setG1(match.slot1_group ?? 1);
    setS2(match.slot2_seed ?? 1);
    setG2(match.slot2_group ?? 1);
  }, [match.slot1_seed, match.slot1_group, match.slot2_seed, match.slot2_group]);

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="font-medium text-gray-700 w-20">Match {match.match_number}</span>
      <select
        value={s1}
        onChange={(e) => setS1(Number(e.target.value))}
        className="px-2 py-1 border rounded text-sm"
      >
        {seeds.map((s) => (
          <option key={s} value={s}>Seed {s}</option>
        ))}
      </select>
      <select
        value={g1}
        onChange={(e) => setG1(Number(e.target.value))}
        className="px-2 py-1 border rounded text-sm"
      >
        {groups.map((g) => (
          <option key={g} value={g}>Group {g}</option>
        ))}
      </select>
      <span className="text-gray-400">vs</span>
      <select
        value={s2}
        onChange={(e) => setS2(Number(e.target.value))}
        className="px-2 py-1 border rounded text-sm"
      >
        {seeds.map((s) => (
          <option key={s} value={s}>Seed {s}</option>
        ))}
      </select>
      <select
        value={g2}
        onChange={(e) => setG2(Number(e.target.value))}
        className="px-2 py-1 border rounded text-sm"
      >
        {groups.map((g) => (
          <option key={g} value={g}>Group {g}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSave(match, { seed: s1, group: g1 }, { seed: s2, group: g2 })}
        disabled={saving}
        className="ml-2 px-3 py-1 bg-ntu-green text-white rounded text-sm hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "儲存中…" : "儲存"}
      </button>
    </div>
  );
}
