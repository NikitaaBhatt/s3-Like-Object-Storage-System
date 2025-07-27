# Simple S3 Storage

A comprehensive, self-hosted S3-like object storage system with user authentication, file sharing, and advanced search capabilities.

## 🌟 Features

### Core Features
- **User Authentication**: Secure registration and login system
- **Bucket Management**: Create and organize files in buckets
- **File Operations**: Upload, download, delete files with drag-and-drop support
- **Multi-format Support**: Handle documents, images, videos, archives, and more

### Advanced Features
- **Bucket Sharing**: Share buckets with other users with granular permissions
- **Permission Management**: View-only, upload, and full-access permission levels
- **Global Search**: Search across all accessible files and buckets
- **Smart Filtering**: Filter by file type, date, size, and bucket location
- **Storage Statistics**: Track usage and storage metrics

### Technical Features
- **Docker Deployment**: Easy containerized deployment
- **Nginx Reverse Proxy**: Production-ready web server with SSL support
- **Data Persistence**: Reliable file storage with backup capabilities
- **RESTful API**: Complete backend API for all operations
- **Responsive UI**: Modern React frontend with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd simple-s3-storage
```

### 2. Deploy with One Command
```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### 3. Access Your Storage System
- **Main Application**: http://localhost:8080
- **Nginx Proxy**: http://localhost:80
- **Health Check**: http://localhost:8080/health

## 📁 Project Structure

```
simple-s3-storage/
├── backend/                  # Flask backend application
│   ├── app.py               # Main application
│   ├── auth.py              # User authentication
│   ├── storage.py           # File operations
│   ├── database.py          # User data management
│   ├── permissions.py       # Sharing & access control
│   ├── search.py            # Search & filtering
│   └── requirements.txt     # Python dependencies
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   └── services/        # API integration
│   └── package.json
├── docker/                  # Docker configuration
│   ├── Dockerfile          # Multi-stage build
│   └── docker-compose.yml  # Service orchestration
├── deploy/                  # Deployment files
│   ├── nginx.conf          # Nginx configuration
│   └── deploy.sh           # Deployment script
└── data/                   # Persistent data (auto-created)
    ├── uploads/            # User files
    ├── users.json         # User accounts
    └── permissions.json   # Sharing permissions
```

## 🛠️ Development Setup

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## 🐳 Docker Commands

### Using the Deployment Script
```bash
# Full deployment
./deploy/deploy.sh deploy

# Start services
./deploy/deploy.sh start

# Stop services
./deploy/deploy.sh stop

# View logs
./deploy/deploy.sh logs

# Check health
./deploy/deploy.sh health

# Update application
./deploy/deploy.sh update
```

### Manual Docker Commands
```bash
# Build and start
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```bash
# Flask Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=production

# Upload Settings
MAX_UPLOAD_SIZE=100MB
ALLOWED_EXTENSIONS=pdf,txt,png,jpg,jpeg,gif,doc,docx,mp4,mp3

# Storage
DATA_DIR=/app/data

# Optional: Redis for sessions
REDIS_URL=redis://redis:6379/0
```

### Nginx Configuration
The `deploy/nginx.conf` file includes:
- SSL/TLS support (uncomment HTTPS sections)
- Rate limiting for API and uploads
- Gzip compression
- Security headers
- Caching for static files

## 🌐 Deployment Options

### 1. Local Development
```bash
./deploy/deploy.sh deploy
```

### 2. VPS/Cloud Deployment
1. Copy project to your server
2. Update nginx.conf with your domain
3. Add SSL certificates to `ssl/` directory
4. Run deployment script

### 3. Cloud Platforms

#### Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
heroku stack:set container
git push heroku main
```

#### DigitalOcean App Platform
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### 4. SSL/HTTPS Setup
1. Obtain SSL certificates (Let's Encrypt recommended)
2. Place certificates in `ssl/` directory:
   - `ssl/cert.pem`
   - `ssl/key.pem`
3. Uncomment HTTPS section in `nginx.conf`
4. Restart services

## 📱 User Guide

### Getting Started
1. **Register**: Create account with email and password
2. **Login**: Access your personal dashboard
3. **Create Buckets**: Organize files in named buckets
4. **Upload Files**: Drag and drop files into buckets

### Sharing Files
1. **Share Bucket**: Click share button on any bucket
2. **Add Users**: Enter email addresses of users to share with
3. **Set Permissions**:
   - **View Only**: Can see and download files
   - **Upload**: Can add new files
   - **Full Access**: Can add, delete, and manage files

### Searching Files
1. **Global Search**: Use search bar to find files across all buckets
2. **Filter Options**:
   - File type (images, documents, videos, etc.)
   - Date range (today, this week, this month, custom)
   - File size (small, medium, large)
   - Specific buckets

### Managing Storage
- View storage statistics in dashboard
- Monitor shared buckets
- Manage permissions for shared buckets
- Download or delete files

## 🔒 Security Features

- **Password Security**: All passwords are hashed using industry standards
- **Session Management**: Secure session handling with configurable timeouts
- **File Access Control**: Users can only access their own files and shared files
- **Permission System**: Granular control over bucket sharing
- **Input Validation**: All file uploads and user inputs are validated
- **Security Headers**: Comprehensive security headers via Nginx

## 🔄 Backup and Maintenance

### Automatic Backups
The deployment script automatically creates backups before updates:
```bash
./deploy/deploy.sh backup
```

### Manual Backup
```bash
# Backup data directory
tar -czf backup_$(date +%Y%m%d).tar.gz data/

# Backup specific user data
tar -czf user_backup.tar.gz data/uploads/user_123/
```

### Maintenance Tasks
```bash
# View system status
./deploy/deploy.sh status

# Check application health
./deploy/deploy.sh health

# Clean up old Docker resources
./deploy/deploy.sh cleanup

# View application logs
./deploy/deploy.sh logs
```

## 🐛 Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose -f docker/docker-compose.yml logs

# Restart services
./deploy/deploy.sh restart
```

**File upload fails:**
- Check `MAX_UPLOAD_SIZE` setting
- Verify `ALLOWED_EXTENSIONS` includes your file type
- Check disk space

**Can't access shared files:**
- Verify user email addresses match exactly
- Check permission settings
- Ensure both users are logged in

**Performance issues:**
- Monitor disk usage
- Check available memory
- Consider adding Redis for session storage

### Log Locations
- Application logs: `docker logs simple-s3-storage`
- Nginx logs: `docker logs s3-nginx`
- Deployment logs: `./deploy.log`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review application logs
- Create an issue in the repository

## 🎯 Roadmap

- [ ] Mobile app support
- [ ] Advanced file versioning
- [ ] Integration with external cloud storage
- [ ] Advanced user management
- [ ] File encryption at rest
- [ ] API key authentication
- [ ] Webhook support
- [ ] Advanced analytics dashboard

---

**Simple S3 Storage** - Your personal cloud storage solution! 🚀
