import { toast } from "sonner";

export interface NotificationOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Utilidad global de notificaciones personalizadas con título y causa explicativa
export const notify = {
  // Notificación de éxito con título y descripción detallada
  success: (title: string, descriptionOrOptions?: string | NotificationOptions) => {
    const options = typeof descriptionOrOptions === "string"
      ? { description: descriptionOrOptions }
      : descriptionOrOptions;

    return toast.success(title, {
      duration: 4000,
      ...options,
    });
  },

  // Notificación de error con título y motivo específico de la falla
  error: (title: string, descriptionOrOptions?: string | NotificationOptions) => {
    const options = typeof descriptionOrOptions === "string"
      ? { description: descriptionOrOptions }
      : descriptionOrOptions;

    return toast.error(title, {
      duration: 5000,
      ...options,
    });
  },

  // Notificación de advertencia o precaución
  warning: (title: string, descriptionOrOptions?: string | NotificationOptions) => {
    const options = typeof descriptionOrOptions === "string"
      ? { description: descriptionOrOptions }
      : descriptionOrOptions;

    return toast.warning(title, {
      duration: 4500,
      ...options,
    });
  },

  // Notificación informativa de estado
  info: (title: string, descriptionOrOptions?: string | NotificationOptions) => {
    const options = typeof descriptionOrOptions === "string"
      ? { description: descriptionOrOptions }
      : descriptionOrOptions;

    return toast.info(title, {
      duration: 4000,
      ...options,
    });
  },

  // Notificación reactiva vinculada al ciclo de vida de una Promesa asíncrona
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
      description?: (data: T) => string;
    }
  ) => {
    return toast.promise(promise, messages);
  },

  // Cerrar una notificación específica o todas
  dismiss: (toastId?: string | number) => {
    return toast.dismiss(toastId);
  },
};
