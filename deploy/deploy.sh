#!/bin/bash

# Simple S3 Storage Deployment Script
# This script automates the deployment process for the Simple S3 Storage application

set -e  # Exit on any error

# Configuration
APP_NAME="simple-s3-storage"
DOCKER_IMAGE="${APP_NAME}:latest"
CONTAINER_NAME="${APP_NAME}-app"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# Function to check if required tools are installed
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    success "All dependencies are installed."
}

# Function to create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p $BACKUP_DIR
    mkdir -p logs
    mkdir -p data/uploads
    mkdir -p data/metadata
    mkdir -p ssl  # For future SSL certificates
    
    success "Directories created successfully."
}

# Function to backup existing data
backup_data() {
    if [ -d "data" ] && [ "$(ls -A data)" ]; then
        log "Creating backup of existing data..."
        
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" data/
        
        success "Backup created: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    else
        log "No existing data to backup."
    fi
}

# Function to generate secret key
generate_secret_key() {
    if [ ! -f ".env" ]; then
        log "Generating environment configuration..."
        
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
        
        cat > .env << EOF
# Flask Configuration
SECRET_KEY=${SECRET_KEY}
FLASK_ENV=production

# Upload Configuration
MAX_UPLOAD_SIZE=100MB
ALLOWED_EXTENSIONS=pdf,txt,png,jpg,jpeg,gif,doc,docx,ppt,pptx,xls,xlsx,zip,rar,mp4,mp3,avi,mov

# Storage Configuration
DATA_DIR=/app/data

# Redis Configuration (optional)
REDIS_URL=redis://redis:6379/0

# Security Settings
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax
EOF
        
        success "Environment configuration created."
    else
        log "Environment configuration already exists."
    fi
}

# Function to build the application
build_application() {
    log "Building Docker image..."
    
    docker build -f docker/Dockerfile -t $DOCKER_IMAGE . || error "Docker build failed"
    
    success "Docker image built successfully."
}

# Function to deploy with docker-compose
deploy_with_compose() {
    log "Deploying with Docker Compose..."
    
    # Stop existing containers
    docker-compose -f docker/docker-compose.yml down || true
    
    # Start new containers
    docker-compose -f docker/docker-compose.yml up -d || error "Docker Compose deployment failed"
    
    success "Application deployed successfully."
}

# Function to wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
            success "Application is ready!"
            return 0
        fi
        
        log "Waiting for application to be ready... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    error "Application failed to become ready within the expected time."
}

# Function to show deployment status
show_status() {
    log "Deployment Status:"
    
    echo ""
    echo "=== Container Status ==="
    docker-compose -f docker/docker-compose.yml ps
    
    echo ""
    echo "=== Service URLs ==="
    echo "Application: http://localhost:8080"
    echo "Nginx Proxy: http://localhost:80"
    echo "Health Check: http://localhost:8080/health"
    
    echo ""
    echo "=== Logs ==="
    echo "Application logs: docker logs simple-s3-storage"
    echo "Nginx logs: docker logs s3-nginx"
    echo "All services: docker-compose -f docker/docker-compose.yml logs -f"
    
    echo ""
    echo "=== Management Commands ==="
    echo "Stop services: docker-compose -f docker/docker-compose.yml down"
    echo "View logs: docker-compose -f docker/docker-compose.yml logs -f"
    echo "Restart: docker-compose -f docker/docker-compose.yml restart"
}

# Function to run health checks
health_check() {
    log "Running health checks..."
    
    # Check if containers are running
    if ! docker-compose -f docker/docker-compose.yml ps | grep -q "Up"; then
        error "Some containers are not running properly."
    fi
    
    # Check application health endpoint
    if ! curl -f -s http://localhost:8080/health > /dev/null; then
        warning "Application health check failed. Check logs for details."
    else
        success "Application health check passed."
    fi
    
    # Check nginx
    if ! curl -f -s http://localhost:80/health > /dev/null; then
        warning "Nginx health check failed. Check configuration."
    else
        success "Nginx health check passed."
    fi
}

# Function to cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    success "Cleanup completed."
}

# Main deployment function
main() {
    log "Starting deployment of Simple S3 Storage..."
    
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            setup_directories
            backup_data
            generate_secret_key
            build_application
            deploy_with_compose
            wait_for_services
            health_check
            show_status
            success "Deployment completed successfully!"
            ;;
        "start")
            log "Starting services..."
            docker-compose -f docker/docker-compose.yml up -d
            wait_for_services
            show_status
            ;;
        "stop")
            log "Stopping services..."
            docker-compose -f docker/docker-compose.yml down
            success "Services stopped."
            ;;
        "restart")
            log "Restarting services..."
            docker-compose -f docker/docker-compose.yml restart
            wait_for_services
            success "Services restarted."
            ;;
        "status")
            show_status
            ;;
        "health")
            health_check
            ;;
        "logs")
            docker-compose -f docker/docker-compose.yml logs -f
            ;;
        "backup")
            backup_data
            ;;
        "cleanup")
            cleanup
            ;;
        "update")
            backup_data
            build_application
            deploy_with_compose
            wait_for_services
            health_check
            success "Update completed successfully!"
            ;;
        *)
            echo "Usage: $0 {deploy|start|stop|restart|status|health|logs|backup|cleanup|update}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment (default)"
            echo "  start    - Start services"
            echo "  stop     - Stop services"
            echo "  restart  - Restart services"
            echo "  status   - Show deployment status"
            echo "  health   - Run health checks"
            echo "  logs     - Show service logs"
            echo "  backup   - Backup data"
            echo "  cleanup  - Clean up old Docker resources"
            echo "  update   - Update application (backup + rebuild + deploy)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"