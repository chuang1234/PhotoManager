import os
from datetime import datetime

import pymysql
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

album_bp = Blueprint('album', __name__)

from config.config import (
    UPLOAD_PHOTO_FOLDER, ALLOWED_EXTENSIONS, UPLOAD_COVER_FOLDER
)
from .utils import get_db_connection
from .auth import login_required

@album_bp.route('/photos/album/<int:album_id>', methods=['GET'])
@login_required
def get_album_photos(album_id):
    # 获取分页参数
    page = int(request.args.get('page', 1))  # 默认第1页
    page_size = int(request.args.get('page_size', 12))  # 每页12条
    offset = (page - 1) * page_size  # 计算偏移量

    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        # 1. 查询当前页数据
        sql = '''SELECT p.*, m.name as member_name, o.name as operator_name, f.folder_id as favorite_folder_id
                 FROM photo p 
                 LEFT JOIN family_member m ON p.member_id = m.id 
                 LEFT JOIN family_member o ON p.operator_id = o.id 
                 LEFT JOIN favorite_photo f ON f.photo_id = p.id and f.member_id = p.operator_id
                 WHERE p.album_id = %s 
                 ORDER BY p.upload_time DESC 
                 LIMIT %s OFFSET %s'''
        cursor.execute(sql, (album_id, page_size, offset))
        photos = cursor.fetchall()

        for photo in photos:
            if photo.get('shoot_time'):
                photo['shoot_time'] = photo['shoot_time'].strftime('%Y-%m-%d %H:%M:%S')

            if photo.get('upload_time'):
                photo['upload_time'] = photo['upload_time'].strftime('%Y-%m-%d %H:%M:%S')

        # 2. 查询总条数（判断是否有更多数据）
        cursor.execute('SELECT COUNT(*) as total FROM photo WHERE album_id = %s', (album_id,))
        total = cursor.fetchone()['total']

        cursor.close()
        conn.close()

        return jsonify({
            'code': 200,
            'data': photos,
            'total': total,  # 总条数
            'has_more': page * page_size < total  # 是否有下一页
        })
    except Exception as e:
        return jsonify({'code': 500, 'msg': f'获取照片失败：{str(e)}'}), 500

