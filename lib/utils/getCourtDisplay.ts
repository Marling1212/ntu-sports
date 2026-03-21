/** PostgREST 有時把 FK 嵌套成單物件或 [物件]，統一成單一 event_slots 列 */
export function normalizeMatchEventSlot(m: any): any {
  const s = m?.slot;
  if (Array.isArray(s)) return s[0] ?? null;
  return s ?? null;
}

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
  const fromSlot = courtNameFromSlotEmbed(normalizeMatchEventSlot(m));
  if (fromSlot) return fromSlot;
  if (m?.court && typeof m.court === "string" && m.court.trim() !== "") {
    return m.court.trim();
  }
  return undefined;
}

/**
 * 統一的 court 顯示邏輯（客戶端／籤表）
 *
 * 優先級：
 * 1. match.court（伺服器已解析的字串；公開頁通常不帶 slot 嵌套，籤表又有 slot1/slot2 種子勿與賽事時段混淆）
 * 2. match.slot（event_slots）上的 event_courts
 * 3. "—"
 */
export function getCourtDisplay(match: any): string {
  if (!match) return "—";
  if (match.court && typeof match.court === "string" && match.court.trim() !== "") {
    return match.court.trim();
  }
  const fromSlot = courtNameFromSlotEmbed(normalizeMatchEventSlot(match));
  if (fromSlot) return fromSlot;
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
