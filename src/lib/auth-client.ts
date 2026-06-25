import { createAuthClient } from "better-auth/react";

// Use the origin the page is actually served from. This avoids baking a
// build-time URL (e.g. localhost) into the client bundle, which breaks the
// deployed site with "Failed to fetch" / mixed-content errors.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321";

export const { signIn, signUp, signOut, useSession } = createAuthClient({ baseURL });
