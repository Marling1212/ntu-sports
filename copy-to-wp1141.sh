#!/bin/bash
# Bash 腳本：將當前專案複製到 wp1141 repo 的 final-project 目錄
# 使用方法：chmod +x copy-to-wp1141.sh && ./copy-to-wp1141.sh

# 設定變數
CURRENT_DIR=$(pwd)
echo "請輸入 wp1141 repo 的本地路徑："
read WP1141_REPO_PATH

# 檢查 wp1141 repo 是否存在
if [ ! -d "$WP1141_REPO_PATH" ]; then
    echo "錯誤：找不到 wp1141 repo 路徑：$WP1141_REPO_PATH"
    echo "請先 clone wp1141 repo 到本地"
    exit 1
fi

# 檢查是否為 git repo
if [ ! -d "$WP1141_REPO_PATH/.git" ]; then
    echo "警告：$WP1141_REPO_PATH 似乎不是一個 git repository"
    read -p "是否繼續？(y/n) " confirm
    if [ "$confirm" != "y" ]; then
        exit 1
    fi
fi

# 建立 final-project 目錄
TARGET_DIR="$WP1141_REPO_PATH/final-project"

if [ -d "$TARGET_DIR" ]; then
    echo "警告：$TARGET_DIR 已存在"
    read -p "是否要覆蓋？(y/n) " confirm
    if [ "$confirm" != "y" ]; then
        exit 1
    fi
    rm -rf "$TARGET_DIR"
fi

mkdir -p "$TARGET_DIR"
echo "已建立目錄：$TARGET_DIR"

# 使用 rsync 複製（如果可用），否則使用 cp
if command -v rsync &> /dev/null; then
    echo "使用 rsync 複製檔案..."
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
        --exclude='.DS_Store' \
        --exclude='Thumbs.db' \
        "$CURRENT_DIR/" "$TARGET_DIR/"
else
    echo "使用 cp 複製檔案..."
    # 複製所有檔案，排除不需要的
    find . -maxdepth 1 ! -name '.' ! -name '.git' ! -name 'node_modules' ! -name '.next' ! -name 'out' ! -name 'build' ! -name '.vercel' ! -name '.env.local' ! -name '.env' -exec cp -r {} "$TARGET_DIR/" \;
fi

echo ""
echo "複製完成！"
echo "目標目錄：$TARGET_DIR"
echo ""
echo "接下來請執行："
echo "  cd $TARGET_DIR"
echo "  git add ."
echo "  git commit -m 'Add final project'"
echo "  git push"
