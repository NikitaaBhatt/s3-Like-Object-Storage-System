from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from database import Database
from config import Config

class SearchEngine:
    """Advanced file search and filtering engine"""
    
    def __init__(self):
        self.db = Database()
    
    def search_files(self, user_id: str, query: str = "", filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Comprehensive file search with multiple filters
        
        Args:
            user_id: ID of user performing search
            query: Search query string
            filters: Dictionary containing filter options
        
        Returns:
            Dictionary with search results and metadata
        """
        try:
            # Get search results from database
            results = self.db.search_files(query, user_id, filters)
            
            # Enrich results with additional information
            enriched_results = self._enrich_search_results(results)
            
            # Sort results by relevance
            sorted_results = self._sort_search_results(enriched_results, query)
            
            # Generate search metadata
            search_metadata = self._generate_search_metadata(sorted_results, query, filters)
            
            return {
                'success': True,
                'results': sorted_results,
                'metadata': search_metadata,
                'total_results': len(sorted_results),
                'query': query,
                'filters_applied': filters or {}
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Search failed: {str(e)}",
                'results': [],
                'metadata': {},
                'total_results': 0,
                'query': query,
                'filters_applied': filters or {}
            }
    
    def _enrich_search_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Add additional information to search results"""
        enriched_results = []
        
        for file_data in results:
            enriched_file = file_data.copy()
            
            # Add human-readable file size
            file_size = file_data.get('size', 0)
            enriched_file['size_human'] = self._format_file_size(file_size)
            enriched_file['size_category'] = Config.get_file_size_category(file_size)
            
            # Add formatted upload date
            upload_date = file_data.get('upload_date')
            if upload_date:
                enriched_file['upload_date_human'] = self._format_date(upload_date)
                enriched_file['days_ago'] = self._get_days_ago(upload_date)
            
            # Add bucket information
            bucket_id = file_data.get('bucket_id', '')
            if bucket_id:
                bucket_parts = bucket_id.split('_', 1)
                if len(bucket_parts) == 2:
                    owner_id, bucket_name = bucket_parts
                    enriched_file['bucket_name'] = bucket_name
                    enriched_file['is_own_file'] = (owner_id == file_data.get('user_id'))
                    
                    # Get owner info if it's a shared file
                    if not enriched_file['is_own_file']:
                        owner_info = self.db.get_user_by_id(owner_id)
                        if owner_info:
                            enriched_file['bucket_owner'] = owner_info.get('email', 'Unknown')
            
            # Add file type icon/category
            file_type = file_data.get('file_type', 'other')
            enriched_file['file_type_display'] = self._get_file_type_display(file_type)
            
            enriched_results.append(enriched_file)
        
        return enriched_results
    
    def _sort_search_results(self, results: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Sort search results by relevance"""
        if not query or not results:
            # Sort by upload date (newest first) if no query
            return sorted(results, key=lambda x: x.get('upload_date', ''), reverse=True)
        
        query_lower = query.lower()
        
        def calculate_relevance_score(file_data):
            score = 0
            filename = file_data.get('file_name', '').lower()
            
            # Exact match gets highest score
            if query_lower == filename:
                score += 100
            
            # Filename starts with query
            elif filename.startswith(query_lower):
                score += 50
            
            # Query appears in filename
            elif query_lower in filename:
                score += 25
            
            # Bonus for recent files
            days_ago = file_data.get('days_ago', 999)
            if days_ago <= 7:
                score += 10
            elif days_ago <= 30:
                score += 5
            
            # Bonus for user's own files
            if file_data.get('is_own_file', False):
                score += 5
            
            return score
        
        # Sort by relevance score (highest first), then by date
        return sorted(results, 
                     key=lambda x: (calculate_relevance_score(x), x.get('upload_date', '')), 
                     reverse=True)
    
    def _generate_search_metadata(self, results: List[Dict[str, Any]], query: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate metadata about search results"""
        if not results:
            return {
                'total_files': 0,
                'file_types': {},
                'size_breakdown': {},
                'date_breakdown': {},
                'bucket_breakdown': {},
                'search_suggestions': []
            }
        
        # File type breakdown
        file_types = {}
        size_breakdown = {'small': 0, 'medium': 0, 'large': 0}
        date_breakdown = {'today': 0, 'week': 0, 'month': 0, 'older': 0}
        bucket_breakdown = {}
        total_size = 0
        
        for file_data in results:
            # File type counting
            file_type = file_data.get('file_type', 'other')
            file_types[file_type] = file_types.get(file_type, 0) + 1
            
            # Size breakdown
            size_category = file_data.get('size_category', 'small')
            size_breakdown[size_category] += 1
            total_size += file_data.get('size', 0)
            
            # Date breakdown
            days_ago = file_data.get('days_ago', 999)
            if days_ago == 0:
                date_breakdown['today'] += 1
            elif days_ago <= 7:
                date_breakdown['week'] += 1
            elif days_ago <= 30:
                date_breakdown['month'] += 1
            else:
                date_breakdown['older'] += 1
            
            # Bucket breakdown
            bucket_name = file_data.get('bucket_name', 'Unknown')
            bucket_owner = file_data.get('bucket_owner', '')
            bucket_key = f"{bucket_name} ({bucket_owner})" if bucket_owner else bucket_name
            bucket_breakdown[bucket_key] = bucket_breakdown.get(bucket_key, 0) + 1
        
        # Generate search suggestions
        suggestions = self._generate_search_suggestions(results, query, filters)
        
        return {
            'total_files': len(results),
            'total_size': total_size,
            'total_size_human': self._format_file_size(total_size),
            'file_types': file_types,
            'size_breakdown': size_breakdown,
            'date_breakdown': date_breakdown,
            'bucket_breakdown': bucket_breakdown,
            'search_suggestions': suggestions
        }
    
    def _generate_search_suggestions(self, results: List[Dict[str, Any]], query: str, filters: Dict[str, Any] = None) -> List[str]:
        """Generate helpful search suggestions"""
        suggestions = []
        
        if not results and query:
            suggestions.append("Try searching with fewer characters")
            suggestions.append("Check spelling of your search term")
            suggestions.append("Try searching without filters")
        
        if results:
            # Suggest popular file types in results
            file_types = {}
            for file_data in results:
                file_type = file_data.get('file_type', 'other')
                file_types[file_type] = file_types.get(file_type, 0) + 1
            
            if len(file_types) > 1:
                most_common_type = max(file_types, key=file_types.get)
                suggestions.append(f"Filter by '{most_common_type}' files to narrow results")
            
            # Suggest date filtering if many results
            if len(results) > 20:
                suggestions.append("Use date filters to find recent files")
                suggestions.append("Filter by specific buckets to reduce results")
        
        return suggestions[:3]  # Limit to 3 suggestions
    
    def get_search_suggestions(self, user_id: str, partial_query: str) -> List[str]:
        """Get search suggestions based on partial query"""
        try:
            if len(partial_query) < 2:
                return []
            
            # Get all accessible files
            all_files = self.db.search_files("", user_id)
            
            suggestions = set()
            partial_lower = partial_query.lower()
            
            for file_data in all_files:
                filename = file_data.get('file_name', '').lower()
                
                # Add filenames that start with or contain the query
                if filename.startswith(partial_lower) or partial_lower in filename:
                    suggestions.add(file_data.get('file_name', ''))
                
                # Limit suggestions
                if len(suggestions) >= 10:
                    break
            
            return list(suggestions)[:10]
            
        except Exception as e:
            return []
    
    def get_filter_options(self, user_id: str) -> Dict[str, Any]:
        """Get available filter options for user"""
        try:
            # Get all accessible files
            all_files = self.db.search_files("", user_id)
            
            # Get available file types
            file_types = set()
            bucket_options = set()
            
            for file_data in all_files:
                file_type = file_data.get('file_type')
                if file_type:
                    file_types.add(file_type)
                
                bucket_id = file_data.get('bucket_id', '')
                if bucket_id:
                    bucket_parts = bucket_id.split('_', 1)
                    if len(bucket_parts) == 2:
                        bucket_name = bucket_parts[1]
                        bucket_options.add(bucket_name)
            
            return {
                'file_types': sorted(list(file_types)),
                'size_categories': ['small', 'medium', 'large'],
                'date_ranges': ['today', 'week', 'month', 'year'],
                'buckets': sorted(list(bucket_options))
            }
            
        except Exception as e:
            return {
                'file_types': [],
                'size_categories': ['small', 'medium', 'large'],
                'date_ranges': ['today', 'week', 'month', 'year'],
                'buckets': []
            }
    
    def get_recent_searches(self, user_id: str) -> List[str]:
        """Get user's recent search queries (placeholder for future implementation)"""
        # This would require storing search history in database
        # For now, return empty list
        return []
    
    def save_search_query(self, user_id: str, query: str) -> bool:
        """Save search query to history (placeholder for future implementation)"""
        # This would require adding search history to database
        # For now, return True
        return True
    
    def get_popular_searches(self, user_id: str) -> List[str]:
        """Get popular search terms (placeholder for future implementation)"""
        # This would require analytics on search queries
        # For now, return common file-related searches
        return ["document", "image", "report", "photo", "presentation"]
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        
        while size >= 1024.0 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
        
        return f"{size:.1f} {size_names[i]}"
    
    def _format_date(self, date_string: str) -> str:
        """Format date string to human readable format"""
        try:
            dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
            return dt.strftime("%b %d, %Y at %I:%M %p")
        except Exception:
            return date_string
    
    def _get_days_ago(self, date_string: str) -> int:
        """Calculate days ago from date string"""
        try:
            dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
            now = datetime.now()
            
            # Make both timezone-naive for comparison
            if dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
            if now.tzinfo is not None:
                now = now.replace(tzinfo=None)
            
            delta = now - dt
            return delta.days
        except Exception:
            return 999
    
    def _get_file_type_display(self, file_type: str) -> Dict[str, str]:
        """Get display information for file type"""
        type_displays = {
            'image': {'name': 'Image', 'icon': '🖼️', 'color': 'blue'},
            'document': {'name': 'Document', 'icon': '📄', 'color': 'green'},
            'video': {'name': 'Video', 'icon': '🎥', 'color': 'red'},
            'audio': {'name': 'Audio', 'icon': '🎵', 'color': 'purple'},
            'archive': {'name': 'Archive', 'icon': '📦', 'color': 'orange'},
            'code': {'name': 'Code', 'icon': '💻', 'color': 'gray'},
            'other': {'name': 'Other', 'icon': '📁', 'color': 'gray'}
        }
        
        return type_displays.get(file_type, type_displays['other'])
    
    def advanced_search(self, user_id: str, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Advanced search with complex parameters
        
        Args:
            user_id: User performing search
            search_params: Dictionary with advanced search parameters
                - query: Search string
                - file_types: List of file types to include
                - size_min: Minimum file size in bytes
                - size_max: Maximum file size in bytes
                - date_from: Start date for file filtering
                - date_to: End date for file filtering
                - buckets: List of specific buckets to search in
                - include_shared: Whether to include shared buckets
        """
        try:
            query = search_params.get('query', '')
            
            # Build filters dictionary
            filters = {}
            
            if search_params.get('file_types'):
                filters['file_types'] = search_params['file_types']
            
            if search_params.get('size_min') is not None or search_params.get('size_max') is not None:
                filters['size_range'] = {
                    'min': search_params.get('size_min', 0),
                    'max': search_params.get('size_max', float('inf'))
                }
            
            if search_params.get('date_from') or search_params.get('date_to'):
                filters['date_range_custom'] = {
                    'from': search_params.get('date_from'),
                    'to': search_params.get('date_to')
                }
            
            if search_params.get('buckets'):
                filters['specific_buckets'] = search_params['buckets']
            
            # Perform search
            results = self.search_files(user_id, query, filters)
            
            # Add advanced search metadata
            results['search_type'] = 'advanced'
            results['parameters_used'] = search_params
            
            return results
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Advanced search failed: {str(e)}",
                'results': [],
                'metadata': {},
                'search_type': 'advanced'
            }

# Create global search manager instance
search_manager = SearchEngine()