import React, { useState, useEffect } from 'react';
import { Shield, Users, Eye, Upload, Crown, AlertTriangle, RefreshCw, Search, Filter, X, Trash2, UserPlus, Clock } from 'lucide-react';

const PermissionsPanel = ({ bucket, isVisible, onClose }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, view, upload, full
  const [searchTerm, setSearchTerm] = useState('');
  //const [showDetails, setShowDetails] = useState({});
  const [updating, setUpdating] = useState({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPermission, setNewUserPermission] = useState('view');
  const [addingUser, setAddingUser] = useState(false);


  const loadPermissions = async () => {
    if (!bucket?.bucket_id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/buckets/${bucket.bucket_id}/permissions`);
      const data = await response.json();
      if (data.success) {
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      //console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible && bucket) {
      loadPermissions();
    }
  }, [isVisible, bucket, loadPermissions]);

  const updatePermission = async (permissionId, newLevel) => {
    setUpdating(prev => ({ ...prev, [permissionId]: true }));
    
    try {
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permission_level: newLevel
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPermissions(prev => 
          prev.map(p => 
            p.permission_id === permissionId 
              ? { ...p, permission_level: newLevel }
              : p
          )
        );
      } else {
        //console.error('Failed to update permission:', data.error);
      }
    } catch (error) {
      //console.error('Error updating permission:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [permissionId]: false }));
    }
  };

  const revokePermission = async (permissionId) => {
    if (!window.confirm('Are you sure you want to revoke access for this user?')) {
      return;
    }

    setUpdating(prev => ({ ...prev, [permissionId]: true }));
    
    try {
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setPermissions(prev => 
          prev.filter(p => p.permission_id !== permissionId)
        );
      } else {
        //console.error('Failed to revoke permission:', data.error);
      }
    } catch (error) {
      //console.error('Error revoking permission:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [permissionId]: false }));
    }
  };

  const addUserPermission = async () => {
    if (!newUserEmail.trim() || !newUserPermission) {
      return;
    }

    setAddingUser(true);
    
    try {
      const response = await fetch(`/api/buckets/${bucket.bucket_id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: newUserEmail.trim(),
          permission_level: newUserPermission
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadPermissions(); // Reload to get updated permissions
        setNewUserEmail('');
        setNewUserPermission('view');
        setShowAddUser(false);
      } else {
        //console.error('Failed to add user permission:', data.error);
      }
    } catch (error) {
      //console.error('Error adding user permission:', error);
    } finally {
      setAddingUser(false);
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
        return <Shield className="w-4 h-4 text-gray-500" />;
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

  const getPermissionDescription = (level) => {
    switch (level) {
      case 'view':
        return 'Can view and download files';
      case 'upload':
        return 'Can view, download, and upload files';
      case 'full':
        return 'Can view, download, upload, and delete files';
      default:
        return 'Unknown permission level';
    }
  };

  const filteredPermissions = permissions.filter(permission => {
    const matchesFilter = filter === 'all' || permission.permission_level === filter;
    const matchesSearch = searchTerm === '' || 
      permission.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Manage Permissions
                </h2>
                <p className="text-sm text-gray-600">
                  {bucket?.bucket_name || 'Bucket'} • {permissions.length} user{permissions.length !== 1 ? 's' : ''} with access
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
                />
              </div>

              {/* Filter */}
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Permissions</option>
                  <option value="view">View Only</option>
                  <option value="upload">Upload Access</option>
                  <option value="full">Full Access</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={loadPermissions}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add User</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading permissions...</span>
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {permissions.length === 0 ? 'No users have access' : 'No matching permissions'}
              </h3>
              <p className="text-gray-600">
                {permissions.length === 0 
                  ? 'This bucket hasn\'t been shared with anyone yet.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPermissions.map((permission) => (
                <div key={permission.permission_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {permission.user_email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {permission.user_name || permission.user_email}
                          </h4>
                          {permission.user_name && (
                            <span className="text-sm text-gray-500">
                              ({permission.user_email})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border ${getPermissionColor(permission.permission_level)}`}>
                            {getPermissionIcon(permission.permission_level)}
                            <span className="capitalize">{permission.permission_level}</span>
                          </span>
                          
                          <span className="text-xs text-gray-500">
                            {getPermissionDescription(permission.permission_level)}
                          </span>
                        </div>

                        {permission.granted_date && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              Granted {new Date(permission.granted_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Permission Level Selector */}
                      <select
                        value={permission.permission_level}
                        onChange={(e) => updatePermission(permission.permission_id, e.target.value)}
                        disabled={updating[permission.permission_id]}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
                      >
                        <option value="view">View Only</option>
                        <option value="upload">Upload Access</option>
                        <option value="full">Full Access</option>
                      </select>

                      {/* Revoke Button */}
                      <button
                        onClick={() => revokePermission(permission.permission_id)}
                        disabled={updating[permission.permission_id]}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Add User Access</h3>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Email
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="Enter user email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permission Level
                  </label>
                  <select
                    value={newUserPermission}
                    onChange={(e) => setNewUserPermission(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="view">View Only - Can view and download files</option>
                    <option value="upload">Upload Access - Can view, download, and upload files</option>
                    <option value="full">Full Access - Can view, download, upload, and delete files</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUserEmail('');
                    setNewUserPermission('view');
                  }}
                  disabled={addingUser}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addUserPermission}
                  disabled={addingUser || !newUserEmail.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {addingUser && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Add Access</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4 text-blue-500" />
                <span>View Only</span>
              </div>
              <div className="flex items-center space-x-1">
                <Upload className="w-4 h-4 text-green-500" />
                <span>Upload Access</span>
              </div>
              <div className="flex items-center space-x-1">
                <Crown className="w-4 h-4 text-purple-500" />
                <span>Full Access</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Changes take effect immediately</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsPanel;