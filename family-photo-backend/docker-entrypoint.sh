#!/bin/bash
set -e

echo "=========================================="
echo "  PhotoManager Backend - Docker 启动"
echo "=========================================="

# ── 恢复默认封面到卷 ──────────────────────
if [ ! -f uploads/covers/default_cover.jpg ] && [ -f /app/default_assets/covers/default_cover.jpg ]; then
    echo "[init] 恢复默认封面文件到卷..."
    cp /app/default_assets/covers/default_cover.jpg uploads/covers/default_cover.jpg
fi

# ── 等待 MySQL 就绪 ──────────────────────
echo "[init] 等待 MySQL 就绪..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    python -c "
import pymysql, os, sys
try:
    conn = pymysql.connect(
        host=os.environ.get('DB_HOST', 'mysql'),
        user=os.environ.get('DB_USER', 'root'),
        password=os.environ.get('DB_PASSWORD', ''),
        database=os.environ.get('DB_NAME', 'family_photo'),
        connect_timeout=3
    )
    conn.close()
    print('MySQL 连接成功！')
    sys.exit(0)
except Exception as e:
    print(f'MySQL 未就绪: {e}')
    sys.exit(1)
" && break

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[init] 重试 $RETRY_COUNT/$MAX_RETRIES，2秒后重试..."
    sleep 2
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "[错误] MySQL 在 $MAX_RETRIES 次重试后仍不可用"
    exit 1
fi

# ── 启动 Gunicorn ──────────────────────
echo "[init] 启动 Gunicorn 生产服务器..."
exec gunicorn -w 4 -b 0.0.0.0:5000 \
    --access-logfile - \
    --error-logfile - \
    --timeout 120 \
    src.main:app
