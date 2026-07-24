"""
AI 对话接口
──────────
提供两个核心接口：
  GET  /api/chat/history   获取最近三个月聊天记录（按账号隔离）
  POST /api/chat/send      发送消息并获取 AI 回复
"""

from flask import Blueprint, request, jsonify, g
import pymysql
import logging
from datetime import datetime

from .auth import login_required
from .utils import get_db_connection
from .ai_service import get_ai_response, get_ai_provider_info

chat_bp = Blueprint('chat', __name__)

logger = logging.getLogger('photo_manager')


# ─────────────────────────────────────────────────────────
# 获取聊天记录（最近三个月，按账号隔离）
# ─────────────────────────────────────────────────────────
@chat_bp.route('/chat/history', methods=['GET'])
@login_required
def get_chat_history():
    """
    查询当前登录用户最近三个月的聊天记录
    可选参数：
      months  查询月数，默认 3（如 ?months=6 则查最近半年）
    """
    try:
        months = int(request.args.get('months', 3))
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        sql = '''
            SELECT id, role, content, create_time
            FROM ai_chat_message
            WHERE member_id = %s
              AND create_time >= DATE_SUB(NOW(), INTERVAL %s MONTH)
            ORDER BY create_time ASC
        '''
        cursor.execute(sql, (g.member_id, months))
        messages = cursor.fetchall()

        # datetime 对象 → 字符串，前端可直接使用
        for msg in messages:
            if msg.get('create_time'):
                msg['create_time'] = msg['create_time'].strftime('%Y-%m-%d %H:%M:%S')

        cursor.close()
        conn.close()

        logger.info(f'[{g.member_name}] 获取聊天记录，共 {len(messages)} 条')
        return jsonify({'code': 200, 'data': messages})

    except Exception as e:
        logger.error(f'获取聊天记录失败：{str(e)}')
        return jsonify({'code': 500, 'msg': f'获取聊天记录失败：{str(e)}'}), 500


# ─────────────────────────────────────────────────────────
# 发送消息（存储用户消息 → 调用 AI → 存储 AI 回复 → 返回）
# ─────────────────────────────────────────────────────────
@chat_bp.route('/chat/send', methods=['POST'])
@login_required
def send_chat_message():
    """
    发送一条用户消息，自动调用 AI 生成回复
    请求体：{ "content": "用户输入的消息" }
    返回：{ user_message: {...}, ai_message: {...} }
    """
    data = request.json
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'code': 400, 'msg': '消息内容不能为空哦～'}), 400

    if len(content) > 2000:
        return jsonify({'code': 400, 'msg': '消息太长啦，请控制在 2000 字以内～'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # ── 1. 保存用户消息 ─────────────────────────────────
        cursor.execute(
            '''INSERT INTO ai_chat_message (member_id, role, content, create_time)
               VALUES (%s, %s, %s, %s)''',
            (g.member_id, 'user', content, now)
        )
        user_msg_id = cursor.lastrowid

        # ── 2. 查询最近对话上下文（最多取 10 轮 / 20 条）───
        cursor.execute(
            '''SELECT role, content FROM ai_chat_message
               WHERE member_id = %s
               ORDER BY create_time DESC
               LIMIT 20''',
            (g.member_id,)
        )
        history_rows = cursor.fetchall()
        # 反转为时间正序
        history_rows.reverse()
        chat_messages = [{'role': r['role'], 'content': r['content']} for r in history_rows]

        # ── 3. 调用 AI 服务 ──────────────────────────────────
        ai_reply = get_ai_response(chat_messages, member_name=g.member_name)

        # ── 4. 保存 AI 回复 ──────────────────────────────────
        ai_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            '''INSERT INTO ai_chat_message (member_id, role, content, create_time)
               VALUES (%s, %s, %s, %s)''',
            (g.member_id, 'assistant', ai_reply, ai_time)
        )
        ai_msg_id = cursor.lastrowid
        conn.commit()

        cursor.close()
        conn.close()

        logger.info(f'[{g.member_name}] 发送消息，AI 回复长度={len(ai_reply)}')

        return jsonify({
            'code': 200,
            'msg': '发送成功',
            'data': {
                'user_message': {
                    'id': user_msg_id,
                    'role': 'user',
                    'content': content,
                    'create_time': now,
                },
                'ai_message': {
                    'id': ai_msg_id,
                    'role': 'assistant',
                    'content': ai_reply,
                    'create_time': ai_time,
                },
            }
        })

    except Exception as e:
        logger.error(f'发送消息失败：{str(e)}')
        return jsonify({'code': 500, 'msg': f'发送消息失败：{str(e)}'}), 500


# ─────────────────────────────────────────────────────────
# 查询当前 AI 提供商及可用模型
# ─────────────────────────────────────────────────────────
@chat_bp.route('/chat/models', methods=['GET'])
@login_required
def list_ai_models():
    """
    返回当前 AI 提供商信息及可用模型列表
    - Ollama：返回本地已安装的模型（通过 ollama pull 安装）
    - OpenAI 等：返回当前配置的模型
    """
    try:
        info = get_ai_provider_info()
        logger.info(f'[{g.member_name}] 查询 AI 模型，provider={info["provider"]}')
        return jsonify({'code': 200, 'data': info})
    except Exception as e:
        logger.error(f'查询 AI 模型失败：{str(e)}')
        return jsonify({'code': 500, 'msg': f'查询失败：{str(e)}'}), 500


# ─────────────────────────────────────────────────────────
# 清空聊天记录（可选接口，方便用户重置对话）
# ─────────────────────────────────────────────────────────
@chat_bp.route('/chat/clear', methods=['POST'])
@login_required
def clear_chat_history():
    """清空当前用户的聊天记录"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM ai_chat_message WHERE member_id = %s', (g.member_id,))
        deleted = cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()

        logger.info(f'[{g.member_name}] 清空聊天记录，删除 {deleted} 条')
        return jsonify({'code': 200, 'msg': f'已清空 {deleted} 条聊天记录'})

    except Exception as e:
        logger.error(f'清空聊天记录失败：{str(e)}')
        return jsonify({'code': 500, 'msg': f'清空失败：{str(e)}'}), 500