// Permissive middleware — auth will be set up in next iteration
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  return next();
});
