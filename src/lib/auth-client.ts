import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321",
});
