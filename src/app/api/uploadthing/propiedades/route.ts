import { createRouteHandler } from "uploadthing/next";
import { propiedadesFileRouter } from "./core";

// Endpoint exclusivo para el bucket de propiedades (token UPLOADTHING_TOKEN_PROPIEDADES)
export const { GET, POST } = createRouteHandler({
  router: propiedadesFileRouter,
});
