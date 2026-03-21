/** 從 slot 嵌套讀取場地名稱（Supabase 可能回傳物件或單元素陣列） */
export function courtNameFromSlotEmbed(slot: any): string | undefined {
  const ec = slot?.event_courts;
  if (!ec) return undefined;
  const name = Array.isArray(ec) ? ec[0]?.name : ec?.name;
  if (name && String(name).trim() !== "") return String(name).trim();
  return undefined;
}

/**
 * 從 DB 列（含 slot join）解析場地名稱，供公開頁 mapping 使用。
 * 有時段時以時段上的場地為準（與 admin 時段一致），避免 matches.court 過期。
 */
export function resolveCourtFromMatchRow(m: any): string | undefined {
  const fromSlot = courtNameFromSlotEmbed(m?.slot);
  if (fromSlot) return fromSlot;
  if (m?.court && typeof m.court === "string" && m.court.trim() !== "") {
    return m.court.trim();
  }
  return undefined;
}

/**
 * 統一的 court 顯示邏輯
 *
 * 優先級：
 * 1. match.court（手動選擇或已映射的場地字串）
 * 2. match.slot.event_courts（時段上連結的場地）
 * 3. "—"（無場地）
 */
export function getCourtDisplay(match: any): string {
  if (!match) return "—";
  const fromSlot = courtNameFromSlotEmbed(match?.slot);
  if (fromSlot) return fromSlot;
  if (match.court && typeof match.court === "string" && match.court.trim() !== "") {
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
    } else if (typeof slotCourt === "object") {
      slotCourtName = slotCourt.name;
    }
  }

  // 詳細輸出 slot 對象的結構
  const slotDetails = match.slot
    ? {
        id: match.slot.id,
        code: match.slot.code,
        court_id: match.slot.court_id,
        event_courts: match.slot.event_courts,
        event_courts_keys: match.slot.event_courts ? Object.keys(match.slot.event_courts) : null,
      }
    : null;

  console.log(`[Court Debug] Match ${matchId || match.id}:`, {
    matchCourt: match.court,
    slotId: match.slot_id,
    slot: slotDetails, // 顯示 slot 的詳細結構
    slotCourt: slotCourt,
    slotCourtName: slotCourtName,
    slotCourtType: Array.isArray(slotCourt) ? "array" : typeof slotCourt,
    finalDisplay: getCourtDisplay(match),
  });
}
