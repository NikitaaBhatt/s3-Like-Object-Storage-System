import React, { useState, useEffect } from 'react';
import { FolderPlus, Search, Share2, Upload, Files, Users, LogOut, User } from 'lucide-react';
import BucketList from './BucketList';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import ShareModal from './ShareModal';
import PermissionsPanel from './PermissionsPanel';
import SharedBuckets from './SharedBuckets';
import StorageStats from './StorageStats';
import FileUpload from './FileUpload';
import FileList from './FileList';
import SearchService from '../services/search';

const Dashboard = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState('buckets');
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadBuckets();
    loadStats();
  }, []);

  const loadBuckets = async () => {
    try {
      const response = await fetch('/api/buckets');
      const data = await response.json();
      if (data.success) {
        setBuckets(data.buckets);
      }
    } catch (error) {
      //console.error('Failed to load buckets:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      //console.error('Failed to load stats:', error);
    }
  };

  const handleCreateBucket = async (e) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/buckets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucket_name: newBucketName }),
      });

      const data = await response.json();
      if (data.success) {
        await loadBuckets();
        setNewBucketName('');
        setShowCreateBucket(false);
      }
    } catch (error) {
      //console.error('Failed to create bucket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      onLogout();
    } catch (error) {
      //console.error('Logout error:', error);
      onLogout(); // Logout anyway
    }
  };

  const renderContent = () => {
    if (selectedBucket) {
      return (
        <div className="space-y-6">
          {/* Bucket Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => setSelectedBucket(null)}
                  className="text-blue-600 hover:text-blue-700 text-sm mb-2"
                >
                  ← Back to Buckets
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedBucket.bucket_name}
                </h2>
                <p className="text-gray-600 mt-1">
                  {selectedBucket.is_shared ? `Shared by ${selectedBucket.owner_email}` : 'Your bucket'}
                </p>
              </div>
              <div className="flex space-x-3">
                {!selectedBucket.is_shared && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* File Upload */}
          <FileUpload 
            bucket={selectedBucket}
            onUploadComplete={loadBuckets}
          />

          {/* File List */}
          <FileList 
            bucket={selectedBucket}
            onFileAction={loadBuckets}
          />
        </div>
      );
    }

    switch (activeView) {
      case 'buckets':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-500">My Buckets</h2>
              <button
                onClick={() => setShowCreateBucket(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-800"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Bucket
              </button>
            </div>
            <BucketList 
              buckets={buckets}
              onSelectBucket={setSelectedBucket}
              onBucketUpdate={loadBuckets}
            />
          </div>
        );

      case 'shared':
        return <SharedBuckets onSelectBucket={setSelectedBucket} />;

      case 'search':
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-50">Search Files</h2>
      <SearchBar onSearchResults={setSearchResults} />
      <FilterPanel
        onFiltersChange={async (filters) => {
          try {
            const res = await SearchService.searchFiles('', filters);
            setSearchResults(res.results || []);
          } catch (error) {
            //console.error("Search error:", error);
            setSearchResults([]);
          }
        }}
      />
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">
            Search Results ({searchResults.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {searchResults.length > 0 ? (
            searchResults.map((file) => (
              <div key={file.file_id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{file.file_name}</h4>
                    <p className="text-sm text-gray-600">
                      {file.bucket_name} • {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      window.open(`/api/download/${file.file_id}`, '_blank')
                    }
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No files found. Try a different search term.
            </div>
          )}
        </div>
      </div>
    </div>
  );

       case 'permissions':
           return selectedBucket ? (
               <PermissionsPanel
               bucket={selectedBucket}
               onClose={() => setActiveView('buckets')}
               />
               ) : (
      <div className="text-white">Select a bucket to manage permissions.</div>
  );



      case 'stats':
        return <StorageStats stats={stats} onStatsUpdate={loadStats} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">S3-Like Object Storage System</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center p-2 rounded-lg hover:bg-gray-100"
                >
                  <User className="w-5 h-5 text-gray-600" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 mr-8">
            <nav className="space-y-1">
              {[
                { id: 'buckets', label: 'My Buckets', icon: Files },
                { id: 'shared', label: 'Shared with Me', icon: Users },
                { id: 'search', label: 'Search Files', icon: Search },
                //{ id: 'permissions', label: 'Permissions', icon: Settings },
                { id: 'stats', label: 'Storage Stats', icon: Upload },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      if (item.id !== 'permissions') {
                          setSelectedBucket(null);  // ✅ Only clear if not permissions view
                          }
                      //setSelectedBucket(null);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                      activeView === item.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-900 hover:bg-white-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Create Bucket Modal */}
      {showCreateBucket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Bucket</h3>
            <form onSubmit={handleCreateBucket}>
              <input
                type="text"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                placeholder="Enter bucket name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-black"
                required
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateBucket(false);
                    setNewBucketName('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newBucketName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedBucket && (
        <ShareModal
          isOpen={showShareModal}
          bucket={selectedBucket}
          onClose={() => setShowShareModal(false)}
          onShareUpdate={loadBuckets}
        />
      )}
    </div>
  );
};



export default Dashboard;