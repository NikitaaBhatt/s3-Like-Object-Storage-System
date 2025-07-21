import os
from flask import Flask, request, jsonify, session, send_file, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path
from datetime import datetime

# Import our custom modules
from auth import auth_manager
from storage import storage_manager
from permissions import permission_manager
from search import SearchEngine
from database import Database
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# Enable CORS for frontend communication
CORS(app, supports_credentials=True)

# Initialize components
db = Database()
search_engine = SearchEngine()

# Error handler for JSON responses
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/')
def index():
    return jsonify({"message": "Welcome to S3-like Storage API", "success": True}), 200

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'message': 'Server is running',
        'timestamp': datetime.now().isoformat()
    })

# =====================================================
# AUTHENTICATION ROUTES
# =====================================================

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        success, message, user_data = auth_manager.register_user(email, password)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'user': user_data
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        success, message, user_data = auth_manager.login_user(email, password)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'user': user_data
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 401
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Login failed: {str(e)}'
        }), 500

@app.route('/api/logout', methods=['POST'])
@auth_manager.require_auth
def logout():
    try:
        success, message = auth_manager.logout_user()
        return jsonify({
            'success': success,
            'message': message
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Logout failed: {str(e)}'
        }), 500

@app.route('/api/user', methods=['GET'])
@auth_manager.require_auth
def get_current_user():
    try:
        user_data = auth_manager.get_current_user()
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get user data: {str(e)}'
        }), 500

@app.route('/api/change-password', methods=['POST'])
@auth_manager.require_auth
def change_password():
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'message': 'Current and new passwords are required'
            }), 400
        
        success, message = auth_manager.change_password(current_password, new_password)
        
        return jsonify({
            'success': success,
            'message': message
        }), 200 if success else 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Password change failed: {str(e)}'
        }), 500

# =====================================================
# BUCKET MANAGEMENT ROUTES
# =====================================================

@app.route('/api/buckets', methods=['GET'])
@auth_manager.require_auth
def get_buckets():
    try:
        user_id = auth_manager.get_current_user_id()
        success, message, buckets = storage_manager.get_user_buckets(user_id)
        
        if success:
            return jsonify({
                'success': True,
                'buckets': buckets
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 500
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get buckets: {str(e)}'
        }), 500

@app.route('/api/buckets/accessible', methods=['GET'])
@auth_manager.require_auth
def get_accessible_buckets():
    try:
        user_id = auth_manager.get_current_user_id()
        accessible_buckets = permission_manager.get_user_accessible_buckets(user_id)
        
        return jsonify({
            'success': True,
            'buckets': accessible_buckets
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get accessible buckets: {str(e)}'
        }), 500

@app.route('/api/buckets/shared', methods=['GET'])
@auth_manager.require_auth
def get_shared_buckets():
    try:
        user_id = auth_manager.get_current_user_id()
        shared_buckets = permission_manager.get_shared_buckets(user_id)
        
        return jsonify({
            'success': True,
            'shared_buckets': shared_buckets
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get shared buckets: {str(e)}'
        }), 500

@app.route('/api/buckets', methods=['POST'])
@auth_manager.require_auth
def create_bucket():
    try:
        data = request.get_json()
        bucket_name = data.get('bucket_name')
        
        if not bucket_name:
            return jsonify({
                'success': False,
                'message': 'Bucket name is required'
            }), 400
        
        user_id = auth_manager.get_current_user_id()
        success, message, bucket_data = storage_manager.create_bucket(user_id, bucket_name)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'bucket': bucket_data
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to create bucket: {str(e)}'
        }), 500




@app.route('/api/buckets/<bucket_id>', methods=['DELETE'])
@auth_manager.require_auth
def delete_bucket(bucket_id):
    try:
        user_id = auth_manager.get_current_user_id()
        
        # Extract bucket name from bucket_id
        bucket_parts = bucket_id.split('_', 1)
        if len(bucket_parts) != 2 or bucket_parts[0] != user_id:
            return jsonify({
                'success': False,
                'message': 'You can only delete your own buckets'
            }), 403
        
        bucket_name = bucket_parts[1]
        success, message = storage_manager.delete_bucket(user_id, bucket_name)
        
        return jsonify({
            'success': success,
            'message': message
        }), 200 if success else 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to delete bucket: {str(e)}'
        }), 500

# =====================================================
# FILE MANAGEMENT ROUTES
# =====================================================

@app.route('/api/files', methods=['GET'])
@auth_manager.require_auth
def get_bucket_files():
    try:
        bucket_id = request.args.get('bucket_id')
        
        if not bucket_id:
            return jsonify({
                'success': False,
                'message': 'Bucket ID is required'
            }), 400
        
        user_id = auth_manager.get_current_user_id()
        success, message, files = storage_manager.get_bucket_files(user_id, bucket_id)
        
        if success:
            return jsonify({
                'success': True,
                'files': files
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get files: {str(e)}'
        }), 500

