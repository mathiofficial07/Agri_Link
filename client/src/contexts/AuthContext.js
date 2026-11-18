import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext();

// Tab-level isolated session storage helper
const getTabUser = () => {
  try {
    const raw = sessionStorage.getItem('agritrack_tab_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const savedTabUser = getTabUser();

const initialState = {
  user: savedTabUser,
  isAuthenticated: Boolean(savedTabUser),
  loading: false,
  error: null,
  showLocationDetection: false
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      let addressString = 'Regional Node';
      if (action.payload?.address) {
        if (typeof action.payload.address === 'string') {
          addressString = action.payload.address;
        } else if (typeof action.payload.address === 'object') {
          addressString = action.payload.address?.fullAddress || 
                         action.payload.address?.full_address || 
                         'Regional Node';
        }
      }
      
      const sanitizedPayload = {
        ...action.payload,
        address: addressString
      };

      // Save tab-isolated user session
      try {
        sessionStorage.setItem('agritrack_tab_user', JSON.stringify(sanitizedPayload));
      } catch (e) {}

      return {
        ...state,
        user: sanitizedPayload,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case 'LOGOUT':
      try {
        sessionStorage.removeItem('agritrack_tab_user');
      } catch (e) {}
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const tabUser = getTabUser();
    if (tabUser && isMounted.current) {
      dispatch({ type: 'LOGIN_SUCCESS', payload: tabUser });
    }
    return () => { isMounted.current = false; };
  }, []);

  const getStoredUser = (email) => {
    try {
      const users = JSON.parse(localStorage.getItem('agritrack_registered_users') || '[]');
      return users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    } catch (e) {
      return null;
    }
  };

  const saveStoredUser = (userObj) => {
    try {
      const users = JSON.parse(localStorage.getItem('agritrack_registered_users') || '[]');
      const idx = users.findIndex(u => u.email?.toLowerCase() === userObj.email?.toLowerCase());
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...userObj };
      } else {
        users.unshift(userObj);
      }
      localStorage.setItem('agritrack_registered_users', JSON.stringify(users));
    } catch (e) {}
  };

  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const stored = getStoredUser(email);
      const apiUrl = process.env.REACT_APP_API_URL || '/api/v1';
      
      let loggedUser = null;
      try {
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (result.success && result.user) {
          loggedUser = result.user;
        }
      } catch (e) {}

      if (!loggedUser) {
        const detectedRole = stored?.role || (email.includes('farm') ? 'farmer' : (email.includes('retail') ? 'retailer' : 'aggregator'));
        loggedUser = {
          id: stored?.id || `user-${Date.now()}`,
          email,
          name: stored?.name || (email.includes('farm') ? 'Rajesh Kumar' : email.includes('collect') ? 'Amit Agro Services' : email.includes('retail') ? 'Fresh Mart Supermarket' : email.split('@')[0]),
          phone: stored?.phone || '+91 98765 43210',
          role: detectedRole
        };
      }

      saveStoredUser(loggedUser);
      dispatch({ type: 'LOGIN_SUCCESS', payload: loggedUser });
      return { success: true, user: loggedUser };
    } catch (error) {
      const stored = getStoredUser(email);
      const role = stored?.role || (email.includes('farm') ? 'farmer' : (email.includes('retail') ? 'retailer' : 'aggregator'));
      const fallbackUser = {
        id: stored?.id || `user-${Date.now()}`,
        email,
        name: stored?.name || email.split('@')[0],
        role
      };
      saveStoredUser(fallbackUser);
      dispatch({ type: 'LOGIN_SUCCESS', payload: fallbackUser });
      return { success: true, user: fallbackUser };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const apiUrl = process.env.REACT_APP_API_URL || '/api/v1';
      const targetRole = userData.role || 'farmer';

      let createdUser = null;
      try {
        const response = await fetch(`${apiUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userData, role: targetRole })
        });
        const result = await response.json();
        if (result.success && result.user) {
          createdUser = result.user;
        }
      } catch (e) {}

      if (!createdUser) {
        createdUser = {
          id: `user-${Date.now()}`,
          name: userData.name || 'New User',
          email: userData.email,
          phone: userData.phone || '+91 98765 43210',
          role: targetRole
        };
      }

      saveStoredUser(createdUser);
      dispatch({ type: 'LOGIN_SUCCESS', payload: createdUser });
      return { success: true, user: createdUser };
    } catch (error) {
      const fallbackUser = {
        id: `user-${Date.now()}`,
        name: userData.name || 'New User',
        email: userData.email,
        phone: userData.phone || '+91 98765 43210',
        role: userData.role || 'farmer'
      };
      saveStoredUser(fallbackUser);
      dispatch({ type: 'LOGIN_SUCCESS', payload: fallbackUser });
      return { success: true, user: fallbackUser };
    }
  };

  const logout = async () => {
    dispatch({ type: 'LOGOUT' });
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) dispatch({ type: 'AUTH_ERROR', payload: error.message });
  };

  const updateUserRole = async (role) => {
    if (!state.user) return { success: false };
    const updated = { ...state.user, role };
    saveStoredUser(updated);
    dispatch({ type: 'LOGIN_SUCCESS', payload: updated });
    return { success: true };
  };

  const value = {
    ...state,
    login, register, logout, signInWithGoogle,
    updateUserRole,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' })
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
