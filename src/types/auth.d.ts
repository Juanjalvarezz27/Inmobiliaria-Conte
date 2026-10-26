import { Rol, CargoEmpleado } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    rol?: Rol;
    nombre?: string;
    apellido?: string | null;
    cedula?: string | null;
    cargo?: CargoEmpleado | null;
  }

  interface Session {
    user: {
      id: string;
      rol: Rol;
      nombre: string;
      apellido?: string | null;
      cedula?: string | null;
      cargo?: CargoEmpleado | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    rol?: Rol;
    nombre?: string;
    apellido?: string | null;
    cedula?: string | null;
    cargo?: CargoEmpleado | null;
  }
}
