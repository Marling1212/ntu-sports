# 籤表編輯與防作弊解決方案

## 問題分析

### 問題 1: 生成籤表後無法在手動編輯器中查看
- **現況**：`GenerateBracket` 生成籤表後，matches 儲存到資料庫，但 `ManualBracketEditor` 不會自動載入這些 matches
- **影響**：Admin 無法看到已生成的籤表，也無法進行後續編輯

### 問題 2: 編輯自動生成籤表的作弊風險
- **風險**：如果允許無限制編輯自動生成的籤表，admin 可能：
  - 故意調整對戰組合讓特定選手更容易晉級
  - 在比賽開始後修改籤表以影響結果
  - 缺乏透明度，無法追蹤修改歷史

## 解決方案

### 方案 A: 添加籤表生成狀態追蹤（推薦）

#### 1. 資料庫結構擴展

```sql
-- 添加籤表生成狀態欄位到 events 表
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_generation_method TEXT DEFAULT NULL 
  CHECK (bracket_generation_method IN ('auto', 'manual', 'imported'));

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_generated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_locked BOOLEAN DEFAULT FALSE;

-- 添加籤表編輯歷史表
CREATE TABLE IF NOT EXISTS bracket_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'generate', 'edit', 'lock', 'unlock'
  changes JSONB, -- 記錄具體修改內容
  reason TEXT, -- 修改原因
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bracket_edit_history_event ON bracket_edit_history(event_id);
CREATE INDEX idx_bracket_edit_history_admin ON bracket_edit_history(admin_id);
```

#### 2. 功能改進

**A. GenerateBracket 組件改進**
- 生成籤表時記錄 `bracket_generation_method = 'auto'`
- 記錄 `bracket_generated_at` 時間戳
- 可選：生成後自動鎖定（`bracket_locked = true`）

**B. ManualBracketEditor 組件改進**
- 載入時檢查是否有現有 matches，如果有則載入顯示
- 根據 `bracket_generation_method` 顯示不同提示
- 如果 `bracket_locked = true`，禁止編輯（或需要解鎖）

**C. 編輯權限控制**
- 自動生成的籤表：需要「解鎖」才能編輯
- 解鎖時要求填寫原因（記錄到 `bracket_edit_history`）
- 所有編輯操作都記錄到歷史表

#### 3. UI/UX 改進

```
┌─────────────────────────────────────────┐
│ 籤表狀態：自動生成 (2024-01-15 10:30)   │
│ [🔒 已鎖定] [🔓 解鎖編輯] [📋 查看歷史] │
└─────────────────────────────────────────┘
```

### 方案 B: 審計日誌與版本控制

#### 1. 完整編輯歷史追蹤
- 每次編輯都記錄：
  - 修改前後的值
  - 修改時間
  - 修改者
  - 修改原因

#### 2. 版本控制
- 保存籤表版本快照
- 可以回滾到之前的版本
- 顯示版本差異

### 方案 C: 混合方案（最實用）

結合方案 A 和 B，提供：
1. ✅ 自動載入現有籤表到 ManualBracketEditor
2. ✅ 生成狀態追蹤（auto/manual/imported）
3. ✅ 鎖定機制防止意外修改
4. ✅ 編輯歷史記錄
5. ✅ 解鎖時要求原因
6. ✅ 視覺化提示（鎖定狀態、生成方式）

## 實作優先順序

### Phase 1: 基礎功能（立即實作）
1. ✅ 讓 ManualBracketEditor 載入現有 matches
2. ✅ 添加 `bracket_generation_method` 欄位
3. ✅ 生成籤表時記錄方法

### Phase 2: 防作弊機制（重要）
1. ✅ 添加 `bracket_locked` 欄位
2. ✅ 自動生成後可選鎖定
3. ✅ 解鎖需要原因
4. ✅ 編輯歷史記錄

### Phase 3: 進階功能（可選）
1. 版本控制
2. 差異視覺化
3. 回滾功能

## 程式碼修改建議

### 1. Migration 檔案

```sql
-- supabase/migrations/029_add_bracket_tracking.sql
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_generation_method TEXT DEFAULT NULL 
  CHECK (bracket_generation_method IN ('auto', 'manual', 'imported'));

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_generated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_locked BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS bracket_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bracket_edit_history_event ON bracket_edit_history(event_id);
```

### 2. TypeScript 類型更新

```typescript
// types/database.ts
export interface Event {
  // ... existing fields
  bracket_generation_method?: 'auto' | 'manual' | 'imported' | null;
  bracket_generated_at?: string | null;
  bracket_locked?: boolean;
}

export interface BracketEditHistory {
  id: string;
  event_id: string;
  admin_id: string;
  action: 'generate' | 'edit' | 'lock' | 'unlock';
  changes?: Record<string, any>;
  reason?: string;
  created_at: string;
}
```

### 3. GenerateBracket 修改

```typescript
// 生成籤表後
await supabase
  .from('events')
  .update({
    bracket_generation_method: 'auto',
    bracket_generated_at: new Date().toISOString(),
    bracket_locked: true, // 可選：自動鎖定
  })
  .eq('id', eventId);
```

### 4. ManualBracketEditor 修改

```typescript
// 載入時檢查現有 matches
useEffect(() => {
  const loadExistingMatches = async () => {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('event_id', eventId)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true });
    
    if (matches && matches.length > 0) {
      // 載入到 bracketPositions
      // ...
    }
  };
  loadExistingMatches();
}, [eventId]);

// 檢查鎖定狀態
const { data: event } = await supabase
  .from('events')
  .select('bracket_locked, bracket_generation_method')
  .eq('id', eventId)
  .single();
```

## 使用者流程

### 自動生成流程
1. Admin 點擊「生成籤表」
2. 系統生成並儲存 matches
3. 記錄 `bracket_generation_method = 'auto'`
4. 可選：自動鎖定籤表
5. ManualBracketEditor 自動載入並顯示

### 編輯流程（已生成）
1. Admin 打開 ManualBracketEditor
2. 看到「籤表已自動生成，目前鎖定」
3. 點擊「解鎖編輯」
4. 填寫解鎖原因（必填）
5. 記錄到 `bracket_edit_history`
6. 解鎖後可以編輯
7. 每次編輯都記錄歷史

### 手動建立流程
1. Admin 使用 ManualBracketEditor 手動分配
2. 儲存時記錄 `bracket_generation_method = 'manual'`
3. 不自動鎖定（因為是手動建立）

## 防作弊機制總結

1. **透明度**：所有編輯都有歷史記錄
2. **審計追蹤**：知道誰、何時、為什麼修改
3. **鎖定機制**：防止意外或惡意修改
4. **原因要求**：解鎖和重大修改需要說明
5. **視覺提示**：清楚顯示籤表狀態

## 建議

建議採用**方案 C（混合方案）**，因為它：
- ✅ 解決了技術問題（載入現有籤表）
- ✅ 提供了防作弊機制
- ✅ 保持了靈活性（可以解鎖編輯）
- ✅ 提供了透明度（歷史記錄）
- ✅ 實作難度適中
