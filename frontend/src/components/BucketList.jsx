import React, { useState } from 'react';
import { Folder, Share2, MoreVertical, Trash2, Edit, Calendar, Files } from 'lucide-react';

const BucketList = ({ buckets, onSelectBucket, onBucketUpdate }) => {
  const [showMenu, setShowMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showRename, setShowRename] = useState(null);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeleteBucket = async (bucketId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/buckets/${bucketId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        onBucketUpdate();
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete bucket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameBucket = async (bucketId) => {
  if (!newName.trim()) return;

  console.log('Renaming bucket:', bucketId, 'to:', newName); // ✅ Debug line

  setLoading(true);
  try {
    const response = await fetch(`/api/buckets/${bucketId}/rename`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_name: newName }),
    });

    const data = await response.json();
    if (data.success) {
      onBucketUpdate();
      setShowRename(null);
      setNewName('');
    } else {
      console.error('Rename failed:', data.message);
    }
  } catch (error) {
    console.error('Failed to rename bucket:', error);
  } finally {
    setLoading(false);
  }
};

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const formatFileCount = (count) => {
    if (count === 0) return 'Empty';
    if (count === 1) return '1 file';
    return `${count} files`;
  };

  if (!buckets || buckets.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No buckets yet</h3>
        <p className="text-gray-600 mb-4">
          Create your first bucket to start organizing your files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buckets.map((bucket) => (
          <div
            key={bucket.bucket_id}
            className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center flex-1 min-w-0"
                  onClick={() => onSelectBucket(bucket)}
                >
                  <div className="bg-blue-50 p-2 rounded-lg mr-3 group-hover:bg-blue-100">
                    <Folder className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {bucket.bucket_name}
                    </h3>
                    {bucket.is_shared && (
                      <div className="flex items-center text-sm text-orange-600 mt-1">
                        <Share2 className="w-3 h-3 mr-1" />
                        Shared bucket
                      </div>
                    )}
                  </div>
                </div>

                {/* Menu for own buckets */}
                {!bucket.is_shared && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(showMenu === bucket.bucket_id ? null : bucket.bucket_id);
                      }}
                      className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {showMenu === bucket.bucket_id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <button
                          onClick={() => {
                            setShowRename(bucket.bucket_id);
                            setNewName(bucket.bucket_name);
                            setShowMenu(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(bucket.bucket_id);
                            setShowMenu(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div
                className="space-y-2"
                onClick={() => onSelectBucket(bucket)}
              >
                <div className="flex items-center text-sm text-gray-600">
                  <Files className="w-4 h-4 mr-2" />
                  {formatFileCount(bucket.file_count || 0)}
                </div>

                {bucket.total_size && (
                  <div className="text-sm text-gray-600">
                    Size: {(bucket.total_size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>


              {/* Permission level for shared buckets */}
              {bucket.is_shared && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {bucket.permission_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rename Modal */}
      {showRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rename Bucket</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new bucket name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-black "
              onKeyPress={(e) => e.key === 'Enter' && handleRenameBucket(showRename)}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRename(null);
                  setNewName('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRenameBucket(showRename)}
                disabled={loading || !newName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Bucket</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this bucket? This will also delete all files in it. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBucket(showDeleteConfirm)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BucketList;