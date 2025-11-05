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
}

export default function ExportBracket({ 
  matches, 
  players, 
  eventName = "NTU Tennis Tournament",
  eventDate = "2025/11/8-11/9",
  eventVenue = "台大新生網球場 5-8 場"
}: ExportBracketProps) {
  
  const handleExport = () => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
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
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${eventName.replace(/\s+/g, '_')}_籤表_${timestamp}.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, filename);
      
      toast.success("📥 Excel 籤表已下載！");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("匯出失敗，請稍後再試");
    }
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

