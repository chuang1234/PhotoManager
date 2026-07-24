import os
from flask import Blueprint, request, jsonify, send_from_directory, g, abort

file_bp = Blueprint('file', __name__)

from config.config import (
    UPLOAD_PHOTO_FOLDER, UPLOAD_COVER_FOLDER
)
from .auth import login_required


def _safe_path(folder, filename):
    """
    校验最终文件路径是否在允许的目录内，防止路径遍历攻击。
    返回 True 表示路径合法，False 表示越界。
    """
    # 解析为绝对路径，消除 ../ 等相对路径符号
    base_dir = os.path.abspath(folder)
    target_path = os.path.abspath(os.path.join(folder, filename))
    # 确保目标路径以 base_dir 为前缀（即位于目录内部）
    return target_path.startswith(base_dir + os.sep) or target_path == base_dir


@file_bp.route('/photos/<path:filename>')
@login_required
def serve_photo(filename):
    if not _safe_path(UPLOAD_PHOTO_FOLDER, filename):
        abort(403, '禁止访问：路径不合法')
    return send_from_directory(UPLOAD_PHOTO_FOLDER, filename)


@file_bp.route('/covers/<path:filename>')
@login_required
def serve_cover(filename):
    if not _safe_path(UPLOAD_COVER_FOLDER, filename):
        abort(403, '禁止访问：路径不合法')
    return send_from_directory(UPLOAD_COVER_FOLDER, filename)