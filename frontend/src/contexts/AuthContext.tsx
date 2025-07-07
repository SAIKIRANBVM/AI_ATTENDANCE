import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
}

const AUTH_TOKEN_KEY = 'auth_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
console.log(`The authContext value in authContext.tsx file: ${AuthContext}`)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize token from localStorage
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  });

  // Wrapper function to update both state and localStorage
  const setToken = (newToken: string | null) => {
    console.log('Setting new token:', newToken);
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken);
      console.log('Token stored in localStorage');
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      console.log('Token removed from localStorage');
    }
  };

  useEffect(() => {
    // Listen for postMessage events from the parent Angular application
    const handleMessage = (event: MessageEvent) => {
      console.log('Received postMessage event:', event);
      console.log('Event origin:', event.origin);
      console.log('Event data:', event.data);

      // Accept messages from localhost:4200 regardless of path
      // if (!event.origin.startsWith('https://best.bvm.ngrok.app')) {
      //   console.log('Origin not allowed:', event.origin);
      //   return;
      // }

      // Check if the message is an auth token
      if (event.data?.type === 'AUTH_TOKEN' && event.data?.token) {
        const receivedToken = event.data.token;
        console.log('Received token from postMessage:', receivedToken);
        
        // Show alert with the received token
        //alert(`Received Auth Token: ${receivedToken}`);
        
        // Store the token
        setToken(receivedToken);
      } else {
        console.log('Invalid message format:', event.data);
      }
    };

    // Listen for storage events to sync token across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_KEY) {
        console.log('Storage event detected:', e.newValue);
        setTokenState(e.newValue); // Only update state, not localStorage
      }
    };

    console.log('Setting up event listeners');
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);

    // Log current token if exists
    const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (currentToken) {
      console.log('Existing token found in localStorage:', currentToken);
    }

    // Cleanup listeners on unmount
    return () => {
      console.log('Cleaning up event listeners');
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 