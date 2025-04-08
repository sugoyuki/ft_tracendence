interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
}

type AuthListener = () => void;

export function createAuthContext() {
  // State
  let token: string | null = localStorage.getItem('token');
  let user: User | null = null;
  const listeners: AuthListener[] = [];
  
  // Try to load user from storage
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    localStorage.removeItem('user');
  }

  // Check if token is valid by checking expiry
  const isTokenValid = () => {
    if (!token) return false;
    
    try {
      // JWT token has format: header.payload.signature
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      
      // Check if token is expired
      if (decodedPayload.exp * 1000 < Date.now()) {
        logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Invalid token format:', error);
      logout();
      return false;
    }
  };
  
  // Initialize - check token validity
  isTokenValid();

  // Auth methods
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://localhost:8000';
      console.log('Using backend URL:', backendUrl);
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to login');
      }
      
      const data = await response.json();
      
      // Save token and user data
      token = data.token;
      user = data.user;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Notify listeners
      notifyListeners();
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };
  
  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      // Make sure we're using HTTP protocol
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      console.log('Using backend URL:', backendUrl);
      
      // Try a simpler fetch configuration without CORS or credentials
      console.log('Sending registration request to:', `${backendUrl}/api/auth/register`);
      console.log('With payload:', { username, email, password: '[HIDDEN]' });
      
      const response = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });
      
      console.log('Registration response status:', response.status);
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.log('Registration error details:', errorData);
          throw new Error(errorData.error || 'Failed to register');
        } catch (e) {
          console.log('Could not parse error response:', e);
          throw e;
        }
      }
      
      console.log('Registration successful!');
      // Return success but don't automatically log in
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error type:', error instanceof TypeError ? 'TypeError' : error instanceof Error ? 'Error' : 'Unknown');
      return false;
    }
  };
  
  const logout = async (): Promise<void> => {
    if (token) {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://localhost:8000';
      console.log('Using backend URL:', backendUrl);
        // Call logout API if token exists
        await fetch(`${backendUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    // Clear local data regardless of API success
    token = null;
    user = null;
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Notify listeners
    notifyListeners();
  };
  
  const refreshUser = async (): Promise<void> => {
    if (!token) return;
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://localhost:8000';
      console.log('Using backend URL:', backendUrl);
      const response = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh user data');
      }
      
      const data = await response.json();
      user = data.user;
      
      localStorage.setItem('user', JSON.stringify(user));
      
      // Notify listeners
      notifyListeners();
    } catch (error) {
      console.error('Error refreshing user data:', error);
      
      // If unauthorized, log out
      if (error instanceof Error && error.message.includes('401')) {
        logout();
      }
    }
  };
  
  // Observer pattern
  const subscribe = (listener: AuthListener): () => void => {
    listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  };
  
  const notifyListeners = () => {
    listeners.forEach(listener => listener());
  };
  
  // Public API
  return {
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: () => !!token && isTokenValid(),
    getToken: () => token,
    getUser: () => user,
    subscribe
  };
}