# 1. 获取相册列表（含最后上传信息、封面）
@album_bp.route('/albums', methods=['GET'])
@login_required
def get_albums():
    try:
        conn = get_db_connection()
        # 核心修改：指定 DictCursor，让查询结果返回字典
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        # 关联查询最后上传人名称
        sql = '''
            SELECT a.*, m.name as last_upload_user_name 
            FROM album a 
            LEFT JOIN family_member m ON a.last_upload_user_id = m.id 
            ORDER BY a.create_time DESC
        '''
        cursor.execute(sql)
        albums = cursor.fetchall()  # 现在返回字典列表，可正常用字符串索引
        # 处理封面路径
        for album in albums:
            # 处理 create_time（数据库查询到的是 datetime 对象）
            if album.get('create_time'):
                # 转换为北京时间（UTC+8），格式：YYYY-MM-DD HH:mm:ss
                album['create_time'] = album['create_time'].strftime('%Y-%m-%d %H:%M:%S')

            # 处理 last_upload_time（同理）
            if album.get('last_upload_time'):
                album['last_upload_time'] = album['last_upload_time'].strftime('%Y-%m-%d %H:%M:%S')

            if album['cover_path'] == 'default_cover.jpg':  # ✅ 字典支持字符串索引
                album['cover_url'] = 'default_cover.jpg'
            else:
                album['cover_url'] = f'{album["cover_path"]}'
        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'data': albums})
    except Exception as e:
        # 新增：打印异常详情，方便排查
        print(f"获取相册列表异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'获取相册失败：{str(e)}'}), 500

# 新增：创建相册接口（放在 get_albums 接口下方）
@album_bp.route('/album/create', methods=['POST'])
def create_album():
    try:
        # 1. 获取普通参数（相册名称）
        album_name = request.form.get('name')
        # 参数校验：名称不能为空
        if not album_name or not album_name.strip():
            return jsonify({'code': 400, 'msg': '相册名称不能为空'}), 400

        # 2. 校验相册名称是否重复
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute('SELECT id FROM album WHERE album_name = %s', (album_name.strip(),))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 400, 'msg': '该相册名称已存在，请更换名称'}), 400

        # 3. 处理封面上传（可选）
        cover_path = 'default_cover.jpg'  # 默认封面
        if 'cover' in request.files:
            file = request.files['cover']
            if file.filename != '':
                # 验证文件类型
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    # 验证文件大小（≤2MB）
                    if file.content_length > 10 * 1024 * 1024:
                        cursor.close()
                        conn.close()
                        return jsonify({'code': 400, 'msg': '封面图片大小不能超过10MB'}), 400
                    # 生成唯一文件名
                    filename = secure_filename(f'album_{datetime.now().strftime("%Y%m%d%H%M%S")}_{file.filename}')
                    # 保存封面文件
                    file.save(os.path.join(UPLOAD_COVER_FOLDER, filename))
                    cover_path = filename
                else:
                    cursor.close()
                    conn.close()
                    return jsonify({'code': 400, 'msg': '仅支持png/jpg/jpeg/gif/bmp格式的封面'}), 400

        # 4. 插入相册记录
        create_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            '''INSERT INTO album (album_name, cover_path, create_time, last_upload_time, last_upload_user_id) 
               VALUES (%s, %s, %s, %s, %s)''',
            (album_name.strip(), cover_path, create_time, None, None)
        )
        conn.commit()
        new_album_id = cursor.lastrowid

        # 5. 关闭连接并返回结果
        cursor.close()
        conn.close()
        return jsonify({
            'code': 200,
            'msg': '创建相册成功',
            'data': {
                'album_id': new_album_id,
                'name': album_name.strip(),
                'cover_url': cover_path
            }
        })
    except Exception as e:
        print(f"创建相册异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'创建相册失败：{str(e)}'}), 500

# 2. 修改相册名称
@album_bp.route('/album/rename', methods=['POST'])
@login_required
def rename_album():
    data = request.json
    album_id = data.get('album_id')
    new_name = data.get('new_name')
    if not album_id or not new_name:
        return jsonify({'code': 400, 'msg': '相册ID和新名称不能为空'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE album SET album_name = %s WHERE id = %s',
            (new_name, album_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'msg': '修改名称成功'})
    except Exception as e:
        return jsonify({'code': 500, 'msg': f'修改名称失败：{str(e)}'}), 500

# 3. 删除相册（级联删除照片）
@album_bp.route('/album/delete', methods=['POST'])
@login_required
def delete_album():
    data = request.json
    album_id = data.get('album_id')
    if not album_id:
        return jsonify({'code': 400, 'msg': '相册ID不能为空'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        # 先删除相册下的照片（可选：也可以保留照片，仅删除相册）
        cursor.execute('SELECT file_path FROM photo WHERE album_id = %s', (album_id,))
        photos = cursor.fetchall()
        # 删除照片物理文件
        for photo in photos:
            file_path = os.path.join(UPLOAD_PHOTO_FOLDER, photo['file_path'])
            if os.path.exists(file_path):
                os.remove(file_path)
        # 删除照片记录
        cursor.execute('DELETE FROM photo WHERE album_id = %s', (album_id,))
        # 删除相册封面（如果不是默认封面）
        cursor.execute('SELECT cover_path FROM album WHERE id = %s', (album_id,))
        album = cursor.fetchone()
        if album and album['cover_path'] != 'default_cover.jpg':
            cover_path = os.path.join(UPLOAD_COVER_FOLDER, album['cover_path'])
            if os.path.exists(cover_path):
                os.remove(cover_path)
        # 删除相册记录
        cursor.execute('DELETE FROM album WHERE id = %s', (album_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'msg': '删除相册成功'})
    except Exception as e:
        print(e)
        return jsonify({'code': 500, 'msg': f'删除相册失败：{str(e)}'}), 500

# 4. 上传/更换相册封面
@album_bp.route('/album/cover/upload', methods=['POST'])
@login_required
def upload_album_cover():
    if 'file' not in request.files:
        return jsonify({'code': 400, 'msg': '请选择封面图片'}), 400
    file = request.files['file']
    album_id = request.form.get('album_id')
    if file.filename == '' or not album_id:
        return jsonify({'code': 400, 'msg': '文件或相册ID不能为空'}), 400
    # 验证文件类型
    if file and '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS:
        filename = secure_filename(f'album_{album_id}_{datetime.now().strftime("%Y%m%d%H%M%S")}.jpg')
        file.save(os.path.join(UPLOAD_COVER_FOLDER, filename))
        try:
            conn = get_db_connection()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            # 先删除旧封面（如果不是默认）
            cursor.execute('SELECT cover_path FROM album WHERE id = %s', (album_id,))
            old_cover = cursor.fetchone()
            if old_cover and old_cover['cover_path'] != 'default_cover.jpg':
                old_cover_path = os.path.join(UPLOAD_COVER_FOLDER, old_cover['cover_path'])
                if os.path.exists(old_cover_path):
                    os.remove(old_cover_path)
            # 更新封面路径
            cursor.execute(
                'UPDATE album SET cover_path = %s WHERE id = %s',
                (filename, album_id)
            )
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({
                'code': 200,
                'msg': '更换封面成功',
                'data': {'cover_url': filename}
            })
        except Exception as e:
            return jsonify({'code': 500, 'msg': f'更新封面失败：{str(e)}'}), 500
    else:
        return jsonify({'code': 400, 'msg': '仅支持png/jpg/jpeg/gif/bmp格式'}), 400
