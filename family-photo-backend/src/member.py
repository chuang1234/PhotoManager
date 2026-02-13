import pymysql
from flask import Blueprint, jsonify, g

from .auth import login_required
from .utils import get_db_connection

member_bp = Blueprint('member', __name__)

# ------------------- 新增：获取当前登录成员信息接口 -------------------
@member_bp.route('/current-member', methods=['GET'])
@login_required
def get_current_member():
    # 从g对象获取成员信息
    return jsonify({
        'code': 200,
        'data': {
            'id': g.member_id,
            'username': g.member_username,
            'name': g.member_name
        }
    })


@member_bp.route('/members', methods=['GET'])
@login_required
def get_members():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('SELECT id, name, relation, email FROM family_member ORDER BY id ASC')
        members = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'data': members})
    except Exception as e:
        return jsonify({'code': 500, 'msg': f'查询家庭成员失败：{str(e)}'})
