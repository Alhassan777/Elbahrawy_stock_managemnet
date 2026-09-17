import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [staff, setStaff] = useState(null);

  const login = useCallback((tokenValue, staffData) => {
    setToken(tokenValue);
    setStaff(staffData);
  }, []);

  const updateAuth = useCallback((tokenValue, staffData) => {
    setToken(tokenValue);
    setStaff(staffData);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStaff(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, staff, login, logout, updateAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
