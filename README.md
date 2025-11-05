# 🎾 NTU Sports - 網球賽事管理系統

台灣大學網球賽事管理平台，提供籤表管理、比賽追蹤、即時公告等功能。

---

## ✨ 功能特色

### 🔐 管理後台
- **選手管理**：新增、編輯、批量匯入選手資料
- **智能籤表生成**：
  - 自動計算籤表大小（支援任意人數）
  - 種子選手分配規則（1-2 固定，3-4/5-8 隨機）
  - BYE 輪空自動分配
  - 季軍賽選項
- **比賽管理**：
  - 即時更新比分
  - 自動晉級系統
  - 場地分配
- **自動化公告**：
  - 比賽開始時自動發布
  - 每輪完賽自動通知
- **賽事設定**：
  - 可編輯賽事規則
  - 可編輯比賽行程
  - 動態天數管理
  - 支援 Markdown 連結

### 📱 公開頁面
- **籤表展示**：視覺化籤表，即時顯示比分
- **賽程表**：完整的比賽時間安排
- **公告系統**：即時賽事公告
- **Excel 匯出**：下載完整籤表

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

在 **Supabase Dashboard** → **SQL Editor** 執行：

1. `supabase/migrations/001_initial_schema.sql` - 基本架構
2. `supabase/migrations/007_add_bye_status.sql` - BYE 狀態
3. `supabase/migrations/008_add_event_content.sql` - 賽事內容
4. `supabase/migrations/009_round_announcements_tracking.sql` - 公告追蹤
5. `supabase/migrations/010_add_third_place_match.sql` - 季軍賽

---

## 📖 使用說明

### 管理員首次使用

1. **註冊管理員**：前往 `/admin/signup`
2. **創建賽事**：Dashboard → Create New Event
3. **匯入選手**：Players → Bulk Import
4. **生成籤表**：Players → Generate Bracket
5. **設定賽事**：Settings → 規則 & 賽程
6. **管理比賽**：Matches → 更新比分

### 選手/觀眾

1. **查看籤表**：`/sports/tennis/draw`
2. **查看賽程**：`/sports/tennis/schedule`
3. **查看公告**：`/sports/tennis/announcements`

---

## 🛠️ 技術架構

- **框架**：Next.js 15 (App Router)
- **語言**：TypeScript
- **樣式**：TailwindCSS
- **資料庫**：Supabase (PostgreSQL)
- **認證**：Supabase Auth
- **部署**：Vercel
- **套件**：
  - `react-hot-toast` - 通知提示
  - `react-markdown` - Markdown 支援
  - `xlsx` - Excel 匯出

---

## 📂 專案結構

```
├── app/                    # Next.js App Router
│   ├── admin/             # 管理後台
│   ├── sports/tennis/     # 公開頁面
│   └── layout.tsx
├── components/            # React 元件
│   ├── admin/            # 管理元件
│   └── ...
├── lib/                   # 工具函數
│   ├── supabase/         # Supabase 客戶端
│   └── utils/
├── supabase/migrations/   # 資料庫遷移
├── types/                 # TypeScript 類型
└── public/               # 靜態資源
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

MIT License - 台灣大學網球社

---

## 🎯 未來功能

- [ ] 多運動支援（籃球、羽球等）
- [ ] 選手統計數據
- [ ] 即時比分推播
- [ ] 行動 App

---

**Made with ❤️ for NTU Sports**
