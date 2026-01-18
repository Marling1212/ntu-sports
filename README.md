# 🏆 NTU Sports - 多運動賽事管理系統

台灣大學多運動賽事管理平台，支援網球、足球、籃球等多種運動，提供籤表管理、賽季模式、比賽追蹤、即時公告等功能。

---

## ✨ 功能特色

### 🔐 管理後台
- **多運動支援**：網球、足球、籃球、排球、羽球、桌球、棒球、壘球
- **選手管理**：
  - 新增、編輯、批量匯入選手資料
  - 支援 Email 欄位（選填）
  - 自動偵測 Email 格式
  - 科系、種子序號管理
- **賽事模式**：
  - **單淘汰賽**：傳統籤表模式
    - 自動計算籤表大小（支援任意人數）
    - 種子選手分配規則（1-2 固定，3-4/5-8 隨機）
    - BYE 輪空自動分配
    - 季軍賽選項
  - **賽季模式**：常規賽 + 季後賽
    - 分組循環賽
    - 自動計算戰績（勝場、敗場、積分、得失分差）
    - 季後賽資格自動判定
    - 可設定每組晉級隊伍數
- **比賽管理**：
  - 即時更新比分
  - 自動晉級系統（單淘汰賽）
  - 自動戰績計算（賽季模式）
  - 場地分配（連結場地管理）
  - 手動輸入場地名稱
  - 延賽狀態標記
- **場地管理**：建立和管理比賽場地，連結至比賽
- **自動化公告**：
  - 今日/明日賽程自動顯示
  - 最新公告顯示於首頁
  - 比賽開始時自動發布
  - 每輪完賽自動通知
- **賽事設定**：
  - 可編輯賽事規則
  - 可編輯比賽行程
  - 動態天數管理
  - 支援 Markdown 連結
  - 刪除賽事功能（三重驗證保護）

### 📱 公開頁面
- **多運動首頁**：動態顯示各運動賽事
- **籤表/戰績展示**：
  - 單淘汰賽：視覺化籤表，即時顯示比分
  - 賽季模式：分組戰績表、得失分差、季後賽資格標示
- **賽程表**：
  - 完整的比賽時間安排
  - 今日賽程優先顯示
  - 延賽比賽自動排序至底部
- **公告系統**：
  - 即時賽事公告
  - 今日/明日賽程預告
  - 最新公告顯示於首頁
- **Excel 匯出**：下載完整籤表/戰績
- **動態導航**：根據賽事模式自動切換「籤表」/「戰績」標籤

---

## 🚀 快速開始

### 本地開發（Localhost 安裝與測試）

**重要：助教/老師會完全按照此步驟執行安裝，請務必確保步驟完整且可執行。**

#### 前置需求

- Node.js 18.0 或更高版本
- npm 或 yarn 套件管理器
- Supabase 帳號（用於資料庫）

#### 安裝步驟

1. **Clone 專案**
   ```bash
   git clone <your-repo-url>
   cd final-project
   ```

2. **安裝依賴套件**
   
   使用 npm：
   ```bash
   npm install
   ```
   
   或使用 yarn（推薦，符合課程要求）：
   ```bash
   yarn install
   ```

