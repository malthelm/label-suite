import { auth } from "./lib/auth";
import { defineMiddleware } from "astro:middleware";

const publicPaths = ["/", "/login", "/signup", "/api/health"];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const isPublic = publicPaths.includes(path);
  const isAuthApi = path.startsWith("/api/auth");

  if (isPublic || isAuthApi) {
    return next();
  }

  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (!session) {
    return context.redirect("/login");
  }

  (context.locals as any).user = session.user;
  (context.locals as any).session = session.session;

  return next();
});
