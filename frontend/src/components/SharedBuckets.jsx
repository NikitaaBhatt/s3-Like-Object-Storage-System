import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Eye, 
  Upload, 
  Crown, 
  Folder, 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  User,
  ExternalLink,
  Calendar,
  HardDrive,
  AlertCircle
} from 'lucide-react';

const SharedBuckets = ({ onSelectBucket }) => {
  const [sharedBuckets, setSharedBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionFilter, setPermissionFilter] = useState('all'); // all, view, upload, full
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, name, owner, permission

  useEffect(() => {
    loadSharedBuckets();
  }, []);

  const loadSharedBuckets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/buckets/shared');
      const data = await response.json();
      if (data.success) {
        setSharedBuckets(data.shared_buckets || []);
      } else {
        //console.error('Failed to load shared buckets:', data.error);
      }
    } catch (error) {
      //console.error('Error loading shared buckets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionIcon = (level) => {
    switch (level) {
      case 'view':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'upload':
        return <Upload className="w-4 h-4 text-green-500" />;
      case 'full':
        return <Crown className="w-4 h-4 text-purple-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPermissionColor = (level) => {
    switch (level) {
      case 'view':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upload':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'full':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPermissionLabel = (level) => {
    switch (level) {
      case 'view':
        return 'View Only';
      case 'upload':
        return 'Upload Access';
      case 'full':
        return 'Full Access';
      default:
        return 'Unknown';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const getUniqueOwners = () => {
    const owners = [...new Set(sharedBuckets.map(bucket => bucket.owner_email))];
    return owners.sort();
  };

  const sortBuckets = (buckets) => {
    return [...buckets].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.bucket_name.localeCompare(b.bucket_name);
        case 'owner':
          return a.owner_email.localeCompare(b.owner_email);
        case 'permission':
          const permissionOrder = { 'view': 1, 'upload': 2, 'full': 3 };
          return (permissionOrder[b.permission_level] || 0) - (permissionOrder[a.permission_level] || 0);
        case 'recent':
        default:
          return new Date(b.shared_date || 0) - new Date(a.shared_date || 0);
      }
    });
  };

  const filteredAndSortedBuckets = sortBuckets(
    sharedBuckets.filter(bucket => {
      const matchesSearch = searchTerm === '' || 
        bucket.bucket_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bucket.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bucket.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPermission = permissionFilter === 'all' || bucket.permission_level === permissionFilter;
      
      const matchesOwner = ownerFilter === '' || bucket.owner_email === ownerFilter;
      
      return matchesSearch && matchesPermission && matchesOwner;
    })
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Loading shared buckets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Share2 className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shared with Me</h2>
            <p className="text-gray-600">
              {sharedBuckets.length} bucket{sharedBuckets.length !== 1 ? 's' : ''} shared with you
            </p>
          </div>
        </div>
        
        <button
          onClick={loadSharedBuckets}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search buckets or owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 text-black"
              />
            </div>

            {/* Permission Filter */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Permissions</option>
                <option value="view">View Only</option>
                <option value="upload">Upload Access</option>
                <option value="full">Full Access</option>
              </select>
            </div>

            {/* Owner Filter */}
            {getUniqueOwners().length > 1 && (
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">All Owners</option>
                  {getUniqueOwners().map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="recent">Recently Shared</option>
              <option value="name">Bucket Name</option>
              <option value="owner">Owner</option>
              <option value="permission">Permission Level</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedBuckets.length === 0 && !loading && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          {sharedBuckets.length === 0 ? (
            <div className="space-y-4">
              <Share2 className="w-16 h-16 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No shared buckets</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  When other users share buckets with you, they'll appear here. 
                  You can then access their files based on the permissions they've granted you.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching buckets</h3>
                <p className="text-gray-600">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shared Buckets Grid */}
      {filteredAndSortedBuckets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedBuckets.map((bucket) => (
            <div
              key={bucket.bucket_id}
              className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => onSelectBucket && onSelectBucket(bucket)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Folder className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {bucket.bucket_name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {bucket.owner_name || bucket.owner_email}
                      </p>
                    </div>
                  </div>
                  
                  <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Permission Badge */}
                <div className="mb-4">
                  <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getPermissionColor(bucket.permission_level)}`}>
                    {getPermissionIcon(bucket.permission_level)}
                    <span>{getPermissionLabel(bucket.permission_level)}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{bucket.file_count || 0} files</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <HardDrive className="w-4 h-4" />
                      <span>{formatFileSize(bucket.total_size)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Shared {formatDate(bucket.shared_date)}</span>
                  </div>
                </div>

                {/* Recent Activity */}
                {bucket.last_activity && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>Last activity: {formatDate(bucket.last_activity)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Owner: {bucket.owner_email}
                  </div>
                  
                  {bucket.permission_level === 'full' && (
                    <div className="flex items-center space-x-1 text-xs text-purple-600">
                      <Crown className="w-3 h-3" />
                      <span>Full Control</span>
                    </div>
                  )}
                  
                  {bucket.permission_level === 'upload' && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <Upload className="w-3 h-3" />
                      <span>Can Upload</span>
                    </div>
                  )}
                  
                  {bucket.permission_level === 'view' && (
                    <div className="flex items-center space-x-1 text-xs text-blue-600">
                      <Eye className="w-3 h-3" />
                      <span>View Only</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {filteredAndSortedBuckets.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredAndSortedBuckets.length}
              </div>
              <div className="text-sm text-gray-600">Shared Buckets</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredAndSortedBuckets.reduce((total, bucket) => total + (bucket.file_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Files</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatFileSize(filteredAndSortedBuckets.reduce((total, bucket) => total + (bucket.total_size || 0), 0))}
              </div>
              <div className="text-sm text-gray-600">Total Size</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedBuckets;