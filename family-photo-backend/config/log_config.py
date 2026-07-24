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


class SafeTimedRotatingFileHandler(TimedRotatingFileHandler):
    """
    针对 Windows 的 TimedRotatingFileHandler 安全封装。

    Windows 上日志文件被占用时，rotate() 会抛出 PermissionError。
    本类在轮转失败时跳过本次轮转并输出警告，而不是让日志系统崩溃。
    """

    def rotate(self, source, dest):
        try:
            super().rotate(source, dest)
        except PermissionError:
            # Windows 上文件被锁，跳过本次轮转（下次触发时再尝试）
            import sys
            sys.stderr.write(
                f'[日志轮转] 跳过：{os.path.basename(source)} 被锁定，'
                f'无法重命名为 {os.path.basename(dest)}\n'
            )
        except OSError as e:
            # 其他 OS 错误（如磁盘满）也优雅处理
            import sys
            sys.stderr.write(f'[日志轮转] 失败：{e}\n')


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

    # 2. 普通日志文件处理器（Windows 安全版）
    info_handler = SafeTimedRotatingFileHandler(
        filename=os.path.join(LOG_DIR, 'info.log'),
        when='midnight',
        backupCount=30,
        encoding='utf-8'
    )
    info_handler.setLevel(logging.INFO)
    info_handler.setFormatter(logging.Formatter(PROD_FORMAT, DATE_FMT))
    logger.addHandler(info_handler)

    # 3. 错误日志文件处理器（Windows 安全版）
    error_handler = SafeTimedRotatingFileHandler(
        filename=os.path.join(LOG_DIR, 'error.log'),
        when='midnight',
        backupCount=90,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter(PROD_FORMAT, DATE_FMT))
    logger.addHandler(error_handler)

    return logger