import { createRouteHandler } from "uploadthing/next";
import { operacionesFileRouter } from "./core";

// Endpoint exclusivo para documentos y contratos en PDF (App UploadThing: conte)
export const { GET, POST } = createRouteHandler({
  router: operacionesFileRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN_OPERACIONES || process.env.UPLOADTHING_TOKEN,
  },
});
