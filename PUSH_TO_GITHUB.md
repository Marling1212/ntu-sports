# 推送到 GitHub 的步驟

## 快速指令

在 PowerShell 中執行以下命令：

```powershell
# 1. 添加所有變更
git add .

# 2. 提交變更
git commit -m "Add demo video script and update README with related project links"

# 3. 推送到 GitHub
git push
```

---

## 詳細步驟

### 1. 添加檔案

```powershell
git add README.md
git add DEMO_VIDEO_SCRIPT.md
git add .env.example
git add ChangeLog.md
git add eval.txt
git add *.md
git add *.ps1
git add *.sh
```

或一次性添加所有：

```powershell
git add .
```

### 2. 提交變更

```powershell
git commit -m "Add demo video script and update README with related project links"
```

### 3. 推送到 GitHub

```powershell
git push
```

---

## 推送到 GitHub 後

你可以在以下位置查看腳本：
- `https://github.com/Marling1212/ntu-sports/blob/main/DEMO_VIDEO_SCRIPT.md`

這樣你就可以在平板上閱讀了！
