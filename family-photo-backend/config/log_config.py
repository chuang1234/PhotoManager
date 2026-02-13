import os
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

# 基础路径
BASE_DIR = Path(__file__).resolve().parent.parent
LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# 日志格式
DEV_FORMAT = '[%(asctime)s] [%(levelname)s] [%(module)s:%(lineno)d] - %(message)s'
PROD_FORMAT = '[%(asctime)s] [%(levelname)s] [%(module)s] - %(message)s'
DATE_FMT = '%Y-%m-%d %H:%M:%S'

def setup_logger(env='dev'):
    """初始化日志器"""
    # 全局日志器
    logger = logging.getLogger('photo_manager')
    logger.setLevel(logging.DEBUG if env == 'dev' else logging.INFO)
    logger.handlers.clear()  # 避免重复添加处理器

    # 1. 控制台处理器（仅开发环境）
    if env == 'dev':
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(logging.Formatter(DEV_FORMAT, DATE_FMT))
        logger.addHandler(console_handler)

    # 2. 普通日志文件处理器
    info_handler = TimedRotatingFileHandler(
        filename=os.path.join(LOG_DIR, 'info.log'),
        when='midnight',
        backupCount=30,
        encoding='utf-8'
    )
    info_handler.setLevel(logging.INFO)
    info_handler.setFormatter(logging.Formatter(PROD_FORMAT, DATE_FMT))
    logger.addHandler(info_handler)

    # 3. 错误日志文件处理器
    error_handler = TimedRotatingFileHandler(
        filename=os.path.join(LOG_DIR, 'error.log'),
        when='midnight',
        backupCount=90,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter(PROD_FORMAT, DATE_FMT))
    logger.addHandler(error_handler)

    return logger