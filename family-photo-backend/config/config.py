import os
import jwt
import hashlib
from datetime import datetime, timedelta
import bcrypt

# 原有数据库/文件配置不变...
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Chuang@123456',
    'database': 'family_photo',
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

print(UPLOAD_COVER_FOLDER)

# JWT配置（保留，调整Token载荷）
JWT_CONFIG = {
    'secret': 'your_family_secret_key',  # 自定义随机字符串
    'expire_hours': 24
}

def encrypt_password(password: str) -> str:
    """
    安全的密码加密（使用bcrypt，自动生成随机盐值）
    :param password: 原始密码
    :return: 带盐值的哈希字符串（可直接存入数据库）
    """
    # 1. 处理密码长度：bcrypt最大支持72字节，超出部分截断（或先做一次SHA256）
    if len(password.encode('utf-8')) > 72:
        # 先通过SHA256压缩到32字节，再加密（避免截断导致密码失效）
        password = hashlib.sha256(password.encode('utf-8')).hexdigest()

    # 2. 生成随机盐值（cost=12 是生产环境推荐值，值越大加密越慢，越安全）
    salt = bcrypt.gensalt(rounds=12)

    # 3. 加密密码（自动将盐值融入哈希结果）
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)

    # 4. 转换为字符串返回（方便存入数据库）
    return password_hash.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码是否匹配
    :param plain_password: 用户输入的原始密码
    :param hashed_password: 数据库中存储的加密哈希
    :return: 匹配返回True，否则False
    """
    try:
        # 1. 处理密码长度（和加密逻辑一致）
        if len(plain_password.encode('utf-8')) > 72:
            plain_password = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()

        # 2. 验证密码（bcrypt会自动从哈希中提取盐值进行比对）
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        # 哈希格式错误/其他异常时，返回验证失败
        print(f"密码验证失败：{str(e)}")
        return False

# 生成JWT Token（携带member_id等信息）
def generate_token(member_info):
    payload = {
        'member_id': member_info['id'],
        'username': member_info['username'],
        'name': member_info['name'],
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