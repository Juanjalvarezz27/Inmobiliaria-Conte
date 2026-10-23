import { PrismaClient } from "@prisma/client";

// Singleton pattern para evitar múltiples conexiones en desarrollo con HMR de Next.js
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

  // Filtrar desconexiones rutinarias por reposo de Neon Serverless (E57P01 / administrator command / idle timeout)
  // para evitar ruido y falsas alarmas en la consola
  client.$on("error", (e) => {
    const msg = e.message || "";
    if (
      msg.includes("administrator command") ||
      msg.includes("E57P01") ||
      msg.includes("closed the connection unexpectedly") ||
      msg.includes("kind: Closed") ||
      msg.includes("kind: UnexpectedEof") ||
      msg.includes("Closed, cause: None")
    ) {
      return;
    }
    console.error("[Prisma Error]:", msg);
  });

  client.$on("warn", (e) => {
    const msg = e.message || "";
    if (
      msg.includes("administrator command") ||
      msg.includes("kind: Closed")
    ) {
      return;
    }
    console.warn("[Prisma Warning]:", msg);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Mantener siempre la instancia en globalThis para evitar fugas de conexiones en Serverless / HMR
globalForPrisma.prisma = prisma;
