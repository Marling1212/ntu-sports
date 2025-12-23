# 期末專題待辦事項清單

## 📋 總覽

根據期末專題要求，以下是所有需要完成的事項。請在 deadline (12/23 9pm) 前完成。

---

## ✅ 已完成項目

- [x] 創建 `.env.example` 檔案
- [x] 更新 `README.md` 基本結構（包含安裝步驟、技術架構等）
- [x] 創建 `ChangeLog.md` 模板
- [x] 創建 `eval.txt` 模板
- [x] 確認 `package.json` 支援 `yarn dev`
- [x] 建立複製/同步腳本

---

## 📝 文件準備（必須完成）

### 1. README.md 需要填入的內容

- [ ] **Deployed Service URL**
  - 填入你的 Vercel 部署連結
  - 位置：README.md 中的「部署連結」章節

- [ ] **Demo 影片連結**
  - 位置：README.md 中的「Demo 影片」章節
  - 先錄製影片後再填入

- [ ] **組別編號**
  - 位置：README.md 中的「組員負責項目」章節

- [ ] **組員負責項目表格**
  - 位置：README.md 中的「組員負責項目」章節
  - 需要填入：
    - 每位組員的學號
    - 每位組員的姓名
    - 每位組員的負責項目
    - 詳細說明

- [ ] **專題製作心得**
  - 位置：README.md 中的「專題製作心得」章節
  - 包含：挑戰、解決方式、學到的技術、團隊合作心得、未來改進方向

- [ ] **對於此課程的建議**
  - 位置：README.md 中的「對於此課程的建議」章節

- [ ] **專題延伸說明**
  - 位置：README.md 中的「專題延伸說明」章節
  - 如果是延伸專題，需要說明本學期的貢獻
  - 提供 GitHub commit 記錄說明

- [ ] **相關連結**
  - 位置：README.md 中的「相關連結」章節
  - 需要填入：
    - Deployed Service URL
    - GitHub Repo URL（如果是 public repo）
    - Demo 影片 URL
    - FB 社團貼文 URL

### 2. eval.txt（組員互評表）

- [ ] 與組員討論後，填入：
  - 組別編號
  - 每位修課組員的學號
  - 每位組員的貢獻分數（總和必須為 100.0）

---

## 🎬 Demo 影片（必須完成）

- [ ] **錄製 Demo 影片**
  - 長度：不超過 6 分鐘
  - 內容必須包含：
    - [ ] 簡單自介（組別、組員姓名、題目名稱）
    - [ ] 三句話內介紹專題功能
    - [ ] Project Demo（完整功能展示）
    - [ ] 程式碼架構/使用技術介紹
  - Optional：動機/心得、投影片或其他輔助說明

- [ ] **上傳 Demo 影片**
  - 上傳至雲端空間（NTU G Suite, Youtube, Vimeo, FB 等）
  - 取得影片連結

- [ ] **填入 README.md**
  - 將影片連結填入 README.md

---

## 📱 FB 社團貼文（必須完成）