3. **設定環境變數**
   
   - 複製 `.env.example` 檔案為 `.env.local`：
     ```bash
     cp .env.example .env.local
     ```
   
   - 編輯 `.env.local` 檔案，填入你的 Supabase 專案資訊：
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     ```
   
   - 取得 Supabase 資訊的方式：
     1. 前往 [Supabase Dashboard](https://app.supabase.com)
     2. 選擇或創建專案
     3. 進入 **Settings** → **API**
     4. 複製 **Project URL** → 填入 `NEXT_PUBLIC_SUPABASE_URL`
     5. 複製 **anon public** key → 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **設定資料庫（Supabase Migration）**
   
   在 **Supabase Dashboard** → **SQL Editor** 中，依序執行以下 migration 檔案：
   
   ```sql
   -- 依序執行以下檔案（位於 supabase/migrations/ 目錄）：
   001_initial_schema.sql
   002_seed_tennis_event.sql
   003_fix_organizer.sql
   004_fix_organizer_policy.sql
   005_fix_organizer_select_policy.sql
   006_disable_rls_organizers.sql
   007_add_bye_status.sql
   008_add_event_content.sql
   009_round_announcements_tracking.sql
   010_add_third_place_match.sql
   011_add_tournament_type.sql
   012_add_scheduling_tables.sql
   013_add_scheduling_templates.sql
   014_add_slot_codes.sql
   015_fix_slot_code_unique_constraint.sql
   016_add_delayed_match_status.sql
   017_add_group_to_matches.sql
   018_add_player_email_and_match_reminder.sql
   019_add_event_reminder_config.sql
   020_create_push_subscriptions.sql
   021_add_event_playoff_qualifiers.sql
   022_add_team_support.sql
   023_add_match_player_stats.sql
   024_add_stat_level_support.sql
   025_fix_match_player_stats_unique_constraint.sql
   ```
   
   **注意**：請按照編號順序執行，每個 migration 檔案都包含完整的 SQL 語句，直接複製貼上執行即可。

5. **執行開發伺服器**
   
   使用 yarn（符合課程要求）：
   ```bash
   yarn dev
   ```
   
   或使用 npm：
   ```bash
   npm run dev
   ```

6. **開啟瀏覽器**
   
   開發伺服器啟動後，開啟瀏覽器前往：
   ```
   http://localhost:3000
   ```

#### 測試帳號與使用方式

**管理員註冊與登入：**
1. 前往 `http://localhost:3000/admin/login`
2. 使用 Email 註冊（Supabase 會發送 Magic Link）
3. 點擊 Email 中的連結完成登入
4. 首次登入後，系統會自動將你設為管理員

**測試功能：**
- 創建賽事：Dashboard → Create New Event
- 匯入選手：Players → Bulk Import（可匯入 Excel 或手動新增）
- 生成籤表：Players → Generate Bracket（單淘汰賽）或 Generate Regular Season（賽季模式）
- 管理比賽：Matches → 更新比分、分配場地
- 查看公開頁面：`/sports/[運動名稱]`（如 `/sports/tennis`）

**注意事項：**
- 如果遇到編譯錯誤，請確認 Node.js 版本是否為 18.0 以上
- 如果資料庫連線失敗，請檢查 `.env.local` 中的 Supabase 設定是否正確
- 如果頁面顯示錯誤，請檢查瀏覽器 Console (F12) 的錯誤訊息

---

## 📦 雲端部署

### 部署連結

**Deployed Service URL:** [請填入你的部署連結]

**注意事項：**
- 本服務已部署至 Vercel
- 如需測試帳號，請參考下方「測試帳號與使用方式」章節
- 如有流量或開啟時間限制，請在此說明

### 部署到 Vercel

#### 方法 1: 透過 GitHub（推薦）

1. **推送到 GitHub**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push
   ```

2. **連接 Vercel**
   - 前往 [vercel.com](https://vercel.com)
   - 點擊 "New Project"
   - 選擇你的 repository
   - 設定環境變數（見下方）
   - 點擊 "Deploy"

#### 方法 2: Vercel CLI

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 部署
vercel

# 設定環境變數後部署到生產環境
vercel --prod
```

#### 環境變數設定

在 Vercel Dashboard → Settings → Environment Variables：

```
NEXT_PUBLIC_SUPABASE_URL = [你的 Supabase URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [你的 Supabase Anon Key]
```

**重要：** 雲端部署使用的資料庫可以與 localhost 相同（共用 Supabase 專案），或各自獨立。建議使用相同的 Supabase 專案以便資料同步，但若擔心開發時影響生產資料，可建立獨立的 Supabase 專案。

---

## 🗄️ 資料庫設定

### Supabase 遷移（詳細步驟）

