import hashlib
import re
from functools import wraps
from flask import session, request, jsonify
from database import Database

class AuthManager:
    """Authentication and authorization manager"""
    
    def __init__(self):
        self.db = Database()
    
    def hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.hash_password(password) == hashed_password
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, email))
    
    def validate_password(self, password: str) -> tuple[bool, str]:
        """Validate password strength"""
        if len(password) < 6:
            return False, "Password must be at least 6 characters long"
        if len(password) > 128:
            return False, "Password must be less than 128 characters"
        return True, "Valid password"
    
    def register_user(self, email: str, password: str) -> tuple[bool, str, dict]:
        """Register a new user"""
        # Validate email
        if not self.validate_email(email):
            return False, "Invalid email format", {}
        
        # Validate password
        is_valid, message = self.validate_password(password)
        if not is_valid:
            return False, message, {}
        
        # Check if user already exists
        existing_user = self.db.get_user_by_email(email)
        if existing_user:
            return False, "User already exists", {}
        
        # Hash password and create user
        password_hash = self.hash_password(password)
        user_id = self.db.create_user(email, password_hash)
        
        if user_id:
            user_data = {
                'user_id': user_id,
                'email': email
            }
            return True, "User registered successfully", user_data
        else:
            return False, "Failed to create user", {}
    
    def login_user(self, email: str, password: str) -> tuple[bool, str, dict]:
        """Login user with email and password"""
        # Validate email format
        if not self.validate_email(email):
            return False, "Invalid email format", {}
        
        # Get user from database
        user_data = self.db.get_user_by_email(email)
        if not user_data:
            return False, "User not found", {}
        
        # Verify password
        if not self.verify_password(password, user_data['password_hash']):
            return False, "Invalid password", {}
        
        # Create session
        session['user_id'] = user_data['user_id']
        session['email'] = user_data['email']
        session['logged_in'] = True
        
        return True, "Login successful", {
            'user_id': user_data['user_id'],
            'email': user_data['email']
        }
    
    def logout_user(self) -> tuple[bool, str]:
        """Logout current user"""
        session.clear()
        return True, "Logout successful"
    
    def get_current_user(self) -> dict:
        """Get current logged in user data"""
        if not self.is_authenticated():
            return {}
        
        return {
            'user_id': session.get('user_id'),
            'email': session.get('email'),
            'logged_in': True
        }
    
    def is_authenticated(self) -> bool:
        """Check if user is authenticated"""
        return session.get('logged_in', False) and session.get('user_id') is not None
    
    def get_current_user_id(self) -> str:
        """Get current user ID"""
        return session.get('user_id')
    
    def require_auth(self, f):
        """Decorator to require authentication for routes"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not self.is_authenticated():
                return jsonify({
                    'success': False,
                    'message': 'Authentication required'
                }), 401
            return f(*args, **kwargs)
        return decorated_function
    
    def check_bucket_access(self, user_id: str, bucket_id: str, required_permission: str = 'view') -> bool:
        """Check if user has required permission for bucket"""
        # Extract owner and bucket name from bucket_id
        if '_' not in bucket_id:
            return False
        
        owner_id = bucket_id.split('_')[0]
        
        # Owner has full access to their own buckets
        if owner_id == user_id:
            return True
        
        # Check shared permissions
        permission = self.db.get_permission(bucket_id, user_id)
        if not permission:
            return False
        
        permission_level = permission.get('permission_level')
        
        # Permission hierarchy: view < upload < full
        if required_permission == 'view':
            return permission_level in ['view', 'upload', 'full']
        elif required_permission == 'upload':
            return permission_level in ['upload', 'full']
        elif required_permission == 'full':
            return permission_level == 'full'
        
        return False
    
    def require_bucket_access(self, required_permission: str = 'view'):
        """Decorator to require bucket access permission"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                if not self.is_authenticated():
                    return jsonify({
                        'success': False,
                        'message': 'Authentication required'
                    }), 401
                
                # Get bucket_id from request
                bucket_id = None
                if request.method == 'GET':
                    bucket_id = request.args.get('bucket_id')
                elif request.method in ['POST', 'PUT', 'DELETE']:
                    data = request.get_json() or {}
                    bucket_id = data.get('bucket_id')
                
                if not bucket_id:
                    return jsonify({
                        'success': False,
                        'message': 'Bucket ID required'
                    }), 400
                
                user_id = self.get_current_user_id()
                if not self.check_bucket_access(user_id, bucket_id, required_permission):
                    return jsonify({
                        'success': False,
                        'message': 'Insufficient permissions'
                    }), 403
                
                return f(*args, **kwargs)
            return decorated_function
        return decorator
    
    def change_password(self, current_password: str, new_password: str) -> tuple[bool, str]:
        """Change user password"""
        if not self.is_authenticated():
            return False, "Not authenticated"
        
        user_id = self.get_current_user_id()
        user_data = self.db.get_user_by_id(user_id)
        
        if not user_data:
            return False, "User not found"
        
        # Verify current password
        if not self.verify_password(current_password, user_data['password_hash']):
            return False, "Current password is incorrect"
        
        # Validate new password
        is_valid, message = self.validate_password(new_password)
        if not is_valid:
            return False, message
        
        # Update password
        new_password_hash = self.hash_password(new_password)
        success = self.db.update_user(user_id, {'password_hash': new_password_hash})
        
        if success:
            return True, "Password changed successfully"
        else:
            return False, "Failed to update password"
    
    def get_user_info(self, user_id: str) -> dict:
        """Get user information (without sensitive data)"""
        user_data = self.db.get_user_by_id(user_id)
        if user_data:
            return {
                'user_id': user_data['user_id'],
                'email': user_data['email'],
                'created_date': user_data.get('created_date')
            }
        return {}

# Create global auth manager instance
auth_manager = AuthManager()