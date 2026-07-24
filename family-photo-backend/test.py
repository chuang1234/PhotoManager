import hashlib
import bcrypt
import logging
logger = logging.getLogger('photo_manager')
def encrypt_password(original_password: str) -> str:
    """
    注册/改密码时：生成最终存储到数据库的哈希（SHA256 + bcrypt）
    :param original_password: 用户输入的原始明文密码
    :return: bcrypt哈希字符串（含盐值）
    """
    try:
        # 第一步：对原始密码做SHA256预处理（和前端登录时一致）
        sha256_result = hashlib.sha256(original_password.encode('utf-8')).hexdigest()

        # 第二步：bcrypt加盐哈希（核心，防止彩虹表破解）
        # bcrypt自动生成盐值，哈希结果会包含盐值（无需单独存盐）
        bcrypt_salt = bcrypt.gensalt(12)  # 盐值强度，生产环境推荐10-14
        bcrypt_hash = bcrypt.hashpw(sha256_result.encode('utf-8'), bcrypt_salt)

        return bcrypt_hash.decode('utf-8')  # 转字符串存数据库
    except Exception as e:
        logger.error(f"密码加密失败：{str(e)}")
        raise e

if __name__ == '__main__':
    print(encrypt_password('testPwd'))  # 必须和前端输出一致