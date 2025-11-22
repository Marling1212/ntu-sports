/**
 * 統一的 court 顯示邏輯
 * 處理 match.court 和 slot.event_courts 的各種情況
 */
export function getCourtDisplay(match: any): string {
  // 優先使用 match.court（手動輸入的場地）
  if (match.court) return match.court;
  
  // 其次使用 slot 關聯的 event_courts
  const slotCourt = match.slot?.event_courts;
  if (slotCourt) {
    // 處理可能是數組或對象的情況
    if (Array.isArray(slotCourt)) {
      return slotCourt[0]?.name || "—";
    }
    return slotCourt.name || "—";
  }
  
  return "—";
}

/**
 * 調試用：輸出 match 的 court 相關信息
 */
export function debugCourtInfo(match: any, matchId?: string) {
  console.log(`[Court Debug] Match ${matchId || match.id}:`, {
    matchCourt: match.court,
    slotId: match.slot_id,
    slot: match.slot,
    slotCourt: match.slot?.event_courts,
    slotCourtType: Array.isArray(match.slot?.event_courts) ? 'array' : typeof match.slot?.event_courts,
    finalDisplay: getCourtDisplay(match),
  });
}

