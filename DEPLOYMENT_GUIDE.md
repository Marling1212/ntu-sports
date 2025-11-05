# 🚀 部署指南 Deployment Guide

本指南將幫助你將 NTU Sports 網球賽事管理系統部署到線上。

---

## 📋 部署前檢查清單

在開始部署前，請確認：

- ✅ 本地開發環境運行正常
- ✅ 所有功能都已測試
- ✅ Supabase 專案已創建
- ✅ 有 GitHub 帳號（用於 Vercel 部署）

---

## 🗄️ Part 1: Supabase 資料庫設置

### 1.1 執行所有資料庫遷移

前往 **Supabase Dashboard** → **SQL Editor**，按順序執行以下 SQL 檔案：

#### 📄 Migration 1: 基本架構
```sql
-- 執行: supabase/migrations/001_initial_schema.sql
-- 創建所有基本表格（events, players, matches, announcements, organizers）
```

#### 📄 Migration 7: BYE 狀態支援
```sql
-- 執行: supabase/migrations/007_add_bye_status.sql
-- 允許 matches 表格的 status 欄位包含 'bye'
```

#### 📄 Migration 8: 賽事內容管理
```sql
-- 執行: supabase/migrations/008_add_event_content.sql
-- 創建賽事規則和賽程表功能
```

#### 📄 Migration 9: 輪次完賽追蹤
```sql
-- 執行: supabase/migrations/009_round_announcements_tracking.sql
-- 創建自動公告追蹤表
```

#### 📄 Migration 10: 季軍賽支援
```sql
-- 執行: supabase/migrations/010_add_third_place_match.sql
-- 添加季軍賽選項
```

### 1.2 驗證資料庫

在 **Supabase Dashboard** → **Table Editor** 確認以下表格都已創建：

- ✅ `events`
- ✅ `players`
- ✅ `matches`
- ✅ `announcements`
- ✅ `organizers`
- ✅ `tournament_rules`
- ✅ `schedule_items`
- ✅ `round_completion_announcements`

### 1.3 設定 RLS (Row Level Security)

如果遇到 RLS 問題，可以暫時執行：

```sql
-- 臨時禁用 organizers 表的 RLS（僅限開發/測試）
ALTER TABLE organizers DISABLE ROW LEVEL SECURITY;
```

⚠️ **生產環境建議**：正確設定 RLS 策略，不要禁用

---

## 🌐 Part 2: Vercel 部署

### 2.1 推送到 GitHub

1. **創建 GitHub Repository**：
   ```bash
   git init
   git add .
   git commit -m "Initial commit: NTU Sports Tournament System"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ntu-sports.git
   git push -u origin main
   ```

2. **確認 `.gitignore` 包含**：
   ```
   .env.local
   node_modules/
   .next/
   ```

### 2.2 連接 Vercel

