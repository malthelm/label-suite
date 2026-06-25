import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321";

export const { signIn, signUp, signOut, useSession } = createAuthClient({ baseURL });
