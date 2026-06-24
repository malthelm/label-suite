// Temporarily permissive middleware while auth is being set up
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  return next();
});
