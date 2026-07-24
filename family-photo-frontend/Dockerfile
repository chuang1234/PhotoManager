# ── 阶段1：构建 React 应用 ──
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存层
COPY package.json package-lock.json ./
# npm ci 要求 lockfile 与 package.json 完全同步，失败时回退到 npm install
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# 复制源码并构建
COPY . .
RUN npm run build

# ── 阶段2：Nginx 部署 ──
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/build /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
