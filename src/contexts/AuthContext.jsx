import React, { createContext, useContext, useState, useMemo } from 'react';
import { USERS, USER_ROLES, getVisibleStages, getFormPermissions } from '../logic';
import { apiLogin } from '../api'; // Import the new API
import { useToast } from './ToastContext';

const AUTH_KEY = 'los_v1_auth_user';
const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse auth user", e);
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getStoredUser); 
  const { showToast } = useToast();

  const login = async (userId) => {
    try {
      // We call our backend API to log in
      const response = await apiLogin(userId);
      const user = response.data;
      
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      setCurrentUser(user);
      showToast(`Welcome, ${user.name}!`, 'success');
    } catch (e) {
      showToast('Login failed', 'error');
      localStorage.removeItem(AUTH_KEY);
      setCurrentUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setCurrentUser(null);
  };

  const permissions = useMemo(() => {
    if (!currentUser) {
      return {
        visibleStages: [],
        formPermissions: { canCreateLead: false, qde: false, dde: false, docs: false, fi: false, uw: false, san: false, disb: false, dev: false },
      };
    }
    return {
      visibleStages: getVisibleStages(currentUser.role),
      formPermissions: getFormPermissions(currentUser.role),
    };
  }, [currentUser]);

  const value = {
    currentUser,
    login,
    logout,
    USERS, // We still pass USERS to the login page
    ...permissions
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};