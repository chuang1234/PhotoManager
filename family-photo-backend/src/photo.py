import os
from flask import Blueprint, request, jsonify, g
import pymysql
from datetime import datetime
from werkzeug.utils import secure_filename

photo_bp = Blueprint('photo', __name__)

from config.config import (
    UPLOAD_PHOTO_FOLDER, UPLOAD_COVER_FOLDER
)
from .utils import get_db_connection, allowed_file
from .auth import login_required

@photo_bp.route('/photos/upload', methods=['POST'])
@login_required
def upload_photo():
    if 'photo' not in request.files:
        return jsonify({'code': 400, 'msg': '未选择照片文件'})
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'code': 400, 'msg': '文件名为空'})

    # 获取表单参数（归属人member_id可选，操作者operator_id自动取当前登录成员）
    album_id = request.form.get('album_id')
    photo_name = request.form.get('photo_name', file.filename)
    shoot_time = request.form.get('shoot_time')
    member_id = request.form.get('member_id')  # 归属人（可选）
    remarks = request.form.get('remarks', '')
    operator_id = g.member_id  # 操作者=当前登录成员（核心变更）

    if not album_id:
        return jsonify({'code': 400, 'msg': '请选择所属相册'})

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        album_dir = os.path.join(UPLOAD_PHOTO_FOLDER, str(album_id))
        if not os.path.exists(album_dir):
            os.makedirs(album_dir)
        file_path = os.path.join(album_dir, filename)
        file.save(file_path)

        relative_path = os.path.join(str(album_id), filename)
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            # 插入时新增operator_id字段（核心变更）
            cursor.execute(
                '''INSERT INTO photo 
                   (photo_name, file_path, shoot_time, album_id, member_id, operator_id, remarks) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s)''',
                (photo_name, relative_path, shoot_time, album_id, member_id, operator_id, remarks)
            )

            cursor.execute(
                '''UPDATE album set last_upload_user_id = %s, last_upload_time=%s WHERE id=%s''',
                (operator_id, datetime.now(), album_id)
            )
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'code': 200, 'msg': '上传成功', 'data': {'file_path': relative_path}})
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'code': 500, 'msg': f'保存数据失败：{str(e)}'})
    else:
        return jsonify({'code': 400, 'msg': '不支持的文件格式，仅支持png/jpg/jpeg/gif/bmp'})

# app.py.bak 中的 delete_photo 接口（完整修复版）
@photo_bp.route('/photos/delete', methods=['POST'])
@login_required
def delete_photo():
    data = request.json
    photo_id = data.get('photo_id')
    if not photo_id:
        return jsonify({'code': 400, 'msg': '照片ID不能为空'}), 400

    try:
        conn = get_db_connection()
        # 核心修改1：使用 DictCursor，让查询结果返回字典
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        # 先查询文件路径（此时 photo 是字典，可通过 'file_path' 访问）
        cursor.execute('SELECT file_path FROM photo WHERE id = %s', (photo_id,))
        photo = cursor.fetchone()
        if photo:
            file_path = os.path.join(UPLOAD_PHOTO_FOLDER, photo['file_path'])  # 正常访问
            if os.path.exists(file_path):
                os.remove(file_path)  # 删除物理文件

        # 删除数据库记录
        cursor.execute('DELETE FROM photo WHERE id = %s', (photo_id,))
        conn.commit()

        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'msg': '删除成功'})
    except Exception as e:
        # 核心修改2：增加异常打印，方便排查
        print(f"删除照片异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'删除失败：{str(e)}'}), 500


@photo_bp.route('/photos/search', methods=['GET'])
@login_required
def search_photos():
    album_id = request.args.get('album_id')
    name_like = request.args.get('name_like', '')
    member_id = request.args.get('member_id', '')
    operator_id = request.args.get('operator_id', '')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')

    # 分页参数
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 12))
    offset = (page - 1) * page_size

    if not album_id:
        return jsonify({'code': 400, 'msg': '相册ID不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        # 构建查询条件
        sql_count = 'SELECT COUNT(*) as total FROM photo p LEFT JOIN family_member m ON p.member_id = m.id LEFT JOIN family_member o ON p.operator_id = o.id WHERE p.album_id = %s'
        sql_data = '''SELECT p.*, m.name as member_name, o.name as operator_name 
                      FROM photo p 
                      LEFT JOIN family_member m ON p.member_id = m.id 
                      LEFT JOIN family_member o ON p.operator_id = o.id 
                      WHERE p.album_id = %s'''
        params = [album_id]

        # 拼接条件
        if name_like:
            sql_count += ' AND p.photo_name LIKE %s'
            sql_data += ' AND p.photo_name LIKE %s'
            params.append(f'%{name_like}%')
        if member_id:
            sql_count += ' AND p.member_id = %s'
            sql_data += ' AND p.member_id = %s'
            params.append(member_id)
        if operator_id:
            sql_count += ' AND p.operator_id = %s'
            sql_data += ' AND p.operator_id = %s'
            params.append(operator_id)
        if start_date:
            sql_count += ' AND p.shoot_time >= %s'
            sql_data += ' AND p.shoot_time >= %s'
            params.append(start_date)
        if end_date:
            sql_count += ' AND p.shoot_time <= %s'
            sql_data += ' AND p.shoot_time <= %s'
            params.append(end_date)

        # 1. 查询总条数
        cursor.execute(sql_count, params)
        total = cursor.fetchone()['total']

        # 2. 查询当前页数据
        sql_data += ' ORDER BY p.upload_time DESC LIMIT %s OFFSET %s'
        params.extend([page_size, offset])
        cursor.execute(sql_data, params)
        photos = cursor.fetchall()

        for photo in photos:
            if photo.get('shoot_time'):
                photo['shoot_time'] = photo['shoot_time'].strftime('%Y-%m-%d %H:%M:%S')

            if photo.get('upload_time'):
                photo['upload_time'] = photo['upload_time'].strftime('%Y-%m-%d %H:%M:%S')

        cursor.close()
        conn.close()

        return jsonify({
            'code': 200,
            'data': photos,
            'total': total,
            'has_more': page * page_size < total
        })
    except Exception as e:
        return jsonify({'code': 500, 'msg': f'搜索失败：{str(e)}'}), 500
