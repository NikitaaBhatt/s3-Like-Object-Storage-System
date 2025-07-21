import React, { useState, useRef } from 'react';
import { Upload, X, File, Check, AlertCircle } from 'lucide-react';

const FileUpload = ({ bucket, onUploadComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_FILES = 10;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles) => {
    setError('');

    // Filter out files that are too large
    const validFiles = newFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" is too large. Maximum size is 100MB.`);
        return false;
      }
      return true;
    });

    // Check total file count
    if (files.length + validFiles.length > MAX_FILES) {
      setError(`Cannot upload more than ${MAX_FILES} files at once.`);
      return;
    }

    // Add new files to the list
    const filesWithId = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...filesWithId]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg'];

    if (imageExts.includes(extension)) return '🖼️';
    if (docExts.includes(extension)) return '📄';
    if (videoExts.includes(extension)) return '🎥';
    if (audioExts.includes(extension)) return '🎵';
    return '📁';
  };

const [successMessage, setSuccessMessage] = useState('');

  const uploadFiles = async () => {
  if (files.length === 0) return;

  setUploading(true);
  setError('');
  setSuccessMessage('');

  for (const fileObj of files) {
    if (fileObj.status === 'completed') continue;

    try {
      setFiles(prev => prev.map(f =>
        f.id === fileObj.id ? { ...f, status: 'uploading' } : f
      ));

      const formData = new FormData();
      formData.append('file', fileObj.file);
      formData.append('bucket_name', bucket.bucket_name);

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(prev => ({
            ...prev,
            [fileObj.id]: percentComplete
          }));
        }
      };

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);

            if (xhr.status >= 400) {
              reject(new Error(response.message || 'Upload failed'));
            } else {
              setFiles(prev => prev.map(f =>
                f.id === fileObj.id ? { ...f, status: 'completed' } : f
              ));
              resolve(response);
            }

          } catch (err) {
            reject(new Error('Invalid response from server'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === fileObj.id ? { ...f, status: 'error', error: error.message } : f
      ));
      console.error('Upload failed:', error);
    }
  }

  setUploading(false);
  setError('');

  // ✅ Increased delay to 3000ms (3 seconds) for visibility
  setTimeout(() => {
    const hasErrorsNow = files.some(f => f.status === 'error');
    if (!hasErrorsNow) {
      setFiles([]);
      setUploadProgress({});
      setSuccessMessage('All files uploaded successfully!');
      onUploadComplete();  // optional
    }
  }, 3000); 
};


  const clearAll = () => {
    setFiles([]);
    setUploadProgress({});
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const canUpload = bucket.permission_name !== 'View Only' || !bucket.is_shared;

  if (!canUpload) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">
          You don't have permission to upload files to this bucket.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Upload Files</h3>
        {files.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">
          <span className="font-medium text-blue-600 cursor-pointer">Click to upload</span>
          {' '}or drag and drop
        </p>
        <p className="text-sm text-gray-500">
          Maximum {MAX_FILES} files, 100MB each
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="space-y-3">
            {files.map((fileObj) => (
              <div
                key={fileObj.id}
                className="flex items-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="text-2xl mr-3">
                  {getFileIcon(fileObj.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileObj.name}
                    </p>
                    <div className="flex items-center space-x-2 ml-2">
                      {fileObj.status === 'completed' && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {fileObj.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <button
                        onClick={() => removeFile(fileObj.id)}
                        disabled={uploading && fileObj.status === 'uploading'}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {formatFileSize(fileObj.size)}
                    </p>

                    {fileObj.status === 'uploading' && (
                      <div className="flex items-center">
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mr-2">
                          <div
                            className="h-1.5 bg-blue-500 rounded-full transition-all"
                            style={{ width: `${uploadProgress[fileObj.id] || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round(uploadProgress[fileObj.id] || 0)}%
                        </span>
                      </div>
                    )}

                    {fileObj.status === 'error' && (
                      <span className="text-xs text-red-500">
                        {fileObj.error}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={uploadFiles}
              disabled={uploading || files.length === 0 || files.every(f => f.status === 'completed')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;