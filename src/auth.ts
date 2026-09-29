import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // Consulta con select mínimo para optimizar uso de memoria
        const user = await prisma.usuario.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            nombre: true,
            apellido: true,
            cedula: true,
            rol: true,
            activo: true,
          },
        });

        // Validar si el usuario existe y si su cuenta está activa
        if (!user || !user.activo) {
          return null;
        }

        // Validar contraseña con bcrypt
        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          cedula: user.cedula,
          rol: user.rol,
        };
      },
    }),
  ],
});