本專案使用 Supabase (PostgreSQL) 作為資料庫。所有 migration 檔案位於 `supabase/migrations/` 目錄。

**執行方式：**
1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 選擇你的專案
3. 進入 **SQL Editor**
4. 依序執行以下 migration 檔案（按照編號順序）：

| 編號 | 檔案名稱 | 說明 |
|------|---------|------|
| 001 | `001_initial_schema.sql` | 基本資料庫架構（events, players, matches, organizers 等） |
| 002 | `002_seed_tennis_event.sql` | 初始網球賽事資料（可選） |
| 003 | `003_fix_organizer.sql` | 修正 organizers 表結構 |
| 004 | `004_fix_organizer_policy.sql` | 修正 RLS 政策 |
| 005 | `005_fix_organizer_select_policy.sql` | 修正查詢政策 |
| 006 | `006_disable_rls_organizers.sql` | 調整 RLS 設定 |
| 007 | `007_add_bye_status.sql` | 新增 BYE 輪空狀態 |
| 008 | `008_add_event_content.sql` | 新增賽事內容欄位 |
| 009 | `009_round_announcements_tracking.sql` | 公告追蹤系統 |
| 010 | `010_add_third_place_match.sql` | 季軍賽支援 |
| 011 | `011_add_tournament_type.sql` | 賽事類型（單淘汰/賽季） |
| 012 | `012_add_scheduling_tables.sql` | 排程系統表 |
| 013 | `013_add_scheduling_templates.sql` | 排程模板 |
| 014 | `014_add_slot_codes.sql` | 時段代碼 |
| 015 | `015_fix_slot_code_unique_constraint.sql` | 修正時段代碼唯一性 |
| 016 | `016_add_delayed_match_status.sql` | 延賽狀態 |
| 017 | `017_add_group_to_matches.sql` | 分組支援（賽季模式） |
| 018 | `018_add_player_email_and_match_reminder.sql` | Email 提醒功能 |
| 019 | `019_add_event_reminder_config.sql` | 提醒設定 |
| 020 | `020_create_push_subscriptions.sql` | 推播訂閱（已棄用，可選） |
| 021 | `021_add_event_playoff_qualifiers.sql` | 季後賽資格設定 |
| 022 | `022_add_team_support.sql` | 隊伍支援 |
| 023 | `023_add_match_player_stats.sql` | 選手統計資料 |
| 024 | `024_add_stat_level_support.sql` | 統計層級支援 |
| 025 | `025_fix_match_player_stats_unique_constraint.sql` | 修正統計唯一性約束 |

**重要提醒：**
- 必須按照編號順序執行，後面的 migration 可能依賴前面的結構
- 每個 migration 檔案都是完整的 SQL 語句，直接複製貼上執行即可
- 執行前建議先備份資料庫（Supabase Dashboard → Settings → Database → Backups）

---

## 📖 使用說明

### 管理員首次使用

1. **註冊管理員**：前往 `/admin/login` → 使用 Email 登入
2. **創建賽事**：Dashboard → Create New Event
   - 選擇運動類型（網球、足球、籃球等）
   - 選擇賽事模式（單淘汰賽 或 賽季模式）
3. **設定場地**：Settings → 場地管理 → 新增場地
4. **匯入選手**：Players → Bulk Import
   - 支援格式：姓名、科系、種子序號、Email（選填）
   - 自動偵測 Email 格式
5. **生成賽事**：
   - **單淘汰賽**：Players → Generate Bracket
   - **賽季模式**：Players → Generate Regular Season
     - 設定分組數
     - 設定每組晉級隊伍數
6. **設定賽事**：Settings → 規則 & 賽程
7. **管理比賽**：Matches → 更新比分、分配場地
8. **發布公告**：Announcements → 新增公告（支援 Markdown）

### 選手/觀眾

1. **查看首頁**：`/sports/[運動名稱]`（如 `/sports/soccer`）
   - 查看今日/明日賽程
   - 查看最新公告
