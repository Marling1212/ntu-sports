# PowerShell 腳本：將當前專案複製到 wp1141 repo 的 final-project 目錄
# 使用方法：在 PowerShell 中執行此腳本

# 設定變數
$currentDir = $PSScriptRoot
$wp1141RepoPath = Read-Host "請輸入 wp1141 repo 的本地路徑（例如：C:\Users\maste\wp1141）"

# 檢查 wp1141 repo 是否存在
if (-not (Test-Path $wp1141RepoPath)) {
    Write-Host "錯誤：找不到 wp1141 repo 路徑：$wp1141RepoPath" -ForegroundColor Red
    Write-Host "請先 clone wp1141 repo 到本地" -ForegroundColor Yellow
    exit 1
}

# 檢查是否為 git repo
if (-not (Test-Path (Join-Path $wp1141RepoPath ".git"))) {
    Write-Host "警告：$wp1141RepoPath 似乎不是一個 git repository" -ForegroundColor Yellow
    $confirm = Read-Host "是否繼續？(y/n)"
    if ($confirm -ne "y") {
        exit 1
    }
}

# 建立 final-project 目錄
$targetDir = Join-Path $wp1141RepoPath "final-project"

if (Test-Path $targetDir) {
    Write-Host "警告：$targetDir 已存在" -ForegroundColor Yellow
    $confirm = Read-Host "是否要覆蓋？(y/n)"
    if ($confirm -ne "y") {
        exit 1
    }
    Remove-Item -Path $targetDir -Recurse -Force
}

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
Write-Host "已建立目錄：$targetDir" -ForegroundColor Green

# 要複製的檔案和目錄（排除不需要的）
$excludeItems = @(
    ".git",
    "node_modules",
    ".next",
    "out",
    "build",
    ".vercel",
    ".env.local",
    ".env",
    "*.log",
    ".DS_Store",
    "Thumbs.db"
)

# 複製所有檔案
Write-Host "開始複製檔案..." -ForegroundColor Cyan

Get-ChildItem -Path $currentDir -Force | ForEach-Object {
    $item = $_
    $shouldExclude = $false
    
    foreach ($exclude in $excludeItems) {
        if ($item.Name -like $exclude -or $item.Name -eq $exclude) {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        $destPath = Join-Path $targetDir $item.Name
        if ($item.PSIsContainer) {
            Copy-Item -Path $item.FullName -Destination $destPath -Recurse -Force
            Write-Host "已複製目錄：$($item.Name)" -ForegroundColor Gray
        } else {
            Copy-Item -Path $item.FullName -Destination $destPath -Force
            Write-Host "已複製檔案：$($item.Name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "已跳過：$($item.Name)" -ForegroundColor DarkGray
    }
}

Write-Host "`n複製完成！" -ForegroundColor Green
Write-Host "目標目錄：$targetDir" -ForegroundColor Cyan
Write-Host "`n接下來請執行：" -ForegroundColor Yellow
Write-Host "  cd $targetDir" -ForegroundColor White
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'Add final project'" -ForegroundColor White
Write-Host "  git push" -ForegroundColor White
