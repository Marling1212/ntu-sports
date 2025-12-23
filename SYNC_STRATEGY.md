# 雙 Repo 同步策略

## 問題說明

你的專案有兩個 repo：
1. **原本的 repo** (`Marling1212/ntu-sports`) - 連接到 Vercel deployment
2. **wp1141 repo** (`Marling1212/wp1141/final-project`) - 期末專題繳交用

如果只在 wp1141 repo 開發，Vercel 不會自動更新。以下是幾種解決方案：

---

## 方案 1：保持兩個 Repo 同步（推薦）⭐

### 策略
- **開發時**：在原本的 repo (`ntu-sports`) 開發和 push
- **同步時**：定期將變更同步到 `wp1141/final-project`
- **Deployment**：Vercel 自動從原本的 repo 部署

### 優點
- ✅ 保持 Vercel deployment 自動更新
- ✅ 開發流程不變
- ✅ 兩個 repo 都有最新程式碼

### 實作方式

#### 方法 A：使用自動同步腳本（推薦）

我已經為你建立了 `sync-to-wp1141.ps1` 腳本，可以：
- 自動偵測變更
- 只複製有變更的檔案
- 在 wp1141 repo 中自動 commit 和 push

**使用方式：**
```powershell
# 在原本的 repo 中執行
.\sync-to-wp1141.ps1
```

#### 方法 B：手動同步

每次在原本的 repo push 後，手動執行複製腳本：
```powershell
.\quick-copy.ps1
cd C:\Users\maste\wp1141
git add final-project
git commit -m "Sync from main repo"
git push
```

---

## 方案 2：將 Vercel 連接到 wp1141 Repo

### 策略
- 將 Vercel 專案重新連接到 `wp1141` repo
- 設定 Root Directory 為 `final-project`
- 之後只在 wp1141 repo 開發

### 步驟

1. **在 Vercel Dashboard**：
   - 進入你的專案設定
   - Settings → Git → Disconnect Repository
   - 重新連接 `Marling1212/wp1141` repo
   - 在 **Root Directory** 設定為 `final-project`

2. **更新環境變數**（如果需要）

### 優點
- ✅ 只需要一個 repo
- ✅ 自動部署

### 缺點
- ⚠️ 需要重新設定 Vercel
- ⚠️ 原本的 repo 就沒有用了

---

## 方案 3：使用 Git Subtree（進階）

### 策略
- 使用 Git Subtree 保持兩個 repo 的關聯
- 可以從原本的 repo push 到 wp1141 repo 的特定目錄

### 設定（只需一次）

```bash
# 在原本的 repo 中
git remote add wp1141 https://github.com/Marling1212/wp1141.git

# 推送整個專案到 wp1141 的 final-project 目錄
git subtree push --prefix=. wp1141 main:final-project
```

### 之後每次同步

```bash
# 在原本的 repo 中，每次 push 後執行
git subtree push --prefix=. wp1141 main:final-project
```

### 優點
- ✅ 保持 Git 歷史記錄
- ✅ 可以雙向同步

### 缺點
- ⚠️ 設定較複雜
- ⚠️ 需要處理衝突

---

## 方案 4：只在 Deadline 前複製一次

### 策略
- 平時在原本的 repo 正常開發
- 只在 deadline (12/23) 前複製一次到 wp1141

### 優點
- ✅ 最簡單
- ✅ 不需要維護兩個 repo

### 缺點
- ⚠️ wp1141 repo 可能不是最新版本
- ⚠️ 如果 deadline 後需要修正，需要手動同步

---

## 推薦方案

**我建議使用「方案 1：保持兩個 Repo 同步」**，因為：

1. **開發流程不變**：繼續在原本的 repo 開發，Vercel 自動部署
2. **定期同步**：每週或每次重要更新後，執行一次同步腳本
3. **兩個 repo 都有最新版本**：符合期末專題要求

### 建議的同步時機

- ✅ 每次重要功能完成後
- ✅ 每週一次（確保 wp1141 repo 不會太舊）
- ✅ Deadline 前最後一次完整同步

---

## 快速開始

1. **第一次複製**（現在）：
   ```powershell
   .\quick-copy.ps1
   ```

2. **之後每次同步**：
   ```powershell
   .\sync-to-wp1141.ps1
   ```

3. **檢查同步結果**：
   ```powershell
   cd C:\Users\maste\wp1141
   git log --oneline final-project
   ```

---

## 注意事項

1. **不要直接在 wp1141/final-project 開發**：避免兩個 repo 版本不一致
2. **同步前先 commit**：確保原本的 repo 有 commit，避免遺失變更
3. **檢查 .env.example**：確保已複製到 wp1141 repo
4. **測試 wp1141 repo**：同步後可以測試 `yarn dev` 是否正常
