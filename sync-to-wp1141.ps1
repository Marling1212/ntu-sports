# 自動同步腳本：將原本 repo 的變更同步到 wp1141/final-project
# 使用方法：在原本的 repo 目錄執行此腳本

# ============================================
# 請修改這裡：填入你的 wp1141 repo 路徑
# ============================================
$wp1141Path = "C:\Users\maste\wp1141"  # 請修改為你的實際路徑

# 當前專案路徑（原本的 repo）
$currentPath = $PSScriptRoot
$targetPath = Join-Path $wp1141Path "final-project"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "自動同步工具：ntu-sports → wp1141/final-project" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "來源：$currentPath" -ForegroundColor Yellow
Write-Host "目標：$targetPath" -ForegroundColor Yellow
Write-Host ""

# 檢查 wp1141 repo 是否存在
if (-not (Test-Path $wp1141Path)) {
    Write-Host "錯誤：找不到 wp1141 repo：$wp1141Path" -ForegroundColor Red
    Write-Host "請先修改腳本中的 `$wp1141Path` 變數" -ForegroundColor Yellow
    exit 1
}

# 檢查是否為 git repo
if (-not (Test-Path (Join-Path $wp1141Path ".git"))) {
    Write-Host "錯誤：$wp1141Path 不是一個 git repository" -ForegroundColor Red
    exit 1
}

# 檢查當前目錄是否為 git repo
if (-not (Test-Path (Join-Path $currentPath ".git"))) {
    Write-Host "警告：當前目錄似乎不是 git repository" -ForegroundColor Yellow
}

# 確認
Write-Host "即將同步專案到：$targetPath" -ForegroundColor Cyan
$confirm = Read-Host "是否繼續？(y/n)"
if ($confirm -ne "y") {
    Write-Host "已取消" -ForegroundColor Yellow
    exit 0
}

# 如果目標目錄不存在，先建立
if (-not (Test-Path $targetPath)) {
    Write-Host "目標目錄不存在，正在建立..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
}

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
    "SYNC_STRATEGY.md"
)

# 複製檔案
Write-Host "`n開始同步檔案..." -ForegroundColor Cyan
$copiedCount = 0
$skippedCount = 0
$updatedCount = 0

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
                # 如果是目錄，使用遞迴複製
                if (Test-Path $destPath) {
                    # 目錄已存在，檢查是否有更新
                    Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
                    $updatedCount++
                    Write-Host "  ↻ 更新目錄：$item" -ForegroundColor Yellow
                } else {
                    Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
                    Write-Host "  ✓ 新增目錄：$item" -ForegroundColor Green
                }
            } else {
                # 如果是檔案，檢查是否需要更新
                if (Test-Path $destPath) {
                    $sourceHash = (Get-FileHash $sourcePath -Algorithm MD5).Hash
                    $destHash = (Get-FileHash $destPath -Algorithm MD5).Hash
                    
                    if ($sourceHash -ne $destHash) {
                        Copy-Item -Path $sourcePath -Destination $destPath -Force
                        $updatedCount++
                        Write-Host "  ↻ 更新檔案：$item" -ForegroundColor Yellow
                    } else {
                        Write-Host "  - 跳過（無變更）：$item" -ForegroundColor DarkGray
                        $skippedCount++
                    }
                } else {
                    Copy-Item -Path $sourcePath -Destination $destPath -Force
                    Write-Host "  ✓ 新增檔案：$item" -ForegroundColor Green
                }
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
Write-Host "同步完成！" -ForegroundColor Green
Write-Host "已處理：$copiedCount 個項目" -ForegroundColor Green
Write-Host "已更新：$updatedCount 個項目" -ForegroundColor Yellow
Write-Host "已跳過：$skippedCount 個項目" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

# 詢問是否要 commit 和 push
if ($updatedCount -gt 0 -or $copiedCount -gt 0) {
    Write-Host "`n檢測到變更，是否要 commit 並 push 到 wp1141 repo？" -ForegroundColor Yellow
    $commit = Read-Host "是否 commit 並 push？(y/n)"
    
    if ($commit -eq "y") {
        Push-Location $wp1141Path
        
        try {
            # 檢查是否有變更
            $status = git status --porcelain final-project
            if ($status) {
                Write-Host "`n正在 commit 變更..." -ForegroundColor Cyan
                git add final-project
                
                $commitMessage = Read-Host "請輸入 commit 訊息（直接 Enter 使用預設）"
                if ([string]::IsNullOrWhiteSpace($commitMessage)) {
                    $commitMessage = "Sync final-project from main repo - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
                }
                
                git commit -m $commitMessage
                
                Write-Host "`n是否要 push 到遠端？" -ForegroundColor Yellow
                $push = Read-Host "是否 push？(y/n)"
                if ($push -eq "y") {
                    git push
                    Write-Host "`n✓ 已成功 push 到遠端！" -ForegroundColor Green
                } else {
                    Write-Host "`n變更已 commit，但尚未 push" -ForegroundColor Yellow
                }
            } else {
                Write-Host "`n沒有變更需要 commit" -ForegroundColor Gray
            }
        } catch {
            Write-Host "`n✗ Git 操作錯誤：$($_.Exception.Message)" -ForegroundColor Red
            Write-Host "請手動執行以下指令：" -ForegroundColor Yellow
            Write-Host "  cd $wp1141Path" -ForegroundColor White
            Write-Host "  git add final-project" -ForegroundColor White
            Write-Host "  git commit -m 'Sync final-project'" -ForegroundColor White
            Write-Host "  git push" -ForegroundColor White
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "`n變更已複製，但尚未 commit" -ForegroundColor Yellow
        Write-Host "請手動執行以下指令：" -ForegroundColor Yellow
        Write-Host "  cd $wp1141Path" -ForegroundColor White
        Write-Host "  git add final-project" -ForegroundColor White
        Write-Host "  git commit -m 'Sync final-project'" -ForegroundColor White
        Write-Host "  git push" -ForegroundColor White
    }
} else {
    Write-Host "`n沒有變更需要同步" -ForegroundColor Gray
}

Write-Host "`n同步完成！" -ForegroundColor Green
