from typing import Dict, List, Tuple, Optional
from datetime import datetime
from database import Database
from config import Config

class PermissionManager:
    """Manage bucket sharing permissions and access control"""
    
    def __init__(self):
        self.db = Database()
    
    def share_bucket(self, owner_id: str, bucket_id: str, shared_with_email: str, permission_level: str) -> Tuple[bool, str]:
        """Share a bucket with another user"""
        # Validate permission level
        if permission_level not in Config.PERMISSION_LEVELS:
            return False, "Invalid permission level"
        
        # Verify bucket belongs to owner
        bucket_parts = bucket_id.split('_', 1)
        if len(bucket_parts) != 2 or bucket_parts[0] != owner_id:
            return False, "You can only share your own buckets"
        
        # Find user to share with
        shared_user = self.db.get_user_by_email(shared_with_email)
        if not shared_user:
            return False, "User not found"
        
        shared_user_id = shared_user['user_id']
        
        # Don't allow sharing with yourself
        if shared_user_id == owner_id:
            return False, "Cannot share bucket with yourself"
        
        # Check if already shared
        existing_permission = self.db.get_permission(bucket_id, shared_user_id)
        if existing_permission:
            # Update existing permission
            success = self.db.update_permission(bucket_id, shared_user_id, permission_level)
            if success:
                return True, f"Permission updated to {Config.PERMISSION_LEVELS[permission_level]}"
            else:
                return False, "Failed to update permission"
        else:
            # Create new permission
            success = self.db.add_permission(bucket_id, owner_id, shared_user_id, permission_level)
            if success:
                return True, f"Bucket shared with {Config.PERMISSION_LEVELS[permission_level]} permission"
            else:
                return False, "Failed to share bucket"
    
    def unshare_bucket(self, owner_id: str, bucket_id: str, shared_with_email: str) -> Tuple[bool, str]:
        """Remove bucket sharing permission"""
        # Verify bucket belongs to owner
        bucket_parts = bucket_id.split('_', 1)
        if len(bucket_parts) != 2 or bucket_parts[0] != owner_id:
            return False, "You can only manage permissions for your own buckets"
        
        # Find user to unshare with
        shared_user = self.db.get_user_by_email(shared_with_email)
        if not shared_user:
            return False, "User not found"
        
        shared_user_id = shared_user['user_id']
        
        # Remove permission
        success = self.db.delete_permission(bucket_id, shared_user_id)
        if success:
            return True, "Bucket access removed successfully"
        else:
            return False, "Failed to remove bucket access"
    
    def get_bucket_permissions(self, owner_id: str, bucket_id: str) -> Tuple[bool, List[Dict]]:
        """Get all permissions for a specific bucket"""
        # Verify bucket belongs to owner
        bucket_parts = bucket_id.split('_', 1)
        if len(bucket_parts) != 2 or bucket_parts[0] != owner_id:
            return False, []
        
        # Get permissions
        permissions = self.db.get_permissions_by_bucket(bucket_id)
        
        # Add user email to each permission
        enriched_permissions = []
        for perm in permissions:
            user_info = self.db.get_user_by_id(perm['shared_with'])
            if user_info:
                perm_data = perm.copy()
                perm_data['shared_with_email'] = user_info['email']
                perm_data['permission_name'] = Config.PERMISSION_LEVELS.get(perm['permission_level'], 'Unknown')
                enriched_permissions.append(perm_data)
        
        return True, enriched_permissions
    
    def get_shared_buckets(self, user_id: str) -> List[Dict]:
        """Get all buckets shared with a user"""
        shared_permissions = self.db.get_shared_buckets_for_user(user_id)
        
        enriched_buckets = []
        for perm in shared_permissions:
            # Get bucket info
            bucket_id = perm['bucket_id']
            bucket_parts = bucket_id.split('_', 1)
            
            if len(bucket_parts) == 2:
                owner_id, bucket_name = bucket_parts
                
                # Get owner info
                owner_info = self.db.get_user_by_id(owner_id)
                if owner_info:
                    bucket_data = {
                        'bucket_id': bucket_id,
                        'bucket_name': bucket_name,
                        'owner_id': owner_id,
                        'owner_email': owner_info['email'],
                        'permission_level': perm['permission_level'],
                        'permission_name': Config.PERMISSION_LEVELS.get(perm['permission_level'], 'Unknown'),
                        'shared_date': perm.get('created_date'),
                        'is_shared': True
                    }
                    enriched_buckets.append(bucket_data)
        
        return enriched_buckets
    
    def check_permission_level(self, user_id: str, bucket_id: str) -> str:
        """Get user's permission level for a bucket"""
        # Check if user owns the bucket
        bucket_parts = bucket_id.split('_', 1)
        if len(bucket_parts) == 2 and bucket_parts[0] == user_id:
            return 'owner'
        
        # Check shared permissions
        permission = self.db.get_permission(bucket_id, user_id)
        if permission:
            return permission['permission_level']
        
        return 'none'
    
    def can_perform_action(self, user_id: str, bucket_id: str, action: str) -> bool:
        """Check if user can perform specific action on bucket"""
        permission_level = self.check_permission_level(user_id, bucket_id)
        
        if permission_level == 'owner':
            return True
        elif permission_level == 'full':
            return True
        elif permission_level == 'upload':
            return action in ['view', 'upload']
        elif permission_level == 'view':
            return action == 'view'
        else:
            return False
    
    def get_user_accessible_buckets(self, user_id: str) -> List[Dict]:
        """Get all buckets user can access (owned + shared)"""
        accessible_buckets = []
        
        # User's own buckets
        user_buckets = self.db.get_user_buckets(user_id)
        for bucket_name in user_buckets:
            bucket_id = f"{user_id}_{bucket_name}"
            bucket_data = {
                'bucket_id': bucket_id,
                'bucket_name': bucket_name,
                'owner_id': user_id,
                'permission_level': 'owner',
                'permission_name': 'Owner',
                'is_shared': False
            }
            accessible_buckets.append(bucket_data)
        
        # Shared buckets
        shared_buckets = self.get_shared_buckets(user_id)
        accessible_buckets.extend(shared_buckets)
        
        return accessible_buckets
    
    def update_bucket_permission(self, owner_id: str, bucket_id: str, shared_with_email: str, new_permission_level: str) -> Tuple[bool, str]:
        """Update permission level for a shared bucket"""
        # Validate permission level
        if new_permission_level not in Config.PERMISSION_LEVELS:
            return False, "Invalid permission level"
        
        # Verify bucket belongs to owner
        bucket_parts = bucket_id.split('_', 1)
        if len(bucket_parts) != 2 or bucket_parts[0] != owner_id:
            return False, "You can only manage permissions for your own buckets"
        
        # Find user
        shared_user = self.db.get_user_by_email(shared_with_email)
        if not shared_user:
            return False, "User not found"
        
        shared_user_id = shared_user['user_id']
        
        # Update permission
        success = self.db.update_permission(bucket_id, shared_user_id, new_permission_level)
        if success:
            return True, f"Permission updated to {Config.PERMISSION_LEVELS[new_permission_level]}"
        else:
            return False, "Failed to update permission"
    
    def get_permission_summary(self, user_id: str) -> Dict:
        """Get summary of user's permission status"""
        # Own buckets
        own_buckets = len(self.db.get_user_buckets(user_id))
        
        # Shared with user
        shared_with_user = len(self.get_shared_buckets(user_id))
        
        # Buckets user has shared with others
        user_buckets = self.db.get_user_buckets(user_id)
        shared_by_user = 0
        for bucket_name in user_buckets:
            bucket_id = f"{user_id}_{bucket_name}"
            permissions = self.db.get_permissions_by_bucket(bucket_id)
            if permissions:
                shared_by_user += 1
        
        return {
            'own_buckets': own_buckets,
            'shared_with_me': shared_with_user,
            'shared_by_me': shared_by_user,
            'total_accessible': own_buckets + shared_with_user
        }
    
    def validate_sharing_request(self, owner_id: str, bucket_id: str, shared_with_email: str, permission_level: str) -> Tuple[bool, str]:
        """Validate a bucket sharing request before processing"""
        # Check permission level
        if permission_level not in Config.PERMISSION_LEVELS:
            return False, "Invalid permission level"
        
        # Check bucket ownership
        bucket_parts = bucket_id.split('_', 1)
        if len(bucket_parts) != 2 or bucket_parts[0] != owner_id:
            return False, "You can only share your own buckets"
        
        # Check if bucket exists
        bucket_name = bucket_parts[1]
        user_buckets = self.db.get_user_buckets(owner_id)
        if bucket_name not in user_buckets:
            return False, "Bucket does not exist"
        
        # Check target user
        shared_user = self.db.get_user_by_email(shared_with_email)
        if not shared_user:
            return False, "Target user not found"
        
        if shared_user['user_id'] == owner_id:
            return False, "Cannot share bucket with yourself"
        
        return True, "Valid sharing request"

# Create global permission manager instance
permission_manager = PermissionManager()