# Court Bug 調試指南

## 問題描述
Public 頁面顯示的 court 與 Admin 頁面不一致，所有比賽顯示同一個場地。

## 調試步驟

### 1. 檢查數據庫查詢結構

**Admin 頁面查詢** (`app/admin/[eventId]/matches/page.tsx`):
```typescript
slot:event_slots(
  id, 
  code, 
  court_id,
  event_courts(name)
)
```

**Public 頁面查詢** (`lib/utils/getSportEvent.ts`):
```typescript
slot:event_slots(
  id, 
  code, 
  court_id,
  event_courts(name)
)
```

兩邊查詢相同，問題可能在於：
- Supabase 返回的數據結構
- 顯示邏輯不一致

### 2. 檢查顯示邏輯

**Admin 頁面** (`components/admin/MatchesTable.tsx`):
```typescript
match.court || (match.slot as any)?.event_courts?.name || "—"
```

**Public 頁面** (`app/sports/[sport]/page.tsx`):
```typescript
const slotCourt = (m.slot as any)?.event_courts;
const slotCourtName = Array.isArray(slotCourt) 
  ? slotCourt[0]?.name 
  : slotCourt?.name;
const court = m.court || slotCourtName || "-";
```

### 3. 可能的原因

1. **Supabase 關聯查詢返回格式不一致**
   - `event_courts` 可能是數組 `[{name: "..."}]`
   - 也可能是對象 `{name: "..."}`
   - 取決於關聯是一對一還是一對多

2. **數據庫中的實際數據**
   - `match.court` 欄位可能為空
   - `slot.event_courts` 關聯可能不正確

### 4. 調試方法

#### 方法 A: 在瀏覽器 Console 檢查數據
1. 打開 Admin 頁面，打開開發者工具 (F12)
2. 在 Console 輸入：
```javascript
// 檢查 matches 數據
console.log('Admin matches:', window.__MATCHES__);
```

#### 方法 B: 添加臨時 console.log
在組件中添加：
```typescript
console.log('Match data:', {
  id: match.id,
  court: match.court,
  slot: match.slot,
  slotCourt: (match.slot as any)?.event_courts,
  slotCourtName: Array.isArray((match.slot as any)?.event_courts)
    ? (match.slot as any)?.event_courts[0]?.name
    : (match.slot as any)?.event_courts?.name
});
```

#### 方法 C: 檢查 Supabase 數據庫
1. 登入 Supabase Dashboard
2. 檢查 `matches` 表：
   - `court` 欄位是否有值？
   - `slot_id` 是否正確？
3. 檢查 `event_slots` 表：
   - `court_id` 是否正確？
4. 檢查 `event_courts` 表：
   - 場地名稱是否正確？

### 5. 統一顯示邏輯

建議統一兩邊的顯示邏輯，使用相同的處理方式：

```typescript
// 統一的 court 顯示邏輯
const getCourtDisplay = (match: any) => {
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
};
```

### 6. 修復步驟

1. **統一顯示邏輯**：讓兩邊使用相同的函數
2. **檢查數據結構**：確認 Supabase 返回的格式
3. **測試**：在不同情況下測試（有 court、無 court、有 slot、無 slot）

