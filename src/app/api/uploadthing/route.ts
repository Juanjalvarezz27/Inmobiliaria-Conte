import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Manejador de rutas API para UploadThing (GET y POST)
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
