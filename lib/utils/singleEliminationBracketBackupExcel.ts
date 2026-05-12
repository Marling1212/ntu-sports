import type { Match, Player } from "@/types/tournament";

/**
 * Builds the same grid shape as `ExportBracket` single-elimination sheet so
 * `ImportBracket.parseWorksheet` can read it (header row must contain 「順序」).
 */
export function buildBracketGridAoAForImport(params: {
  eventName: string;
  eventDate?: string;
  eventVenue?: string;
  divisionLabel?: string;
  matches: Match[];
}): any[][] {
  const { eventName, eventDate = "", eventVenue = "", divisionLabel = "單淘汰", matches } = params;
  if (!matches.length) return [];

  const maxRound = Math.max(...matches.map((m) => m.round), 1);
  const finalRoundMatches = matches.filter((m) => m.round === maxRound);
  const has3rdPlace = finalRoundMatches.length > 1;
  const thirdPlaceMatch = has3rdPlace ? finalRoundMatches.find((m) => m.matchNumber === 2) : null;
  const bracketMatches = matches.filter((m) => !(m.round === maxRound && m.matchNumber === 2));

  const round1Matches = bracketMatches
    .filter((m) => m.round === 1)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const positions: (Player | null)[] = [];
  round1Matches.forEach((match) => {
    positions.push(match.player1 || null);
    positions.push(match.player2 || null);
  });

  const getMatchPositionRange = (round: number, matchNumber: number): number[] => {
    const playersPerMatch = Math.pow(2, round);
    const startPos = (matchNumber - 1) * playersPerMatch;
    const endPos = startPos + playersPerMatch - 1;
    const range: number[] = [];
    for (let i = startPos; i <= endPos; i++) {
      range.push(i);
    }
    return range;
  };

  const positionRoundResults: Record<number, Record<number, string>> = {};
  positions.forEach((_, index) => {
    positionRoundResults[index] = {};
  });

  for (let round = 1; round <= maxRound; round++) {
    const roundMatches = bracketMatches
      .filter((m) => m.round === round)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    roundMatches.forEach((match) => {
      const coveredPositions = getMatchPositionRange(round, match.matchNumber);
      const lowestPosition = Math.max(...coveredPositions.filter((pos) => pos < positions.length));

      let displayText = "";
      if (match.status === "bye" && match.winner) {
        displayText = `${match.winner.name}(bye)`;
      } else if (match.status === "completed" && match.winner) {
        const score = match.score || "";
        displayText = `${match.winner.name}(${score})`;
      }

      if (displayText) {
        positionRoundResults[lowestPosition][round] = displayText;
      }
    });
  }

  const data: any[][] = [];
  data.push([eventName]);
  data.push([]);
  data.push(["比賽日期", eventDate]);
  data.push(["比賽地點", eventVenue]);
  data.push(["組別", divisionLabel]);
  data.push([]);

  const headers = ["順序", "種子", "姓名", "系級"];
  for (let i = 1; i <= maxRound; i++) {
    if (i === 1) headers.push("第一輪");
    else if (i === 2) headers.push("第二輪");
    else if (i === 3) headers.push("第三輪");
    else if (i === 4) headers.push("第四輪");
    else if (i === 5) headers.push("第五輪");
    else if (i === 6) headers.push("第六輪");
    else if (i === 7) headers.push("第七輪");
    else headers.push(`第${i}輪`);
  }
  data.push(headers);

  positions.forEach((player, index) => {
    const row: any[] = [];
    row.push(index + 1);
    row.push(player?.seed ? `s${player.seed}` : "");
    row.push(player?.name || "BYE");
    row.push(player?.school || "");
    for (let round = 1; round <= maxRound; round++) {
      row.push(positionRoundResults[index][round] || "");
    }
    data.push(row);
  });

  if (has3rdPlace && thirdPlaceMatch) {
    data.push([]);
    data.push([""]);
    data.push(["季軍賽 (3rd Place Match)"]);
    const thirdPlaceRow1 = ["", "", thirdPlaceMatch.player1?.name || "TBD", thirdPlaceMatch.player1?.school || ""];
    const thirdPlaceRow2 = ["", "", thirdPlaceMatch.player2?.name || "TBD", thirdPlaceMatch.player2?.school || ""];
    if (thirdPlaceMatch.status === "completed" && thirdPlaceMatch.winner) {
      const score = thirdPlaceMatch.score || "";
      thirdPlaceRow1.push(`第三名: ${thirdPlaceMatch.winner.name}(${score})`);
    }
    data.push(thirdPlaceRow1);
    data.push(thirdPlaceRow2);
  }

  return data;
}

export function buildFlatPlayoffMatchesAoA(
  matches: Match[],
  scheduledByMatchId: Record<string, string>
): any[][] {
  const sorted = [...matches].filter((m) => m.round >= 1).sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
  const rows: any[][] = [
    ["說明：此工作表僅供備份與對照；匯入籤表時系統不讀取此表。"],
    [],
    [
      "match_id",
      "輪次",
      "場次",
      "選手1",
      "選手2",
      "比分",
      "狀態",
      "勝者",
      "開賽時間",
    ],
  ];
  for (const m of sorted) {
    rows.push([
      m.id,
      m.round,
      m.matchNumber,
      m.player1?.name || "",
      m.player2?.name || "",
      m.score || "",
      m.status,
      m.winner?.name || "",
      scheduledByMatchId[m.id] || "",
    ]);
  }
  return rows;
}
