import type { Match } from "@/types/tournament";

/** Printable staircase bracket (HTML string) for html2canvas → PDF. */
export function buildStaircaseBracketHtml(
  matches: Match[],
  opts: {
    eventName: string;
    eventDate: string;
    eventVenue: string;
    /** e.g. 單淘汰籤表（階梯狀） / 季後賽籤表（階梯狀） */
    subtitle: string;
    /** When true (e.g. embedded in season PDF), omit duplicate title block; only subtitle + bracket. */
    compactHeader?: boolean;
  }
): string {
  if (!matches.length) return "";

  const { eventName, eventDate, eventVenue, subtitle, compactHeader } = opts;
  const maxRound = Math.max(...matches.map((m) => m.round), 1);
  const bracketMatches = matches.filter((m) => !(m.round === maxRound && m.matchNumber === 2));

  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const LEAF = 34;
  const topPad = 28;
  const totalH = Math.pow(2, maxRound) * LEAF + topPad + 60;
  const colW = 120;

  const yCenter = (round: number, matchIdx0: number) =>
    topPad + (Math.pow(2, round) * matchIdx0 + Math.pow(2, round - 1)) * LEAF;
  const boxH = (round: number) => Math.max(46, Math.pow(2, round) * LEAF - 10);

  const playerLine = (m: Match, side: 1 | 2): string => {
    const p = side === 1 ? m.player1 : m.player2;
    if (p?.name) {
      const seedTag = p.seed ? ` <span style="color:#00694E;font-weight:700">(${p.seed})</span>` : "";
      return `${esc(p.name)}${seedTag}`;
    }
    if (m.status === "bye") {
      return '<span style="color:#888;font-style:italic">BYE</span>';
    }
    return '<span style="color:#999">TBD</span>';
  };

  let columnsHtml = "";
  for (let r = 1; r <= maxRound; r++) {
    const rMatches = bracketMatches
      .filter((m) => m.round === r)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    let cells = "";
    for (const m of rMatches) {
      const top = yCenter(r, m.matchNumber - 1) - boxH(r) / 2;
      const scoreLine =
        m.status === "completed" && m.score
          ? `<div style="margin-top:4px;font-size:10px;color:#00694E;font-weight:700">${esc(m.score)}</div>`
          : "";
      cells += `
          <div style="position:absolute;left:5px;right:5px;top:${top}px;height:${boxH(r)}px;border:1px solid #333;border-radius:6px;background:#fff;padding:5px 4px;font-size:11px;line-height:1.25;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;">
            <div style="font-weight:700;color:#00694E;font-size:10px;">M${m.matchNumber}</div>
            <div style="margin-top:3px;color:#111;">${playerLine(m, 1)}</div>
            <div style="margin-top:3px;color:#111;">${playerLine(m, 2)}</div>
            ${scoreLine}
          </div>`;
    }
    columnsHtml += `<div style="position:relative;width:${colW}px;height:${totalH}px;flex-shrink:0;border-left:1px solid #bbb;background:#fafafa;">${cells}</div>`;
  }

  const finalRoundMatches = matches.filter((m) => m.round === maxRound);
  const has3rdPlace = finalRoundMatches.length > 1;
  const thirdPlaceMatch = has3rdPlace ? finalRoundMatches.find((m) => m.matchNumber === 2) : null;

  let thirdBlock = "";
  if (thirdPlaceMatch) {
    thirdBlock = `
        <div style="margin-top:24px;padding-top:16px;border-top:2px solid #ccc;">
          <div style="font-weight:bold;margin-bottom:8px;color:#00694E;">季軍賽</div>
          <div style="font-size:12px;">${playerLine(thirdPlaceMatch, 1)} <span style="color:#999">vs</span> ${playerLine(thirdPlaceMatch, 2)}</div>
          ${
            thirdPlaceMatch.status === "completed" && thirdPlaceMatch.winner
              ? `<div style="margin-top:6px;font-size:11px;font-weight:700;">第三名：${esc(thirdPlaceMatch.winner.name)}</div>`
              : ""
          }
        </div>`;
  }

  const headerBlock = compactHeader
    ? `<h2 style="font-size: 19px; font-weight: bold; margin-bottom: 14px; color: #00694E;">${esc(subtitle)}</h2>`
    : `
        <h1 style="font-size: 22px; font-weight: bold; margin-bottom: 14px; color: #00694E;">${esc(eventName)}</h1>
        <div style="margin-bottom: 14px; font-size: 13px;">
          <p><strong>比賽日期:</strong> ${esc(eventDate)}</p>
          <p><strong>比賽地點:</strong> ${esc(eventVenue)}</p>
          <p style="margin-top:6px;color:#444;">${esc(subtitle)}</p>
        </div>`;

  return `
      <div style="font-family: Arial, 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif;">
        ${headerBlock}
        <div style="display:flex;flex-direction:row;align-items:flex-start;gap:0;border:1px solid #ccc;border-radius:8px;overflow:hidden;background:#fff;">
          ${columnsHtml}
        </div>
        ${thirdBlock}
      </div>`;
}
