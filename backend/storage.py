import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from database import Database
from config import Config

class StorageManager:
    """File and bucket storage operations manager"""
    
    def __init__(self):
        self.db = Database()
        Config.init_directories()
    
    def create_bucket(self, user_id: str, bucket_name: str) -> Tuple[bool, str, Dict]:
        """Create a new bucket for user"""
        # Validate bucket name
        if not self._validate_bucket_name(bucket_name):
            return False, "Invalid bucket name. Use only letters, numbers, hyphens, and underscores", {}
        
        # Check if bucket already exists
        existing_buckets = self.db.get_user_buckets(user_id)
        if bucket_name in existing_buckets:
            return False, "Bucket already exists", {}
        
        # Create bucket metadata and directory
        try:
            bucket_id = self.db.create_bucket_metadata(user_id, bucket_name)
            
            bucket_data = {
                'bucket_id': bucket_id,
                'bucket_name': bucket_name,
                'owner_id': user_id,
                'created_date': datetime.now().isoformat(),
                'file_count': 0,
                'total_size': 0
            }
            
            return True, "Bucket created successfully", bucket_data
            
        except Exception as e:
            return False, f"Failed to create bucket: {str(e)}", {}




    def delete_bucket(self, user_id: str, bucket_name: str) -> Tuple[bool, str]:
        """Delete a bucket and all its contents"""
        # Verify bucket belongs to user
        user_buckets = self.db.get_user_buckets(user_id)
        if bucket_name not in user_buckets:
            return False, "Bucket not found or access denied"
        
        try:
            # Delete physical directory
            bucket_path = Config.UPLOADS_DIR / user_id / bucket_name
            if bucket_path.exists():
                shutil.rmtree(bucket_path)
            
            # Delete metadata
            self.db.delete_bucket_metadata(user_id, bucket_name)
            
            return True, "Bucket deleted successfully"
            
        except Exception as e:
            return False, f"Failed to delete bucket: {str(e)}"
    
    def upload_file(self, user_id: str, bucket_name: str, file: FileStorage) -> Tuple[bool, str, Dict]:
        """Upload a file to a bucket"""
        # Validate file
        if not file or not file.filename:
            return False, "No file provided", {}
        
        # Verify bucket exists and user has access
        user_buckets = self.db.get_user_buckets(user_id)
        if bucket_name not in user_buckets:
            return False, "Bucket not found or access denied", {}
        
        # Validate file
        validation_result = self._validate_file(file)
        if not validation_result[0]:
            return False, validation_result[1], {}
        
        try:
            # Generate unique filename
            original_filename = secure_filename(file.filename)
            file_id = str(uuid.uuid4())
            file_extension = Path(original_filename).suffix
            unique_filename = f"{file_id}{file_extension}"
            
            # Create file path
            bucket_path = Config.UPLOADS_DIR / user_id / bucket_name
            bucket_path.mkdir(parents=True, exist_ok=True)
            file_path = bucket_path / unique_filename
            
            # Save file
            file.save(str(file_path))
            
            # Get file info
            file_size = file_path.stat().st_size
            file_type = self._get_file_type(original_filename)
            
            # Create metadata
            bucket_id = f"{user_id}_{bucket_name}"
            file_metadata = {
                'file_id': file_id,
                'file_name': original_filename,
                'stored_filename': unique_filename,
                'file_type': file_type,
                'size': file_size,
                'upload_date': datetime.now().isoformat(),
                'bucket_id': bucket_id,
                'bucket_name': bucket_name,
                'user_id': user_id,
                'file_path': str(file_path)
            }
            
            # Add to database
            success = self.db.add_file_metadata(file_metadata)
            if not success:
                # Cleanup file if metadata save failed
                if file_path.exists():
                    file_path.unlink()
                return False, "Failed to save file metadata", {}
            
            return True, "File uploaded successfully", file_metadata
            
        except Exception as e:
            return False, f"Failed to upload file: {str(e)}", {}
    
    def download_file(self, user_id: str, file_id: str) -> Tuple[bool, str, Optional[Path]]:
        """Get file path for download"""
        # Get file metadata
        file_metadata = self.db.get_file_metadata(file_id)
        if not file_metadata:
            return False, "File not found", None
        
        # Check if user has access to the bucket
        bucket_id = file_metadata['bucket_id']
        if not self._check_bucket_access(user_id, bucket_id, 'view'):
            return False, "Access denied", None
        
        # Check if file exists
        file_path = Path(file_metadata['file_path'])
        if not file_path.exists():
            return False, "File not found on disk", None
        
        return True, "File found", file_path
    
    def delete_file(self, user_id: str, file_id: str) -> Tuple[bool, str]:
        """Delete a file"""
        # Get file metadata
        file_metadata = self.db.get_file_metadata(file_id)
        if not file_metadata:
            return False, "File not found"
        
        # Check if user has delete access to the bucket
        bucket_id = file_metadata['bucket_id']
        if not self._check_bucket_access(user_id, bucket_id, 'full'):
            return False, "Insufficient permissions to delete file"
        
        try:
            # Delete physical file
            file_path = Path(file_metadata['file_path'])
            if file_path.exists():
                file_path.unlink()
            
            # Delete metadata
            self.db.delete_file_metadata(file_id)
            
            return True, "File deleted successfully"
            
        except Exception as e:
            return False, f"Failed to delete file: {str(e)}"
    
    def get_bucket_files(self, user_id: str, bucket_id: str) -> Tuple[bool, str, List[Dict]]:
        """Get all files in a bucket"""
        # Check bucket access
        if not self._check_bucket_access(user_id, bucket_id, 'view'):
            return False, "Access denied", []
        
        try:
            files = self.db.get_files_by_bucket(bucket_id)
            
            # Add additional info to each file
            enriched_files = []
            for file_data in files:
                file_info = file_data.copy()
                file_info['size_category'] = Config.get_file_size_category(file_data['size'])
                file_info['size_human'] = self._format_file_size(file_data['size'])
                enriched_files.append(file_info)
            
            return True, "Files retrieved successfully", enriched_files
            
        except Exception as e:
            return False, f"Failed to get files: {str(e)}", []
    
    def get_user_buckets(self, user_id: str) -> Tuple[bool, str, List[Dict]]:
        """Get all buckets for a user with statistics"""
        try:
            bucket_names = self.db.get_user_buckets(user_id)
            buckets = []
            
            for bucket_name in bucket_names:
                bucket_id = f"{user_id}_{bucket_name}"
                files = self.db.get_files_by_bucket(bucket_id)
                
                total_size = sum(f.get('size', 0) for f in files)
                file_count = len(files)
                
                bucket_info = {
                    'bucket_id': bucket_id,
                    'bucket_name': bucket_name,
                    'file_count': file_count,
                    'total_size': total_size,
                    'total_size_human': self._format_file_size(total_size),
                    'created_date': None,  # Could be added to bucket metadata
                    'is_shared': len(self.db.get_permissions_by_bucket(bucket_id)) > 0
                }
                buckets.append(bucket_info)
            
            return True, "Buckets retrieved successfully", buckets
            
        except Exception as e:
            return False, f"Failed to get buckets: {str(e)}", []
    
    def get_storage_stats(self, user_id: str) -> Dict[str, Any]:
        """Get storage statistics for user"""
        try:
            # Get user's own files
            user_files = self.db.get_files_by_user(user_id)
            
            # Calculate statistics
            total_files = len(user_files)
            total_size = sum(f.get('size', 0) for f in user_files)
            
            # File type breakdown
            file_types = {}
            for file_data in user_files:
                file_type = file_data.get('file_type', 'other')
                if file_type in file_types:
                    file_types[file_type]['count'] += 1
                    file_types[file_type]['size'] += file_data.get('size', 0)
                else:
                    file_types[file_type] = {
                        'count': 1,
                        'size': file_data.get('size', 0)
                    }
            
            # Format file type data
            for file_type in file_types:
                file_types[file_type]['size_human'] = self._format_file_size(file_types[file_type]['size'])
            
            # Bucket count
            bucket_count = len(self.db.get_user_buckets(user_id))
            
            return {
                'total_files': total_files,
                'total_size': total_size,
                'total_size_human': self._format_file_size(total_size),
                'bucket_count': bucket_count,
                'file_types': file_types,
                'storage_limit': Config.MAX_STORAGE_PER_USER,
                'storage_limit_human': self._format_file_size(Config.MAX_STORAGE_PER_USER),
                'storage_used_percentage': min(100, (total_size / Config.MAX_STORAGE_PER_USER) * 100) if Config.MAX_STORAGE_PER_USER > 0 else 0
            }
            
        except Exception as e:
            return {
                'error': f"Failed to get storage stats: {str(e)}",
                'total_files': 0,
                'total_size': 0,
                'total_size_human': '0 B',
                'bucket_count': 0,
                'file_types': {},
                'storage_used_percentage': 0
            }
    
    def _validate_bucket_name(self, bucket_name: str) -> bool:
        """Validate bucket name"""
        if not bucket_name or len(bucket_name) < 1 or len(bucket_name) > 63:
            return False
        
        # Only allow alphanumeric, hyphens, and underscores
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_')
        return all(c in allowed_chars for c in bucket_name)
    
    def _validate_file(self, file: FileStorage) -> Tuple[bool, str]:
        """Validate uploaded file"""
        if not file or not file.filename:
            return False, "No file provided"
        
        # Check file size
        if hasattr(file, 'content_length') and file.content_length:
            if file.content_length > Config.MAX_FILE_SIZE:
                return False, f"File too large. Maximum size: {self._format_file_size(Config.MAX_FILE_SIZE)}"
        
        # Check file extension
        filename = secure_filename(file.filename)
        file_ext = Path(filename).suffix.lower()
        
        if Config.ALLOWED_EXTENSIONS and file_ext not in Config.ALLOWED_EXTENSIONS:
            return False, f"File type not allowed. Allowed types: {', '.join(Config.ALLOWED_EXTENSIONS)}"
        
        if file_ext in Config.BLOCKED_EXTENSIONS:
            return False, "This file type is not allowed for security reasons"
        
        return True, "File valid"
    
    def _get_file_type(self, filename: str) -> str:
        """Determine file type category"""
        file_ext = Path(filename).suffix.lower()
        
        for category, extensions in Config.FILE_TYPE_CATEGORIES.items():
            if file_ext in extensions:
                return category
        
        return 'other'
    
    def _check_bucket_access(self, user_id: str, bucket_id: str, action: str) -> bool:
        """Check if user has access to perform action on bucket"""
        # Extract owner from bucket_id
        bucket_parts = bucket_id.split('_', 1)
        if len(bucket_parts) != 2:
            return False
        
        owner_id = bucket_parts[0]
        
        # Owner has full access
        if owner_id == user_id:
            return True
        
        # Check shared permissions
        permission = self.db.get_permission(bucket_id, user_id)
        if not permission:
            return False
        
        permission_level = permission['permission_level']
        
        # Permission mapping
        if action == 'view':
            return permission_level in ['view', 'upload', 'full']
        elif action == 'upload':
            return permission_level in ['upload', 'full']
        elif action == 'full':
            return permission_level == 'full'
        
        return False
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        
        while size >= 1024.0 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
        
        return f"{size:.1f} {size_names[i]}"
    
    def get_recent_files(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recently uploaded files for user"""
        try:
            # Get all accessible files
            user_files = self.db.get_files_by_user(user_id)
            
            # Sort by upload date (most recent first)
            sorted_files = sorted(user_files, key=lambda x: x.get('upload_date', ''), reverse=True)
            
            # Limit results and add formatted info
            recent_files = []
            for file_data in sorted_files[:limit]:
                file_info = file_data.copy()
                file_info['size_human'] = self._format_file_size(file_data.get('size', 0))
                recent_files.append(file_info)
            
            return recent_files
            
        except Exception as e:
            return []
    
    def rename_file(self, user_id: str, file_id: str, new_name: str) -> Tuple[bool, str]:
        """Rename a file"""
        # Get file metadata
        file_metadata = self.db.get_file_metadata(file_id)
        if not file_metadata:
            return False, "File not found"
        
        # Check permissions
        bucket_id = file_metadata['bucket_id']
        if not self._check_bucket_access(user_id, bucket_id, 'full'):
            return False, "Insufficient permissions to rename file"
        
        # Validate new name
        if not new_name or len(new_name.strip()) == 0:
            return False, "Invalid file name"
        
        try:
            # Update metadata
            updates = {'file_name': new_name.strip()}
            
            # Update in database (assuming we add this method to Database class)
            metadata = self.db._read_json(Config.FILE_METADATA_FILE)
            search_index = self.db._read_json(Config.SEARCH_INDEX_FILE)
            
            if file_id in metadata:
                metadata[file_id].update(updates)
            
            if file_id in search_index:
                search_index[file_id]['file_name'] = new_name.strip()
            
            success1 = self.db._write_json(Config.FILE_METADATA_FILE, metadata)
            success2 = self.db._write_json(Config.SEARCH_INDEX_FILE, search_index)
            
            if success1 and success2:
                return True, "File renamed successfully"
            else:
                return False, "Failed to update file name"
                
        except Exception as e:
            return False, f"Failed to rename file: {str(e)}"

# Create global storage manager instance
storage_manager = StorageManager()