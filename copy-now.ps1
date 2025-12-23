# 直接複製腳本 - 使用絕對路徑
$source = "C:\Users\maste\OneDrive\Desktop\網路服務\Final"
$target = "C:\Users\maste\OneDrive\Desktop\網路服務\wp1141\final-project"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "開始複製專案" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "來源：$source" -ForegroundColor Yellow
Write-Host "目標：$target" -ForegroundColor Yellow
Write-Host ""

# 檢查來源是否存在
if (-not (Test-Path $source)) {
    Write-Host "錯誤：找不到來源目錄：$source" -ForegroundColor Red
    exit 1
}

# 如果目標已存在，詢問是否覆蓋
if (Test-Path $target) {
    Write-Host "警告：目標目錄已存在" -ForegroundColor Yellow
    $overwrite = Read-Host "是否覆蓋？(y/n)"
    if ($overwrite -eq "y") {
        Remove-Item -Path $target -Recurse -Force
        Write-Host "已刪除舊目錄" -ForegroundColor Gray
    } else {
        Write-Host "已取消" -ForegroundColor Yellow
        exit 0
    }
}

# 建立目標目錄
New-Item -ItemType Directory -Path $target -Force | Out-Null
Write-Host "已建立目錄：$target" -ForegroundColor Green

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
    "sync-to-wp1141.ps1",
    "COPY_TO_WP1141.md",
    "SYNC_STRATEGY.md",
    "COPY_INSTRUCTIONS.md",
    "copy-now.ps1"
)

# 複製檔案
Write-Host "`n開始複製檔案..." -ForegroundColor Cyan
$copiedCount = 0
$skippedCount = 0

Get-ChildItem -Path $source -Force | ForEach-Object {
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
        $destPath = Join-Path $target $item
        
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

Write-Host "`n接下來請執行：" -ForegroundColor Yellow
Write-Host "  cd C:\Users\maste\OneDrive\Desktop\網路服務\wp1141" -ForegroundColor Cyan
Write-Host "  git add final-project" -ForegroundColor Cyan
Write-Host "  git commit -m 'Add final project'" -ForegroundColor Cyan
Write-Host "  git push" -ForegroundColor Cyan

