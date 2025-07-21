import React, { useState, useEffect } from 'react';
import { X, Share2, Mail, Eye, Upload, Settings, Copy, Check, AlertCircle, Users } from 'lucide-react';

const ShareModal = ({ isOpen, onClose, bucket, onShareSuccess }) => {
  const [shareEmail, setShareEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentShares, setCurrentShares] = useState([]);
  const [loading, setLoading] = useState(false);



  const loadCurrentShares = async () => {
    if (!bucket?.bucket_id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/buckets/${bucket.bucket_id}/shares`);
      const data = await response.json();
      if (data.success) {
        setCurrentShares(data.shares || []);
      }
    } catch (error) {
      //console.error('Failed to load shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = () => {
    if (bucket?.bucket_id) {
      const baseUrl = window.location.origin;
      setShareLink(`${baseUrl}/shared/${bucket.bucket_id}`);
      //setShareLink(`${baseUrl}/shared/${bucket.bucket_id}`);

      setLinkGenerated(true);
    }
  };

  useEffect(() => {
    if (isOpen && bucket) {
      loadCurrentShares();
      generateShareLink();
    }
  }, [isOpen, bucket, loadCurrentShares, generateShareLink]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim() || !bucket?.bucket_id) return;

    setIsSharing(true);
    setError('');

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket_id: bucket.bucket_id,
          share_with_email: shareEmail.trim(),
          permission_level: permission
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShareEmail('');
        setPermission('view');
        await loadCurrentShares();
        if (onShareSuccess) onShareSuccess();
      } else {
        setError(data.error || 'Failed to share bucket');
      }
    } catch (error) {
      setError('Failed to share bucket. Please try again.');
      //console.error('Share error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (shareId) => {
    try {
      const response = await fetch(`/api/unshare`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await loadCurrentShares();
        if (onShareSuccess) onShareSuccess();
      } else {
        setError(data.error || 'Failed to remove share');
      }
    } catch (error) {
      setError('Failed to remove share. Please try again.');
      //console.error('Remove share error:', error);
    }
  };

  const handleUpdatePermission = async (shareId, newPermission) => {
    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permission_level: newPermission
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadCurrentShares();
        if (onShareSuccess) onShareSuccess();
      } else {
        setError(data.error || 'Failed to update permission');
      }
    } catch (error) {
      setError('Failed to update permission. Please try again.');
      //console.error('Update permission error:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      //console.error('Failed to copy link:', error);
    }
  };

  const getPermissionIcon = (perm) => {
    switch (perm) {
      case 'view': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'upload': return <Upload className="w-4 h-4 text-green-500" />;
      case 'full': return <Settings className="w-4 h-4 text-purple-500" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPermissionDescription = (perm) => {
    switch (perm) {
      case 'view': return 'Can view and download files';
      case 'upload': return 'Can view, download, and upload files';
      case 'full': return 'Can view, download, upload, and delete files';
      default: return 'Unknown permission';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Share Bucket</h2>
              <p className="text-sm text-gray-500">{bucket?.bucket_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Share Form */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add People
            </h3>
            
            <form onSubmit={handleShare} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Permission Level
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'view', label: 'View Only', desc: 'Can view and download files' },
                    { value: 'upload', label: 'Can Upload', desc: 'Can view, download, and upload files' },
                    { value: 'full', label: 'Full Access', desc: 'Can view, download, upload, and delete files' }
                  ].map(perm => (
                    <label
                      key={perm.value}
                      className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        permission === perm.value
                          ? 'border-blue-200 bg-gray-600'
                          : 'border-gray-200 hover:bg-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="permission"
                        value={perm.value}
                        checked={permission === perm.value}
                        onChange={(e) => setPermission(e.target.value)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2">
                        {getPermissionIcon(perm.value)}
                        <div>
                          <div className="font-medium text-gray-900">{perm.label}</div>
                          <div className="text-sm text-gray-600">{perm.desc}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSharing || !shareEmail.trim()}
                className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                  isSharing || !shareEmail.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isSharing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Bucket
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Share Link */}
          {linkGenerated && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Share Link
              </h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    copySuccess
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Anyone with this link will be able to access the bucket
              </p>
            </div>
          )}

          {/* Current Shares */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>People with access</span>
              </div>
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            ) : currentShares.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No one else has access to this bucket</p>
                <p className="text-sm">Share it with someone to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentShares.map((share, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {share.shared_with_email?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {share.shared_with_email}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-1">
                          {getPermissionIcon(share.permission_level)}
                          <span>{getPermissionDescription(share.permission_level)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={share.permission_level}
                        onChange={(e) => handleUpdatePermission(share.share_id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="view">View Only</option>
                        <option value="upload">Can Upload</option>
                        <option value="full">Full Access</option>
                      </select>
                      
                      <button
                        onClick={() => handleRemoveShare(share.share_id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50"
                        title="Remove access"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;