# CSV/Excel 匯入功能整理

本文檔整理整個網站中所有支援 CSV 或 Excel 檔案上傳來匯入大量資料的功能。

---

## 📋 匯入功能總覽

網站中共有 **7 個主要匯入功能**，分佈在以下頁面：

### 1. 選手管理頁面 (`/admin/[eventId]/players`)
### 2. 比賽管理頁面 (`/admin/[eventId]/matches`)
### 3. 排程管理頁面 (`/admin/[eventId]/scheduling`)

---

## 🔍 詳細功能列表

### 1. 📥 選手批量匯入 (BulkPlayerImport)

**位置：** `/admin/[eventId]/players` - Players 頁面

**功能描述：**
- 批量匯入選手資料
- 支援文字貼上（可從 Excel 直接複製貼上）
- 支援 Tab 分隔或逗號分隔格式

**支援格式：**
- 文字輸入（Tab 或逗號分隔）
- 可從 Excel 直接複製貼上

**欄位格式：**
```
姓名, 系級, Email, 種子序號
或
姓名	系級	Email	種子序號
```

**支援的欄位組合：**
- `[name]` - 僅姓名
- `[name, email]` - 姓名 + Email
- `[name, department]` - 姓名 + 系級
- `[name, department, email]` - 姓名 + 系級 + Email
- `[name, department, email, seed]` - 完整格式
- `[name, department, seed, email]` - 種子序號和 Email 順序可互換

**檔案類型：** 文字輸入（支援從 Excel 複製貼上）

**組件檔案：** `components/admin/BulkPlayerImport.tsx`

---

### 2. 📥 隊伍成員批量匯入 (BulkTeamMemberImport)

**位置：** `/admin/[eventId]/players` - Teams 頁面（隊伍詳情）

**功能描述：**
- 批量匯入隊伍成員
- 支援文字貼上（可從 Excel 直接複製貼上）
- 支援 Tab 分隔或逗號分隔格式

**支援格式：**
- 文字輸入（Tab 或逗號分隔）
- 可從 Excel 直接複製貼上

**欄位格式：**
```
姓名, 背號
或
姓名	背號
```

**支援的欄位組合：**
- `[name]` - 僅姓名
- `[name, jersey_number]` - 姓名 + 背號

**檔案類型：** 文字輸入（支援從 Excel 複製貼上）

**組件檔案：** `components/admin/BulkTeamMemberImport.tsx`

---

### 3. 📥 籤表匯入 (ImportBracket)

**位置：** `/admin/[eventId]/players` - Players 頁面（單淘汰賽模式）

**功能描述：**
- 匯入單淘汰賽籤表結構
- 支援從系統匯出的 Excel 範本重新匯入
- 可匯入籤表位置、種子分配、BYE 設定

**支援格式：**
- Excel 檔案 (`.xlsx`, `.xls`)

**欄位要求：**
- 必須使用系統匯出的 Excel 範本格式
- 包含「籤表」工作表
- 欄位：位置、種子、姓名、系級、各輪結果

**特殊功能：**
- 可下載範本 Excel 檔案
- 自動匹配選手姓名
- 支援手動調整選手對應

**檔案類型：** Excel (`.xlsx`, `.xls`)

**組件檔案：** `components/admin/ImportBracket.tsx`

---

### 4. 📥 比賽賽程匯入 (ImportMatchSchedule)

**位置：** `/admin/[eventId]/matches` - Matches 頁面

**功能描述：**
- 匯入比賽日期和比分
- 更新現有比賽的排程和結果
- 支援部分更新（只更新 CSV 中提到的比賽）

**支援格式：**
- CSV 檔案 (`.csv`, `.txt`)

**欄位格式：**
```
日期, 隊伍A, 隊伍B, 比分A, 比分B
或
日期	隊伍A	隊伍B	比分A	比分B
```

**欄位說明：**
- **日期**：比賽日期（格式：YYYY-MM-DD 或 YYYY/MM/DD）
- **隊伍A/隊伍B**：選手或隊伍名稱（必須與系統中的名稱匹配）
- **比分A/比分B**：可選，比分格式如 "2-1"
- **額外欄位**：可包含其他資訊，會被忽略

**特殊功能：**
- 自動忽略「Week X」等標題列
- 根據隊伍名稱匹配現有比賽
- 可選擇是否建立 CSV 中新增的比賽
- 未在 CSV 中提及的比賽保持 TBD 狀態

**檔案類型：** CSV (`.csv`, `.txt`)

**組件檔案：** `components/admin/ImportMatchSchedule.tsx`

---

### 5. 📥 賽季比賽匯入 (ImportSeasonPlay)

**位置：** `/admin/[eventId]/players` - Players 頁面（賽季模式）

**功能描述：**
- 匯入賽季模式的比賽資料
- 支援從系統匯出的 Excel 或 CSV 檔案重新匯入
- 可匯入常規賽比賽、比分、狀態

**支援格式：**
- Excel 檔案 (`.xlsx`, `.xls`)
- CSV 檔案 (`.csv`)

**欄位要求：**
- 必須包含 "Regular Season" 工作表（Excel）
- 或包含對應的 CSV 格式
- 欄位：比賽編號、選手1、選手2、比分、狀態、日期、組別

**特殊功能：**
- 支援 UTF-8、Big5、GB2312 等多種編碼（CSV）
- 自動匹配選手姓名
- 支援手動調整選手對應
- 可從系統匯出的檔案恢復資料

