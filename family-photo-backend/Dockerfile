FROM python:3.10-slim

WORKDIR /app

# 换用阿里云镜像源 + 跳过签名验证
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null; \
    sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null; \
    true

# 安装系统依赖（跳过签名验证）
RUN apt-get -o Acquire::AllowInsecureRepositories=true \
    -o Acquire::AllowDowngradeToInsecureRepositories=true \
    update && \
    apt-get install -y --no-install-recommends --allow-unauthenticated \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir \
    -i https://pypi.tuna.tsinghua.edu.cn/simple \
    --extra-index-url https://mirrors.aliyun.com/pypi/simple/ \
    --extra-index-url https://pypi.org/simple/ \
    --trusted-host pypi.tuna.tsinghua.edu.cn \
    --trusted-host mirrors.aliyun.com \
    --trusted-host pypi.org \
    -r requirements.txt

# 复制应用代码
COPY . .

# 备份默认封面
RUN mkdir -p /app/default_assets/covers && \
    cp uploads/covers/default_cover.jpg /app/default_assets/covers/ 2>/dev/null || true

# 创建必要目录
RUN mkdir -p uploads/photos uploads/covers logs

# 设置入口脚本权限
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
