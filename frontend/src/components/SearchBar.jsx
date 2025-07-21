import React, { useState, useEffect, useRef } from 'react';
import { Search, X, File, Clock, Filter } from 'lucide-react';

const SearchBar = ({ onSearchResults, onFilterToggle, showFilters }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        //console.error('Failed to load recent searches:', error);
      }
    }
  }, []);


  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (query) => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results || []);
        onSearchResults(data.results || []);
        
        // Save to recent searches
        saveRecentSearch(query);
      } else {
        //console.error('Search failed:', data.error);
        setSearchResults([]);
        onSearchResults([]);
      }
    } catch (error) {
      //console.error('Search error:', error);
      setSearchResults([]);
      onSearchResults([]);
    } finally {
      setIsSearching(false);
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        onSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery,onSearchResults, performSearch]);

  const saveRecentSearch = (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return;

    const updated = [
      normalizedQuery,
      ...recentSearches.filter(search => search !== normalizedQuery)
    ].slice(0, 5); // Keep only last 5 searches

    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    if (recentSearches.length > 0 || searchQuery.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    performSearch(suggestion);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    onSearchResults([]);
    searchInputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
          
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="Search files across all buckets..."
            className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-2">
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            <button
              type="button"
              onClick={onFilterToggle}
              className={`p-1 rounded-md transition-colors ${
                showFilters 
                  ? 'text-blue-600 bg-blue-100' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Search Suggestions */}
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <Clock className="w-3 h-3 mr-1" />
                  Recent
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </div>
              
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="block w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Quick Search Results Preview */}
          {searchQuery.trim() && searchResults.length > 0 && (
            <div className="p-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Quick Results ({searchResults.length})
              </div>
              
              {searchResults.slice(0, 5).map((result, index) => (
                <div
                  key={index}
                  className="flex items-center px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => {
                    // Handle result click - could navigate to file or bucket
                    setShowSuggestions(false);
                  }}
                >
                  <File className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {result.file_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      in {result.bucket_name}
                    </div>
                  </div>
                </div>
              ))}
              
              {searchResults.length > 5 && (
                <div className="text-xs text-gray-500 text-center mt-2 py-1">
                  +{searchResults.length - 5} more results
                </div>
              )}
            </div>
          )}

          {/* No Results */}
          {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
            <div className="p-4 text-center text-gray-500">
              <File className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <div className="text-sm">No files found</div>
              <div className="text-xs">Try different keywords or check your filters</div>
            </div>
          )}

          {/* Empty State */}
          {!searchQuery.trim() && recentSearches.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <div className="text-sm">Start typing to search files</div>
              <div className="text-xs">Search across all your buckets and shared files</div>
            </div>
          )}
        </div>
      )}

      {/* Search Results Count */}
      {searchQuery && (
        <div className="mt-2 text-sm text-gray-600">
          {isSearching ? (
            <span>Searching...</span>
          ) : (
            <span>
              {searchResults.length === 0 
                ? 'No results found' 
                : `${searchResults.length} file${searchResults.length !== 1 ? 's' : ''} found`
              }
              {searchQuery && (
                <span> for "{searchQuery}"</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;