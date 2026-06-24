import { createAuthClient } from "better-auth/react";

// Only import in client context (React islands)
let _client: ReturnType<typeof createAuthClient> | null = null;

export function getAuthClient() {
  if (!_client) {
    _client = createAuthClient();
  }
  return _client;
}

export const { signIn, signUp, signOut, useSession } = createAuthClient();
