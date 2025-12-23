# 如何將專案複製到 wp1141/final-project

根據期末專題要求，需要將專案放在 `wp1141` repo 的 `final-project` 目錄下。以下是幾種方法：

## 方法 1：使用提供的腳本（推薦）

### Windows (PowerShell)

1. 確保你已經 clone 了 `wp1141` repo 到本地
2. 在當前專案目錄執行：
   ```powershell
   .\copy-to-wp1141.ps1
   ```
3. 輸入 `wp1141` repo 的本地路徑
4. 按照提示完成複製

### Linux/Mac (Bash)

1. 確保你已經 clone 了 `wp1141` repo 到本地
2. 在當前專案目錄執行：
   ```bash
   chmod +x copy-to-wp1141.sh
   ./copy-to-wp1141.sh
   ```
3. 輸入 `wp1141` repo 的本地路徑
4. 按照提示完成複製

## 方法 2：手動複製（最簡單）

### 步驟：

1. **Clone wp1141 repo**（如果還沒有的話）：
   ```bash
   git clone <your-wp1141-repo-url>
   cd wp1141
   ```

2. **建立 final-project 目錄**：
   ```bash
   mkdir final-project
   cd final-project
   ```

3. **複製當前專案的所有檔案**（排除不需要的）：
   
   **Windows (PowerShell)**：
   ```powershell
   # 從當前專案目錄執行
   $source = "C:\Users\maste\OneDrive\Desktop\網路服務\Final"
   $target = "C:\path\to\wp1141\final-project"
   
   # 複製所有檔案，排除 .git, node_modules 等
   Get-ChildItem -Path $source -Exclude @('.git', 'node_modules', '.next', 'out', 'build', '.vercel', '.env.local', '.env', '*.log') | 
       Copy-Item -Destination $target -Recurse -Force
   ```
   
   **Linux/Mac**：
   ```bash
   # 從當前專案目錄執行
   rsync -av --progress \
       --exclude='.git' \
       --exclude='node_modules' \
       --exclude='.next' \
       --exclude='out' \
       --exclude='build' \
       --exclude='.vercel' \
       --exclude='.env.local' \
       --exclude='.env' \
       --exclude='*.log' \
       ./ /path/to/wp1141/final-project/
   ```

4. **在 wp1141 repo 中提交**：
   ```bash
   cd /path/to/wp1141
   git add final-project
   git commit -m "Add final project"
   git push
   ```

## 方法 3：使用 Git Subtree（進階）

如果你想保持兩個 repo 的歷史記錄：

```bash
# 在 wp1141 repo 中
cd /path/to/wp1141
git subtree add --prefix=final-project <current-repo-url> main --squash
```

## 方法 4：直接 Push 到 wp1141 repo（如果當前 repo 就是 wp1141）

如果你想把當前專案直接推送到 wp1141 repo 的 final-project 目錄：

```bash
# 1. 添加 wp1141 repo 作為 remote
git remote add wp1141 <wp1141-repo-url>

# 2. 推送到 wp1141 repo 的 final-project 分支
git push wp1141 main:final-project

# 或者在 wp1141 repo 中建立 final-project 目錄後，直接 push
```

## 注意事項

1. **不要複製的檔案/目錄**：
   - `.git/` - Git 歷史記錄
   - `node_modules/` - 依賴套件（可以用 `npm install` 重新安裝）
   - `.next/`, `out/`, `build/` - 建置產物
   - `.env.local`, `.env` - 本地環境變數（但 `.env.example` 要複製）
   - `.vercel/` - Vercel 設定

2. **需要複製的重要檔案**：
   - 所有原始碼（`app/`, `components/`, `lib/` 等）
   - `package.json`, `tsconfig.json` 等設定檔
   - `README.md`, `ChangeLog.md`, `eval.txt` 等文件
   - `.env.example` 環境變數範例
   - `supabase/migrations/` 資料庫遷移檔案

3. **複製後記得**：
   - 在 `final-project` 目錄執行 `yarn install` 或 `npm install`
   - 確認 `.env.example` 已複製
   - 測試 `yarn dev` 是否可以正常運行

## 驗證

複製完成後，確認以下項目：

```bash
cd /path/to/wp1141/final-project
ls -la  # 確認檔案都在
yarn install  # 安裝依賴
yarn dev  # 測試是否可以運行
```
