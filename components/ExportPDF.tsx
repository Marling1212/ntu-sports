"use client";

import { Player, Match } from "@/types/tournament";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  
  const handleExportPDF = async () => {
    try {
      toast.loading("正在生成 PDF...", { id: "pdf-export" });
      
      // Create a temporary container for the PDF content
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.width = "1200px"; // Landscape A4 width in pixels
      container.style.backgroundColor = "white";
      container.style.padding = "40px";
      container.style.fontFamily = "Arial, 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif";
      document.body.appendChild(container);

      // Detect tournament type
      const hasRegularSeason = matches.some(m => m.round === 0);
      const isSeasonPlay = tournamentType === "season_play" || hasRegularSeason;

      const regularSeasonMatches = matches.filter(m => m.round === 0);
      const playoffMatches = matches.filter(m => m.round >= 1);

      // Generate HTML content
      const htmlContent = isSeasonPlay 
        ? generateSeasonPlayHTML(regularSeasonMatches, playoffMatches)
        : generateSingleEliminationHTML();

      container.innerHTML = htmlContent;

      // Wait for fonts to load
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));

      // Convert to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: container.offsetWidth,
        height: container.scrollHeight
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Create PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 210; // A4 height in mm
      const pageWidth = 297; // A4 landscape width in mm

      // Calculate how many pages we need
      const totalPages = Math.ceil(imgHeight / pageHeight);

      // Add image to PDF, split across multiple pages if needed
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate the source Y position in the original image (in pixels)
        const sourceY = (i * pageHeight * canvas.height) / imgHeight;
        const sourceHeight = Math.min(
          (pageHeight * canvas.height) / imgHeight,
          canvas.height - sourceY
        );

        // Create a temporary canvas for this page
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext("2d");
        
        if (pageCtx) {
          // Draw the portion of the image for this page
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );

          const pageImgData = pageCanvas.toDataURL("image/png");
          const pageImgHeight = (sourceHeight * pageWidth) / canvas.width;
          
          pdf.addImage(pageImgData, "PNG", 0, 0, pageWidth, pageImgHeight);
        }
      }

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${eventName.replace(/\s+/g, '_')}_${isSeasonPlay ? 'Season' : 'Bracket'}_${timestamp}.pdf`;
      
      pdf.save(filename);
      toast.success(`📄 PDF ${isSeasonPlay ? '賽季資料' : '籤表'}已下載！`, { id: "pdf-export" });
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF 匯出失敗，請稍後再試", { id: "pdf-export" });
    }
  };

  const generateSeasonPlayHTML = (regularSeasonMatches: Match[], playoffMatches: Match[]) => {
    const standings = calculateStandings(regularSeasonMatches, players);
    
    let html = `
      <div style="font-family: Arial, 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #00694E;">${eventName}</h1>
        <div style="margin-bottom: 20px; font-size: 14px;">
          <p><strong>比賽日期:</strong> ${eventDate}</p>
          <p><strong>比賽地點:</strong> ${eventVenue}</p>
        </div>
    `;

    // Regular Season Matches
    if (regularSeasonMatches.length > 0) {
      html += `<h2 style="font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 15px;">Regular Season Matches</h2>`;
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">`;
      html += `<thead><tr style="background-color: #00694E; color: white; font-weight: bold;">`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Group</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Match #</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Player 1</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Player 2</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Score</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Status</th>`;
      html += `</tr></thead><tbody>`;

      const sortedMatches = regularSeasonMatches.sort((a, b) => {
        const aGroup = (a as any).group_number || 0;
        const bGroup = (b as any).group_number || 0;
        if (aGroup !== bGroup) return aGroup - bGroup;
        return a.matchNumber - b.matchNumber;
      });

      sortedMatches.forEach((match, idx) => {
        const matchData = match as any;
        const bgColor = idx % 2 === 0 ? "#f9f9f9" : "white";
        html += `<tr style="background-color: ${bgColor};">`;
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${matchData.group_number ? `Group ${matchData.group_number}` : ""}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${match.matchNumber}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${match.player1?.name || "TBD"}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${match.player2?.name || "TBD"}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${match.score || "-"}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${match.status}</td>`;
        html += `</tr>`;
      });

      html += `</tbody></table>`;
    }

    // Standings
    if (standings.length > 0) {
      html += `<h2 style="font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 15px;">Standings</h2>`;
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">`;
      html += `<thead><tr style="background-color: #00694E; color: white; font-weight: bold;">`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Rank</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Player</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">W</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">D</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">L</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Points</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">GD</th>`;
      html += `</tr></thead><tbody>`;

      standings.forEach((standing, idx) => {
        const bgColor = idx % 2 === 0 ? "#f9f9f9" : "white";
        html += `<tr style="background-color: ${bgColor};">`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${idx + 1}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${standing.player.name}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${standing.wins}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${standing.draws}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${standing.losses}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${standing.points}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${standing.goalDiff}</td>`;
        html += `</tr>`;
      });

      html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
  };

  const generateSingleEliminationHTML = () => {
    const maxRound = Math.max(...matches.map(m => m.round), 1);
    
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

    // Create headers
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

    let html = `
      <div style="font-family: Arial, 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #00694E;">${eventName}</h1>
        <div style="margin-bottom: 20px; font-size: 14px;">
          <p><strong>比賽日期:</strong> ${eventDate}</p>
          <p><strong>比賽地點:</strong> ${eventVenue}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background-color: #00694E; color: white; font-weight: bold;">
    `;

    headers.forEach(header => {
      html += `<th style="padding: 8px; border: 1px solid #ddd; text-align: center;">${header}</th>`;
    });

    html += `</tr></thead><tbody>`;

    positions.forEach((player, index) => {
      const bgColor = index % 2 === 0 ? "#f9f9f9" : "white";
      html += `<tr style="background-color: ${bgColor};">`;
      html += `<td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>`;
      html += `<td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${player?.seed ? `s${player.seed}` : ""}</td>`;
      html += `<td style="padding: 6px; border: 1px solid #ddd;">${player?.name || "BYE"}</td>`;
      html += `<td style="padding: 6px; border: 1px solid #ddd;">${player?.school || ""}</td>`;
      
      for (let round = 1; round <= maxRound; round++) {
        html += `<td style="padding: 6px; border: 1px solid #ddd;">${positionRoundResults[index][round] || ""}</td>`;
      }
      
      html += `</tr>`;
    });

    // Add 3rd place match if exists
    const finalRoundMatches = matches.filter(m => m.round === maxRound);
    const has3rdPlace = finalRoundMatches.length > 1;
    const thirdPlaceMatch = has3rdPlace ? finalRoundMatches.find(m => m.matchNumber === 2) : null;

    if (has3rdPlace && thirdPlaceMatch) {
      html += `<tr><td colspan="${headers.length}" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f0f0f0;">季軍賽 (3rd Place Match)</td></tr>`;
      html += `<tr><td colspan="2"></td><td style="padding: 6px; border: 1px solid #ddd;">${thirdPlaceMatch.player1?.name || "TBD"}</td><td style="padding: 6px; border: 1px solid #ddd;">${thirdPlaceMatch.player1?.school || ""}</td>`;
      for (let i = 4; i < headers.length; i++) html += `<td></td>`;
      html += `</tr>`;
      html += `<tr><td colspan="2"></td><td style="padding: 6px; border: 1px solid #ddd;">${thirdPlaceMatch.player2?.name || "TBD"}</td><td style="padding: 6px; border: 1px solid #ddd;">${thirdPlaceMatch.player2?.school || ""}</td>`;
      for (let i = 4; i < headers.length; i++) html += `<td></td>`;
      html += `</tr>`;
      
      if (thirdPlaceMatch.status === "completed" && thirdPlaceMatch.winner) {
        const score = thirdPlaceMatch.score || "";
        html += `<tr><td colspan="2"></td><td colspan="2" style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">第三名: ${thirdPlaceMatch.winner.name} (${score})</td>`;
        for (let i = 4; i < headers.length; i++) html += `<td></td>`;
        html += `</tr>`;
      }
    }

    html += `</tbody></table></div>`;
    return html;
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
