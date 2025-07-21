// API service for backend communication
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // Set authorization header
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };
  }

  // Handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'API request failed');
    }
    return response.json();
  }

  // Authentication endpoints
  async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await this.handleResponse(response);
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async register(email, password) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await this.handleResponse(response);
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders()
      });
    } finally {
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  // Bucket operations
  async getBuckets() {
    const response = await fetch(`${API_BASE}/buckets`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async createBucket(name, description = '') {
    const response = await fetch(`${API_BASE}/buckets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, description })
    });
    return this.handleResponse(response);
  }

  async deleteBucket(bucketId) {
    const response = await fetch(`${API_BASE}/buckets/${bucketId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getBucketDetails(bucketId) {
    const response = await fetch(`${API_BASE}/buckets/${bucketId}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // File operations
  async getFiles(bucketId) {
    const response = await fetch(`${API_BASE}/buckets/${bucketId}/files`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async uploadFile(bucketId, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/buckets/${bucketId}/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    return this.handleResponse(response);
  }

  async deleteFile(bucketId, fileName) {
    const response = await fetch(`${API_BASE}/buckets/${bucketId}/files/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async downloadFile(bucketId, fileName) {
    const response = await fetch(`${API_BASE}/buckets/${bucketId}/files/${encodeURIComponent(fileName)}/download`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    return response.blob();
  }

  async getFileMetadata(bucketId, fileName) {
    const response = await fetch(`${API_BASE}/buckets/${bucketId}/files/${encodeURIComponent(fileName)}/metadata`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Storage statistics
  async getStorageStats() {
    const response = await fetch(`${API_BASE}/storage/stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // User profile
  async getUserProfile() {
    const response = await fetch(`${API_BASE}/user/profile`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async updateUserProfile(profileData) {
    const response = await fetch(`${API_BASE}/user/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(profileData)
    });
    return this.handleResponse(response);
  }

  // Utility methods
  isAuthenticated() {
    return !!this.token;
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // File size formatting
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Date formatting
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get file type icon
  getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      // Images
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
      // Documents
      pdf: '📄', doc: '📝', docx: '📝', txt: '📝', rtf: '📝',
      // Spreadsheets
      xls: '📊', xlsx: '📊', csv: '📊',
      // Presentations
      ppt: '📊', pptx: '📊',
      // Archives
      zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️',
      // Videos
      mp4: '🎥', avi: '🎥', mov: '🎥', wmv: '🎥', flv: '🎥', webm: '🎥',
      // Audio
      mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵', ogg: '🎵',
      // Code
      js: '💻', html: '💻', css: '💻', php: '💻', py: '💻', java: '💻',
      // Default
      default: '📄'
    };
    return iconMap[extension] || iconMap.default;
  }
}

export default new ApiService();