// Search service for file search and filtering
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class SearchService {
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
      const error = await response.json().catch(() => ({ message: 'Search request failed' }));
      throw new Error(error.message || 'Search request failed');
    }
    return response.json();
  }

  // Global file search across all accessible buckets
  async searchFiles(query, options = {}) {
    const searchParams = new URLSearchParams();
    
    if (query) searchParams.append('q', query);
    if (options.bucketId) searchParams.append('bucket_id', options.bucketId);
    if (options.fileType) searchParams.append('file_type', options.fileType);
    if (options.minSize) searchParams.append('min_size', options.minSize);
    if (options.maxSize) searchParams.append('max_size', options.maxSize);
    if (options.dateFrom) searchParams.append('date_from', options.dateFrom);
    if (options.dateTo) searchParams.append('date_to', options.dateTo);
    if (options.sortBy) searchParams.append('sort_by', options.sortBy);
    if (options.sortOrder) searchParams.append('sort_order', options.sortOrder);
    if (options.limit) searchParams.append('limit', options.limit);
    if (options.offset) searchParams.append('offset', options.offset);

    const response = await fetch(`${API_BASE}/search/files?${searchParams.toString()}`, {
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }

  // Search within specific bucket
  async searchInBucket(bucketId, query, filters = {}) {
    const searchOptions = {
      bucketId,
      ...filters
    };
    return this.searchFiles(query, searchOptions);
  }

  // Get search suggestions (autocomplete)
  async getSearchSuggestions(query) {
    const response = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Get popular searches
  async getPopularSearches() {
    const response = await fetch(`${API_BASE}/search/popular`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Get recent searches
  async getRecentSearches() {
    const response = await fetch(`${API_BASE}/search/recent`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Save search to recent searches
  async saveSearch(query, filters = {}) {
    const response = await fetch(`${API_BASE}/search/save`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, filters })
    });
    return this.handleResponse(response);
  }

  // Clear recent searches
  async clearRecentSearches() {
    const response = await fetch(`${API_BASE}/search/recent`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Advanced search with multiple criteria
  async advancedSearch(criteria) {
    const response = await fetch(`${API_BASE}/search/advanced`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(criteria)
    });
    return this.handleResponse(response);
  }

  // Get search statistics
  async getSearchStats() {
    const response = await fetch(`${API_BASE}/search/stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Filter files by type
  async filterByType(fileTypes) {
    return this.searchFiles('', { fileType: fileTypes.join(',') });
  }

  // Filter files by date range
  async filterByDateRange(dateFrom, dateTo) {
    return this.searchFiles('', { dateFrom, dateTo });
  }

  // Filter files by size range
  async filterBySizeRange(minSize, maxSize) {
    return this.searchFiles('', { minSize, maxSize });
  }

  // Get file type statistics
  async getFileTypeStats(bucketId = null) {
    const params = bucketId ? `?bucket_id=${bucketId}` : '';
    const response = await fetch(`${API_BASE}/search/file-types${params}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Search within date ranges
  getDateRangePresets() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisYear = new Date(now.getFullYear(), 0, 1);

    return {
      today: { from: today.toISOString(), to: now.toISOString(), label: 'Today' },
      yesterday: { from: yesterday.toISOString(), to: today.toISOString(), label: 'Yesterday' },
      thisWeek: { from: thisWeek.toISOString(), to: now.toISOString(), label: 'This Week' },
      thisMonth: { from: thisMonth.toISOString(), to: now.toISOString(), label: 'This Month' },
      lastMonth: { from: lastMonth.toISOString(), to: lastMonthEnd.toISOString(), label: 'Last Month' },
      thisYear: { from: thisYear.toISOString(), to: now.toISOString(), label: 'This Year' }
    };
  }

  // File size presets
  getSizeRangePresets() {
    return {
      small: { max: 1024 * 1024, label: 'Small (< 1MB)' },
      medium: { min: 1024 * 1024, max: 10 * 1024 * 1024, label: 'Medium (1-10MB)' },
      large: { min: 10 * 1024 * 1024, max: 100 * 1024 * 1024, label: 'Large (10-100MB)' },
      xlarge: { min: 100 * 1024 * 1024, label: 'Very Large (> 100MB)' }
    };
  }

  // File type categories
  getFileTypeCategories() {
    return {
      images: {
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff'],
        label: 'Images',
        icon: '🖼️'
      },
      documents: {
        extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
        label: 'Documents',
        icon: '📄'
      },
      spreadsheets: {
        extensions: ['xls', 'xlsx', 'csv', 'ods'],
        label: 'Spreadsheets',
        icon: '📊'
      },
      presentations: {
        extensions: ['ppt', 'pptx', 'odp'],
        label: 'Presentations',
        icon: '📊'
      },
      videos: {
        extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
        label: 'Videos',
        icon: '🎥'
      },
      audio: {
        extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
        label: 'Audio',
        icon: '🎵'
      },
      archives: {
        extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
        label: 'Archives',
        icon: '🗜️'
      },
      code: {
        extensions: ['js', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c', 'json', 'xml'],
        label: 'Code',
        icon: '💻'
      }
    };
  }

  // Get file extension from filename
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  // Get file category from filename
  getFileCategory(filename) {
    const extension = this.getFileExtension(filename);
    const categories = this.getFileTypeCategories();
    
    for (const [categoryKey, category] of Object.entries(categories)) {
      if (category.extensions.includes(extension)) {
        return categoryKey;
      }
    }
    return 'other';
  }

  // Format search results for display
  formatSearchResults(results) {
    return results.map(file => ({
      ...file,
      category: this.getFileCategory(file.name),
      icon: this.getFileIcon(file.name),
      sizeFormatted: this.formatFileSize(file.size),
      dateFormatted: this.formatDate(file.uploaded_at || file.modified_at)
    }));
  }

  // Get file icon based on extension
  getFileIcon(fileName) {
    const extension = this.getFileExtension(fileName);
    const categories = this.getFileTypeCategories();
    
    for (const category of Object.values(categories)) {
      if (category.extensions.includes(extension)) {
        return category.icon;
      }
    }
    return '📄';
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format date
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Debounce search queries
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Create debounced search function
  createDebouncedSearch(callback, delay = 300) {
    return this.debounce(callback, delay);
  }
}

const searchService = new SearchService();
export default searchService;
