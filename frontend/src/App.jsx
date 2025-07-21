import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import apiService from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const userData = apiService.getCurrentUser();
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            // Token exists but no user data, try to fetch user profile
            try {
              const profile = await apiService.getUserProfile();
              setUser(profile);
              setIsAuthenticated(true);
            } catch (error) {
              // Invalid token, clear storage
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        }
      } catch (error) {
        //console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      //console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;