**檔案類型：** Excel (`.xlsx`, `.xls`) 或 CSV (`.csv`)

**組件檔案：** `components/admin/ImportSeasonPlay.tsx`

---

### 6. 📥 賽季組別分配匯入 (ImportSeasonGroups)

**位置：** `/admin/[eventId]/players` - Players 頁面（賽季模式）

**功能描述：**
- 匯入賽季模式的組別分配
- 將選手分配到不同組別進行循環賽

**支援格式：**
- Excel 檔案 (`.xlsx`, `.xls`)

**欄位要求：**
- 必須包含「組別」和「選手姓名」欄位
- 組別欄位必須是數字（1, 2, 3...）
- 選手姓名必須與系統中的姓名完全一致

**欄位格式：**
```
組別, 選手姓名, 系級（選填）
```

**特殊功能：**
- 可下載範本 Excel 檔案
- 自動匹配選手姓名
- 支援手動調整選手對應
- 可設定每組晉級隊伍數

**檔案類型：** Excel (`.xlsx`, `.xls`)

**組件檔案：** `components/admin/ImportSeasonGroups.tsx`

---

### 7. 📥 排程管理 CSV 匯入 (SchedulingManager)

**位置：** `/admin/[eventId]/scheduling` - Scheduling 頁面

**功能描述：**
排程管理頁面包含 **2 個 CSV 匯入功能**：

#### 7.1 每週時段模板匯入

**功能描述：**
- 匯入每週可用的時段模板
- 定義場地、時間、容量等資訊

**支援格式：**
- CSV 檔案 (`.csv`, `.txt`)

**欄位格式：**
```
code, weekday, start_time, end_time, court, capacity, notes
```

**欄位說明：**
- **code**：時段代號（如：SLOT-A）
- **weekday**：星期（0-6、Mon、週一等）
- **start_time**：開始時間（HH:MM 格式）
- **end_time**：結束時間（HH:MM 格式）
- **court**：場地名稱
- **capacity**：容量（選填）
- **notes**：備註（選填）

**特殊功能：**
- 可選擇匯入前清空既有模板
- 自動解析星期和時間格式

#### 7.2 選手不可比賽時段匯入

**功能描述：**
- 匯入選手的不可比賽時段
- 用於自動排程時避開這些時段

**支援格式：**
- CSV 檔案 (`.csv`, `.txt`)

**欄位格式：**
```
player_name, slot_code
```

**欄位說明：**
- **player_name**：選手姓名（必須與系統中的姓名一致）
- **slot_code**：時段代號（必須對應到「每週時段模板」中的代號）

**特殊功能：**
- 每一列代表該選手每週同時段皆不可比賽
- 自動匹配選手姓名和時段代號

**檔案類型：** CSV (`.csv`, `.txt`)

**組件檔案：** `components/admin/SchedulingManager.tsx`

---

## 📊 功能統計

| 功能 | 位置 | 檔案類型 | 支援格式 |
|------|------|----------|----------|
| 選手批量匯入 | Players | 文字輸入 | Tab/逗號分隔 |
| 隊伍成員匯入 | Teams | 文字輸入 | Tab/逗號分隔 |
| 籤表匯入 | Players | Excel | `.xlsx`, `.xls` |
| 比賽賽程匯入 | Matches | CSV | `.csv`, `.txt` |
| 賽季比賽匯入 | Players | Excel/CSV | `.xlsx`, `.xls`, `.csv` |
| 賽季組別匯入 | Players | Excel | `.xlsx`, `.xls` |
| 時段模板匯入 | Scheduling | CSV | `.csv`, `.txt` |
| 不可比賽時段匯入 | Scheduling | CSV | `.csv`, `.txt` |

**總計：8 個匯入功能**

---

## 🎯 使用建議

### 文字輸入匯入（選手、隊伍成員）
- ✅ 最適合少量資料（< 50 筆）
- ✅ 可從 Excel 直接複製貼上
- ✅ 不需要準備檔案

### Excel 匯入（籤表、賽季資料）
- ✅ 最適合大量資料（> 50 筆）
- ✅ 可使用系統匯出的範本
- ✅ 格式較為結構化

### CSV 匯入（賽程、排程）
- ✅ 最適合簡單的表格資料
- ✅ 可用文字編輯器編輯
- ✅ 格式較為靈活

---

## 📝 注意事項

1. **編碼問題**：CSV 檔案建議使用 UTF-8 編碼，系統會自動嘗試多種編碼
2. **姓名匹配**：選手姓名必須與系統中的姓名完全一致（區分大小寫）
3. **範本使用**：建議使用系統匯出的範本檔案，可確保格式正確
4. **備份資料**：匯入前建議先匯出現有資料作為備份
5. **部分更新**：部分匯入功能支援只更新 CSV 中提到的資料，未提及的保持不變

---

## 🔗 相關組件檔案

- `components/admin/BulkPlayerImport.tsx`
- `components/admin/BulkTeamMemberImport.tsx`
- `components/admin/ImportBracket.tsx`
- `components/admin/ImportMatchSchedule.tsx`
- `components/admin/ImportSeasonPlay.tsx`
- `components/admin/ImportSeasonGroups.tsx`
- `components/admin/SchedulingManager.tsx`

---

## 📚 技術實作

- **Excel 處理**：使用 `xlsx` 套件 (v0.18.5)
- **CSV 處理**：自訂解析函數，支援多種編碼
- **檔案上傳**：使用 HTML `<input type="file">` 元素
- **資料驗證**：自動驗證格式和欄位完整性
