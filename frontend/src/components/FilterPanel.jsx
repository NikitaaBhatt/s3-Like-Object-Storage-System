import React, { useState, useEffect } from 'react';
import { Filter, X, Image, FileText, Video, Music, File, ChevronDown, ChevronUp } from 'lucide-react';

const FilterPanel = ({ isVisible, onFiltersChange, onClose }) => {
  const [filters, setFilters] = useState({
    fileType: 'all',
    dateRange: 'all',
    sizeRange: 'all',
    bucketId: 'all',
    customDateFrom: '',
    customDateTo: '',
    customSizeMin: '',
    customSizeMax: ''
  });

  const [buckets, setBuckets] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    loadBuckets();
  }, []);

  useEffect(() => {
    // Count active filters
    let count = 0;
    if (filters.fileType !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.sizeRange !== 'all') count++;
    if (filters.bucketId !== 'all') count++;
    if (filters.customDateFrom || filters.customDateTo) count++;
    if (filters.customSizeMin || filters.customSizeMax) count++;
    
    setActiveFilterCount(count);
    
    // Notify parent of filter changes
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const loadBuckets = async () => {
    try {
      const response = await fetch('/api/buckets');
      const data = await response.json();
      if (data.success) {
        setBuckets(data.buckets || []);
      }
    } catch (error) {
      //console.error('Failed to load buckets:', error);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      fileType: 'all',
      dateRange: 'all',
      sizeRange: 'all',
      bucketId: 'all',
      customDateFrom: '',
      customDateTo: '',
      customSizeMin: '',
      customSizeMax: ''
    });
  };

  const getFileTypeIcon = (type) => {
    switch (type) {
      case 'images': return <Image className="w-4 h-4 text-green-500" />;
      case 'documents': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'videos': return <Video className="w-4 h-4 text-purple-500" />;
      case 'audio': return <Music className="w-4 h-4 text-orange-500" />;
      default: return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Options */}
      <div className="space-y-4">
        {/* File Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'all', label: 'All Files', icon: <File className="w-4 h-4 text-gray-500" /> },
              { value: 'images', label: 'Images', icon: getFileTypeIcon('images') },
              { value: 'documents', label: 'Documents', icon: getFileTypeIcon('documents') },
              { value: 'videos', label: 'Videos', icon: getFileTypeIcon('videos') },
              { value: 'audio', label: 'Audio', icon: getFileTypeIcon('audio') },
              { value: 'other', label: 'Other', icon: getFileTypeIcon('other') }
            ].map(type => (
              <button
                key={type.value}
                onClick={() => handleFilterChange('fileType', type.value)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                  filters.fileType === type.value
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {type.icon}
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {filters.dateRange === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.customDateFrom}
                  onChange={(e) => handleFilterChange('customDateFrom', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.customDateTo}
                  onChange={(e) => handleFilterChange('customDateTo', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* File Size Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Size
          </label>
          <select
            value={filters.sizeRange}
            onChange={(e) => handleFilterChange('sizeRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">Any Size</option>
            <option value="small">Small (less than 1 MB)</option>
            <option value="medium">Medium (1-10 MB)</option>
            <option value="large">Large (10-100 MB)</option>
            <option value="huge">Huge (> 100 MB)</option>
            <option value="custom">Custom Size</option>
          </select>

          {filters.sizeRange === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min (MB)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={filters.customSizeMin}
                  onChange={(e) => handleFilterChange('customSizeMin', e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max (MB)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={filters.customSizeMax}
                  onChange={(e) => handleFilterChange('customSizeMax', e.target.value)}
                  placeholder="∞"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bucket Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bucket
          </label>
          <select
            value={filters.bucketId}
            onChange={(e) => handleFilterChange('bucketId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Buckets</option>
            <option value="owned">My Buckets Only</option>
            <option value="shared">Shared Buckets Only</option>
            {buckets.map(bucket => (
              <option key={bucket.bucket_id} value={bucket.bucket_id}>
                {bucket.bucket_name}
                {bucket.is_shared && ' (Shared)'}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Options Toggle */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>Advanced Options</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Results By
                </label>
                <select
                  value={filters.sortBy || 'relevance'}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="relevance">Relevance</option>
                  <option value="name">File Name</option>
                  <option value="date">Upload Date</option>
                  <option value="size">File Size</option>
                  <option value="type">File Type</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleFilterChange('sortOrder', 'asc')}
                    className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                      filters.sortOrder === 'asc'
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Ascending
                  </button>
                  <button
                    onClick={() => handleFilterChange('sortOrder', 'desc')}
                    className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                      filters.sortOrder === 'desc'
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Descending
                  </button>
                </div>
              </div>

              {/* Include Hidden Files */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeHidden"
                  checked={filters.includeHidden || false}
                  onChange={(e) => handleFilterChange('includeHidden', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="includeHidden" className="text-sm text-gray-700">
                  Include hidden files
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={clearAllFilters}
          disabled={activeFilterCount === 0}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            activeFilterCount === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Clear All
        </button>

        <div className="text-sm text-gray-500">
          {activeFilterCount === 0 ? (
            'No filters applied'
          ) : (
            `${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} applied`
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;