"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import TournamentBracket from "@/components/TournamentBracket";
import type { Match, Player } from "@/types/tournament";
import type { Player as DbPlayer } from "@/types/database";

interface BracketCheckInClientProps {
  eventId: string;
  divisionQuery: string;
  sportLabel?: string;
  initialMatches: Match[];
  initialPlayers: DbPlayer[];
}

export default function BracketCheckInClient({
  eventId,
  divisionQuery,
  sportLabel = "Tennis",
  initialMatches,
  initialPlayers,
}: BracketCheckInClientProps) {
  const supabase = createClient();
  const [checkedInByPlayerId, setCheckedInByPlayerId] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    for (const p of initialPlayers) {
      if (p.checked_in_at) o[p.id] = true;
    }
    return o;
  });
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);

  const tournamentPlayers: Player[] = useMemo(
    () =>
      initialPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        seed: p.seed ?? undefined,
        school: p.department ?? undefined,
      })),
    [initialPlayers]
  );

  const onToggleCheckIn = useCallback(
    async (player: Player) => {
      const nextCheckedIn = !checkedInByPlayerId[player.id];
      setBusyPlayerId(player.id);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const actorId = authData.user?.id ?? null;
        const payload = nextCheckedIn
          ? { checked_in_at: new Date().toISOString(), checked_in_by: actorId }
          : { checked_in_at: null, checked_in_by: null };

        const { data, error } = await supabase
          .from("players")
          .update(payload)
          .eq("id", player.id)
          .select("id, checked_in_at")
          .single();

        if (error) throw error;

        setCheckedInByPlayerId((prev) => ({
          ...prev,
          [player.id]: Boolean(data?.checked_in_at),
        }));
        toast.success(nextCheckedIn ? "已報到" : "已取消報到");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "更新報到狀態失敗";
        toast.error(msg);
      } finally {
        setBusyPlayerId(null);
      }
    },
    [checkedInByPlayerId, supabase]
  );

  if (!initialMatches.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="font-medium mb-2">尚無季後賽／單淘汰比賽資料</p>
        <p className="text-sm mb-4">請先在「報名管理」產生或匯入籤表。</p>
        <Link href={`/admin/${eventId}/players${divisionQuery}#players-table`} className="text-ntu-green font-semibold underline">
          前往報名管理
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={`/admin/${eventId}/players${divisionQuery}#players-table`} className="text-ntu-green font-medium hover:underline">
          ← 報名管理
        </Link>
        <Link href={`/admin/${eventId}/matches${divisionQuery}`} className="text-ntu-green font-medium hover:underline">
          賽程 / 比分
        </Link>
      </div>
      <TournamentBracket
        matches={initialMatches}
        players={tournamentPlayers}
        sportName={sportLabel}
        adminCheckIn={{
          checkedInByPlayerId,
          onToggleCheckIn,
          busyPlayerId,
        }}
      />
    </div>
  );
}
