import React, { useState, useEffect } from 'react';
import { Download, Trash2, File, Image, Video, Music, FileText, Calendar, Grid, List, ChevronDown, ChevronUp } from 'lucide-react';

const FileList = ({ bucket, onFileAction }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  //const [showMenu, setShowMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  useEffect(() => {
    loadFiles();
  }, [bucket.bucket_id]);
//const [successMessage, setSuccessMessage] = useState('');



  const loadFiles = async () => {
    setLoading(true);
    try {
     // const response = await fetch(`/api/buckets/${bucket.bucket_id}/files`);
      const response = await fetch(`/api/files?bucket_id=${bucket.bucket_id}`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files || []);
      }
    } catch (error) {
      //console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleDownload = async (file) => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`/api/download/${file.file_id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    //console.error('Download error:', err);
    alert('Download failed. Please try again.');
  }
};


  const handleDeleteFile = async (fileId) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setFiles(prev => prev.filter(f => f.file_id !== fileId));
        setShowDeleteConfirm(null);
        onFileAction();
      }
    } catch (error) {
      //console.error('Failed to delete file:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const getFileIcon = (fileName, size = 'w-5 h-5') => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg'];

    if (imageExts.includes(extension)) return <Image className={`${size} text-green-500`} />;
    if (docExts.includes(extension)) return <FileText className={`${size} text-blue-500`} />;
    if (videoExts.includes(extension)) return <Video className={`${size} text-purple-500`} />;
    if (audioExts.includes(extension)) return <Music className={`${size} text-orange-500`} />;
    return <File className={`${size} text-gray-500`} />;
  };

  const sortFiles = (filesToSort) => {
    return [...filesToSort].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.file_name?.toLowerCase() || '';
          bValue = b.file_name?.toLowerCase() || '';
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'date':
          aValue = new Date(a.upload_date || 0);
          bValue = new Date(b.upload_date || 0);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    }
    return null;
  };

  const canDelete = bucket.permission_name !== 'View Only' || !bucket.is_shared;
  const sortedFiles = sortFiles(files);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-600">Loading files...</span>
        </div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
        <p className="text-gray-500">Upload your first file to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header with view controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Files ({files.length})
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${
                viewMode === 'list' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* File list */}
      {viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('size')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Size</span>
                    {getSortIcon('size')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Modified</span>
                    {getSortIcon('date')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedFiles.map((file, index) => (
                <tr key={file.file_id || index} className="hover:bg-gray-600">
                  <td className="px-6 py-4 whitespace-nowrap text-black">
                    <div className="flex items-center">
                      {getFileIcon(file.file_name)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-50">
                          {file.file_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(file.upload_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleDownload(file)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setShowDeleteConfirm(file.file_id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid view */
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedFiles.map((file, index) => (
              <div 
                key={file.file_id || index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col items-center text-center">
                  {getFileIcon(file.file_name, 'w-8 h-8')}
                  <div className="mt-2 w-full">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {file.file_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(file.upload_date)}
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-2 mt-3">
                    <button
                      onClick={() => handleDownload(file)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setShowDeleteConfirm(file.file_id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete File</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFile(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;