2. **查看籤表/戰績**：`/sports/[運動名稱]/draw`
   - 單淘汰賽：顯示籤表
   - 賽季模式：顯示分組戰績、得失分差、季後賽資格
3. **查看賽程**：`/sports/[運動名稱]/schedule`
   - 完整賽程表
   - 延賽比賽標示
4. **查看公告**：`/sports/[運動名稱]/announcements`
   - 所有公告
   - 今日/明日賽程預告

---

## 🛠️ 技術架構與使用技術

### 核心技術棧

- **前端框架**：Next.js 15 (App Router)
  - 使用最新的 App Router 架構
  - Server Components 與 Client Components 分離
  - 支援 SSR (Server-Side Rendering) 與 SSG (Static Site Generation)
  
- **程式語言**：TypeScript
  - 完整的型別檢查與推斷
  - 提升程式碼可維護性與開發體驗
  
- **樣式框架**：TailwindCSS
  - 響應式設計（RWD）
  - 行動裝置優先設計
  - 自訂主題與色彩系統
  
- **資料庫**：Supabase (PostgreSQL)
  - 關聯式資料庫設計
  - Row Level Security (RLS) 實作
  - 即時資料同步（Real-time Subscriptions）
  
- **認證系統**：Supabase Auth
  - Email Magic Link 登入
  - Session 管理
  - 管理員權限控制
  
- **部署平台**：Vercel
  - 自動 CI/CD
  - 邊緣網路加速
  - 自動 HTTPS

### 第三方套件與框架

| 套件名稱 | 版本 | 用途 |
|---------|------|------|
| `@supabase/ssr` | ^0.5.1 | Supabase Server-Side Rendering 支援 |
| `@supabase/supabase-js` | ^2.39.0 | Supabase JavaScript 客戶端 |
| `react-hot-toast` | ^2.4.1 | 使用者通知提示 |
| `react-markdown` | ^10.1.0 | Markdown 內容渲染 |
| `xlsx` | ^0.18.5 | Excel 檔案讀寫（匯入/匯出） |
| `html2canvas` | ^1.4.1 | HTML 轉圖片（PDF 匯出） |
| `jspdf` | ^3.0.3 | PDF 生成 |
| `jspdf-autotable` | ^5.0.2 | PDF 表格生成 |
| `qrcode.react` | ^4.2.0 | QR Code 生成 |
| `date-fns` | (內建於 Next.js) | 日期時間處理 |

### 程式碼架構說明

**專案結構：**
- `app/` - Next.js App Router 路由與頁面
  - `admin/` - 管理後台（需要認證）
  - `sports/` - 公開運動賽事頁面
  - `api/` - API 路由（Server Actions）
- `components/` - React 元件
  - `admin/` - 管理後台專用元件
  - 公開頁面共用元件
- `lib/` - 工具函數與設定
  - `supabase/` - Supabase 客戶端設定
  - `utils/` - 通用工具函數
- `supabase/migrations/` - 資料庫遷移檔案
- `types/` - TypeScript 型別定義

**設計模式：**
- Server Components 優先，減少客戶端 JavaScript 大小
- Client Components 僅用於需要互動的元件
- 使用 Server Actions 處理表單提交與資料變更
- RLS (Row Level Security) 確保資料安全性

### 使用與參考之框架/模組/原始碼

- **Next.js 官方文件**：https://nextjs.org/docs
- **Supabase 官方文件**：https://supabase.com/docs
- **TailwindCSS 官方文件**：https://tailwindcss.com/docs
- **React 官方文件**：https://react.dev

**參考專案：**
- Next.js App Router 範例專案
- Supabase 官方範例與模板

**注意：** 本專題為從零開始開發，未使用任何現成的專案模板或範例程式碼作為基礎。

---

## 📂 專案結構

```
├── app/                          # Next.js App Router
│   ├── admin/                   # 管理後台
│   │   └── [eventId]/          # 動態賽事管理
│   │       ├── matches/        # 比賽管理
│   │       ├── players/        # 選手管理
│   │       ├── settings/       # 賽事設定
│   │       └── announcements/ # 公告管理
│   ├── sports/                  # 公開頁面
│   │   ├── [sport]/            # 動態運動路由
│   │   │   ├── draw/          # 籤表/戰績
│   │   │   ├── schedule/      # 賽程
│   │   │   └── announcements/ # 公告
│   │   └── tennis/            # 網球專屬頁面
│   ├── api/                     # API 路由
│   │   ├── admin/             # 管理 API
│   │   └── reminders/         # 提醒系統
│   └── layout.tsx
├── components/                  # React 元件
│   ├── admin/                  # 管理元件
│   │   ├── MatchesTable.tsx   # 比賽表格
│   │   ├── PlayersTable.tsx   # 選手表格
│   │   ├── GenerateSeasonPlay.tsx # 賽季生成
│   │   └── ...
│   ├── SeasonPlayDisplay.tsx   # 賽季模式顯示
│   ├── TournamentBracket.tsx   # 單淘汰籤表
│   ├── TennisNavbarClient.tsx  # 動態導航欄
│   └── ...
├── lib/                         # 工具函數
│   ├── supabase/               # Supabase 客戶端
│   └── utils/
│       └── getSportEvent.ts    # 賽事資料獲取
├── supabase/migrations/         # 資料庫遷移
├── types/                       # TypeScript 類型
└── public/                      # 靜態資源
```

---

## 🔒 安全性

- ✅ Row Level Security (RLS) 啟用
- ✅ 管理員權限驗證
- ✅ 環境變數保護
- ✅ HTTPS 強制（Vercel 自動）

---

## 📚 詳細文件

- [部署指南](./DEPLOYMENT_GUIDE.md) - 完整部署說明
- [快速部署](./QUICKSTART_DEPLOY.md) - 10 分鐘快速部署

---

## 🤝 支援

需要協助？請查看：
- Supabase 日誌
- Vercel 建置日誌
- 瀏覽器 Console (F12)

---

## 📄 授權

MIT License - 台大校網 NTU tennis

---

## ✨ 最新功能

### v2.0+ 更新
- ✅ **多運動支援**：網球、足球、籃球、排球、羽球、桌球、棒球、壘球
- ✅ **賽季模式**：常規賽 + 季後賽完整支援
- ✅ **戰績系統**：自動計算勝敗、積分、得失分差
- ✅ **場地管理**：統一管理比賽場地
- ✅ **今日/明日賽程**：自動顯示即將進行的比賽
- ✅ **最新公告**：首頁顯示最新公告
- ✅ **動態導航**：根據賽事模式自動切換標籤
- ✅ **Email 欄位**：選手資料支援 Email（選填）
- ✅ **延賽標記**：支援延賽狀態並自動排序

## 🎯 未來功能

- [ ] 選手統計數據
- [ ] 即時比分推播
- [ ] Email 提醒系統（已實作，待啟用）
- [ ] 行動 App
- [ ] 多語言支援

---

---

## 📹 Demo 影片

**Demo 影片連結：** [請填入你的 Demo 影片連結]

**影片內容：**
- 簡單自介（組別、組員姓名、題目名稱）
- 三句話內介紹專題功能
- Project Demo（完整功能展示）
- 程式碼架構/使用技術介紹

---

## 👥 組員負責項目

**組別：** [39]

| 學號 | 姓名 | 負責項目 | 說明 |
|------|------|---------|------|
| [b12901094] | [安馬林] | [ntu-sports] | [ntu-sports的前端與後端] |
| [D11222008] | [許婷] | [ntu-venue] | [ntu-venue的前端與後端] |
| [B10204007] | [趙華杉] | [matchup-platform] | [matchup-platform的前端與後端] |

**負責項目範例：**
- 前端 UI/UX 設計與實作
- 後端 API 開發與資料庫設計
- 系統架構設計與技術選型
- 部署與 DevOps
- 測試與除錯
- 文件撰寫

**注意：** 如果有找外掛（非修課成員），請務必特別註明，並說明原因與各自貢獻。

