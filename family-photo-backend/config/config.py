import os
import jwt
import hashlib
from datetime import datetime, timedelta
import bcrypt
import logging
from dotenv import load_dotenv

# 确保 .env 文件被加载（兼容直接运行 config.py 的场景）
load_dotenv()

# ── 数据库配置（敏感信息从环境变量读取）──────────────────
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', 'family_photo'),
    'charset': 'utf8mb4'
}
parent_dir = os.path.dirname(os.path.dirname(__file__))

UPLOAD_PHOTO_FOLDER = os.path.join(parent_dir, 'uploads/photos')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024

if not os.path.exists(UPLOAD_PHOTO_FOLDER):
    os.makedirs(UPLOAD_PHOTO_FOLDER)

UPLOAD_COVER_FOLDER = os.path.join(parent_dir, 'uploads/covers')
if not os.path.exists(UPLOAD_COVER_FOLDER):
    os.makedirs(UPLOAD_COVER_FOLDER)

logger = logging.getLogger('photo_manager')

# JWT配置（敏感信息从环境变量读取）
JWT_CONFIG = {
    'secret': os.environ.get('JWT_SECRET', ''),
    'expire_hours': int(os.environ.get('JWT_EXPIRE_HOURS', '24'))
}

# 启动时校验：敏感配置不能为空
if not DB_CONFIG['password']:
    raise RuntimeError('❌ 环境变量 DB_PASSWORD 未配置，请在 .env 文件中设置数据库密码')
if not JWT_CONFIG['secret']:
    raise RuntimeError('❌ 环境变量 JWT_SECRET 未配置，请在 .env 文件中设置 JWT 密钥')

def encrypt_password(plain_password: str) -> str:
    """
    密码加密（注册/修改密码时调用）
    逻辑：原始密码 → SHA256 → bcrypt哈希（和登录验证逻辑对齐）
    """
    try:
        # 1. 先做SHA256哈希（和前端一致）
        sha256_hash = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()

        # 2. bcrypt加密（处理长度限制 + 加盐）
        if len(sha256_hash.encode('utf-8')) > 72:
            sha256_hash = hashlib.sha256(sha256_hash.encode('utf-8')).hexdigest()

        salt = bcrypt.gensalt(12)  # 加盐，强度12（生产环境推荐10-14）
        bcrypt_hash = bcrypt.hashpw(sha256_hash.encode('utf-8'), salt)

        return bcrypt_hash.decode('utf-8')
    except Exception as e:
        logger.error(f"密码加密失败：{str(e)}")
        raise e  # 抛异常，避免存储错误的哈希

def verify_password(frontend_sha256: str, db_bcrypt_hash: str) -> bool:
    """
    登录验证：前端传的SHA256串 → 验证数据库的bcrypt哈希
    :param frontend_sha256: 前端SHA256后的密码串（比如123456→e10adc3949ba59abbe56e057f20f883e）
    :param db_bcrypt_hash: 数据库存储的bcrypt哈希（encrypt_password生成的）
    :return: 验证通过返回True，否则False
    """
    try:
        # bcrypt.checkpw会自动从db_bcrypt_hash中提取盐值，无需手动处理
        return bcrypt.checkpw(
            frontend_sha256.encode('utf-8'),  # 前端传的SHA256串
            db_bcrypt_hash.encode('utf-8')    # 数据库的bcrypt哈希
        )
    except Exception as e:
        logger.error(f"密码验证失败：{str(e)}")
        return False

# 生成JWT Token（携带member_id等信息）
def generate_token(member_info):
    payload = {
        'member_id': member_info['id'],
        'username': member_info['username'],
        'name': member_info['name'],
        'is_admin': member_info['is_admin'],
        'exp': datetime.utcnow() + timedelta(hours=JWT_CONFIG['expire_hours'])
    }
    token = jwt.encode(payload, JWT_CONFIG['secret'], algorithm='HS256')
    return token

# 验证Token
def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_CONFIG['secret'], algorithms=['HS256'])
        return payload  # 包含member_id/username/name
    except jwt.ExpiredSignatureError:
        return None  # Token过期
    except jwt.InvalidTokenError:
        return None  # Token无效


if __name__ == "__main__":
    # 加密密码
    raw_pwd = "123456Abc!"
    hashed_pwd = encrypt_password(raw_pwd)
    print(f"加密后的哈希：{hashed_pwd}")

    # 验证正确密码
    is_match = verify_password(raw_pwd, hashed_pwd)
    print(f"密码验证结果（正确）：{is_match}")  # 输出 True

    # 验证错误密码
    is_match = verify_password("wrong_pwd", hashed_pwd)
    print(f"密码验证结果（错误）：{is_match}")  # 输出 False