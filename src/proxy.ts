import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Interceptar TODO: páginas, api y rutas arbitrarias.
  // Solo excluir assets internos de Next.js que nunca necesitan autenticación.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
