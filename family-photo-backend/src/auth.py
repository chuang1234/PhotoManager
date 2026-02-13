from flask import Blueprint, request, jsonify, send_from_directory, g
import pymysql

auth_bp = Blueprint('auth', __name__)

from config.config import (verify_token, verify_password, generate_token)
from .utils import get_db_connection

def login_required(f):
    def wrapper(*args, **kwargs):
        # 优先从请求头获取Token，其次从URL参数获取（适配图片请求）
        token = request.headers.get('Authorization') or request.args.get('token')
        if not token:
            return jsonify({'code': 401, 'msg': '未登录，请先登录'}), 401

        payload = verify_token(token)
        if not payload:
            return jsonify({'code': 401, 'msg': '登录已过期，请重新登录'}), 401

        # 将成员信息存入Flask上下文g（全局可访问）
        g.member_id = payload['member_id']
        g.member_username = payload['username']
        g.member_name = payload['name']

        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# ------------------- 登录接口（修改：验证family_member表的账号密码） -------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'code': 400, 'msg': '用户名和密码不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        # 查询成员信息（密码暂时明文，后续可改为验证加密后的密码）
        cursor.execute(
            'SELECT id, name, username, email, password FROM family_member WHERE username = %s',
            (username,)
        )
        member = cursor.fetchone()
        cursor.close()
        conn.close()

        if not member:
            return jsonify({'code': 400, 'msg': '用户名不存在'}), 400

        if not verify_password(password, member['password']):
            return jsonify({'code': 400, 'msg': '密码错误'}), 400

        # 生成Token（携带成员信息）
        token = generate_token({
            'id': member['id'],
            'username': member['username'],
            'name': member['name']
        })

        # 返回成员信息（不含密码）
        return jsonify({
            'code': 200,
            'msg': '登录成功',
            'data': {
                'token': token,
                'member': {
                    'id': member['id'],
                    'name': member['name'],
                    'username': member['username'],
                    'email': member['email']
                }
            }
        })
    except Exception as e:
        return jsonify({'code': 500, 'msg': f'登录失败：{str(e)}'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'code': 200, 'msg': '退出成功'})