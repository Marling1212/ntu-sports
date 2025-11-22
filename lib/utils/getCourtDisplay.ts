/**
 * 統一的 court 顯示邏輯
 * 
 * 簡化邏輯：只使用 match.court（從 event_courts 列表選擇的場地）
 * 不再從 slot 獲取場地，因為場地應該直接從場地列表選擇
 * 
 * 優先級：
 * 1. match.court（從場地列表選擇的場地）
 * 2. "—"（無場地）
 */
export function getCourtDisplay(match: any): string {
  // 只使用 match.court（從 event_courts 列表選擇的場地）
  // 檢查是否為非空字符串
  if (match.court && typeof match.court === 'string' && match.court.trim() !== '') {
    return match.court.trim();
  }
  
  return "—";
}

/**
 * 調試用：輸出 match 的 court 相關信息
 */
export function debugCourtInfo(match: any, matchId?: string) {
  const slotCourt = match.slot?.event_courts;
  let slotCourtName = null;
  
  if (slotCourt) {
    if (Array.isArray(slotCourt)) {
      slotCourtName = slotCourt[0]?.name;
    } else if (typeof slotCourt === 'object') {
      slotCourtName = slotCourt.name;
    }
  }
  
  // 詳細輸出 slot 對象的結構
  const slotDetails = match.slot ? {
    id: match.slot.id,
    code: match.slot.code,
    court_id: match.slot.court_id,
    event_courts: match.slot.event_courts,
    event_courts_keys: match.slot.event_courts ? Object.keys(match.slot.event_courts) : null,
  } : null;
  
  console.log(`[Court Debug] Match ${matchId || match.id}:`, {
    matchCourt: match.court,
    slotId: match.slot_id,
    slot: slotDetails, // 顯示 slot 的詳細結構
    slotCourt: slotCourt,
    slotCourtName: slotCourtName,
    slotCourtType: Array.isArray(slotCourt) ? 'array' : typeof slotCourt,
    finalDisplay: getCourtDisplay(match),
  });
}

