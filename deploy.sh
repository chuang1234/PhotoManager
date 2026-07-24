#!/bin/bash
set -e

echo ""
echo "========================================"
echo "   PhotoManager 一键 Docker 部署"
echo "========================================"
echo ""

# ── 检查 Docker 是否安装 ──
if ! command -v docker &> /dev/null; then
    echo "[X] 未检测到 Docker，请先安装 Docker"
    echo "    Linux:  curl -fsSL https://get.docker.com | sh"
    echo "    Mac:    https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "[OK] Docker 已安装"

# ── 检查 Docker 是否运行 ──
if ! docker info &> /dev/null; then
    echo "[X] Docker 未运行！请启动 Docker 后重试"
    exit 1
fi
echo "[OK] Docker 正在运行"

# ── 切换到脚本所在目录 ──
cd "$(dirname "$0")"

echo ""
echo "[1/5] 检查环境配置..."
if [ ! -f .env ]; then
    if [ -f .env.docker ]; then
        cp .env.docker .env
        echo "      已从 .env.docker 创建 .env 配置文件"
    else
        echo "[X] 未找到 .env.docker 配置模板"
        exit 1
    fi
else
    echo "      已存在 .env 配置文件"
fi

echo ""
echo "[2/5] 停止旧容器（如存在）..."
docker compose down 2>/dev/null || true

echo ""
echo "[3/5] 构建镜像..."
docker compose build

echo ""
echo "[4/5] 启动服务..."
docker compose up -d

echo ""
echo "[5/5] 等待服务就绪..."
ready=0
for i in $(seq 1 30); do
    sleep 3
    if curl -s http://localhost:5000/api/members > /dev/null 2>&1; then
        ready=1
        echo "      后端服务已就绪"
        break
    fi
    echo "      等待后端启动... $i/30"
done

if [ $ready -eq 0 ]; then
    echo "      [!] 后端未在预期时间内响应，请检查日志"
    echo "      运行: docker compose logs backend"
fi

echo ""
echo "========================================"
echo "         部署完成！"
echo "========================================"
echo ""
echo "  前端地址:  http://localhost"
echo "  后端地址:  http://localhost:5000"
echo ""
echo "  常用命令:"
echo "    查看状态:  docker compose ps"
echo "    查看日志:  docker compose logs -f"
echo "    停止服务:  docker compose down"
echo "    重新构建:  docker compose up -d --build"
echo ""
