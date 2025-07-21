import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Folder, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive, 
  RefreshCw,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  Upload,
  Clock,
  Share2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const StorageStats = ({ refreshTrigger }) => {
  const [stats, setStats] = useState({
    total_storage: 0,
    used_storage: 0,
    available_storage: 0,
    bucket_count: 0,
    file_count: 0,
    shared_buckets_count: 0,
    file_types: {},
    recent_uploads: [],
    storage_by_bucket: [],
    monthly_usage: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, all
  const [error, setError] = useState(null);


  const loadStorageStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stats?range=${timeRange}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats || {});
      } else {
        setError(data.error || 'Failed to load storage statistics');
      }
    } catch (error) {
      //console.error('Error loading storage stats:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadStorageStats();
  }, [refreshTrigger, timeRange]);


  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStoragePercentage = () => {
    if (!stats.total_storage || stats.total_storage === 0) return 0;
    return Math.round((stats.used_storage / stats.total_storage) * 100);
  };

  const getFileTypeIcon = (type) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5 text-green-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-red-600" />;
      case 'audio':
        return <Music className="w-5 h-5 text-purple-600" />;
      case 'document':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'archive':
        return <Archive className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getFileTypeColor = (type) => {
    switch (type) {
      case 'image':
        return 'bg-green-100 border-green-300';
      case 'video':
        return 'bg-red-100 border-red-300';
      case 'audio':
        return 'bg-purple-100 border-purple-300';
      case 'document':
        return 'bg-blue-100 border-blue-300';
      case 'archive':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStorageHealthStatus = () => {
    const percentage = getStoragePercentage();
    if (percentage >= 90) {
      return { status: 'critical', color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle };
    } else if (percentage >= 75) {
      return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle };
    } else {
      return { status: 'healthy', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
    }
  };

  const getStorageProgressColor = () => {
    const percentage = getStoragePercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Loading storage statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Statistics</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadStorageStats}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const healthStatus = getStorageHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <HardDrive className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Storage Statistics</h2>
            <p className="text-gray-600">Monitor your storage usage and file organization</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadStorageStats}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Storage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Storage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg ${healthStatus.bg}`}>
              <HealthIcon className={`w-6 h-6 ${healthStatus.color}`} />
            </div>
            <span className={`text-sm font-medium ${healthStatus.color}`}>
              {healthStatus.status === 'critical' ? 'Critical' : 
               healthStatus.status === 'warning' ? 'Warning' : 'Healthy'}
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Storage Used</h3>
            <div className="text-2xl font-bold text-gray-900">
              {formatFileSize(stats.used_storage)}
            </div>
            <div className="text-sm text-gray-500">
              of {formatFileSize(stats.total_storage)} ({getStoragePercentage()}%)
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getStorageProgressColor()}`}
                style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Buckets */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Total Buckets</h3>
            <div className="text-2xl font-bold text-gray-900">{stats.bucket_count || 0}</div>
            <div className="text-sm text-gray-500">
              {stats.shared_buckets_count || 0} shared with others
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <Upload className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Total Files</h3>
            <div className="text-2xl font-bold text-gray-900">{stats.file_count || 0}</div>
            <div className="text-sm text-gray-500">
              {stats.recent_uploads?.length || 0} uploaded recently
            </div>
          </div>
        </div>

        {/* Available Storage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <Download className="w-4 h-4 text-purple-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">Available Space</h3>
            <div className="text-2xl font-bold text-gray-900">
              {formatFileSize(stats.available_storage || (stats.total_storage - stats.used_storage))}
            </div>
            <div className="text-sm text-gray-500">
              {Math.round(((stats.available_storage || (stats.total_storage - stats.used_storage)) / stats.total_storage) * 100)}% remaining
            </div>
          </div>
        </div>
      </div>

      {/* File Types Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Types Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">File Types</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          
          {stats.file_types && Object.keys(stats.file_types).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.file_types)
                .sort(([,a], [,b]) => b.size - a.size)
                .map(([type, data]) => {
                  const percentage = stats.used_storage > 0 ? (data.size / stats.used_storage * 100) : 0;
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getFileTypeIcon(type)}
                          <span className="font-medium text-gray-900 capitalize">{type}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatFileSize(data.size)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {data.count} files
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getFileTypeColor(type).replace('bg-', 'bg-').replace('-100', '-500')}`}
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {percentage.toFixed(1)}% of total storage
                      </div>
                    </div>
                  );
                })
              }
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No files uploaded yet</p>
            </div>
          )}
        </div>

        {/* Storage by Bucket */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Storage by Bucket</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          {stats.storage_by_bucket && stats.storage_by_bucket.length > 0 ? (
            <div className="space-y-4">
              {stats.storage_by_bucket
                .sort((a, b) => b.size - a.size)
                .slice(0, 10)
                .map((bucket, index) => {
                  const percentage = stats.used_storage > 0 ? (bucket.size / stats.used_storage * 100) : 0;
                  return (
                    <div key={bucket.bucket_name || index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Folder className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900 truncate">
                            {bucket.bucket_name || 'Unnamed Bucket'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatFileSize(bucket.size)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {bucket.file_count} files
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {percentage.toFixed(1)}% of total storage
                      </div>
                    </div>
                  );
                })
              }
              
              {stats.storage_by_bucket.length > 10 && (
                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    And {stats.storage_by_bucket.length - 10} more buckets...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No buckets created yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity & Monthly Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Uploads</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          {stats.recent_uploads && stats.recent_uploads.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_uploads.slice(0, 8).map((file, index) => (
                <div key={file.file_id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getFileTypeIcon(file.file_type)}
                    <div>
                      <div className="font-medium text-gray-900 truncate max-w-48">
                        {file.file_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        in {file.bucket_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(file.upload_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No recent uploads</p>
            </div>
          )}
        </div>

        {/* Monthly Usage Trend */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Storage Trend</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          
          {stats.monthly_usage && stats.monthly_usage.length > 0 ? (
            <div className="space-y-4">
              {stats.monthly_usage.slice(-6).map((month, index) => {
                const maxUsage = Math.max(...stats.monthly_usage.map(m => m.storage_used));
                const percentage = maxUsage > 0 ? (month.storage_used / maxUsage * 100) : 0;
                
                return (
                  <div key={month.month || index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">
                        {month.month}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatFileSize(month.storage_used)}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {month.files_uploaded || 0} files uploaded
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No usage history available</p>
            </div>
          )}
        </div>
      </div>

      {/* Storage Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Storage Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Storage Health */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <HealthIcon className={`w-4 h-4 ${healthStatus.color}`} />
                  <span className="font-medium text-gray-900">Storage Health</span>
                </div>
                <p className="text-sm text-gray-600">
                  {healthStatus.status === 'critical' 
                    ? 'Storage is nearly full. Consider upgrading or cleaning up files.'
                    : healthStatus.status === 'warning'
                    ? 'Storage usage is high. Monitor your uploads closely.'
                    : 'Storage usage is healthy. You have plenty of space available.'
                  }
                </p>
              </div>

              {/* File Organization */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Folder className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-900">Organization</span>
                </div>
                <p className="text-sm text-gray-600">
                  {stats.bucket_count > 0 
                    ? `Good organization with ${stats.bucket_count} buckets. Average ${Math.round((stats.file_count || 0) / stats.bucket_count)} files per bucket.`
                    : 'Create buckets to better organize your files.'
                  }
                </p>
              </div>

              {/* Sharing Activity */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Share2 className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-900">Collaboration</span>
                </div>
                <p className="text-sm text-gray-600">
                  {stats.shared_buckets_count > 0 
                    ? `Actively sharing ${stats.shared_buckets_count} bucket${stats.shared_buckets_count !== 1 ? 's' : ''} with others.`
                    : 'Start sharing buckets to collaborate with others.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageStats;