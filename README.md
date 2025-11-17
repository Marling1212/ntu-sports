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

### 本地開發

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **設定環境變數**
   
   創建 `.env.local` 檔案：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **執行開發伺服器**
   ```bash
   npm run dev
   ```

4. **開啟瀏覽器**
   ```
   http://localhost:3000
   ```

---

## 📦 部署到 Vercel

### 方法 1: 透過 GitHub（推薦）

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

### 方法 2: Vercel CLI

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

### 環境變數設定

在 Vercel Dashboard → Settings → Environment Variables：

```
NEXT_PUBLIC_SUPABASE_URL = [你的 Supabase URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [你的 Supabase Anon Key]
```

---

## 🗄️ 資料庫設定

### Supabase 遷移

在 **Supabase Dashboard** → **SQL Editor** 依序執行所有遷移檔案：

1. `001_initial_schema.sql` - 基本架構
2. `007_add_bye_status.sql` - BYE 狀態
3. `008_add_event_content.sql` - 賽事內容
4. `009_round_announcements_tracking.sql` - 公告追蹤
5. `010_add_third_place_match.sql` - 季軍賽
6. `011_add_season_play_tables.sql` - 賽季模式支援
7. `012_add_scheduling_tables.sql` - 排程系統
8. `013_add_delayed_status.sql` - 延賽狀態
9. `014_add_event_courts.sql` - 場地管理
10. `015_add_announcements_table.sql` - 公告系統
11. `016_add_delayed_match_status.sql` - 延賽狀態修正
12. `017_add_event_sport_column.sql` - 多運動支援
13. `018_add_player_email_and_match_reminder.sql` - Email 提醒
14. `019_add_event_reminder_config.sql` - 提醒設定
15. `020_create_push_subscriptions.sql` - 推播訂閱（已棄用）
16. `021_add_event_playoff_qualifiers.sql` - 季後賽資格設定

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

## 🛠️ 技術架構

- **框架**：Next.js 15 (App Router)
- **語言**：TypeScript
- **樣式**：TailwindCSS
- **資料庫**：Supabase (PostgreSQL)
- **認證**：Supabase Auth (Email Magic Link)
- **部署**：Vercel (自動部署)
- **時區處理**：Asia/Taipei
- **套件**：
  - `react-hot-toast` - 通知提示
  - `react-markdown` - Markdown 支援
  - `xlsx` - Excel 匯出
  - `date-fns` - 日期處理

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

**Made with ❤️ for NTU Sports**