@app.route('/api/files/recent', methods=['GET'])
@auth_manager.require_auth
def get_recent_files():
    try:
        user_id = auth_manager.get_current_user_id()
        limit = int(request.args.get('limit', 10))
        
        recent_files = storage_manager.get_recent_files(user_id, limit)
        
        return jsonify({
            'success': True,
            'files': recent_files
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get recent files: {str(e)}'
        }), 500

@app.route('/api/upload', methods=['POST'])
@auth_manager.require_auth
def upload_file():
    try:
        bucket_name = request.form.get('bucket_name')
        
        if not bucket_name:
            return jsonify({
                'success': False,
                'message': 'Bucket name is required'
            }), 400
        
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        user_id = auth_manager.get_current_user_id()
        
        success, message, file_data = storage_manager.upload_file(user_id, bucket_name, file)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'file': file_data
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Upload failed: {str(e)}'
        }), 500

@app.route('/api/download/<file_id>', methods=['GET'])
@auth_manager.require_auth
def download_file(file_id):
    try:
        user_id = auth_manager.get_current_user_id()
        success, message, file_path = storage_manager.download_file(user_id, file_id)
        
        if success and file_path:
            # Get file metadata for original filename
            file_metadata = db.get_file_metadata(file_id)
            if file_metadata:
                original_filename = file_metadata.get('file_name', 'download')
                return send_file(file_path, as_attachment=True, download_name=original_filename)
            else:
                return send_file(file_path, as_attachment=True)
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 404
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Download failed: {str(e)}'
        }), 500


@app.route('/api/files/<file_id>', methods=['DELETE'])
@auth_manager.require_auth
def delete_file(file_id):
    try:
        user_id = auth_manager.get_current_user_id()
        success, message = storage_manager.delete_file(user_id, file_id)
        
        return jsonify({
            'success': success,
            'message': message
        }), 200 if success else 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to delete file: {str(e)}'
        }), 500

@app.route('/api/files/<file_id>/rename', methods=['PUT'])
@auth_manager.require_auth
def rename_file(file_id):
    try:
        data = request.get_json()
        new_name = data.get('new_name')
        
        if not new_name:
            return jsonify({
                'success': False,
                'message': 'New name is required'
            }), 400
        
        user_id = auth_manager.get_current_user_id()
        success, message = storage_manager.rename_file(user_id, file_id, new_name)
        
        return jsonify({
            'success': success,
            'message': message
        }), 200 if success else 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to rename file: {str(e)}'
        }), 500

# =====================================================
# SHARING & PERMISSIONS ROUTES
# =====================================================
@app.route('/api/shares/<share_id>', methods=['PUT'])
@auth_manager.require_auth
def update_share_permission(share_id):
    try:
        data = request.get_json()
        new_permission = data.get('permission_level')
        user_id = auth_manager.get_current_user_id()

        success, message = permission_manager.update_permission(user_id, share_id, new_permission)
        return jsonify({ 'success': success, 'message': message }), 200 if success else 400
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'Failed to update permission: {str(e)}' }), 500


@app.route('/api/buckets/<bucket_id>/shares', methods=['GET'])
@auth_manager.require_auth
def get_bucket_shares(bucket_id):
    try:
        user_id = auth_manager.get_current_user_id()
        shares = permission_manager.get_bucket_shares(bucket_id, user_id)
        return jsonify({
            'success': True,
            'shares': shares
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch bucket shares: {str(e)}'
        }), 500


@app.route('/api/share', methods=['POST'])
@auth_manager.require_auth
def share_bucket():
    try:
        data = request.get_json()
        bucket_id = data.get('bucket_id')
        shared_with_email = data.get('shared_with_email')
        permission_level = data.get('permission_level')
        
        if not all([bucket_id, shared_with_email, permission_level]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400
        
        owner_id = auth_manager.get_current_user_id()
        success, message = permission_manager.share_bucket(
            owner_id, bucket_id, shared_with_email, permission_level
        )
        
        return jsonify({
            'success': success,
            'message': message
        }), 200 if success else 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Sharing failed: {str(e)}'
        }), 500

@app.route('/api/unshare', methods=['POST'])
@auth_manager.require_auth
def unshare_bucket():
    try:
        data = request.get_json()
        bucket_id = data.get('bucket_id')
        shared_with_email = data.get('shared_with_email')
        
        if not bucket_id or not shared_with_email:
            return jsonify({
                'success': False,
                'message': 'Bucket ID and email are required'
            }), 400
        
        owner_id = auth_manager.get_current_user_id()
        success, message = permission_manager.unshare_bucket(
            owner_id, bucket_id, shared_with_email
        )
        
        return jsonify({
            'success': success,
            'message': message
        }), 200 if success else 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Unsharing failed: {str(e)}'
        }), 500

@app.route('/api/permissions/<bucket_id>', methods=['GET'])
@auth_manager.require_auth
def get_bucket_permissions(bucket_id):
    try:
        owner_id = auth_manager.get_current_user_id()
        success, permissions = permission_manager.get_bucket_permissions(owner_id, bucket_id)
        
        if success:
            return jsonify({
                'success': True,
                'permissions': permissions
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Access denied or bucket not found'
            }), 403
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get permissions: {str(e)}'
        }), 500

