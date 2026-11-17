import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TOKEN_STORAGE_KEY } from '../services/apiClient.js';
import { authService } from '../services/authService.js';

const USER_STORAGE_KEY = 'dm_tiles_user';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isInitializing, setIsInitializing] = useState(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return Boolean(token && !stored);
  });

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsInitializing(false);
      return;
    }

    try {
      const profile = await authService.getMe();
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      setUser(profile);
    } catch {
      clearSession();
    } finally {
      setIsInitializing(false);
    }
  }, [clearSession]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('dm-tiles:unauthorized', onUnauthorized);
    return () => window.removeEventListener('dm-tiles:unauthorized', onUnauthorized);
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = await authService.register(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network failures during logout
    } finally {
      clearSession();
    }
  };

  const updateProfile = async (payload) => {
    const updatedUser = await authService.updateMe(payload);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isInitializing,
    login,
    register,
    logout,
    updateProfile,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

