import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  ready: boolean; 
}

const AUTH_TOKEN_KEY = 'auth_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
console.log(`The authContext value in authContext.tsx file: ${AuthContext}`)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  });
  const [ready, setReady] = useState(false);

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
    setReady(true);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received postMessage event:', event);
      console.log('Event origin:', event.origin);
      console.log('Event data:', event.data);


      if (event.data?.type === 'AUTH_TOKEN' && event.data?.token) {
        const receivedToken = event.data.token;
        console.log('Received token from postMessage:', receivedToken);
        
        setToken(receivedToken);
      } else {
        console.log('Invalid message format:', event.data);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_KEY) {
        console.log('Storage event detected:', e.newValue);
        setTokenState(e.newValue); 
      }
    };

    console.log('Setting up event listeners');
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);

    setReady(true);

    const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (currentToken) {
      console.log('Existing token found in localStorage:', currentToken);
    }

    return () => {
      console.log('Cleaning up event listeners');
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, ready }}>
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