@app.route('/api/permissions/<bucket_id>', methods=['PUT'])
@auth_manager.require_auth
def update_bucket_permission(bucket_id):
    try:
        data = request.get_json()
        shared_with_email = data.get('shared_with_email')
        new_permission_level = data.get('permission_level')
        
        if not shared_with_email or not new_permission_level:
            return jsonify({
                'success': False,
                'message': 'Email and permission level are required'
            }), 400
        
        owner_id = auth_manager.get_current_user_id()
        success, message = permission_manager.update_bucket_permission(
            owner_id, bucket_id, shared_with_email, new_permission_level
        )
        
        return jsonify({
            'success': success,
            'message': message
        }), 200 if success else 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to update permission: {str(e)}'
        }), 500

@app.route('/api/permissions/summary', methods=['GET'])
@auth_manager.require_auth
def get_permission_summary():
    try:
        user_id = auth_manager.get_current_user_id()
        summary = permission_manager.get_permission_summary(user_id)
        
        return jsonify({
            'success': True,
            'summary': summary
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get permission summary: {str(e)}'
        }), 500

# =====================================================
# SEARCH ROUTES
# =====================================================

@app.route('/api/search', methods=['GET'])
@auth_manager.require_auth
def search_files():
    try:
        query = request.args.get('query', '')
        file_type = request.args.get('file_type')
        size_category = request.args.get('size_category')
        date_range = request.args.get('date_range')
        bucket_id = request.args.get('bucket_id')
        
        # Build filters dictionary
        filters = {}
        if file_type:
            filters['file_type'] = file_type
        if size_category:
            filters['size_category'] = size_category
        if date_range:
            filters['date_range'] = date_range
        if bucket_id:
            filters['bucket_id'] = bucket_id
        
        user_id = auth_manager.get_current_user_id()
        results = search_engine.search_files(query, user_id, filters)
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results)
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Search failed: {str(e)}'
        }), 500

@app.route('/api/search/filters', methods=['GET'])
@auth_manager.require_auth
def get_search_filters():
    try:
        user_id = auth_manager.get_current_user_id()
        filters = search_engine.get_available_filters(user_id)
        
        return jsonify({
            'success': True,
            'filters': filters
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get filters: {str(e)}'
        }), 500

# =====================================================
# STATS & ANALYTICS ROUTES
# =====================================================

@app.route('/api/stats', methods=['GET'])
@auth_manager.require_auth
def get_storage_stats():
    try:
        user_id = auth_manager.get_current_user_id()
        stats = storage_manager.get_storage_stats(user_id)
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get stats: {str(e)}'
        }), 500

@app.route('/api/dashboard', methods=['GET'])
@auth_manager.require_auth
def get_dashboard_data():
    try:
        user_id = auth_manager.get_current_user_id()
        
        # Get various dashboard components
        storage_stats = storage_manager.get_storage_stats(user_id)
        recent_files = storage_manager.get_recent_files(user_id, 5)
        accessible_buckets = permission_manager.get_user_accessible_buckets(user_id)
        permission_summary = permission_manager.get_permission_summary(user_id)
        
        dashboard_data = {
            'storage_stats': storage_stats,
            'recent_files': recent_files,
            'accessible_buckets': accessible_buckets,
            'permission_summary': permission_summary,
            'total_buckets': len(accessible_buckets),
            'recent_activity': recent_files  # Could be enhanced with more activity data
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get dashboard data: {str(e)}'
        }), 500

# =====================================================
# CONFIGURATION ROUTES
# =====================================================

@app.route('/api/config', methods=['GET'])
def get_config():
    try:
        config_data = {
            'max_file_size': Config.MAX_FILE_SIZE,
            'max_file_size_human': storage_manager._format_file_size(Config.MAX_FILE_SIZE),
            'allowed_extensions': list(Config.ALLOWED_EXTENSIONS) if Config.ALLOWED_EXTENSIONS else None,
            'file_type_categories': Config.FILE_TYPE_CATEGORIES,
            'permission_levels': Config.PERMISSION_LEVELS,
            'size_categories': ['small', 'medium', 'large'],
            'date_ranges': ['today', 'week', 'month', 'year']
        }
        
        return jsonify({
            'success': True,
            'config': config_data
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to get configuration: {str(e)}'
        }), 500

# =====================================================
# DEVELOPMENT/DEBUG ROUTES (Remove in production)
# =====================================================

@app.route('/api/debug/session', methods=['GET'])
def debug_session():
    """Debug endpoint to check session data - Remove in production"""
    if app.debug:
        return jsonify({
            'session': dict(session),
            'authenticated': auth_manager.is_authenticated()
        })
    else:
        return jsonify({'message': 'Debug endpoint disabled'}), 404

# =====================================================
# APPLICATION STARTUP
# =====================================================
'''@app.route('/health', methods=['GET'])
def health():
    return jsonify({"message": "Backend running fine", "success": True}), 200
    '''


if __name__ == '__main__':
    # Ensure data directories exist
    Config.init_directories()
    
    # Run development server
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    )