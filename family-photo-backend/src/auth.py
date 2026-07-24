from flask import Blueprint, request, jsonify, send_from_directory, g, make_response
import pymysql
import logging

auth_bp = Blueprint('auth', __name__)

from config.config import (verify_token, verify_password, generate_token)
from .utils import get_db_connection

logger = logging.getLogger('photo_manager')

# ── Cookie 配置 ──────────────────────────────────────────
# 开发环境用 Lax（HTTP），生产环境用 Strict + Secure（HTTPS）
COOKIE_SAMESITE = 'Lax'
COOKIE_SECURE = False   # 生产环境改为 True（需 HTTPS）

def login_required(f):
    def wrapper(*args, **kwargs):
        # Token 获取优先级：请求头 → Cookie → URL参数（兼容旧版图片请求）
        token = (
            request.headers.get('Authorization')
            or request.cookies.get('token')
            or request.args.get('token')
        )
        if not token:
            return jsonify({'code': 401, 'msg': '未登录，请先登录'}), 401

        payload = verify_token(token)
        if not payload:
            return jsonify({'code': 401, 'msg': '登录已过期，请重新登录'}), 401

        # 将成员信息存入Flask上下文g（全局可访问）
        g.member_id = payload['member_id']
        g.member_username = payload['username']
        g.member_name = payload['name']
        g.is_admin = payload.get('is_admin', 0)

        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# ------------------- 登录接口（修改：验证family_member表的账号密码） -------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    logger.info(f'登录请求：{data}');

    if not username or not password:
        return jsonify({'code': 400, 'msg': '用户名和密码不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        # 查询成员信息（含权限标识）
        cursor.execute(
            'SELECT id, name, username, email, password, is_admin FROM family_member WHERE username = %s',
            (username,)
        )
        member = cursor.fetchone()
        cursor.close()
        conn.close()

        if not member:
            return jsonify({'code': 400, 'msg': '用户名不存在'}), 400

        if not verify_password(password, member['password']):
            return jsonify({'code': 400, 'msg': '密码错误'}), 400

        # 生成Token（携带成员信息及权限标识）
        token = generate_token({
            'id': member['id'],
            'username': member['username'],
            'name': member['name'],
            'is_admin': member.get('is_admin', 0),
        })

        # 构造响应，同时设置 HttpOnly Cookie（供图片等静态资源请求自动携带）
        resp = make_response(jsonify({
            'code': 200,
            'msg': '登录成功',
            'data': {
                'token': token,
                'member': {
                    'id': member['id'],
                    'name': member['name'],
                    'username': member['username'],
                    'email': member['email'],
                    'is_admin': bool(member.get('is_admin', 0)),
                }
            }
        }))
        resp.set_cookie(
            'token', token,
            httponly=True,            # JS 无法读取，防 XSS 窃取
            samesite=COOKIE_SAMESITE, # 防 CSRF
            secure=COOKIE_SECURE,     # 生产环境需 HTTPS
            max_age=24 * 60 * 60,     # 与 JWT 过期时间一致（秒）
            path='/',
        )
        return resp
    except Exception as e:
        logger.error(f'登录失败：{str(e)}')
        return jsonify({'code': 500, 'msg': f'登录失败：{str(e)}'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    resp = make_response(jsonify({'code': 200, 'msg': '退出成功'}))
    resp.delete_cookie('token', path='/')
    return resp