---

## 🔗 相關專案

本專題為團隊合作專案，包含三個相互關聯的運動平台，已整合至本網站導航欄：

### 1. 🏆 NTU Sports（本專案）
**負責人：** 安馬林 (b12901094)  
**部署連結：** [https://ntu-sports.vercel.app/](https://ntu-sports.vercel.app/)  
**GitHub：** [https://github.com/Marling1212/ntu-sports](https://github.com/Marling1212/ntu-sports)

**功能概述：**
- 多運動賽事管理系統（網球、足球、籃球、排球、羽球、桌球、棒球、壘球）
- 支援單淘汰賽與賽季模式
- 完整的籤表管理、比賽追蹤、即時公告系統
- 管理後台與公開頁面

**技術棧：**
- Next.js 15 (App Router) + TypeScript
- Supabase (PostgreSQL)
- TailwindCSS
- Vercel 部署

---

### 2. 🏟️ NTU Venue
**負責人：** 許婷 (D11222008)  
**部署連結：** [https://ntu-venue.vercel.app/](https://ntu-venue.vercel.app/)  
**GitHub：** [https://github.com/Kyrielee02/wp1141/tree/main/final-project](https://github.com/Kyrielee02/wp1141/tree/main/final-project)

**功能概述：**
NTU Venue 是一個整合場地Dashboard和場地交換功能的平台，包含：

**場地Dashboard：**
- 即時人數統計（游泳池、健身房）
- 今日人數折線圖
- 場地使用情況（籃球場、排球場）
- 自動化爬蟲系統（每10分鐘更新即時人數，每天更新場地時間表）

**場地交換平台：**
- Google OAuth 登入
- 場地上架功能（提供場地、日期、時間、運動項目）
- 交換請求系統（完整的狀態管理：pending → accepted/rejected → completed）
- 即時對話功能（使用 Pusher 實現即時訊息推送）
- 即時通知系統

**技術棧：**
- Next.js 15+ (App Router) + TypeScript
- NextAuth.js (Google OAuth)
- MongoDB Atlas + Mongoose ODM
- Pusher（即時通訊）
- Recharts（圖表）
- Tailwind CSS
- Vercel 部署

**特色功能：**
- 自動化爬蟲系統（GitHub Actions 定時觸發）
- 即時數據更新（無需重新整理頁面）
- 完整的交換請求狀態管理
- 雙方確認完成機制

---

### 3. 🎯 Match Point - 運動約戰平台
**負責人：** 趙華杉 (B10204007)  
**部署連結：** [https://matchup-platform.vercel.app/](https://matchup-platform.vercel.app/)  
**GitHub：** [https://github.com/MaxChaohs/matchup-platform](https://github.com/MaxChaohs/matchup-platform)

**功能概述：**
一個專為運動愛好者設計的約戰與組隊平台，包含：

**找隊伍（Team Match）：**
- 建立隊伍對戰，邀請其他隊伍一對一較量
- 瀏覽所有公開對戰，找到合適的對手
- 一鍵報名，系統自動交換聯絡資訊

**找隊員（Player Recruitment）：**
- 發布招募貼文，尋找志同道合的隊友
- 瀏覽招募資訊，加入心儀的隊伍
- 填寫自我介紹，讓隊長認識你

**報名管理：**
- 建立者可查看所有報名者清單
- 顯示報名者聯絡方式（Email、電話）
- 接受或拒絕報名，自動更新隊伍人數

**使用者系統：**
- 安全的註冊/登入功能
- 忘記密碼？透過 Email 重設
- 編輯個人資訊、刪除帳號

**篩選與搜尋：**
- 按運動類別篩選（籃球、足球、羽球...）
- 按地區篩選（北部、中部、南部）
- 按時間篩選（週一到週日）
- 關鍵字全文搜尋

**技術棧：**
- **前端：** React 18 + TypeScript + Vite
- **狀態管理：** Zustand
- **樣式：** Tailwind CSS
- **後端：** Express.js (部署為 Vercel Serverless Functions)
- **資料庫：** Supabase (PostgreSQL) + Row Level Security
- **郵件：** Resend API（密碼重設）
- **部署：** Vercel

**系統架構：**
- React SPA（單頁應用程式）
- Vercel Serverless Functions（後端 API）
- Supabase Cloud（PostgreSQL 資料庫）
- Row Level Security（資料安全機制）

---

### 專案整合

三個專案已整合至 NTU Sports 導航欄，使用者可以輕鬆切換：
- **Venue** → NTU Venue（場地資訊與交換平台）
- **matchup** → Match Point（運動約戰平台）
- **首頁** → NTU Sports（賽事管理系統）

三個平台共同構成完整的台大運動生態系統，涵蓋賽事管理、場地資訊與交換、以及約戰組隊等全方位功能。

---

## 📝 專題製作心得

本專題為團隊合作專案，包含三個相互關聯的運動平台（NTU Sports、NTU Venue、Match Point）。在開發過程中，我們遇到了許多挑戰，但也學到了寶貴的技術與經驗。

### 開發過程中的挑戰與解決方式

**技術挑戰：**
- **Next.js App Router 架構**：初次接觸 Next.js 15 的 App Router，Server Components 與 Client Components 的分離概念需要時間理解。透過深入研究官方文檔和實際專案練習，逐漸掌握其設計理念。
- **Supabase RLS 權限設定**：Row Level Security 的實作比預期複雜，需要仔細設計政策以確保資料安全性。透過逐步測試和調整，最終建立了完整的權限系統。
- **三個專案的整合**：將三個獨立開發的專案整合到統一的導航系統是一大挑戰。我們建立了共用的導航元件，確保使用者可以無縫切換不同平台。

**解決方式：**
- 善用 AI 工具（Cursor Pro）協助開發，大幅提升開發效率
- 參考官方文檔和社群資源，逐步解決技術難題
- 團隊成員互相協助，分享解決方案

### 學到的技術與經驗

這門課程讓我見識到現代網頁開發的強大能力。從前端到後端、從資料庫到部署，每個環節都有豐富的工具和框架可以選擇。特別是在實作過程中，我深刻體會到：

- **全端開發的完整流程**：從需求分析、系統設計、實作開發到部署上線，每個階段都有其重要性
- **現代框架的威力**：Next.js 15 的 App Router、Supabase 的即時資料庫、Vercel 的自動部署，這些工具讓開發變得更加高效
- **AI 輔助開發的價值**：使用 Cursor Pro 等 AI 工具，不僅加速了開發速度，也幫助我們學習和理解複雜的技術概念

### 團隊合作的心得

三個專案各自獨立開發，最後整合的過程讓我們學到了：
- **分工合作的重要性**：每個成員專注於自己的專案，可以更深入地實作功能
- **溝通協調的關鍵**：定期開會討論整合方案，確保三個平台可以無縫銜接
- **互相學習的價值**：不同專案使用不同的技術棧（Next.js、React + Vite、MongoDB、Supabase），讓我們有機會接觸更多技術

### 實際應用的價值

這個專題的靈感來自於實際需求——體育主任（我的教練）希望有一個網站來管理賽事。這門課程給了我們實現這個想法的藍圖和工具。從最初的概念到最終的實作，我們不僅完成了期末專題，也創造了一個真正可以使用的系統。

**實際使用情況：**
目前系統已經在實際運作中，網球隊和足球隊基本上已經開始使用這個平台來管理他們的賽事。棒球隊也即將加入使用。看到自己開發的系統真正被使用，並且能夠解決實際問題，這是最有成就感的部分。這也證明了這門課程的價值——不只是完成作業，而是創造出真正有用的工具。

### 未來改進方向

- **統一設計風格**：三個平台目前有各自的設計風格，未來可以建立統一的設計系統
- **加強即時通知功能**：整合三個平台的通知系統，提供更好的使用者體驗
- **優化行動裝置體驗**：進一步改善響應式設計，確保在手機上也有良好的使用體驗
- **擴展功能**：根據實際使用回饋，持續改進和新增功能

### 結語

這門課程不僅教會了我們技術，更重要的是給了我們實現想法的能力。從「想要一個網站」到「真的做出來了」，這個過程充滿挑戰但也非常有成就感。特別感謝 Cursor Pro 等 AI 工具的協助，讓開發過程更加順暢。接下來沒有它感覺會活不下去！期待未來能繼續運用這些技術，創造更多有價值的專案。

---

## 💡 對於此課程的建議

本課程提供了完整的網路服務開發知識，從前端到後端、從資料庫到部署都有涵蓋，內容非常實用且直接應用到專題開發中。老師的教學非常認真，講解清晰，提供了多種技術選項（如 Next.js、Supabase 等），讓我們有機會選擇適合自己專題的技術棧。

**建議增加實作練習：**
在學習過程中，我發現大部分真正學到的東西都是在做作業和專題時，透過實際動手操作才真正理解的。動手操作真的學得比較快，也更能加深印象。因此建議可以在上課時增加更多實作練習的機會，例如：
- 在講解新技術時，可以安排 10-15 分鐘的實作時間，讓同學跟著老師一起寫程式碼
- 可以設計一些小型的實作練習，讓同學在課堂上完成
- 這樣不僅能讓同學更專注於課堂內容，也能讓學習效果更好

**關於課堂專注度的問題：**
目前因為上課主要是講解理論，同學們可能因為沒有立即的實作需求而比較不專注，這對認真教學的老師來說確實不太尊重。如果能在課堂中加入更多互動和實作環節，相信能提升同學的參與度和專注度，也能讓老師的用心教學得到更好的回應。

**整體評價：**
整體而言，這是一門非常實用的課程，不僅教會了我們技術，更重要的是給了我們實現想法的能力。課程內容與實際應用結合得很好，讓我們能夠將所學直接應用到專題開發中。非常感謝老師的認真教學，也期待未來課程能持續改進，讓更多同學受益。

---

## 📋 專題延伸說明

**本專題是否為之前作品/專題的延伸？**

[-] 否，本專題為本學期從零開始開發

[ ] 是，延伸自 [請說明來源專題/作品]



**GitHub Commit 記錄說明：**

本專題為本學期從零開始開發，所有 commit 記錄皆為本學期修課學生所貢獻。三個專案（NTU Sports、NTU Venue、Match Point）各自有獨立的 GitHub repository，所有開發工作皆在本學期完成。

**NTU Sports (本專案) GitHub：**
- Repository: https://github.com/Marling1212/ntu-sports
- 所有 commit 記錄可在 GitHub 上查看，皆為本學期開發過程中的實際貢獻

**注意：** 由於本專題為本學期從零開始開發，且所有組員皆為修課學生，因此無需提供額外的 commit 記錄截圖或說明。

---

## 🔗 相關連結

### NTU Sports（本專案）
- **Deployed Service URL:** [https://ntu-sports.vercel.app/](https://ntu-sports.vercel.app/)
- **GitHub Repo URL:** [https://github.com/Marling1212/ntu-sports](https://github.com/Marling1212/ntu-sports)

### 相關專案
- **NTU Venue:** 
  - 部署連結：[https://ntu-venue.vercel.app/](https://ntu-venue.vercel.app/)
  - GitHub：[https://github.com/Kyrielee02/wp1141/tree/main/final-project](https://github.com/Kyrielee02/wp1141/tree/main/final-project)
- **Match Point (matchup-platform):** 
  - 部署連結：[https://matchup-platform.vercel.app/](https://matchup-platform.vercel.app/)
  - GitHub：[https://github.com/MaxChaohs/matchup-platform](https://github.com/MaxChaohs/matchup-platform)

### 其他連結
- **Demo 影片 URL:** [請填入]
- **FB 社團貼文 URL:** [請填入]

---

**Made with ❤️ for NTU Sports**
