"use client";

import { Player, Match } from "@/types/tournament";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";

interface ExportPDFProps {
  matches: Match[];
  players: Player[];
  eventName?: string;
  eventDate?: string;
  eventVenue?: string;
  tournamentType?: "single_elimination" | "season_play";
}

export default function ExportPDF({ 
  matches, 
  players, 
  eventName = "NTU Tennis Tournament",
  eventDate = "2025/11/8-11/9",
  eventVenue = "台大新生網球場 5-8 場",
  tournamentType = "single_elimination"
}: ExportPDFProps) {
  
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Detect tournament type
      const hasRegularSeason = matches.some(m => m.round === 0);
      const isSeasonPlay = tournamentType === "season_play" || hasRegularSeason;

      if (isSeasonPlay) {
        exportSeasonPlayPDF(doc);
      } else {
        exportSingleEliminationPDF(doc);
      }

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${eventName.replace(/\s+/g, '_')}_${isSeasonPlay ? '賽季' : '籤表'}_${timestamp}.pdf`;
      
      doc.save(filename);
      toast.success(`📄 PDF ${isSeasonPlay ? '賽季資料' : '籤表'}已下載！`);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF 匯出失敗，請稍後再試");
    }
  };

  const exportSeasonPlayPDF = (doc: jsPDF) => {
    const regularSeasonMatches = matches.filter(m => m.round === 0);
    const playoffMatches = matches.filter(m => m.round >= 1);

    // Page 1: Event Info & Regular Season Matches
    let yPos = 10;
    
    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(eventName, 14, yPos);
    yPos += 8;

    // Event details
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`比賽日期: ${eventDate}`, 14, yPos);
    yPos += 6;
    doc.text(`比賽地點: ${eventVenue}`, 14, yPos);
    yPos += 10;

    // Regular Season Matches Table
    if (regularSeasonMatches.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Regular Season Matches", 14, yPos);
      yPos += 8;

      const matchData = regularSeasonMatches
        .sort((a, b) => {
          const aGroup = (a as any).group_number || 0;
          const bGroup = (b as any).group_number || 0;
          if (aGroup !== bGroup) return aGroup - bGroup;
          return a.matchNumber - b.matchNumber;
        })
        .map(match => {
          const matchData = match as any;
          return [
            matchData.group_number ? `Group ${matchData.group_number}` : "",
            match.matchNumber.toString(),
            match.player1?.name || "TBD",
            match.player2?.name || "TBD",
            match.score || "-",
            match.status
          ];
        });

      autoTable(doc, {
        startY: yPos,
        head: [["Group", "Match #", "Player 1", "Player 2", "Score", "Status"]],
        body: matchData,
        theme: "striped",
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // If we need a new page for standings
    if (yPos > 180) {
      doc.addPage();
      yPos = 10;
    }

    // Standings Table
    const standings = calculateStandings(regularSeasonMatches, players);
    if (standings.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Standings", 14, yPos);
      yPos += 8;

      const standingsData = standings.map((s, idx) => [
        (idx + 1).toString(),
        s.player.name,
        s.wins.toString(),
        s.draws.toString(),
        s.losses.toString(),
        s.points.toString(),
        s.goalDiff.toString()
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Rank", "Player", "W", "D", "L", "Points", "GD"]],
        body: standingsData,
        theme: "striped",
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });
    }

    // Page 2: Playoff Bracket (if exists)
    if (playoffMatches.length > 0) {
      doc.addPage();
      exportPlayoffBracketPDF(doc, playoffMatches);
    }
  };

  const exportSingleEliminationPDF = (doc: jsPDF) => {
    const maxRound = Math.max(...matches.map(m => m.round), 1);
    
    // Title section
    let yPos = 10;
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(eventName, 14, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`比賽日期: ${eventDate}`, 14, yPos);
    yPos += 6;
    doc.text(`比賽地點: ${eventVenue}`, 14, yPos);
    yPos += 10;

    // Build bracket data
    const round1Matches = matches
      .filter(m => m.round === 1)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    const positions: (Player | null)[] = [];
    round1Matches.forEach(match => {
      positions.push(match.player1 || null);
      positions.push(match.player2 || null);
    });

    // Calculate results for each round
    const positionRoundResults: Record<number, Record<number, string>> = {};
    positions.forEach((_, index) => {
      positionRoundResults[index] = {};
    });

    const bracketMatches = matches.filter(m => !(m.round === maxRound && m.matchNumber === 2));
    
    for (let round = 1; round <= maxRound; round++) {
      const roundMatches = bracketMatches
        .filter(m => m.round === round)
        .sort((a, b) => a.matchNumber - b.matchNumber);

      roundMatches.forEach((match) => {
        const playersPerMatch = Math.pow(2, round);
        const startPos = (match.matchNumber - 1) * playersPerMatch;
        const endPos = startPos + playersPerMatch - 1;
        const lowestPosition = Math.max(...Array.from({ length: endPos - startPos + 1 }, (_, i) => startPos + i).filter(pos => pos < positions.length));

        let displayText = "";
        if (match.status === "bye" && match.winner) {
          displayText = `${match.winner.name} (bye)`;
        } else if (match.status === "completed" && match.winner) {
          const score = match.score || "";
          displayText = `${match.winner.name} (${score})`;
        }

        if (displayText) {
          positionRoundResults[lowestPosition][round] = displayText;
        }
      });
    }

    // Create table data
    const headers = ["順序", "種子", "姓名", "系級"];
    for (let i = 1; i <= maxRound; i++) {
      if (i === 1) headers.push("第一輪");
      else if (i === 2) headers.push("第二輪");
      else if (i === 3) headers.push("第三輪");
      else if (i === 4) headers.push("第四輪");
      else if (i === 5) headers.push("第五輪");
      else if (i === 6) headers.push("第六輪");
      else headers.push(`第${i}輪`);
    }

    const tableData = positions.map((player, index) => {
      const row: any[] = [
        (index + 1).toString(),
        player?.seed ? `s${player.seed}` : "",
        player?.name || "BYE",
        player?.school || ""
      ];
      
      for (let round = 1; round <= maxRound; round++) {
        row.push(positionRoundResults[index][round] || "");
      }
      
      return row;
    });

    // Add 3rd place match if exists
    const finalRoundMatches = matches.filter(m => m.round === maxRound);
    const has3rdPlace = finalRoundMatches.length > 1;
    const thirdPlaceMatch = has3rdPlace ? finalRoundMatches.find(m => m.matchNumber === 2) : null;

    if (has3rdPlace && thirdPlaceMatch) {
      tableData.push([]);
      tableData.push(["", "", "季軍賽 (3rd Place Match)", ""]);
      tableData.push(["", "", thirdPlaceMatch.player1?.name || "TBD", thirdPlaceMatch.player1?.school || ""]);
      tableData.push(["", "", thirdPlaceMatch.player2?.name || "TBD", thirdPlaceMatch.player2?.school || ""]);
      
      if (thirdPlaceMatch.status === "completed" && thirdPlaceMatch.winner) {
        const score = thirdPlaceMatch.score || "";
        tableData.push(["", "", `第三名: ${thirdPlaceMatch.winner.name} (${score})`, ""]);
      }
    }

    // Generate table
    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 15 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 }
      }
    });
  };

  const exportPlayoffBracketPDF = (doc: jsPDF, playoffMatches: Match[]) => {
    const maxRound = Math.max(...playoffMatches.map(m => m.round), 1);
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Playoff Bracket", 14, 10);

    // Similar logic to single elimination
    const round1Matches = playoffMatches
      .filter(m => m.round === 1)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    const positions: (Player | null)[] = [];
    round1Matches.forEach(match => {
      positions.push(match.player1 || null);
      positions.push(match.player2 || null);
    });

    const positionRoundResults: Record<number, Record<number, string>> = {};
    positions.forEach((_, index) => {
      positionRoundResults[index] = {};
    });

    for (let round = 1; round <= maxRound; round++) {
      const roundMatches = playoffMatches
        .filter(m => m.round === round)
        .sort((a, b) => a.matchNumber - b.matchNumber);

      roundMatches.forEach((match) => {
        const playersPerMatch = Math.pow(2, round);
        const startPos = (match.matchNumber - 1) * playersPerMatch;
        const endPos = startPos + playersPerMatch - 1;
        const lowestPosition = Math.max(...Array.from({ length: endPos - startPos + 1 }, (_, i) => startPos + i).filter(pos => pos < positions.length));

        let displayText = "";
        if (match.status === "bye" && match.winner) {
          displayText = `${match.winner.name} (bye)`;
        } else if (match.status === "completed" && match.winner) {
          const score = match.score || "";
          displayText = `${match.winner.name} (${score})`;
        }

        if (displayText) {
          positionRoundResults[lowestPosition][round] = displayText;
        }
      });
    }

    const headers = ["順序", "種子", "姓名", "系級"];
    for (let i = 1; i <= maxRound; i++) {
      headers.push(`Round ${i}`);
    }

    const tableData = positions.map((player, index) => {
      const row: any[] = [
        (index + 1).toString(),
        player?.seed ? `s${player.seed}` : "",
        player?.name || "BYE",
        player?.school || ""
      ];
      
      for (let round = 1; round <= maxRound; round++) {
        row.push(positionRoundResults[index][round] || "");
      }
      
      return row;
    });

    autoTable(doc, {
      startY: 20,
      head: [headers],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });
  };

  const calculateStandings = (regularSeasonMatches: Match[], players: Player[]) => {
    const standings: { [playerId: string]: { player: Player; wins: number; losses: number; draws: number; points: number; goalsFor: number; goalsAgainst: number; goalDiff: number } } = {};

    players.forEach(player => {
      standings[player.id] = { player, wins: 0, losses: 0, draws: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 };
    });

    regularSeasonMatches.forEach((match) => {
      if (match.status === "completed" && match.player1?.id && match.player2?.id) {
        const p1 = standings[match.player1.id];
        const p2 = standings[match.player2.id];
        
        if (!p1 || !p2) return;

        // Parse score
        const scoreMatch = match.score?.match(/(\d+)\s*[-:]\s*(\d+)/);
        if (scoreMatch) {
          const score1 = parseInt(scoreMatch[1], 10);
          const score2 = parseInt(scoreMatch[2], 10);
          
          p1.goalsFor += score1;
          p1.goalsAgainst += score2;
          p2.goalsFor += score2;
          p2.goalsAgainst += score1;

          // Check for draw
          if (score1 === score2) {
            p1.draws++;
            p1.points += 1;
            p2.draws++;
            p2.points += 1;
          } else if (match.winner) {
            if (match.winner.id === match.player1.id) {
              p1.wins++;
              p1.points += 3;
              p2.losses++;
            } else if (match.winner.id === match.player2.id) {
              p2.wins++;
              p2.points += 3;
              p1.losses++;
            }
          }
        } else if (match.winner) {
          // No score but has winner
          if (match.winner.id === match.player1.id) {
            p1.wins++;
            p1.points += 3;
            p2.losses++;
          } else if (match.winner.id === match.player2.id) {
            p2.wins++;
            p2.points += 3;
            p1.losses++;
          }
        }
      }
    });

    return Object.values(standings)
      .filter(s => s.wins > 0 || s.losses > 0 || s.draws > 0)
      .map(s => ({
        ...s,
        goalDiff: s.goalsFor - s.goalsAgainst
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      });
  };

  return (
    <button
      onClick={handleExportPDF}
      className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-md flex items-center gap-2 ml-2"
    >
      <span>📄</span>
      <span>Download PDF</span>
    </button>
  );
}

