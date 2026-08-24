import { useQuery } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/userUtils";

export function useAuth() {
  const { data: user, isPending, error, isFetched } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
    networkMode: "always",
  });

  // Never spin forever if the API is down / 503 — treat as logged out
  const isLoading = isPending && !isFetched && !error;

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !error && !!user,
  };
}
