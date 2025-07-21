// Permissions service for bucket sharing and access control
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class PermissionsService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // Get authorization headers
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };
  }

  // Handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Permission request failed' }));
      throw new Error(error.message || 'Permission request failed');
    }
    return response.json();
  }

  // Permission levels enum
  PERMISSION_LEVELS = {
    VIEW: 'view',
    UPLOAD: 'upload',
    FULL: 'full'
  };

  // Get permission level labels
  getPermissionLabels() {
    return {
      [this.PERMISSION_LEVELS.VIEW]: 'View Only',
      [this.PERMISSION_LEVELS.UPLOAD]: 'View & Upload',
      [this.PERMISSION_LEVELS.FULL]: 'Full Access'
    };
  }

  // Get permission level descriptions
  getPermissionDescriptions() {
    return {
      [this.PERMISSION_LEVELS.VIEW]: 'Can view and download files only',
      [this.PERMISSION_LEVELS.UPLOAD]: 'Can view, download, and upload new files',
      [this.PERMISSION_LEVELS.FULL]: 'Can view, download, upload, and delete files'
    };
  }

  // Share bucket with user
  async shareBucket(bucketId, userEmail, permissionLevel) {
    const response = await fetch(`${API_BASE}/permissions/share`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        bucket_id: bucketId,
        user_email: userEmail,
        permission_level: permissionLevel
      })
    });
    return this.handleResponse(response);
  }

  // Update bucket permissions for a user
  async updateBucketPermission(bucketId, userEmail, permissionLevel) {
    const response = await fetch(`${API_BASE}/permissions/update`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        bucket_id: bucketId,
        user_email: userEmail,
        permission_level: permissionLevel
      })
    });
    return this.handleResponse(response);
  }

  // Remove user access from bucket
  async revokeBucketAccess(bucketId, userEmail) {
    const response = await fetch(`${API_BASE}/permissions/revoke`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({
        bucket_id: bucketId,
        user_email: userEmail
      })
    });
    return this.handleResponse(response);
  }

  // Get bucket permissions (who has access)
  async getBucketPermissions(bucketId) {
    const response = await fetch(`${API_BASE}/permissions/bucket/${bucketId}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Get buckets shared with current user
  async getSharedWithMe() {
    const response = await fetch(`${API_BASE}/permissions/shared-with-me`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Get buckets shared by current user
  async getSharedByMe() {
    const response = await fetch(`${API_BASE}/permissions/shared-by-me`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Check if user has specific permission on bucket
  async checkPermission(bucketId, action) {
    const response = await fetch(`${API_BASE}/permissions/check`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        bucket_id: bucketId,
        action: action
      })
    });
    return this.handleResponse(response);
  }

  // Get user's permission level for a bucket
  async getUserPermission(bucketId) {
    const response = await fetch(`${API_BASE}/permissions/user-permission/${bucketId}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Get all users with access to any of user's buckets
  async getSharedUsers() {
    const response = await fetch(`${API_BASE}/permissions/shared-users`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Bulk update permissions for multiple users
  async bulkUpdatePermissions(bucketId, permissions) {
    const response = await fetch(`${API_BASE}/permissions/bulk-update`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        bucket_id: bucketId,
        permissions: permissions // Array of { user_email, permission_level }
      })
    });
    return this.handleResponse(response);
  }

  // Generate shareable link for bucket
  async generateShareableLink(bucketId, permissionLevel, expirationDays = null) {
    const response = await fetch(`${API_BASE}/permissions/generate-link`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        bucket_id: bucketId,
        permission_level: permissionLevel,
        expiration_days: expirationDays
      })
    });
    return this.handleResponse(response);
  }

  // Get shareable links for bucket
  async getShareableLinks(bucketId) {
    const response = await fetch(`${API_BASE}/permissions/shareable-links/${bucketId}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Revoke shareable link
  async revokeShareableLink(linkId) {
    const response = await fetch(`${API_BASE}/permissions/revoke-link/${linkId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Access bucket via shareable link
  async accessViaLink(token) {
    const response = await fetch(`${API_BASE}/permissions/access-link/${token}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Get permission history/audit log
  async getPermissionHistory(bucketId) {
    const response = await fetch(`${API_BASE}/permissions/history/${bucketId}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Search for users to share with
  async searchUsers(query) {
    const response = await fetch(`${API_BASE}/permissions/search-users?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Get sharing statistics
  async getSharingStats() {
    const response = await fetch(`${API_BASE}/permissions/stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Utility methods for permission checking
  canView(permissionLevel) {
    return [this.PERMISSION_LEVELS.VIEW, this.PERMISSION_LEVELS.UPLOAD, this.PERMISSION_LEVELS.FULL].includes(permissionLevel);
  }

  canUpload(permissionLevel) {
    return [this.PERMISSION_LEVELS.UPLOAD, this.PERMISSION_LEVELS.FULL].includes(permissionLevel);
  }

  canDelete(permissionLevel) {
    return permissionLevel === this.PERMISSION_LEVELS.FULL;
  }

  canManagePermissions(permissionLevel) {
    return permissionLevel === this.PERMISSION_LEVELS.FULL;
  }

  // Format permission data for display
  formatPermissionData(permissions) {
    const labels = this.getPermissionLabels();
    const descriptions = this.getPermissionDescriptions();
    
    return permissions.map(permission => ({
      ...permission,
      permission_label: labels[permission.permission_level],
      permission_description: descriptions[permission.permission_level],
      can_view: this.canView(permission.permission_level),
      can_upload: this.canUpload(permission.permission_level),
      can_delete: this.canDelete(permission.permission_level),
      can_manage: this.canManagePermissions(permission.permission_level)
    }));
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate permission level
  validatePermissionLevel(level) {
    return Object.values(this.PERMISSION_LEVELS).includes(level);
  }

  // Get permission icon
  getPermissionIcon(permissionLevel) {
    const icons = {
      [this.PERMISSION_LEVELS.VIEW]: '👁️',
      [this.PERMISSION_LEVELS.UPLOAD]: '📤',
      [this.PERMISSION_LEVELS.FULL]: '🔧'
    };
    return icons[permissionLevel] || '❓';
  }

  // Get permission color
  getPermissionColor(permissionLevel) {
    const colors = {
      [this.PERMISSION_LEVELS.VIEW]: 'blue',
      [this.PERMISSION_LEVELS.UPLOAD]: 'green',
      [this.PERMISSION_LEVELS.FULL]: 'red'
    };
    return colors[permissionLevel] || 'gray';
  }

  // Format date for display
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Check if link is expired
  isLinkExpired(expirationDate) {
    return expirationDate && new Date(expirationDate) < new Date();
  }

  // Calculate days until expiration
  getDaysUntilExpiration(expirationDate) {
    if (!expirationDate) return null;
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Generate random share token (client-side preview)
  generateShareToken() {
    return Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15);
  }
}

export default new PermissionsService();