from flask import Flask
from flask_cors import CORS
import os
from pathlib import Path

# ── 加载 .env 文件（必须在其他模块导入之前） ────────────
# 支持通过 .env 文件配置环境变量，无需每次手动 set
from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent / '.env'
if _env_path.exists():
    load_dotenv(_env_path, override=True)

from .album import album_bp
from .auth import auth_bp
from .chat import chat_bp          # AI 对话蓝图
from .favorite import favorite_bp
from .file import file_bp
from .member import member_bp
from .photo import photo_bp

app = Flask(__name__)
CORS(app, supports_credentials=True, resources=r'/*', expose_headers='Authorization')

app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(photo_bp, url_prefix='/api')
app.register_blueprint(file_bp, url_prefix='/uploads')
app.register_blueprint(member_bp, url_prefix='/api')
app.register_blueprint(favorite_bp, url_prefix='/api')
app.register_blueprint(album_bp, url_prefix='/api')
app.register_blueprint(chat_bp, url_prefix='/api')     # AI 对话接口

from config.log_config import setup_logger
# 初始化日志器
env = os.environ.get('FLASK_ENV', 'dev')
logger = setup_logger(env)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)