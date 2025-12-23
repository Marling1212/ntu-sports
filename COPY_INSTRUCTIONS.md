# 複製到 wp1141 repo 的步驟

## 步驟 1：確認或 Clone wp1141 repo

### 如果還沒有 wp1141 repo：

```powershell
# 在 PowerShell 中執行
cd C:\Users\maste
git clone <your-wp1141-repo-url> wp1141
```

### 如果已經有 wp1141 repo：

確認路徑是否為 `C:\Users\maste\wp1141`，如果不是，請修改 `quick-copy.ps1` 中的路徑。

---

## 步驟 2：執行複製腳本

### 方法 1：直接在 PowerShell 中執行（推薦）

1. **打開 PowerShell**
2. **切換到專案目錄**：
   ```powershell
   cd "C:\Users\maste\OneDrive\Desktop\網路服務\Final"
   ```
   
3. **執行腳本**：
   ```powershell
   .\quick-copy.ps1
   ```

4. **按照提示操作**：
   - 確認是否繼續（輸入 `y`）
   - 如果目標目錄已存在，選擇是否覆蓋（輸入 `y`）

### 方法 2：如果路徑有問題，手動執行

如果 PowerShell 路徑編碼有問題，可以：

1. **打開檔案總管**
2. **進入專案目錄**：`C:\Users\maste\OneDrive\Desktop\網路服務\Final`
3. **右鍵點擊 `quick-copy.ps1`**
4. **選擇「使用 PowerShell 執行」**

---

## 步驟 3：在 wp1141 repo 中提交

複製完成後：

```powershell
# 進入 wp1141 repo
cd C:\Users\maste\wp1141

# 檢查檔案
cd final-project
ls

# 回到 wp1141 根目錄
cd ..

# 提交到 Git
git add final-project
git commit -m "Add final project"
git push
```

---

## 步驟 4：驗證

1. **檢查檔案是否都已複製**
2. **確認 `.env.example` 已複製**
3. **測試是否可以運行**：
   ```powershell
   cd final-project
   yarn install
   yarn dev
   ```

---

## 如果遇到問題

### 問題 1：找不到 wp1141 repo

**解決方法：**
- 確認 repo 是否已 clone
- 確認路徑是否正確
- 修改 `quick-copy.ps1` 中的 `$wp1141Path` 變數

### 問題 2：執行權限問題

**解決方法：**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 問題 3：路徑編碼問題

**解決方法：**
- 使用檔案總管右鍵執行
- 或使用絕對路徑

---

## 注意事項

1. **複製前先 commit 當前變更**：
   ```powershell
   git add .
   git commit -m "Update README.md and prepare for submission"
   ```

2. **確認所有重要檔案都已更新**：
   - README.md
   - .env.example
   - ChangeLog.md
   - eval.txt

3. **複製後檢查**：
   - 確認所有檔案都在
   - 確認沒有遺漏重要檔案
   - 確認 `.env.example` 已複製

