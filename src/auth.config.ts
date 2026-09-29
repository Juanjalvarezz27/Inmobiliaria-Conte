import type { NextAuthConfig } from "next-auth";
import { Rol } from "@prisma/client";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/home/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // --- Protección de endpoints API ---
      if (pathname.startsWith("/api")) {
        // Endpoints de autenticación de NextAuth siempre accesibles
        if (pathname.startsWith("/api/auth")) return true;

        // Cualquier otro endpoint sin sesión activa → 401
        if (!isLoggedIn) {
          return Response.json(
            { error: "No autorizado. Se requiere una sesión activa." },
            { status: 401 }
          );
        }
        return true;
      }

      // --- Protección de páginas públicas ---
      // Las rutas de login (/ y /home/login) son las únicas públicas
      const isPublicPage = pathname === "/" || pathname === "/home/login";

      // Función auxiliar para obtener la URL de destino según el rol
      const getRoleDashboard = (rol?: string) => {
        if (rol === "ADMIN") return "/admin/dashboard";
        if (rol === "EMPLEADO") return "/empleado/dashboard";
        if (rol === "INQUILINO") return "/inquilino/dashboard";
        return "/home/dashboard";
      };

      // Usuario con sesión intentando entrar al login → redirigir a su dashboard correspondiente
      if (isLoggedIn && isPublicPage) {
        return Response.redirect(new URL(getRoleDashboard(auth?.user?.rol), nextUrl));
      }

      // Usuario sin sesión en cualquier ruta privada → redirigir al login
      if (!isLoggedIn && !isPublicPage) {
        return false; // NextAuth redirige automáticamente a pages.signIn
      }

      // --- Protección granular por rol (RBAC) para usuarios autenticados ---
      if (isLoggedIn) {
        const userRole = auth?.user?.rol;

        // Si intentan entrar a /home/dashboard genérico, redirigir a su portal específico
        if (pathname === "/home/dashboard" || pathname === "/home") {
          return Response.redirect(new URL(getRoleDashboard(userRole), nextUrl));
        }

        // Rutas de Administrador: Acceso exclusivo a ADMIN
        if (pathname.startsWith("/admin") && userRole !== "ADMIN") {
          return Response.redirect(new URL(getRoleDashboard(userRole), nextUrl));
        }

        // Rutas de Empleado: Acceso a EMPLEADO y ADMIN
        if (pathname.startsWith("/empleado") && userRole !== "EMPLEADO" && userRole !== "ADMIN") {
          return Response.redirect(new URL(getRoleDashboard(userRole), nextUrl));
        }

        // Rutas de Inquilino: Acceso a INQUILINO y ADMIN
        if (pathname.startsWith("/inquilino") && userRole !== "INQUILINO" && userRole !== "ADMIN") {
          return Response.redirect(new URL(getRoleDashboard(userRole), nextUrl));
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
        token.nombre = user.nombre;
        token.apellido = user.apellido;
        token.cedula = user.cedula;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.rol = token.rol as Rol;
        session.user.nombre = (token.nombre as string) ?? session.user.name;
        session.user.apellido = token.apellido as string | null | undefined;
        session.user.cedula = token.cedula as string | null | undefined;
      }
      return session;
    },
  },
  providers: [],
};
