import os
import pymysql
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from datetime import datetime
from werkzeug.utils import secure_filename
from config import (
    DB_CONFIG, UPLOAD_FOLDER, ALLOWED_EXTENSIONS, MAX_CONTENT_LENGTH,
    JWT_CONFIG, generate_token, verify_token, encrypt_password, UPLOAD_COVER_FOLDER, verify_password
)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
CORS(app, supports_credentials=True, resources=r'/*', expose_headers='Authorization')

# 配置（根据实际情况修改）
app.config['UPLOAD_COVER_FOLDER'] = UPLOAD_COVER_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

# 数据库连接函数（不变）
def get_db_connection():
    conn = pymysql.connect(**DB_CONFIG)
    return conn

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
@app.route('/api/login', methods=['POST'])
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

# ------------------- 新增：获取当前登录成员信息接口 -------------------
@app.route('/api/current-member', methods=['GET'])
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

# ------------------- 上传照片接口（修改：自动记录operator_id） -------------------
@app.route('/api/photos/upload', methods=['POST'])
@login_required
def upload_photo():
    # 调试信息（可选）
    print("=== 调试信息 ===")
    print("请求 Content-Type：", request.content_type)
    print("request.files 中的字段：", list(request.files.keys()))
    print("当前登录成员ID：", g.member_id)

    # 原有文件检查逻辑
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
        album_dir = os.path.join(UPLOAD_FOLDER, str(album_id))
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

@app.route('/api/members', methods=['GET'])
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

@app.route('/uploads/<path:filename>')
@login_required
def serve_photo(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/static/<path:filename>')
@login_required
def serve_static_photo(filename):
    return send_from_directory(UPLOAD_COVER_FOLDER, filename)

@app.route('/api/logout', methods=['POST'])
def logout():
    return jsonify({'code': 200, 'msg': '退出成功'})

# app.py 中的 delete_photo 接口（完整修复版）
@app.route('/api/photos/delete', methods=['POST'])
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
            file_path = os.path.join(UPLOAD_FOLDER, photo['file_path'])  # 正常访问
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

# app.py 新增搜索接口
# app.py - 搜索照片（分页版）
@app.route('/api/photos/search', methods=['GET'])
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

# app.py - 获取相册照片（分页版）
@app.route('/api/photos/album/<int:album_id>', methods=['GET'])
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
        sql = '''SELECT p.*, m.name as member_name, o.name as operator_name 
                 FROM photo p 
                 LEFT JOIN family_member m ON p.member_id = m.id 
                 LEFT JOIN family_member o ON p.operator_id = o.id 
                 WHERE p.album_id = %s 
                 ORDER BY p.upload_time DESC 
                 LIMIT %s OFFSET %s'''
        cursor.execute(sql, (album_id, page_size, offset))
        photos = cursor.fetchall()

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
@app.route('/api/albums', methods=['GET'])
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
                album['cover_url'] = 'covers/default_cover.jpg'
            else:
                album['cover_url'] = f'covers/{album["cover_path"]}'
        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'data': albums})
    except Exception as e:
        # 新增：打印异常详情，方便排查
        print(f"获取相册列表异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'获取相册失败：{str(e)}'}), 500

# 新增：创建相册接口（放在 get_albums 接口下方）
@app.route('/api/album/create', methods=['POST'])
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
                    if file.content_length > 2 * 1024 * 1024:
                        cursor.close()
                        conn.close()
                        return jsonify({'code': 400, 'msg': '封面图片大小不能超过2MB'}), 400
                    # 生成唯一文件名
                    filename = secure_filename(f'album_{datetime.now().strftime("%Y%m%d%H%M%S")}_{file.filename}')
                    # 保存封面文件
                    file.save(os.path.join(app.config['UPLOAD_COVER_FOLDER'], filename))
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
                'cover_url': f'covers/{cover_path}' if cover_path != 'default_cover.jpg' else 'covers/default_cover.jpg'
            }
        })
    except Exception as e:
        print(f"创建相册异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'创建相册失败：{str(e)}'}), 500

# 2. 修改相册名称
@app.route('/api/album/rename', methods=['POST'])
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
@app.route('/api/album/delete', methods=['POST'])
@login_required
def delete_album():
    data = request.json
    album_id = data.get('album_id')
    if not album_id:
        return jsonify({'code': 400, 'msg': '相册ID不能为空'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # 先删除相册下的照片（可选：也可以保留照片，仅删除相册）
        cursor.execute('SELECT file_path FROM photo WHERE album_id = %s', (album_id,))
        photos = cursor.fetchall()
        # 删除照片物理文件
        for photo in photos:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], photo['file_path'])
            if os.path.exists(file_path):
                os.remove(file_path)
        # 删除照片记录
        cursor.execute('DELETE FROM photo WHERE album_id = %s', (album_id,))
        # 删除相册封面（如果不是默认封面）
        cursor.execute('SELECT cover_path FROM album WHERE id = %s', (album_id,))
        album = cursor.fetchone()
        if album and album['cover_path'] != 'default_cover.jpg':
            cover_path = os.path.join(app.config['UPLOAD_COVER_FOLDER'], album['cover_path'])
            if os.path.exists(cover_path):
                os.remove(cover_path)
        # 删除相册记录
        cursor.execute('DELETE FROM album WHERE id = %s', (album_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'msg': '删除相册成功'})
    except Exception as e:
        return jsonify({'code': 500, 'msg': f'删除相册失败：{str(e)}'}), 500

# 4. 上传/更换相册封面
@app.route('/api/album/cover/upload', methods=['POST'])
@login_required
def upload_album_cover():
    if 'file' not in request.files:
        return jsonify({'code': 400, 'msg': '请选择封面图片'}), 400
    file = request.files['file']
    album_id = request.form.get('album_id')
    if file.filename == '' or not album_id:
        return jsonify({'code': 400, 'msg': '文件或相册ID不能为空'}), 400
    # 验证文件类型
    if file and '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']:
        filename = secure_filename(f'album_{album_id}_{datetime.now().strftime("%Y%m%d%H%M%S")}.jpg')
        file.save(os.path.join(app.config['UPLOAD_COVER_FOLDER'], filename))
        try:
            conn = get_db_connection()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            # 先删除旧封面（如果不是默认）
            cursor.execute('SELECT cover_path FROM album WHERE id = %s', (album_id,))
            old_cover = cursor.fetchone()
            if old_cover and old_cover['cover_path'] != 'default_cover.jpg':
                old_cover_path = os.path.join(app.config['UPLOAD_COVER_FOLDER'], old_cover['cover_path'])
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
                'data': {'cover_url': f'http://localhost:5000/covers/{filename}'}
            })
        except Exception as e:
            return jsonify({'code': 500, 'msg': f'更新封面失败：{str(e)}'}), 500
    else:
        return jsonify({'code': 400, 'msg': '仅支持png/jpg/jpeg/gif/bmp格式'}), 400

# 暴露封面静态文件访问
@app.route('/covers/<filename>')
@login_required
def uploaded_cover(filename):
    return send_from_directory(app.config['UPLOAD_COVER_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)