- [ ] **加入 FB 社團**
  - 至少一名組員加入 [NTU Web Programming FB 社團](https://www.facebook.com/groups/NTURicWebProg)
  - 等待入社申請通過（十二月開始處理）

- [ ] **發文內容**（按照順序）：
  - [ ] 第一行：`[114-1] Web Programming Final`
  - [ ] 專題題目名稱（格式：`(Group xx) Your Title`）
  - [ ] Demo 影片連結
  - [ ] 描述這個服務在做什麼
  - [ ] Deployed 連結（如有安全疑慮可省略）
  - [ ] 使用/操作方式（如有 deployed 連結）
  - [ ] GitHub link（如果有 public repo，不要給 private wp1141 repo）
  - [ ] 其他說明
  - [ ] 使用與參考之框架/模組/原始碼
  - [ ] 使用之第三方套件、框架、程式碼
  - [ ] 專題製作心得

- [ ] **取得貼文連結**
  - 發文後取得貼文 URL
  - 填入 README.md 的「相關連結」章節

---

## 📝 Google Form 填寫（必須完成）

- [ ] **填寫期末專題繳交資訊收集表**
  - 連結：https://forms.gle/voofXL9WsdbZwGNM8
  - 12/10 後開放填寫
  - 需要在 12/23 9pm 前完成
  - 需要填入：
    - 組別
    - 組長中文姓名
    - 題目名稱
    - Deployed service 網址
    - Github Repo 網址
    - Demo 影片網址
    - FB 社團貼文網址
    - (Optional) 其他想提醒老師與助教評分之事項

---

## 🔄 GitHub Repo 設定（必須完成）

### 第一次複製到 wp1141 repo

- [ ] **Clone wp1141 repo**（如果還沒有的話）
  ```bash
  git clone <your-wp1141-repo-url> C:\Users\maste\wp1141
  ```

- [ ] **執行第一次複製**
  ```powershell
  .\quick-copy.ps1
  ```
  - 記得先修改腳本中的 `$wp1141Path` 變數

- [ ] **在 wp1141 repo 中提交**
  ```bash
  cd C:\Users\maste\wp1141
  git add final-project
  git commit -m "Add final project"
  git push
  ```

- [ ] **驗證複製結果**
  - 確認所有檔案都已複製
  - 確認 `.env.example` 已複製
  - 測試 `yarn dev` 是否可以運行

### 之後的同步（建議定期執行）

- [ ] **定期同步到 wp1141 repo**
  - 使用 `.\sync-to-wp1141.ps1` 腳本
  - 建議時機：
    - 每次重要功能完成後
    - 每週一次
    - Deadline 前最後一次完整同步

---

## 🚀 部署與測試（必須完成）

### 雲端部署

- [ ] **確認 Vercel 部署正常**
  - 檢查部署連結是否可以正常訪問
  - 測試主要功能是否正常運作
  - 確認沒有錯誤

- [ ] **提供測試帳號**（如果需要登入）
  - 在 README.md 中說明測試帳號
  - 或在 Google Form 的備註中說明

- [ ] **檢查流量/時間限制**
  - 如有限制，在 README.md 中說明
  - 在 Google Form 的備註中說明
  - 提供網管聯絡方式

### 地端測試

- [ ] **確認 localhost 可以運行**
  - 按照 README.md 的步驟執行
  - 確認 `yarn dev` 可以正常啟動
  - 確認所有功能正常運作

- [ ] **測試安裝步驟**
  - 請其他組員或朋友按照 README.md 的步驟安裝
  - 確認步驟完整且可執行
  - 如有問題，修正 README.md

---

## 📅 重要時程

### 期中 Review（12/05 9pm）

- [ ] **完成 Prototype**
  - 部署到雲端
  - 基本框架和功能
  - 簡單頁面
  - 示範性功能（placeholder OK）

- [ ] **繳交項目**
  - [ ] Deployed link for project prototype
  - [ ] 預期開發項目與進度（in "plan.md"）

### 期末 Deadline（12/23 9pm）

- [ ] **所有文件完成**
- [ ] **Demo 影片上傳**
- [ ] **FB 社團貼文**
- [ ] **Google Form 填寫**
- [ ] **GitHub 程式碼 push 到 wp1141/final-project**
- [ ] **Deployed version 正常運作**

---

## 🔍 檢查清單（Deadline 前最後檢查）

### 文件檢查

- [ ] README.md 所有待填項目都已填入
- [ ] eval.txt 已填寫且格式正確（總和為 100.0）
- [ ] ChangeLog.md 已準備（雖然可能還是空的）

### 程式碼檢查

- [ ] 所有程式碼已 push 到 GitHub
- [ ] wp1141/final-project 目錄下有完整專案
- [ ] `.env.example` 已存在
- [ ] `yarn dev` 可以正常運行

### 部署檢查

- [ ] 雲端部署正常運作
- [ ] 所有功能都可以正常使用
- [ ] 沒有明顯的錯誤或 bug

### 連結檢查

- [ ] Deployed Service URL 可訪問
- [ ] Demo 影片連結可播放
- [ ] FB 社團貼文連結可訪問
- [ ] GitHub Repo 連結可訪問（如果是 public）

---

## 📊 進度追蹤

**總進度：** [ ] 0% → [ ] 25% → [ ] 50% → [ ] 75% → [ ] 100%

**建議優先順序：**

1. **高優先級（必須完成）**：
   - GitHub Repo 設定（第一次複製）
   - README.md 基本內容填入
   - Demo 影片錄製與上傳
   - FB 社團貼文
   - Google Form 填寫

2. **中優先級（建議完成）**：
   - 組員互評表（eval.txt）
   - 專題製作心得
   - 定期同步到 wp1141 repo

3. **低優先級（可選）**：
   - 課程建議
   - 其他說明

---

## 💡 提示

1. **不要等到最後一刻**：很多項目需要時間準備（如 Demo 影片）
2. **定期同步**：不要等到 deadline 才同步到 wp1141 repo
3. **測試很重要**：確保助教可以按照 README.md 成功安裝
4. **檢查連結**：所有連結都要可以正常訪問

---

**最後更新：** 2024-12-21
