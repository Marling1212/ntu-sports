# 快速複製腳本 - 直接執行此腳本
# 使用方法：修改下面的 $wp1141Path 變數，然後執行此腳本

# ============================================
# 請修改這裡：填入你的 wp1141 repo 路徑
# ============================================
$wp1141Path = "C:\Users\maste\OneDrive\Desktop\網路服務\wp1141"  # 請修改為你的實際路徑

# 當前專案路徑
$currentPath = $PSScriptRoot

# 目標路徑
$targetPath = Join-Path $wp1141Path "final-project"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "專案複製工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "來源：$currentPath" -ForegroundColor Yellow
Write-Host "目標：$targetPath" -ForegroundColor Yellow
Write-Host ""

# 檢查 wp1141 repo 是否存在
if (-not (Test-Path $wp1141Path)) {
    Write-Host "錯誤：找不到 wp1141 repo：$wp1141Path" -ForegroundColor Red
    Write-Host "請先修改腳本中的 `$wp1141Path` 變數" -ForegroundColor Yellow
    Write-Host "或者先 clone wp1141 repo：" -ForegroundColor Yellow
    Write-Host "  git clone <your-wp1141-repo-url> $wp1141Path" -ForegroundColor White
    exit 1
}

# 確認
Write-Host "即將複製專案到：$targetPath" -ForegroundColor Cyan
$confirm = Read-Host "是否繼續？(y/n)"
if ($confirm -ne "y") {
    Write-Host "已取消" -ForegroundColor Yellow
    exit 0
}

# 如果目標目錄已存在，詢問是否覆蓋
if (Test-Path $targetPath) {
    Write-Host "警告：目標目錄已存在" -ForegroundColor Yellow
    $overwrite = Read-Host "是否覆蓋？(y/n)"
    if ($overwrite -eq "y") {
        Remove-Item -Path $targetPath -Recurse -Force
        Write-Host "已刪除舊目錄" -ForegroundColor Gray
    } else {
        Write-Host "已取消" -ForegroundColor Yellow
        exit 0
    }
}

# 建立目標目錄
New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
Write-Host "已建立目錄：$targetPath" -ForegroundColor Green

# 要排除的項目
$excludePatterns = @(
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
    "Thumbs.db",
    "copy-to-wp1141.ps1",
    "copy-to-wp1141.sh",
    "quick-copy.ps1",
    "COPY_TO_WP1141.md"
)

# 複製檔案
Write-Host "`n開始複製檔案..." -ForegroundColor Cyan
$copiedCount = 0
$skippedCount = 0

Get-ChildItem -Path $currentPath -Force | ForEach-Object {
    $item = $_.Name
    $shouldExclude = $false
    
    foreach ($pattern in $excludePatterns) {
        if ($item -like $pattern -or $item -eq $pattern) {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        $sourcePath = $_.FullName
        $destPath = Join-Path $targetPath $item
        
        try {
            if ($_.PSIsContainer) {
                Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
                Write-Host "  ✓ 目錄：$item" -ForegroundColor Gray
            } else {
                Copy-Item -Path $sourcePath -Destination $destPath -Force
                Write-Host "  ✓ 檔案：$item" -ForegroundColor Gray
            }
            $copiedCount++
        } catch {
            Write-Host "  ✗ 錯誤：$item - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  - 跳過：$item" -ForegroundColor DarkGray
        $skippedCount++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "複製完成！" -ForegroundColor Green
Write-Host "已複製：$copiedCount 個項目" -ForegroundColor Green
Write-Host "已跳過：$skippedCount 個項目" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n接下來請執行以下步驟：" -ForegroundColor Yellow
Write-Host "1. 進入 wp1141 repo：" -ForegroundColor White
Write-Host "   cd $wp1141Path" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. 檢查檔案：" -ForegroundColor White
Write-Host "   cd final-project" -ForegroundColor Cyan
Write-Host "   ls" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. 安裝依賴：" -ForegroundColor White
Write-Host "   yarn install" -ForegroundColor Cyan
Write-Host "   或" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. 測試運行：" -ForegroundColor White
Write-Host "   yarn dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. 提交到 Git：" -ForegroundColor White
Write-Host "   cd .." -ForegroundColor Cyan
Write-Host "   git add final-project" -ForegroundColor Cyan
Write-Host "   git commit -m 'Add final project'" -ForegroundColor Cyan
Write-Host "   git push" -ForegroundColor Cyan
