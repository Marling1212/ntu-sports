# ⚡ 快速部署步驟

## 🎯 10 分鐘部署到線上

---

### Step 1: Supabase 資料庫 (5 分鐘)

1. **打開 Supabase Dashboard**
   - 前往：https://supabase.com/dashboard
   - 選擇你的專案

2. **執行 SQL 遷移**
   - 點擊左側 **SQL Editor**
   - 點擊 **"New Query"**
   - 複製貼上以下檔案的內容並執行：
   
   ```
   ✅ supabase/migrations/001_initial_schema.sql
   ✅ supabase/migrations/007_add_bye_status.sql
   ✅ supabase/migrations/008_add_event_content.sql
   ✅ supabase/migrations/009_round_announcements_tracking.sql
   ✅ supabase/migrations/010_add_third_place_match.sql
   ```

3. **驗證**
   - 點擊左側 **Table Editor**
   - 確認所有表格都已創建

---

### Step 2: GitHub 推送 (2 分鐘)

```bash
# 初始化 Git（如果還沒做過）
git init

# 添加所有檔案
git add .

# 提交
git commit -m "Initial deployment"

# 創建 GitHub repository 後連接
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 推送
git branch -M main
git push -u origin main
```

---

### Step 3: Vercel 部署 (3 分鐘)

1. **前往 Vercel**
   - https://vercel.com
   - 使用 GitHub 登入

2. **匯入專案**
   - 點擊 **"New Project"**
   - 選擇你的 GitHub repository
   - 點擊 **"Import"**

3. **設定環境變數**
   - 在 **Environment Variables** 區域添加：
   
   ```
   NEXT_PUBLIC_SUPABASE_URL = [你的 Supabase URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [你的 Supabase Anon Key]
   ```
   
   從 Supabase Dashboard → Settings → API 取得這些值

4. **部署**
   - 點擊 **"Deploy"**
   - 等待 2-3 分鐘

5. **完成！**
   - 你會得到一個網址：`https://your-app.vercel.app`

---

### Step 4: 首次使用

1. **創建管理員**
   - 前往：`https://your-app.vercel.app/admin/signup`
   - 註冊管理員帳號

2. **創建賽事**
   - 登入後前往 Dashboard
   - 點擊 "Create New Event"

3. **設定賽事**
   - Players → 匯入選手
   - Players → Generate Bracket
   - Settings → 設定規則和賽程
   - Matches → 管理比賽

4. **分享給選手**
   - 公開籤表：`https://your-app.vercel.app/sports/tennis/draw`
   - 賽程表：`https://your-app.vercel.app/sports/tennis/schedule`

---

## 🎉 完成！

你的網球賽事管理系統已經上線了！

**重要連結**：
- 📱 公開首頁：`https://your-app.vercel.app`
- 🔐 管理後台：`https://your-app.vercel.app/admin/login`

---

## 🔄 如何更新？

當你修改程式碼後：

```bash
git add .
git commit -m "更新說明"
git push
```

Vercel 會自動重新部署！✨

---

## ⚠️ 重要提醒

1. **不要提交 `.env.local`** 到 GitHub（已在 .gitignore 中）
2. **環境變數只在 Vercel 設定**，不要寫在程式碼中
3. **第一次部署後記得創建管理員帳號**
4. **定期備份 Supabase 資料庫**

---

需要幫助？查看完整的 `DEPLOYMENT_GUIDE.md` 或聯繫技術支援。



