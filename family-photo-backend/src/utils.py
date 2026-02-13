import pymysql

from config.config import (DB_CONFIG, ALLOWED_EXTENSIONS)

def get_db_connection():
    conn = pymysql.connect(**DB_CONFIG)
    return conn

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS