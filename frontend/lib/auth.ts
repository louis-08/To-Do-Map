import { useAuth } from "@clerk/nextjs";

export async function getToken(): Promise<string | null> {
  // Used only in server context where needed — client uses useAuth hook
  return null;
}

export function useClerkToken() {
  const { getToken } = useAuth();
  return getToken;
}