1. 前往 [vercel.com](https://vercel.com)
2. 使用 GitHub 帳號登入
3. 點擊 **"New Project"**
4. 選擇你的 GitHub repository
5. 點擊 **"Import"**

### 2.3 設定環境變數

在 Vercel 專案設定中，前往 **Settings** → **Environment Variables**，添加：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的Supabase專案URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名金鑰
```

**如何取得這些值**：
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 前往 **Settings** → **API**
4. 複製：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2.4 部署

1. 點擊 **"Deploy"**
2. 等待建置完成（約 2-3 分鐘）
3. 完成後會得到一個網址（例如：`your-app.vercel.app`）

---

## 🔒 Part 3: Supabase 安全設定

### 3.1 設定允許的網域

在 **Supabase Dashboard** → **Authentication** → **URL Configuration**：

添加你的 Vercel 網址到：
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: 
  - `https://your-app.vercel.app/admin/dashboard`
  - `https://your-app.vercel.app/**`

### 3.2 Email 設定

在 **Supabase Dashboard** → **Authentication** → **Providers** → **Email**：

**選項 1：開發/測試**
- ✅ Enable Email Provider
- ✅ Disable "Confirm email"（方便測試）

**選項 2：生產環境**
- ✅ Enable Email Provider
- ✅ Enable "Confirm email"
- 設定自訂 SMTP（可選）

---

## 🎯 Part 4: 首次設定

### 4.1 創建管理員帳號

1. 前往 `https://your-app.vercel.app/admin/signup`
2. 註冊第一個管理員帳號
3. 登入後會自動創建 organizer 記錄

### 4.2 創建第一個賽事

1. 前往 Dashboard
2. 點擊 **"Create New Event"**
3. 填寫賽事資訊
4. 點擊 **"Create Event"**

### 4.3 設定賽事內容

1. **選手管理** (`/admin/[eventId]/players`)
   - 使用 Bulk Import 匯入選手名單
   - 設定種子選手

2. **生成籤表** (`/admin/[eventId]/players`)
   - 勾選「🥉 舉辦季軍賽」
   - 點擊「🎾 Generate Bracket」

3. **賽事規則** (`/admin/[eventId]/settings`)
   - 添加比賽規則
   - 設定賽程表
   - 填寫賽程說明和聯繫資訊

4. **比賽管理** (`/admin/[eventId]/matches`)
   - 設定比賽場地
   - 輸入比分
   - 選擇勝者（自動晉級）

---

## 🌍 Part 5: 自訂網域（選用）

### 5.1 在 Vercel 添加網域

1. 前往 Vercel 專案 → **Settings** → **Domains**
2. 點擊 **"Add"**
3. 輸入你的網域（例如：`tennis.ntu.edu.tw`）
4. 按照指示設定 DNS 記錄

### 5.2 更新 Supabase

在 Supabase 的 **URL Configuration** 中添加你的自訂網域

---

## 🔧 常見問題

### Q1: "Your project's URL and Key are required..."
**解決方案**：檢查 Vercel 環境變數是否正確設定

### Q2: "Invalid login credentials"
**解決方案**：
1. 檢查 Supabase Email 設定
2. 確認帳號已創建
3. 如果啟用了 Email Confirmation，檢查信箱

### Q3: "Could not find the table..."
**解決方案**：確認所有資料庫遷移都已執行

### Q4: 資料沒有即時更新
**解決方案**：檢查以下檔案是否有設定：
```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

### Q5: RLS 錯誤
**解決方案**：
```sql
-- 臨時解決（開發用）
ALTER TABLE organizers DISABLE ROW LEVEL SECURITY;

-- 長期解決：正確設定 RLS 策略
```

---

## 📱 Part 6: 測試部署

### 公開頁面測試：
- ✅ `/` - 首頁
- ✅ `/sports/tennis` - Tennis 首頁
- ✅ `/sports/tennis/draw` - 籤表
- ✅ `/sports/tennis/schedule` - 賽程表
- ✅ `/sports/tennis/announcements` - 公告

### Admin 頁面測試：
- ✅ `/admin/login` - 登入
- ✅ `/admin/signup` - 註冊
- ✅ `/admin/dashboard` - 儀表板
- ✅ `/admin/[eventId]/players` - 選手管理
- ✅ `/admin/[eventId]/matches` - 比賽管理
- ✅ `/admin/[eventId]/announcements` - 公告管理
- ✅ `/admin/[eventId]/settings` - 賽事設定

---

## 🎉 完成！

你的網球賽事管理系統現在已經上線了！

**下一步**：
1. 🎾 分享公開頁面網址給選手
2. 👥 邀請其他管理員（他們可以用 `/admin/signup` 註冊）
3. 📱 監控比賽進度，即時更新比分

---

## 📞 需要協助？

如果遇到部署問題：
1. 檢查 Vercel 的建置日誌（Build Logs）
2. 檢查瀏覽器的 Console（F12）
3. 檢查 Supabase 的 Logs
4. 參考 Next.js 和 Supabase 官方文件

---

## 🔄 更新部署

當你更新程式碼後：

```bash
git add .
git commit -m "Update: [描述你的更改]"
git push
```

Vercel 會自動偵測並重新部署！✨

