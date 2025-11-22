/**
 * 統一的 court 顯示邏輯
 * 處理 match.court 和 slot.event_courts 的各種情況
 * 
 * 優先級：
 * 1. match.court（手動輸入的場地，最高優先級）
 * 2. slot.event_courts.name（從時段關聯的場地）
 * 3. "—"（無場地）
 */
export function getCourtDisplay(match: any): string {
  // 優先使用 match.court（手動輸入的場地）
  // 檢查是否為非空字符串
  if (match.court && typeof match.court === 'string' && match.court.trim() !== '') {
    return match.court.trim();
  }
  
  // 其次使用 slot 關聯的 event_courts
  const slot = match.slot;
  if (slot) {
    // 處理 event_courts 可能是數組、對象或 null 的情況
    const slotCourt = slot.event_courts;
    
    if (slotCourt) {
      // 如果是數組（Supabase 有時會返回數組）
      if (Array.isArray(slotCourt)) {
        const firstCourt = slotCourt[0];
        if (firstCourt?.name && typeof firstCourt.name === 'string') {
          return firstCourt.name.trim();
        }
      }
      // 如果是對象
      else if (typeof slotCourt === 'object' && slotCourt.name) {
        if (typeof slotCourt.name === 'string' && slotCourt.name.trim() !== '') {
          return slotCourt.name.trim();
        }
      }
    }
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

