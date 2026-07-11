import { useQuery } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/userUtils";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser>({
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
