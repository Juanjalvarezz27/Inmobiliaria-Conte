import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Excluir assets de Next.js y las rutas de UploadThing (sus callbacks son server-to-server, sin cookie de sesión)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/uploadthing|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
