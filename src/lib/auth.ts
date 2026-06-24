import "dotenv/config";
import { betterAuth } from "better-auth";

// Minimal auth setup — uses in-memory DB for dev
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:4321", "https://label-suite.truenature.online"],
});

export type Auth = typeof auth;
