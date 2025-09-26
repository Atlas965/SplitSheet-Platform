import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  subscriptionTier?: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !isLoading && !error && !!user,
  };
}
