"use client";

import { Player, Match } from "@/types/tournament";
import * as XLSX from 'xlsx';
import toast from "react-hot-toast";

interface ExportBracketProps {
  matches: Match[];
  players: Player[];
  eventName?: string;
  eventDate?: string;
  eventVenue?: string;
  tournamentType?: "single_elimination" | "season_play";
}

export default function ExportBracket({ 
  matches, 
  players, 
  eventName = "NTU Tennis Tournament",
  eventDate = "2025/11/8-11/9",
  eventVenue = "台大新生網球場 5-8 場",
  tournamentType = "single_elimination"
}: ExportBracketProps) {
  
  const handleExport = () => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Detect tournament type from matches if not provided
      const hasRegularSeason = matches.some(m => m.round === 0);
      const isSeasonPlay = tournamentType === "season_play" || hasRegularSeason;
      
      if (isSeasonPlay) {
        exportSeasonPlay(wb);
      } else {
        exportSingleElimination(wb);
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${eventName.replace(/\s+/g, '_')}_${isSeasonPlay ? '賽季' : '籤表'}_${timestamp}.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, filename);
      
      toast.success(`📥 Excel ${isSeasonPlay ? '賽季資料' : '籤表'}已下載！`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("匯出失敗，請稍後再試");
    }
  };
  
  const exportSeasonPlay = (wb: XLSX.WorkBook) => {
    const regularSeasonMatches = matches.filter(m => m.round === 0);
    const playoffMatches = matches.filter(m => m.round >= 1);
    
    // Calculate standings from regular season
    const standings: { [playerId: string]: { player: Player; wins: number; losses: number; points: number; group?: number } } = {};
    
    players.forEach(player => {
      standings[player.id] = { player, wins: 0, losses: 0, points: 0 };
    });

    regularSeasonMatches.forEach((match) => {
      if (match.status === 'completed' && match.winner) {
        const winnerId = match.winner.id;
        const loserId = match.player1?.id === winnerId ? match.player2?.id : match.player1?.id;
        
        if (winnerId && standings[winnerId]) {
          standings[winnerId].wins++;
          standings[winnerId].points += 3;
          const matchData = match as any;
          if (matchData.group_number) {
            standings[winnerId].group = matchData.group_number;
          }
        }
        
        if (loserId && standings[loserId]) {
          standings[loserId].losses++;
        }
      }
    });

    const standingsArray = Object.values(standings)
      .filter(s => s.wins > 0 || s.losses > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });
    
    // Check if matches are grouped
    const allGroups = new Set<number>();
    regularSeasonMatches.forEach(m => {
      const groupNum = (m as any).group_number;
      if (groupNum !== null && groupNum !== undefined) {
        allGroups.add(groupNum);
      }
    });
    const hasGroups = allGroups.size > 0;
    
    // Sheet 1: Regular Season Matches
    const regularSeasonData: any[][] = [];
    regularSeasonData.push([eventName]);
    regularSeasonData.push([]);
    regularSeasonData.push(["比賽日期", eventDate]);
    regularSeasonData.push(["比賽地點", eventVenue]);
    regularSeasonData.push(["組別", "Regular Season Matches"]);
    regularSeasonData.push([]);
    
    if (hasGroups) {
      // Grouped matches
      const sortedGroups = Array.from(allGroups).sort((a, b) => a - b);
      sortedGroups.forEach(groupNum => {
        regularSeasonData.push([`Group ${groupNum}`]);
        regularSeasonData.push(["Match #", "Player 1", "Player 2", "Score", "Status", "Date & Time"]);
        
        const groupMatches = regularSeasonMatches
          .filter(m => (m as any).group_number === groupNum)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        
        groupMatches.forEach(match => {
          const matchData = match as any;
          const row = [
            match.matchNumber,
            match.player1?.name || "TBD",
            match.player2?.name || "TBD",
            match.score || "-",
            match.status,
            matchData.scheduled_time ? new Date(matchData.scheduled_time).toLocaleString('zh-TW') : "TBD"
          ];
          regularSeasonData.push(row);
        });
        regularSeasonData.push([]);
      });
    } else {
      // Ungrouped matches
      regularSeasonData.push(["Match #", "Player 1", "Player 2", "Score", "Status", "Date & Time"]);
      regularSeasonMatches
        .sort((a, b) => a.matchNumber - b.matchNumber)
        .forEach(match => {
          const matchData = match as any;
          const row = [
            match.matchNumber,
            match.player1?.name || "TBD",
            match.player2?.name || "TBD",
            match.score || "-",
            match.status,
            matchData.scheduled_time ? new Date(matchData.scheduled_time).toLocaleString('zh-TW') : "TBD"
          ];
          regularSeasonData.push(row);
        });
    }
    
    const ws1 = XLSX.utils.aoa_to_sheet(regularSeasonData);
    ws1['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Regular Season");
    
    // Sheet 2: Standings
    const standingsData: any[][] = [];
    standingsData.push([eventName, "Regular Season Standings"]);
    standingsData.push([]);
    
    if (hasGroups) {
      const sortedGroups = Array.from(allGroups).sort((a, b) => a - b);
      sortedGroups.forEach(groupNum => {
        standingsData.push([`Group ${groupNum} Standings`]);
        standingsData.push(["Rank", "Player", "Wins", "Losses", "Points"]);
        
        const groupStandings = standingsArray
          .filter(s => s.group === groupNum)
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.losses - b.losses;
          });
        
        groupStandings.forEach((standing, idx) => {
          standingsData.push([
            idx + 1,
            standing.player.name,
            standing.wins,
            standing.losses,
            standing.points
          ]);
        });
        standingsData.push([]);
      });
    } else {
      standingsData.push(["Rank", "Player", "Wins", "Losses", "Points"]);
      standingsArray.forEach((standing, idx) => {
        standingsData.push([
          idx + 1,
          standing.player.name,
          standing.wins,
          standing.losses,
          standing.points
        ]);
      });
    }
    
    const ws2 = XLSX.utils.aoa_to_sheet(standingsData);
    ws2['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Standings");
    
    // Sheet 3: Playoff Bracket (if exists)
    if (playoffMatches.length > 0) {
      exportPlayoffBracket(wb, playoffMatches);
    }
  };
  
  const exportPlayoffBracket = (wb: XLSX.WorkBook, playoffMatches: Match[]) => {
    const maxRound = Math.max(...playoffMatches.map(m => m.round), 1);
    
    // Check if there's a 3rd place match
    const finalRoundMatches = playoffMatches.filter(m => m.round === maxRound);
    const has3rdPlace = finalRoundMatches.length > 1;
    const thirdPlaceMatch = has3rdPlace ? finalRoundMatches.find(m => m.matchNumber === 2) : null;
    
    // Bracket matches (exclude 3rd place match)
    const bracketMatches = playoffMatches.filter(m => !(m.round === maxRound && m.matchNumber === 2));
    
    // Build position-based player list from Round 1
    const round1Matches = bracketMatches
      .filter(m => m.round === 1)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    
    const positions: (Player | null)[] = [];
    round1Matches.forEach(match => {
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
        .filter(m => m.round === round)
        .sort((a, b) => a.matchNumber - b.matchNumber);
      
      roundMatches.forEach((match) => {
        const coveredPositions = getMatchPositionRange(round, match.matchNumber);
        const lowestPosition = Math.max(...coveredPositions.filter(pos => pos < positions.length));
        
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
    data.push([eventName, "Playoff Bracket"]);
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
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const colWidths = [
      { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 20 }
    ];
    for (let i = 0; i < maxRound; i++) {
      colWidths.push({ wch: 18 });
    }
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, "Playoffs");
  };
  
  const exportSingleElimination = (wb: XLSX.WorkBook) => {
      
      // Calculate bracket info
      const maxRound = Math.max(...matches.map(m => m.round), 1);
      
      // Check if there's a 3rd place match (match_number = 2 in final round)
      const finalRoundMatches = matches.filter(m => m.round === maxRound);
      const has3rdPlace = finalRoundMatches.length > 1;
      const thirdPlaceMatch = has3rdPlace ? finalRoundMatches.find(m => m.matchNumber === 2) : null;
      
      // Bracket matches (for main draw - exclude 3rd place match)
      const bracketMatches = matches.filter(m => !(m.round === maxRound && m.matchNumber === 2));
      
      // Build position-based player list from Round 1
      const round1Matches = bracketMatches
        .filter(m => m.round === 1)
        .sort((a, b) => a.matchNumber - b.matchNumber);
      
      const positions: (Player | null)[] = [];
      round1Matches.forEach(match => {
        positions.push(match.player1 || null);
        positions.push(match.player2 || null);
      });
      
      // Calculate which initial positions each match covers
      // For example, Round 1 Match 1 covers positions 0-1, Round 2 Match 1 covers positions 0-3
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
      
      // For each round, for each match, determine which position should show the result
      // The result should appear at the LOWEST (highest index) position involved in that match
      const positionRoundResults: Record<number, Record<number, string>> = {};
      
      // Initialize
      positions.forEach((_, index) => {
        positionRoundResults[index] = {};
      });
      
      // Process each round (excluding 3rd place match)
      for (let round = 1; round <= maxRound; round++) {
        const roundMatches = bracketMatches
          .filter(m => m.round === round)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        
        roundMatches.forEach((match) => {
          // Get all positions covered by this match
          const coveredPositions = getMatchPositionRange(round, match.matchNumber);
          
          // Find the LOWEST position (highest index) that actually has a player
          const lowestPosition = Math.max(...coveredPositions.filter(pos => pos < positions.length));
          
          // Determine what to display
          let displayText = "";
          if (match.status === "bye" && match.winner) {
            displayText = `${match.winner.name}(bye)`;
          } else if (match.status === "completed" && match.winner) {
            const score = match.score || "";
            displayText = `${match.winner.name}(${score})`;
          }
          
          // Set the result at the lowest position for this round
          if (displayText) {
            positionRoundResults[lowestPosition][round] = displayText;
          }
        });
      }
      
      // Prepare data for Excel
      const data: any[][] = [];
      
      // Header section
      data.push([eventName]);
      data.push([]);
      data.push(["比賽日期", eventDate]);
      data.push(["比賽地點", eventVenue]);
      data.push(["組別", "男子組單打"]);
      data.push([]);
      
      // Column headers
      const headers = ["順序", "種子", "姓名", "系級"];
      
      // Add round headers
      for (let i = 1; i <= maxRound; i++) {
        if (i === 1) headers.push("第一輪");
        else if (i === 2) headers.push("第二輪");
        else if (i === 3) headers.push("第三輪");
        else if (i === 4) headers.push("第四輪");
        else if (i === 5) headers.push("第五輪");
        else if (i === 6) headers.push("第六輪");
        else if (i === 7) headers.push("第七輪");
      }
      
      data.push(headers);
      
      // Add player rows
      positions.forEach((player, index) => {
        const row: any[] = [];
        row.push(index + 1); // 順序
        row.push(player?.seed ? `s${player.seed}` : ""); // 種子
        row.push(player?.name || "BYE"); // 姓名
        row.push(player?.school || ""); // 系級
        
        // Add round columns
        for (let round = 1; round <= maxRound; round++) {
          row.push(positionRoundResults[index][round] || "");
        }
        
        data.push(row);
      });
      
      // Add 3rd place match section if exists
      if (has3rdPlace && thirdPlaceMatch) {
        data.push([]); // Empty row for spacing
        data.push([""]); // Empty row
        data.push(["季軍賽 (3rd Place Match)"]); // Section title
        
        // 3rd place match details
        const thirdPlaceRow1 = ["", "", thirdPlaceMatch.player1?.name || "TBD", thirdPlaceMatch.player1?.school || ""];
        const thirdPlaceRow2 = ["", "", thirdPlaceMatch.player2?.name || "TBD", thirdPlaceMatch.player2?.school || ""];
        
        // Add winner info if match is completed
        if (thirdPlaceMatch.status === "completed" && thirdPlaceMatch.winner) {
          const score = thirdPlaceMatch.score || "";
          thirdPlaceRow1.push(`第三名: ${thirdPlaceMatch.winner.name}(${score})`);
        }
        
        data.push(thirdPlaceRow1);
        data.push(thirdPlaceRow2);
      }
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Set column widths
      const colWidths = [
        { wch: 8 },  // 順序
        { wch: 8 },  // 種子
        { wch: 15 }, // 姓名
        { wch: 20 }, // 系級
      ];
      for (let i = 0; i < maxRound; i++) {
        colWidths.push({ wch: 18 }); // Round columns (wider for name + score)
      }
      ws['!cols'] = colWidths;
      
      // Merge cells for title
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title spans 6 columns
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "籤表");
  };

  return (
    <button
      onClick={handleExport}
      className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-md flex items-center gap-2"
    >
      <span>📥</span>
      <span>Download Bracket (Excel)</span>
    </button>
  );
}

