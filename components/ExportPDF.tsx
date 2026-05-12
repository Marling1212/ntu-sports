"use client";

import { Player, Match } from "@/types/tournament";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import { createRoot, type Root } from "react-dom/client";
import { I18nProvider } from "@/lib/i18n/context";
import { defaultLocale, type Locale } from "@/lib/i18n/translations";
import { TournamentBracketCore } from "@/components/TournamentBracket";

function getPdfExportLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const m = document.cookie.match(/(?:^|;\s*)locale=(zh|en)(?:;|$)/);
  if (m?.[1] === "zh" || m?.[1] === "en") return m[1];
  const lang = document.documentElement.lang || "";
  if (lang.toLowerCase().startsWith("zh")) return "zh";
  if (lang.toLowerCase().startsWith("en")) return "en";
  return defaultLocale;
}

function renderPdfBracketRoot(
  host: HTMLElement,
  bracketProps: {
    matches: Match[];
    players: Player[];
    sportName: string;
  },
  roots: Root[]
) {
  const root = createRoot(host);
  roots.push(root);
  root.render(
    <I18nProvider initialLocale={getPdfExportLocale()}>
      <TournamentBracketCore
        {...bracketProps}
        pdfCapture
        previewSuffix=""
      />
    </I18nProvider>
  );
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function pdfPageHeaderHtml(eventName: string, eventDate: string, eventVenue: string, subtitle?: string): string {
  return (
    `<header style="margin-bottom: 22px;">` +
    `<h1 style="font-size: 24px; font-weight: bold; margin: 0 0 12px 0; color: #00694E;">${escAttr(eventName)}</h1>` +
    `<div style="font-size: 14px; line-height: 1.55; color: #111;">` +
    `<p style="margin: 0 0 4px 0;"><strong>比賽日期:</strong> ${escAttr(eventDate)}</p>` +
    `<p style="margin: 0 0 4px 0;"><strong>比賽地點:</strong> ${escAttr(eventVenue)}</p>` +
    (subtitle ? `<p style="margin: 10px 0 0 0; color: #444;">${escAttr(subtitle)}</p>` : "") +
    `</div></header>`
  );
}

function waitForBracketPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 900);
      });
    });
  });
}

interface ExportPDFProps {
  matches: Match[];
  players: Player[];
  eventName?: string;
  eventDate?: string;
  eventVenue?: string;
  tournamentType?: "single_elimination" | "season_play";
  /** Used for bracket links / labels; PDF capture uses non-interactive cards. */
  sportName?: string;
}

