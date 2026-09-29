import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/home/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboardRoute = nextUrl.pathname.startsWith("/home/dashboard");
      const isLoginRoute = nextUrl.pathname === "/home/login";

      // Proteger rutas de dashboard contra usuarios anónimos
      if (isDashboardRoute) {
        return isLoggedIn;
      }

      // Si ya tiene sesión activa y visita login, redirigir a dashboard
      if (isLoginRoute && isLoggedIn) {
        return Response.redirect(new URL("/home/dashboard", nextUrl));
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
        session.user.rol = token.rol as any;
        session.user.nombre = (token.nombre as string) ?? session.user.name;
        session.user.apellido = token.apellido as string | null | undefined;
        session.user.cedula = token.cedula as string | null | undefined;
      }
      return session;
    },
  },
  providers: [],
};
