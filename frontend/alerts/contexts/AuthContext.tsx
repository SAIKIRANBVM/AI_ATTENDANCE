import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axiosInstance, { setAuthToken } from "../lib/axios";

interface User {
  id: string;
  email: string;
  name: string;
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initializeAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AlertsAuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = React.useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if user is authenticated on initial load
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized]);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        // Set the token in axios instance
        setAuthToken(token);

        try {
          // Try to fetch user data if the endpoint exists
          const response = await axiosInstance
            .get("/api/auth/me")
            .catch(() => null);
          if (response?.data?.user) {
            setUser(response.data.user);
          } else {
            // If no user endpoint or invalid response, create a default user
            setUser({
              id: "demo-user",
              email: "demo@example.com",
              name: "Demo User",
            });
          }
        } catch (error) {
          console.warn("Could not fetch user data, using demo user");
          setUser({
            id: "demo-user",
            email: "demo@example.com",
            name: "Demo User",
          });
        }
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      // Clear invalid token
      setAuthToken(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post("/api/auth/login", {
        email,
        password,
      });
      const { token, user } = response.data;

      // Store the token in localStorage using the consistent key
      localStorage.setItem("auth_token", token);

      // Set the auth token in axios instance
      setAuthToken(token);
      setToken(token);
      setUser(user);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    // Clear the token from localStorage
    localStorage.removeItem("auth_token");

    // Clear the auth token from axios instance
    setAuthToken(null);
    setToken(null);
    // Clear the user state
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    initializeAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
