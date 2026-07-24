FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖（bcrypt 编译需要 gcc）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖 + gunicorn 生产服务器
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# 复制应用代码
COPY . .

# 备份默认封面（卷挂载后需要恢复）
RUN mkdir -p /app/default_assets/covers && \
    cp uploads/covers/default_cover.jpg /app/default_assets/covers/ 2>/dev/null || true

# 创建必要目录
RUN mkdir -p uploads/photos uploads/covers logs

# 设置入口脚本权限（处理 Windows CRLF → LF）
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