export default function ExportPDF({
  matches,
  players,
  eventName = "NTU Tennis Tournament",
  eventDate = "2025/11/8-11/9",
  eventVenue = "台大新生網球場 5-8 場",
  tournamentType = "single_elimination",
  sportName = "Tennis",
}: ExportPDFProps) {
  const calculateStandings = (regularSeasonMatches: Match[], allPlayers: Player[]) => {
    const standings: {
      [playerId: string]: {
        player: Player;
        wins: number;
        losses: number;
        draws: number;
        points: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDiff: number;
      };
    } = {};

    allPlayers.forEach((player) => {
      standings[player.id] = {
        player,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
      };
    });

    regularSeasonMatches.forEach((match) => {
      if (match.status === "completed" && match.player1?.id && match.player2?.id) {
        const p1 = standings[match.player1.id];
        const p2 = standings[match.player2.id];

        if (!p1 || !p2) return;

        const scoreMatch = match.score?.match(/(\d+)\s*[-:]\s*(\d+)/);
        if (scoreMatch) {
          const score1 = parseInt(scoreMatch[1], 10);
          const score2 = parseInt(scoreMatch[2], 10);

          p1.goalsFor += score1;
          p1.goalsAgainst += score2;
          p2.goalsFor += score2;
          p2.goalsAgainst += score1;

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
      .filter((s) => s.wins > 0 || s.losses > 0 || s.draws > 0)
      .map((s) => ({
        ...s,
        goalDiff: s.goalsFor - s.goalsAgainst,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      });
  };

  const buildSeasonPdfTablesHtml = (regularSeasonMatches: Match[]) => {
    const standings = calculateStandings(regularSeasonMatches, players);
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    let html = "";

    if (regularSeasonMatches.length > 0) {
      html += `<h2 style="font-size: 19px; font-weight: bold; margin-top: 8px; margin-bottom: 12px; color:#00694E;">例行賽 / Regular Season</h2>`;
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
          return date.toLocaleDateString("zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Taipei",
          });
        } catch {
          return "TBD";
        }
      };

      const sortedMatches = [...regularSeasonMatches].sort((a, b) => {
        const aGroup = (a as any).group_number || 0;
        const bGroup = (b as any).group_number || 0;
        const aTime = (a as any).scheduled_time;
        const bTime = (b as any).scheduled_time;
        if (aGroup !== bGroup) return aGroup - bGroup;
        if (!aTime && !bTime) return a.matchNumber - b.matchNumber;
        if (!aTime) return 1;
        if (!bTime) return -1;
        const aDate = new Date(aTime).getTime();
        const bDate = new Date(bTime).getTime();
        if (aDate !== bDate) return aDate - bDate;
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

    return html;
  };

  const handleExportPDF = async () => {
    const roots: Root[] = [];
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-12000px";
    container.style.top = "0";
    container.style.width = "1200px";
    container.style.maxWidth = "100vw";
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "40px";
    container.style.fontFamily = "Arial, 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif";
    container.style.overflow = "visible";
    container.style.zIndex = "-1";

    try {
      toast.loading("正在生成 PDF...", { id: "pdf-export" });
      document.body.appendChild(container);

      const hasRegularSeason = matches.some((m) => m.round === 0);
      const isSeasonPlay = tournamentType === "season_play" || hasRegularSeason;
      const regularSeasonMatches = matches.filter((m) => m.round === 0);
      const playoffMatches = matches.filter((m) => m.round >= 1);

      const bracketWidthPx = (rounds: number) => Math.max(1200, rounds * 300 + 520);

      if (!isSeasonPlay) {
        const mr = Math.max(...matches.map((m) => m.round), 1);
        container.style.width = `${bracketWidthPx(mr)}px`;
        container.innerHTML = pdfPageHeaderHtml(eventName, eventDate, eventVenue, "單淘汰籤表（與 Draw 頁相同連線）");
        const host = document.createElement("div");
        container.appendChild(host);
        renderPdfBracketRoot(host, { matches, players, sportName }, roots);
      } else {
        if (playoffMatches.length > 0) {
          const mr = Math.max(...playoffMatches.map((m) => m.round), 1);
          container.style.width = `${Math.max(1400, bracketWidthPx(mr))}px`;
        } else {
          container.style.width = "1200px";
        }
        container.innerHTML =
          pdfPageHeaderHtml(eventName, eventDate, eventVenue, "賽季賽程與排名（PDF 列印版）") +
          `<div class="season-pdf-tables" style="font-family: inherit;">` +
          buildSeasonPdfTablesHtml(regularSeasonMatches) +
          `</div>`;

        if (playoffMatches.length > 0) {
          const playoffWrap = document.createElement("div");
          playoffWrap.style.marginTop = "36px";
          playoffWrap.style.paddingTop = "20px";
          playoffWrap.style.borderTop = "3px solid #00694E";
          playoffWrap.innerHTML = `<h2 style="font-size: 19px; font-weight: bold; margin: 0 0 14px 0; color: #00694E;">季後賽籤表</h2>`;
          const host = document.createElement("div");
          playoffWrap.appendChild(host);
          container.appendChild(playoffWrap);
          renderPdfBracketRoot(host, { matches: playoffMatches, players, sportName }, roots);
        }
      }

      await document.fonts.ready;
      await waitForBracketPaint();

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: container.offsetWidth,
        height: container.scrollHeight,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 210;
      const pageWidth = 297;
      const totalPages = Math.ceil(imgHeight / pageHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();

        const sourceY = (i * pageHeight * canvas.height) / imgHeight;
        const sourceHeight = Math.min((pageHeight * canvas.height) / imgHeight, canvas.height - sourceY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext("2d");

        if (pageCtx) {
          pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          const pageImgData = pageCanvas.toDataURL("image/png");
          const pageImgHeight = (sourceHeight * pageWidth) / canvas.width;
          pdf.addImage(pageImgData, "PNG", 0, 0, pageWidth, pageImgHeight);
        }
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${eventName.replace(/\s+/g, "_")}_${isSeasonPlay ? "Season" : "Bracket"}_${timestamp}.pdf`;
      pdf.save(filename);
      toast.success(`📄 PDF ${isSeasonPlay ? "賽季資料" : "籤表"}已下載！`, { id: "pdf-export" });
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF 匯出失敗，請稍後再試", { id: "pdf-export" });
    } finally {
      roots.forEach((r) => {
        try {
          r.unmount();
        } catch {
          /* ignore */
        }
      });
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    }
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
