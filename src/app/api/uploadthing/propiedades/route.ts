import { createRouteHandler } from "uploadthing/next";
import { propiedadesFileRouter } from "./core";

// Endpoint exclusivo para imágenes de propiedades (App UploadThing: Inmobiliariaconte)
export const { GET, POST } = createRouteHandler({
  router: propiedadesFileRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN_PROPIEDADES || process.env.UPLOADTHING_TOKEN,
  },
});
