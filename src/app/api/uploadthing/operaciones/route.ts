import { createRouteHandler } from "uploadthing/next";
import { operacionesFileRouter } from "./core";

// Endpoint exclusivo para el bucket de operaciones (token UPLOADTHING_TOKEN_OPERACIONES)
export const { GET, POST } = createRouteHandler({
  router: operacionesFileRouter,
});
