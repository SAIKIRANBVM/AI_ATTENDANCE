import React, { createContext, useContext } from 'react';

interface AuthContextType {
  token: string | null;
  ready: boolean;
}

// Create a simple auth context that's always authenticated
const AuthContext = createContext<AuthContextType>({
  token: 'dummy-token',
  ready: true
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthContext.Provider value={{ token: 'dummy-token', ready: true }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};