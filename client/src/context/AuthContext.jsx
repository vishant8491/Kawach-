import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);  // Save token to localStorage after getting from server
    localStorage.setItem('user', JSON.stringify(userData));  // Save user data
  };
  
  const setFile = (id) => { 
    setFileId(id);
  }

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');  // Remove token on logout
    localStorage.removeItem('user');   // Remove user data on logout
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, setFile, fileId, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
