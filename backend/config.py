import os
from pathlib import Path

class Config:
    """Configuration settings for the S3-like storage system"""
    
    # Base directories
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / "data"
    UPLOADS_DIR = DATA_DIR / "uploads"
    METADATA_DIR = DATA_DIR / "metadata"
    
    # Data files
    USERS_FILE = DATA_DIR / "users.json"
    PERMISSIONS_FILE = DATA_DIR / "permissions.json"
    SEARCH_INDEX_FILE = DATA_DIR / "search_index.json"
    FILE_METADATA_FILE = METADATA_DIR / "file_metadata.json"
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
    SESSION_PERMANENT = False
    SESSION_TYPE = 'filesystem'
    
    # Security settings
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB max file size

    # Allowed and blocked extensions
    ALLOWED_EXTENSIONS = {
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico',
        '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx',
        '.ppt', '.pptx', '.csv', '.mp4', '.avi', '.mov', '.wmv', '.flv',
        '.webm', '.mkv', '.m4v', '.mp3', '.wav', '.flac', '.aac', '.ogg',
        '.wma', '.m4a', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
        '.py', '.js', '.html', '.css', '.json', '.xml', '.sql', '.php',
        '.java', '.cpp', '.c', '.h'
    }

    BLOCKED_EXTENSIONS = {
        '.exe', '.sh', '.bat', '.cmd', '.msi', '.dll', '.scr', '.pif', '.vb', '.vbs'
    }

    # Max storage per user (in bytes)
    MAX_STORAGE_PER_USER = 5 * 1024 * 1024 * 1024  # 5 GB
    
    # File type mappings
    FILE_TYPE_CATEGORIES = {
        # Images
        '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
        '.bmp': 'image', '.svg': 'image', '.webp': 'image', '.ico': 'image',
        
        # Documents
        '.pdf': 'document', '.doc': 'document', '.docx': 'document',
        '.txt': 'document', '.rtf': 'document', '.odt': 'document',
        '.xls': 'document', '.xlsx': 'document', '.ppt': 'document',
        '.pptx': 'document', '.csv': 'document',
        
        # Videos
        '.mp4': 'video', '.avi': 'video', '.mov': 'video', '.wmv': 'video',
        '.flv': 'video', '.webm': 'video', '.mkv': 'video', '.m4v': 'video',
        
        # Audio
        '.mp3': 'audio', '.wav': 'audio', '.flac': 'audio', '.aac': 'audio',
        '.ogg': 'audio', '.wma': 'audio', '.m4a': 'audio',
        
        # Archives
        '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive',
        '.gz': 'archive', '.bz2': 'archive',
        
        # Code
        '.py': 'code', '.js': 'code', '.html': 'code', '.css': 'code',
        '.json': 'code', '.xml': 'code', '.sql': 'code', '.php': 'code',
        '.java': 'code', '.cpp': 'code', '.c': 'code', '.h': 'code'
    }
    
    # Permission levels
    PERMISSION_LEVELS = {
        'view': 'View Only',
        'upload': 'Upload Access', 
        'full': 'Full Access'
    }
    
    # File size categories (in bytes)
    FILE_SIZE_CATEGORIES = {
        'small': 1024 * 1024,      # < 1MB
        'medium': 10 * 1024 * 1024,  # 1MB - 10MB
        'large': float('inf')        # > 10MB
    }
    
    @classmethod
    def init_directories(cls):
        """Create necessary directories if they don't exist"""
        directories = [
            cls.DATA_DIR,
            cls.UPLOADS_DIR,
            cls.METADATA_DIR
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def get_file_type(cls, filename):
        """Get file type based on extension"""
        extension = Path(filename).suffix.lower()
        return cls.FILE_TYPE_CATEGORIES.get(extension, 'other')
    
    @classmethod
    def get_file_size_category(cls, size):
        """Get file size category"""
        if size < cls.FILE_SIZE_CATEGORIES['small']:
            return 'small'
        elif size < cls.FILE_SIZE_CATEGORIES['medium']:
            return 'medium'
        else:
            return 'large'