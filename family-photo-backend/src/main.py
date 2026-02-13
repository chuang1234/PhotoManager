from flask import Flask
from flask_cors import CORS
import os

from .album import album_bp
from .auth import auth_bp
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

from config.log_config import setup_logger
# 初始化日志器
env = os.environ.get('FLASK_ENV', 'dev')
logger = setup_logger(env)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)