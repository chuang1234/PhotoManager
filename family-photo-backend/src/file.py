from flask import Blueprint, request, jsonify, send_from_directory, g

file_bp = Blueprint('file', __name__)

from config.config import (
    UPLOAD_PHOTO_FOLDER, UPLOAD_COVER_FOLDER
)
from .auth import login_required

@file_bp.route('/photos/<path:filename>')
@login_required
def serve_photo(filename):
    return send_from_directory(UPLOAD_PHOTO_FOLDER, filename)

@file_bp.route('/covers/<path:filename>')
@login_required
def serve_cover(filename):
    return send_from_directory(UPLOAD_COVER_FOLDER, filename)
