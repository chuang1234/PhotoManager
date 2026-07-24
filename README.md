<div align="center">

# 📷 家庭相册 Family Photo Manager

**记录每一个温馨瞬间，让家人之间的距离更近一点 💖**

[![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3-green?logo=flask)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-6-0170F8?logo=ant-design)](https://ant.design/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7+-4479A1?logo=mysql)](https://www.mysql.com/)

</div>

---

## 📖 项目简介

家庭相册是一个专为家庭设计的私密照片管理系统。支持多家庭成员共享相册、照片上传/拍照、收藏管理，并内置 AI 智能助手提供温馨互动。所有数据存储在本地，保护家庭隐私。

### ✨ 核心功能

| 功能模块 | 描述 |
|---------|------|
| 📁 **相册管理** | 创建、重命名、删除相册，自定义封面 |
| 📤 **照片上传** | 支持批量上传，记录拍摄时间、归属成员、备注 |
| 📷 **拍照功能** | 调用摄像头直接拍照并上传（需 HTTPS 环境） |
| 🔍 **照片搜索** | 按名称、归属人、上传者、日期范围筛选 |
| 💖 **收藏管理** | 创建收藏夹，照片加入收藏/移出，支持多个收藏夹 |
| 👨‍👩‍👧 **家庭成员** | 多成员管理，照片记录归属人和上传者 |
| 🤖 **AI 助手** | 内置 AI 对话功能，支持 OpenAI / Ollama 等多种提供商 |
| 🔐 **登录鉴权** | JWT Token 认证，SHA256 + bcrypt 双重密码加密 |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                   前端 (React 19)                    │
│  Ant Design 6 · React Router 7 · Axios · Less       │
│                    :3000 (craco)                     │
└──────────────────────┬──────────────────────────────┘
                       │  /api/*  /uploads/*
                       ▼
┌─────────────────────────────────────────────────────┐
│                 后端 (Flask 2.3)                      │
│  PyJWT · bcrypt · PyMySQL · Werkzeug · python-dotenv│
│                    :5000                              │
└───────┬─────────────────────────┬───────────────────┘
        ▼                         ▼
┌───────────────┐      ┌──────────────────┐
│   MySQL 5.7+  │      │  本地文件系统     │
│  family_photo │      │  uploads/photos  │
│               │      │  uploads/covers  │
└───────────────┘      └──────────────────┘
```

---

## 📂 项目结构

```
PhotoManager/
├── family-photo-backend/          # 🔧 后端 (Flask)
│   ├── config/
│   │   ├── config.py              # 数据库/JWT/密码加密配置
│   │   └── log_config.py          # 日志配置（按天轮转）
│   ├── src/
│   │   ├── main.py                # Flask 应用入口
│   │   ├── auth.py                # 登录/登出/Token 鉴权
│   │   ├── album.py               # 相册 CRUD + 封面上传
│   │   ├── photo.py               # 照片上传/搜索/删除
│   │   ├── favorite.py            # 收藏夹 & 收藏照片管理
│   │   ├── member.py              # 家庭成员查询
│   │   ├── file.py                # 静态文件服务（路径遍历防护）
│   │   ├── chat.py                # AI 对话接口
│   │   ├── ai_service.py          # AI 服务（OpenAI/Ollama）
│   │   └── utils.py               # 数据库连接 & 工具函数
│   ├── sql/
│   │   └── table_info.sql         # 数据库建表 SQL
│   ├── uploads/                   # 上传文件存储
│   │   ├── photos/                # 照片文件（按 album_id 分目录）
│   │   └── covers/                # 相册封面
│   ├── logs/                      # 日志文件（自动生成）
│   ├── .env.example               # 环境变量模板
│   └── requirements.txt           # Python 依赖
│
├── family-photo-frontend/         # 🎨 前端 (React)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login/             # 登录页
│   │   │   ├── AlbumList/         # 相册列表
│   │   │   ├── AlbumDetail/       # 相册详情
│   │   │   │   ├── components/
│   │   │   │   │   ├── AlbumPhotoList/  # 照片列表（分页）
│   │   │   │   │   ├── UploadArare/     # 照片上传区
│   │   │   │   │   └── PhotoCapture/    # 摄像头拍照
│   │   │   │   └── popwin/
│   │   │   │       ├── FilterPopwin/          # 搜索筛选弹窗
│   │   │   │       └── FavoriteConfirmModal/  # 收藏确认弹窗
│   │   │   ├── CreateAlbum/       # 创建相册
│   │   │   └── FavoriteManager/   # 收藏管理
│   │   ├── components/
│   │   │   ├── PrivateRoute.js    # 路由守卫
│   │   │   ├── HeaderComponent.js # 顶部导航
│   │   │   ├── AiChat/           # AI 对话悬浮窗
│   │   │   └── ButtonWrapper/    # 按钮封装
│   │   ├── contexts/
│   │   │   └── MemberContext.js   # 当前登录成员上下文
│   │   ├── utils/
│   │   │   ├── request.js         # Axios 封装（Token 拦截器）
│   │   │   └── dateUtil.js        # 日期格式化工具
│   │   └── App.js                 # 路由配置入口
│   ├── craco.config.js            # Craco 配置（Less/代理）
│   └── package.json
│
└── README.md
```

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Python | 3.8+ |
| Node.js | 16+ |
| MySQL | 5.7+ |
| npm / yarn | 最新稳定版 |

### 1️⃣ 克隆项目

```bash
git clone <your-repo-url>
cd PhotoManager
```

### 2️⃣ 初始化数据库

```bash
# 登录 MySQL 创建数据库
mysql -u root -p

CREATE DATABASE family_photo DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE family_photo;

# 导入建表 SQL（新建数据库时使用）
source family-photo-backend/sql/table_info.sql;

# （可选）插入测试家庭成员
INSERT INTO family_member (name, relation, username, password, email) VALUES
('爸爸', 'father', 'father', '此处填SHA256哈希', 'father@example.com'),
('妈妈', 'mother', 'mother', '此处填SHA256哈希', 'mother@example.com');
```

> 💡 密码存储流程：**前端 SHA256** → **后端 bcrypt 加密** → 存入数据库。  
> 初始密码可先用 `config/config.py` 中的 `encrypt_password()` 函数生成哈希。

### 3️⃣ 启动后端

```bash
cd family-photo-backend

# 创建虚拟环境（推荐）
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（必须！）
cp .env.example .env
# 编辑 .env，填入以下必要配置：
#   DB_PASSWORD  — 数据库密码
#   JWT_SECRET   — JWT 密钥（用 python -c "import secrets; print(secrets.token_hex(32))" 生成）
#   AI_API_KEY   — AI 服务密钥（可选）

# 启动服务
python -m src.main
# 后端运行在 http://localhost:5000
```

### 4️⃣ 启动前端

```bash
cd family-photo-frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
# 前端运行在 http://localhost:3000
# 已配置代理：/api/* 和 /uploads/* 自动转发到后端 5000 端口
```

---

## ⚙️ 环境变量配置

在 `family-photo-backend/.env` 中配置（参考 `.env.example`）：

```bash
# ── 数据库配置（必填！）─────────────────────
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=family_photo

# ── JWT 密钥（必填！）──────────────────────
# 生成方式：python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=你的JWT密钥
JWT_EXPIRE_HOURS=24

# ── AI 服务配置 ──────────────────────────────
# 提供商：openai（默认）| ollama（本地部署，无需 API Key）
AI_PROVIDER=openai

# OpenAI / DeepSeek / 通义千问
AI_API_KEY=sk-xxx
AI_API_BASE=https://api.openai.com/v1
AI_MODEL=gpt-3.5-turbo

# ── 使用 Ollama 本地部署时，改为以下配置 ───────
# AI_PROVIDER=ollama
# AI_MODEL=llama3
# AI_API_BASE=http://localhost:11434

# ── 通用 ─────────────────────────────────────
AI_TIMEOUT=60

# ── Flask 环境 ───────────────────────────────
FLASK_ENV=dev
```

> ⚠️ **安全提示：**  
> - `DB_PASSWORD` 和 `JWT_SECRET` 为必填项，未配置时服务启动会报错  
> - `.env` 文件已在 `.gitignore` 中，不会被提交到代码仓库  
> - 生产环境请务必使用强随机字符串作为 `JWT_SECRET`

---

## 🗄️ 数据库设计

```
family_member (家庭成员)
    │
    ├──< album (相册)
    │       │
    │       └──< photo (照片)
    │               │
    │               └──< favorite_photo (收藏记录) >── favorite_folder (收藏夹)
    │
    └──< ai_chat_message (AI 聊天记录)
```

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `family_member` | 家庭成员 / 登录账号 | `username`(唯一), `password`(bcrypt), **`is_admin`**(权限标识) |
| `album` | 相册 | `album_name`, `cover_path`, **`creator_id`**(创建者), `last_upload_user_id` |
| `photo` | 照片 | `file_path`, `album_id`, `member_id`(归属), `operator_id`(上传者) |
| `favorite_folder` | 收藏夹 | `folder_name`, `member_id`, `is_default` |
| `favorite_photo` | 收藏记录 | `folder_id`, `photo_id`, `member_id`（唯一约束防重复） |
| `ai_chat_message` | AI 聊天记录 | `member_id`, `role`(user/assistant), `content` |

> 加粗字段为本次新增。完整建表 SQL 见 `family-photo-backend/sql/table_info.sql`

---

## 📡 API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 登录（返回 JWT Token） |
| POST | `/api/logout` | 登出 |

### 相册

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/albums` | ✅ | 获取所有相册列表 |
| POST | `/api/album/create` | ✅ | 创建相册（可上传封面） |
| POST | `/api/album/rename` | ✅ | 修改相册名称 |
| POST | `/api/album/delete` | ✅ | 删除相册（级联删除照片） |
| POST | `/api/album/cover/upload` | ✅ | 上传/更换相册封面 |
| GET | `/api/photos/album/:id` | ✅ | 获取相册下照片（分页） |

### 照片

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/photos/upload` | ✅ | 上传照片 |
| POST | `/api/photos/delete` | ✅ | 删除照片 |
| GET | `/api/photos/search` | ✅ | 搜索照片（支持多条件筛选） |

### 收藏

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/favorite/folders` | ✅ | 获取收藏夹列表 |
| POST | `/api/favorite/folders` | ✅ | 创建收藏夹 |
| PUT | `/api/favorite/folders/:id` | ✅ | 修改收藏夹名称 |
| DELETE | `/api/favorite/folders/:id` | ✅ | 删除收藏夹 |
| POST | `/api/favorite/photos` | ✅ | 照片加入收藏 |
| DELETE | `/api/favorite/photos` | ✅ | 照片移出收藏 |
| GET | `/api/favorite/photos/:folder_id` | ✅ | 获取收藏夹内照片 |

### 成员 & AI

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/current-member` | ✅ | 获取当前登录成员信息 |
| GET | `/api/members` | ✅ | 获取所有家庭成员 |
| GET | `/api/chat/history` | ✅ | 获取聊天记录（默认近 3 个月） |
| POST | `/api/chat/send` | ✅ | 发送消息 & 获取 AI 回复 |
| GET | `/api/chat/models` | ✅ | 查询 AI 提供商 & 可用模型 |
| POST | `/api/chat/clear` | ✅ | 清空聊天记录 |

### 静态文件

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/uploads/photos/:filename` | ✅ | 获取照片文件 |
| GET | `/uploads/covers/:filename` | ✅ | 获取封面文件 |

---

## 🔐 安全机制

| 层面 | 措施 |
|------|------|
| **认证** | JWT Token（HS256，24h 过期），`@login_required` 装饰器保护所有接口 |
| **密码** | 前端 SHA256 + 后端 bcrypt（salt rounds=12）双重加密 |
| **权限隔离** | `is_admin` 字段区分管理员/普通用户，普通用户只能操作自己创建的相册及照片 |
| **文件上传** | 扩展名白名单校验、`secure_filename` 过滤、唯一文件名防覆盖 |
| **路径安全** | 上传目录限制 + `_safe_path()` 绝对路径校验，防止路径遍历 |
| **数据校验** | `album_id` 等参数强制正整数校验，存在性校验防止对不存在资源操作 |
| **SQL 注入** | 全部使用 PyMySQL 参数化查询 (`%s`) |
| **CORS** | Flask-CORS 配置 `supports_credentials=True` |

---

## 👥 权限体系

### 角色说明

| 角色 | `is_admin` 值 | 权限范围 |
|------|--------------|---------|
| **管理员** | `1` | 查看所有相册，操作所有资源 |
| **普通成员** | `0`（默认） | 只能查看/操作**自己创建的**相册及照片 |

### 权限配置

在数据库中手动设置：

```sql
-- 将某用户设为管理员
UPDATE family_member SET is_admin = 1 WHERE username = 'father';

-- 取消管理员权限
UPDATE family_member SET is_admin = 0 WHERE username = 'father';

-- 查看所有成员的权限
SELECT id, name, username, is_admin FROM family_member;
```

### 权限覆盖范围

| 操作 | 管理员 | 普通成员 |
|------|--------|---------|
| 查看相册列表 | 所有相册 | 仅自己创建的 |
| 查看相册照片 | 任意相册 | 仅自己创建的相册 |
| 创建相册 | ✅ | ✅（自动成为创建者） |
| 重命名/删除相册 | 任意相册 | 仅自己创建的 |
| 更换相册封面 | 任意相册 | 仅自己创建的 |
| 上传照片 | 任意相册 | 仅自己创建的相册 |
| 删除照片 | 任意照片 | 仅自己相册中的照片 |
| 搜索照片 | 任意相册 | 仅自己创建的相册 |
| 收藏/取消收藏 | ✅ | ✅（收藏为个人行为，无需权限） |

---

## 🤖 AI 助手

支持三种 AI 提供商，通过环境变量 `AI_PROVIDER` 切换：

| 提供商 | 配置方式 | 特点 |
|--------|---------|------|
| **OpenAI** | 配置 `AI_API_KEY` + `AI_API_BASE` | 支持 OpenAI / DeepSeek / 通义千问等兼容接口 |
| **Ollama** | `AI_PROVIDER=ollama` | 本地部署，无需 API Key，完全离线 |
| **模拟模式** | 不配置 `AI_API_KEY` | 自动使用预设回复，方便体验功能 |

---

## 📸 功能预览

| 页面 | 功能 |
|------|------|
| 🔑 登录页 | 温馨风格登录，SHA256 密码加密传输 |
| 📁 相册列表 | 展示所有相册，显示封面、最后上传人和时间 |
| 🖼️ 相册详情 | 照片网格展示、分页加载、搜索筛选 |
| 📤 上传区域 | 填写归属成员、拍摄时间、备注后批量上传 |
| 📷 拍照上传 | 调用摄像头拍照 → 预览 → 选择归属人 → 上传 |
| 💖 收藏管理 | 收藏夹列表 + 收藏照片网格，支持增删改 |
| 🤖 AI 助手 | 全局悬浮对话窗，聊天记录按账号隔离 |

---

## 🛠️ 开发说明

### 前端代理配置（`craco.config.js`）

```javascript
// 开发环境下自动代理到后端
'/api'      → http://localhost:5000/api
'/uploads'  → http://localhost:5000/uploads
```

### 日志系统

- 日志目录：`family-photo-backend/logs/`
- `info.log`：常规操作日志（保留 30 天）
- `error.log`：错误日志（保留 90 天）
- 按天自动轮转，Windows 下安全处理文件锁定

### 密码加密流程

```
用户输入明文密码
    │
    ▼
前端 CryptoJS.SHA256(password)  ──→  SHA256 哈希
    │
    ▼
POST /api/login  { password: sha256_hash }
    │
    ▼
后端 bcrypt.checkpw(sha256_hash, db_bcrypt_hash)  ──→  验证结果
```

---

## 📋 待办事项

- [ ] 实现 Token 黑名单机制，使 Logout 真正生效
- [ ] 添加照片 EXIF 信息自动提取（拍摄时间、GPS 等）
- [ ] 支持照片压缩上传，减少存储空间
- [ ] 添加照片分享功能（生成临时链接）

---

## 📄 License

MIT License © 2026 Family Photo Manager