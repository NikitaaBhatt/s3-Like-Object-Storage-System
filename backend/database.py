import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from config import Config

class Database:
    """Database manager for JSON file-based storage"""
    
    def __init__(self):
        Config.init_directories()
        self._init_files()
    
    def _init_files(self):
        """Initialize JSON files if they don't exist"""
        default_files = {
            Config.USERS_FILE: {},
            Config.PERMISSIONS_FILE: {},
            Config.SEARCH_INDEX_FILE: {},
            Config.FILE_METADATA_FILE: {}
        }
        
        for file_path, default_content in default_files.items():
            if not file_path.exists():
                self._write_json(file_path, default_content)
    
    def _read_json(self, file_path: Path) -> Dict[str, Any]:
        """Read JSON data from file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _write_json(self, file_path: Path, data: Dict[str, Any]) -> bool:
        """Write JSON data to file"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            return True
        except Exception as e:
            print(f"Error writing to {file_path}: {e}")
            return False
    
    # User management
    def create_user(self, email: str, password_hash: str) -> str:
        """Create a new user and return user_id"""
        users = self._read_json(Config.USERS_FILE)
        
        # Check if user already exists
        for user_id, user_data in users.items():
            if user_data['email'] == email:
                return None  # User already exists
        
        user_id = str(uuid.uuid4())
        user_data = {
            'email': email,
            'password_hash': password_hash,
            'user_id': user_id,
            'created_date': datetime.now().isoformat()
        }
        
        users[user_id] = user_data
        
        if self._write_json(Config.USERS_FILE, users):
            # Create user directory
            user_dir = Config.UPLOADS_DIR / user_id
            user_dir.mkdir(exist_ok=True)
            return user_id
        return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user data by email"""
        users = self._read_json(Config.USERS_FILE)
        for user_data in users.values():
            if user_data['email'] == email:
                return user_data
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data by user_id"""
        users = self._read_json(Config.USERS_FILE)
        return users.get(user_id)
    
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update user data"""
        users = self._read_json(Config.USERS_FILE)
        if user_id in users:
            users[user_id].update(updates)
            return self._write_json(Config.USERS_FILE, users)
        return False
    
    # Bucket and file metadata
    def add_file_metadata(self, file_info: Dict[str, Any]) -> bool:
        """Add file metadata to search index"""
        metadata = self._read_json(Config.FILE_METADATA_FILE)
        search_index = self._read_json(Config.SEARCH_INDEX_FILE)
        
        file_id = file_info.get('file_id', str(uuid.uuid4()))
        file_info['file_id'] = file_id
        
        # Add to detailed metadata
        metadata[file_id] = file_info
        
        # Add to search index
        search_data = {
            'file_name': file_info['file_name'],
            'file_type': file_info['file_type'],
            'size': file_info['size'],
            'upload_date': file_info['upload_date'],
            'bucket_id': file_info['bucket_id'],
            'user_id': file_info['user_id']
        }
        search_index[file_id] = search_data
        
        success1 = self._write_json(Config.FILE_METADATA_FILE, metadata)
        success2 = self._write_json(Config.SEARCH_INDEX_FILE, search_index)
        
        return success1 and success2
    
    def get_file_metadata(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get file metadata by file_id"""
        metadata = self._read_json(Config.FILE_METADATA_FILE)
        return metadata.get(file_id)
    
    def get_files_by_bucket(self, bucket_id: str) -> List[Dict[str, Any]]:
        """Get all files in a specific bucket"""
        metadata = self._read_json(Config.FILE_METADATA_FILE)
        return [file_data for file_data in metadata.values() 
                if file_data.get('bucket_id') == bucket_id]
    
    def get_files_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all files owned by a user"""
        metadata = self._read_json(Config.FILE_METADATA_FILE)
        return [file_data for file_data in metadata.values() 
                if file_data.get('user_id') == user_id]
    
    def delete_file_metadata(self, file_id: str) -> bool:
        """Delete file metadata"""
        metadata = self._read_json(Config.FILE_METADATA_FILE)
        search_index = self._read_json(Config.SEARCH_INDEX_FILE)
        
        if file_id in metadata:
            del metadata[file_id]
        if file_id in search_index:
            del search_index[file_id]
        
        success1 = self._write_json(Config.FILE_METADATA_FILE, metadata)
        success2 = self._write_json(Config.SEARCH_INDEX_FILE, search_index)
        
        return success1 and success2
    
    # Bucket management
    def create_bucket_metadata(self, user_id: str, bucket_name: str) -> str:
        """Create bucket metadata and return bucket_id"""
        bucket_id = f"{user_id}_{bucket_name}"
        
        # Create bucket directory
        bucket_path = Config.UPLOADS_DIR / user_id / bucket_name
        bucket_path.mkdir(parents=True, exist_ok=True)
        
        return bucket_id
    
    def get_user_buckets(self, user_id: str) -> List[str]:
        """Get all bucket names for a user"""
        user_dir = Config.UPLOADS_DIR / user_id
        if user_dir.exists():
            return [bucket.name for bucket in user_dir.iterdir() if bucket.is_dir()]
        return []
    
    def delete_bucket_metadata(self, user_id: str, bucket_name: str) -> bool:
        """Delete bucket and all its file metadata"""
        bucket_id = f"{user_id}_{bucket_name}"
        
        # Get all files in bucket
        files_in_bucket = self.get_files_by_bucket(bucket_id)
        
        # Delete all file metadata
        for file_data in files_in_bucket:
            self.delete_file_metadata(file_data['file_id'])
        
        return True
    
    # Permission management
    def add_permission(self, bucket_id: str, owner_id: str, shared_with: str, permission_level: str) -> bool:
        """Add bucket sharing permission"""
        permissions = self._read_json(Config.PERMISSIONS_FILE)
        
        permission_id = f"{bucket_id}_{shared_with}"
        permission_data = {
            'bucket_id': bucket_id,
            'owner': owner_id,
            'shared_with': shared_with,
            'permission_level': permission_level,
            'created_date': datetime.now().isoformat()
        }
        
        permissions[permission_id] = permission_data
        return self._write_json(Config.PERMISSIONS_FILE, permissions)
    
    def get_permissions_by_bucket(self, bucket_id: str) -> List[Dict[str, Any]]:
        """Get all permissions for a specific bucket"""
        permissions = self._read_json(Config.PERMISSIONS_FILE)
        return [perm for perm in permissions.values() 
                if perm.get('bucket_id') == bucket_id]
    
    def get_shared_buckets_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all buckets shared with a specific user"""
        permissions = self._read_json(Config.PERMISSIONS_FILE)
        return [perm for perm in permissions.values() 
                if perm.get('shared_with') == user_id]
    
    def get_permission(self, bucket_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get specific permission for user and bucket"""
        permissions = self._read_json(Config.PERMISSIONS_FILE)
        permission_id = f"{bucket_id}_{user_id}"
        return permissions.get(permission_id)
    
    def update_permission(self, bucket_id: str, user_id: str, permission_level: str) -> bool:
        """Update permission level"""
        permissions = self._read_json(Config.PERMISSIONS_FILE)
        permission_id = f"{bucket_id}_{user_id}"
        
        if permission_id in permissions:
            permissions[permission_id]['permission_level'] = permission_level
            return self._write_json(Config.PERMISSIONS_FILE, permissions)
        return False
    
    def delete_permission(self, bucket_id: str, user_id: str) -> bool:
        """Delete permission"""
        permissions = self._read_json(Config.PERMISSIONS_FILE)
        permission_id = f"{bucket_id}_{user_id}"
        
        if permission_id in permissions:
            del permissions[permission_id]
            return self._write_json(Config.PERMISSIONS_FILE, permissions)
        return False
    
    # Search functionality
    def search_files(self, query: str, user_id: str, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Search files with filters"""
        search_index = self._read_json(Config.SEARCH_INDEX_FILE)
        metadata = self._read_json(Config.FILE_METADATA_FILE)
        
        results = []
        accessible_bucket_ids = self._get_accessible_bucket_ids(user_id)
        
        for file_id, search_data in search_index.items():
            # Check if user has access to this bucket
            if search_data['bucket_id'] not in accessible_bucket_ids:
                continue
            
            # Apply search query
            if query and query.lower() not in search_data['file_name'].lower():
                continue
            
            # Apply filters
            if filters:
                if not self._apply_filters(search_data, metadata.get(file_id, {}), filters):
                    continue
            
            # Add full metadata to result
            file_metadata = metadata.get(file_id, {})
            file_metadata.update(search_data)
            results.append(file_metadata)
        
        return results
    
    def _get_accessible_bucket_ids(self, user_id: str) -> List[str]:
        """Get all bucket IDs that user can access (owned + shared)"""
        bucket_ids = []
        
        # User's own buckets
        user_buckets = self.get_user_buckets(user_id)
        bucket_ids.extend([f"{user_id}_{bucket}" for bucket in user_buckets])
        
        # Shared buckets
        shared_buckets = self.get_shared_buckets_for_user(user_id)
        bucket_ids.extend([perm['bucket_id'] for perm in shared_buckets])
        
        return bucket_ids
    
    def _apply_filters(self, search_data: Dict[str, Any], metadata: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """Apply search filters to file data"""
        # File type filter
        if filters.get('file_type') and search_data.get('file_type') != filters['file_type']:
            return False
        
        # Size filter
        if filters.get('size_category'):
            file_size = search_data.get('size', 0)
            expected_category = Config.get_file_size_category(file_size)
            if expected_category != filters['size_category']:
                return False
        
        # Date filter
        if filters.get('date_range'):
            upload_date = search_data.get('upload_date')
            if not self._check_date_range(upload_date, filters['date_range']):
                return False
        
        # Bucket filter
        if filters.get('bucket_id') and search_data.get('bucket_id') != filters['bucket_id']:
            return False
        
        return True
    
    def _check_date_range(self, upload_date: str, date_range: str) -> bool:
        """Check if upload date falls within specified range"""
        if not upload_date:
            return False
        
        try:
            upload_dt = datetime.fromisoformat(upload_date.replace('Z', '+00:00'))
            now = datetime.now()
            
            if date_range == 'today':
                return upload_dt.date() == now.date()
            elif date_range == 'week':
                return (now - upload_dt).days <= 7
            elif date_range == 'month':
                return (now - upload_dt).days <= 30
            elif date_range == 'year':
                return (now - upload_dt).days <= 365
            
        except Exception:
            return False
        
        return True