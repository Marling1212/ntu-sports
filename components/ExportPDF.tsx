"use client";

import { Player, Match } from "@/types/tournament";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import { buildStaircaseBracketHtml } from "@/lib/utils/bracketStaircasePdfHtml";

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

      if (!isSeasonPlay) {
        const mr = Math.max(...matches.map((m) => m.round), 1);
        container.style.width = `${Math.max(1200, mr * 128 + 280)}px`;
      } else if (playoffMatches.length > 0) {
        const mr = Math.max(...playoffMatches.map((m) => m.round), 1);
        container.style.width = `${Math.max(1200, mr * 128 + 280, 1200)}px`;
      }

      // Generate HTML content
      const htmlContent = isSeasonPlay 
        ? generateSeasonPlayHTML(regularSeasonMatches, playoffMatches)
        : generateSingleEliminationStaircaseHTML();

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
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    
    let html = `
      <div style="font-family: Arial, 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif;">
        <h1 style="font-size: 26px; font-weight: bold; margin-bottom: 16px; color: #00694E;">${esc(eventName)}</h1>
        <div style="margin-bottom: 22px; font-size: 14px; line-height:1.5;">
          <p><strong>比賽日期:</strong> ${esc(eventDate)}</p>
          <p><strong>比賽地點:</strong> ${esc(eventVenue)}</p>
          <p style="margin-top:8px;color:#333;">賽季賽程與排名（PDF 列印版）</p>
        </div>
    `;

    // Regular Season Matches
    if (regularSeasonMatches.length > 0) {
      html += `<h2 style="font-size: 19px; font-weight: bold; margin-top: 28px; margin-bottom: 12px; color:#00694E;">例行賽 / Regular Season</h2>`;
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size:12px;">`;
      html += `<thead><tr style="background-color: #00694E; color: white; font-weight: bold;">`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Group</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Player 1</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Player 2</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Score</th>`;
      html += `<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Game Date</th>`;
      html += `</tr></thead><tbody>`;

      const formatGameDate = (scheduledTime?: string | null): string => {
        if (!scheduledTime) return "TBD";
        try {
          const date = new Date(scheduledTime);
          return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Taipei'
          });
        } catch {
          return "TBD";
        }
      };

      // Sort by date (scheduled_time), then by group, then by match number
      const sortedMatches = regularSeasonMatches.sort((a, b) => {
        const aGroup = (a as any).group_number || 0;
        const bGroup = (b as any).group_number || 0;
        const aTime = (a as any).scheduled_time;
        const bTime = (b as any).scheduled_time;
        
        // First sort by group
        if (aGroup !== bGroup) return aGroup - bGroup;
        
        // Then sort by scheduled_time (null/undefined goes to end)
        if (!aTime && !bTime) return a.matchNumber - b.matchNumber;
        if (!aTime) return 1; // a goes to end
        if (!bTime) return -1; // b goes to end
        
        const aDate = new Date(aTime).getTime();
        const bDate = new Date(bTime).getTime();
        if (aDate !== bDate) return aDate - bDate;
        
        // Finally sort by match number
        return a.matchNumber - b.matchNumber;
      });

      sortedMatches.forEach((match, idx) => {
        const matchData = match as any;
        const bgColor = idx % 2 === 0 ? "#f9f9f9" : "white";
        const isDelayed = match.status === "delayed";
        const dateColor = isDelayed ? "color: red; font-weight: bold;" : "";
        
        html += `<tr style="background-color: ${bgColor};">`;
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${matchData.group_number ? `Group ${matchData.group_number}` : ""}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${esc(match.player1?.name || "TBD")}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${esc(match.player2?.name || "TBD")}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${esc(match.score || "-")}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; ${dateColor}">${esc(formatGameDate(matchData.scheduled_time))}</td>`;
        html += `</tr>`;
      });

      html += `</tbody></table>`;
    }

    // Standings
    if (standings.length > 0) {
      html += `<h2 style="font-size: 19px; font-weight: bold; margin-top: 28px; margin-bottom: 12px; color:#00694E;">排名 / Standings</h2>`;
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size:12px;">`;
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
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${esc(standing.player.name)}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${standing.wins}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${standing.draws}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${standing.losses}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${standing.points}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${standing.goalDiff}</td>`;
        html += `</tr>`;
      });

      html += `</tbody></table>`;
    }

    if (playoffMatches.length > 0) {
      html += `<div style="margin-top:36px;padding-top:20px;border-top:3px solid #00694E;">`;
      html += buildStaircaseBracketHtml(playoffMatches, {
        eventName,
        eventDate,
        eventVenue,
        subtitle: "季後賽籤表（階梯狀）",
        compactHeader: true,
      });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  };

  const generateSingleEliminationStaircaseHTML = () =>
    buildStaircaseBracketHtml(matches, {
      eventName,
      eventDate,
      eventVenue,
      subtitle: "單淘汰籤表（階梯狀）",
    });

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
