"use client";

import { useEffect } from "react";
import { notify } from "@/lib/notifications";

export function NetworkStatusNotifier() {
  useEffect(() => {
    const handleOnline = () => {
      notify.success(
        "Conexión restablecida",
        "Has vuelto a conectarte al servidor correctamente. El sistema está en línea."
      );
    };

    const handleOffline = () => {
      notify.warning(
        "Sin conexión a internet",
        "Se ha detectado una pérdida de red. Verifica tu conexión para continuar operando."
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
}
