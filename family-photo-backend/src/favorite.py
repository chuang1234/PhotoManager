import pymysql
from flask import Blueprint, request, jsonify, g
from .utils import get_db_connection
from .auth import login_required

favorite_bp = Blueprint('favorite', __name__)
# 1. 获取当前用户的收藏夹列表
@favorite_bp.route('/favorite/folders', methods=['GET'])
@login_required
def get_favorite_folders():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        # 查询当前用户的所有收藏夹，优先显示默认收藏夹
        cursor.execute(
            '''SELECT id, folder_name, is_default, create_time 
               FROM favorite_folder 
               WHERE member_id = %s 
               ORDER BY is_default DESC, create_time DESC''',
            (g.member_id,)
        )
        folders = cursor.fetchall()
        # 格式化时间
        for folder in folders:
            if folder.get('create_time'):
                folder['create_time'] = folder['create_time'].strftime('%Y-%m-%d %H:%M:%S')

        cursor.close()
        conn.close()
        return jsonify({
            'code': 200,
            'msg': '查询成功',
            'data': folders
        })
    except Exception as e:
        print(f"获取收藏夹列表异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'查询失败：{str(e)}'}), 500

# 2. 创建收藏夹
@favorite_bp.route('/favorite/folders', methods=['POST'])
@login_required
def create_favorite_folder():
    data = request.json
    folder_name = data.get('folder_name', '').strip()

    if not folder_name:
        return jsonify({'code': 400, 'msg': '收藏夹名称不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # 检查名称是否重复（可选）
        cursor.execute(
            '''SELECT id FROM favorite_folder 
               WHERE member_id = %s AND folder_name = %s''',
            (g.member_id, folder_name)
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 400, 'msg': '该收藏夹名称已存在'}), 400

        # 插入新收藏夹（默认非默认收藏夹）
        cursor.execute(
            '''INSERT INTO favorite_folder (folder_name, member_id, is_default) 
               VALUES (%s, %s, 0)''',
            (folder_name, g.member_id)
        )
        new_folder_id = cursor.lastrowid
        conn.commit()

        cursor.close()
        conn.close()
        return jsonify({
            'code': 200,
            'msg': '创建成功',
            'data': {'folder_id': new_folder_id, 'folder_name': folder_name}
        })
    except Exception as e:
        print(f"创建收藏夹异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'创建失败：{str(e)}'}), 500

# 3. 修改收藏夹名称
@favorite_bp.route('/favorite/folders/<int:folder_id>', methods=['PUT'])
@login_required
def update_favorite_folder(folder_id):
    data = request.json
    new_name = data.get('folder_name', '').strip()

    if not new_name:
        return jsonify({'code': 400, 'msg': '收藏夹名称不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # 检查收藏夹是否属于当前用户
        cursor.execute(
            '''SELECT id FROM favorite_folder 
               WHERE id = %s AND member_id = %s''',
            (folder_id, g.member_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 403, 'msg': '无权限修改该收藏夹'}), 403

        # 检查新名称是否重复
        cursor.execute(
            '''SELECT id FROM favorite_folder 
               WHERE member_id = %s AND folder_name = %s AND id != %s''',
            (g.member_id, new_name, folder_id)
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 400, 'msg': '该收藏夹名称已存在'}), 400

        # 更新名称
        cursor.execute(
            '''UPDATE favorite_folder SET folder_name = %s WHERE id = %s''',
            (new_name, folder_id)
        )
        conn.commit()

        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'msg': '修改成功', 'data': {'folder_name': new_name}})
    except Exception as e:
        print(f"修改收藏夹名称异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'修改失败：{str(e)}'}), 500

# 4. 删除收藏夹（非默认）
@favorite_bp.route('/favorite/folders/<int:folder_id>', methods=['DELETE'])
@login_required
def delete_favorite_folder(folder_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        # 检查收藏夹是否存在且属于当前用户
        cursor.execute(
            '''SELECT id, is_default FROM favorite_folder 
               WHERE id = %s AND member_id = %s''',
            (folder_id, g.member_id)
        )
        folder = cursor.fetchone()
        if not folder:
            cursor.close()
            conn.close()
            return jsonify({'code': 404, 'msg': '收藏夹不存在'}), 404

        # 禁止删除默认收藏夹
        if folder['is_default'] == 1:
            cursor.close()
            conn.close()
            return jsonify({'code': 400, 'msg': '默认收藏夹不能删除'}), 400

        # 删除收藏夹（级联删除关联的照片收藏记录）
        cursor.execute('DELETE FROM favorite_folder WHERE id = %s', (folder_id,))
        conn.commit()

        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'msg': '删除成功'})
    except Exception as e:
        print(f"删除收藏夹异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'删除失败：{str(e)}'}), 500

# 5. 照片加入收藏夹
@favorite_bp.route('/favorite/photos', methods=['POST'])
@login_required
def add_photo_to_favorite():
    data = request.json
    photo_id = data.get('photo_id')
    folder_id = data.get('folder_id')

    if not photo_id or not folder_id:
        return jsonify({'code': 400, 'msg': '照片ID和收藏夹ID不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # 检查收藏夹是否属于当前用户
        cursor.execute(
            '''SELECT id FROM favorite_folder 
               WHERE id = %s AND member_id = %s''',
            (folder_id, g.member_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 403, 'msg': '无权限操作该收藏夹'}), 403

        # 检查照片是否存在
        cursor.execute('SELECT id FROM photo WHERE id = %s', (photo_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 404, 'msg': '照片不存在'}), 404

        # 检查是否已收藏
        cursor.execute(
            '''SELECT id FROM favorite_photo 
               WHERE folder_id = %s AND photo_id = %s''',
            (folder_id, photo_id)
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 400, 'msg': '该照片已在收藏夹中'}), 400

        # 新增收藏记录
        cursor.execute(
            '''INSERT INTO favorite_photo (folder_id, photo_id, member_id) 
               VALUES (%s, %s, %s)''',
            (folder_id, photo_id, g.member_id)
        )
        conn.commit()

        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'msg': '加入收藏成功'})
    except pymysql.IntegrityError as e:
        print(f"加入收藏重复异常：{str(e)}")
        return jsonify({'code': 400, 'msg': '该照片已在收藏夹中'}), 400
    except Exception as e:
        print(f"加入收藏异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'加入收藏失败：{str(e)}'}), 500

# 6. 照片移出收藏夹
@favorite_bp.route('/favorite/photos', methods=['DELETE'])
@login_required
def remove_photo_from_favorite():
    data = request.json
    photo_id = data.get('photo_id')
    folder_id = data.get('folder_id')

    if not photo_id or not folder_id:
        return jsonify({'code': 400, 'msg': '照片ID和收藏夹ID不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # 检查收藏夹是否属于当前用户
        cursor.execute(
            '''SELECT id FROM favorite_folder 
               WHERE id = %s AND member_id = %s''',
            (folder_id, g.member_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 403, 'msg': '无权限操作该收藏夹'}), 403

        # 删除收藏记录
        cursor.execute(
            '''DELETE FROM favorite_photo 
               WHERE folder_id = %s AND photo_id = %s AND member_id = %s''',
            (folder_id, photo_id, g.member_id)
        )
        conn.commit()

        cursor.close()
        conn.close()
        return jsonify({'code': 200, 'msg': '移出收藏成功'})
    except Exception as e:
        print(f"移出收藏异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'移出收藏失败：{str(e)}'}), 500

# 7. 获取收藏夹下的照片列表（分页）
@favorite_bp.route('/favorite/photos/<int:folder_id>', methods=['GET'])
@login_required
def get_favorite_photos(folder_id):
    # 分页参数
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 12))
    offset = (page - 1) * page_size

    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        # 检查收藏夹是否属于当前用户
        cursor.execute(
            '''SELECT id FROM favorite_folder 
               WHERE id = %s AND member_id = %s''',
            (folder_id, g.member_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'code': 403, 'msg': '无权限访问该收藏夹'}), 403

        # 1. 查询总条数
        cursor.execute(
            '''SELECT COUNT(*) as total 
               FROM favorite_photo fp 
               JOIN photo p ON fp.photo_id = p.id 
               WHERE fp.folder_id = %s AND fp.member_id = %s''',
            (folder_id, g.member_id)
        )
        total = cursor.fetchone()['total']

        # 2. 查询当前页照片数据（关联用户信息）
        cursor.execute(
            '''SELECT p.*, m.name as member_name, o.name as operator_name, a.album_name
               FROM favorite_photo fp 
               JOIN photo p ON fp.photo_id = p.id 
               LEFT JOIN family_member m ON p.member_id = m.id 
               LEFT JOIN family_member o ON p.operator_id = o.id 
               LEFT JOIN album a ON p.album_id = a.id
               WHERE fp.folder_id = %s AND fp.member_id = %s 
               ORDER BY fp.create_time DESC 
               LIMIT %s OFFSET %s''',
            (folder_id, g.member_id, page_size, offset)
        )
        photos = cursor.fetchall()

        # 格式化时间
        for photo in photos:
            if photo.get('shoot_time'):
                photo['shoot_time'] = photo['shoot_time'].strftime('%Y-%m-%d %H:%M:%S')
            if photo.get('upload_time'):
                photo['upload_time'] = photo['upload_time'].strftime('%Y-%m-%d %H:%M:%S')

        cursor.close()
        conn.close()
        return jsonify({
            'code': 200,
            'msg': '查询成功',
            'data': photos,
            'total': total,
            'has_more': page * page_size < total
        })
    except Exception as e:
        print(f"获取收藏照片异常：{str(e)}")
        return jsonify({'code': 500, 'msg': f'查询失败：{str(e)}'}), 500
