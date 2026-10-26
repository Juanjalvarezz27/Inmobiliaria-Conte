// Utilidades de formateo de fecha y hora deterministas
// Eliminan diferencias de espacio en blanco (ICU non-breaking spaces) que disparan errores de hidratación

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Arreglo indexado de 1 a 12 (índice 0 es vacío para acceso 1-based directo)
export const NOMBRES_MESES = [
  "",
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Opciones estandarizadas para componentes <Select />
export const OPCIONES_MESES = MESES.map((label, index) => ({
  value: String(index + 1),
  label,
}));

export const MESES_ABREV = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic"
];

export const DIAS_SEMANA = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

export const DIAS_ABREV = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Obtiene el nombre del mes a partir de su número (1 = Enero, 12 = Diciembre)
export function getNombreMes(mes: number): string {
  if (mes >= 1 && mes <= 12) {
    return MESES[mes - 1];
  }
  return "";
}

// Formatea hora en formato 24 horas: "14:30"
export function formatearHora24(isoStr: string | null | undefined): string {
  if (!isoStr) return "--:--";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "--:--";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "--:--";
  }
}

// Formatea hora en formato 12 horas con espacio ASCII estándar (evita caracteres invisibles U+202F de ICU)
export function formatearHora12(isoStr: string | null | undefined): string {
  if (!isoStr) return "--:--";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "--:--";
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "p. m." : "a. m.";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${strHours}:${minutes} ${ampm}`;
  } catch {
    return "--:--";
  }
}

// Formatea fecha larga determinista: "Miércoles, 21 de Octubre de 2026"
export function formatearFechaLarga(date: Date = new Date()): string {
  try {
    const diaSemana = DIAS_SEMANA[date.getDay()];
    const dia = date.getDate();
    const mes = MESES[date.getMonth()];
    const ano = date.getFullYear();
    return `${diaSemana}, ${dia} de ${mes} de ${ano}`;
  } catch {
    return "";
  }
}

// Formatea fecha corta determinista: "mié, 21 oct"
export function formatearFechaCorta(isoStr: string | null | undefined): string {
  if (!isoStr) return "--";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "--";
    const diaSem = DIAS_ABREV[d.getDay()];
    const diaNum = d.getDate();
    const mes = MESES_ABREV[d.getMonth()];
    return `${diaSem}, ${diaNum} ${mes}`;
  } catch {
    return "--";
  }
}

// Formatea fecha numérica: "21/10/2026"
export function formatearFechaNumerica(isoStr: string | null | undefined): string {
  if (!isoStr) return "--/--/----";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "--/--/----";
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch {
    return "--/--/----";
  }
}

// Formatea fecha en español determinista: "21 de Octubre de 2026"
export function formatearFechaEspanol(isoStr: string | null | undefined): string {
  if (!isoStr) return "--";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "--";
    const dia = d.getDate();
    const mes = MESES[d.getMonth()];
    const ano = d.getFullYear();
    return `${dia} de ${mes} de ${ano}`;
  } catch {
    return "--";
  }
}

// Formatea cabecera para agrupación de eventos por día con detección de Hoy y Ayer
export function formatearCabeceraFecha(isoStr: string | null | undefined): {
  titulo: string;
  esHoy: boolean;
  esAyer: boolean;
  fechaLimpia: string;
} {
  if (!isoStr) {
    return { titulo: "Fecha desconocida", esHoy: false, esAyer: false, fechaLimpia: "Fecha desconocida" };
  }
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      return { titulo: "Fecha inválida", esHoy: false, esAyer: false, fechaLimpia: "Fecha inválida" };
    }

    const ahora = new Date();
    const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const hoyDay = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    const ayerDay = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1).getTime();

    const esHoy = itemDay === hoyDay;
    const esAyer = itemDay === ayerDay;

    const diaSem = DIAS_SEMANA[d.getDay()];
    const diaNum = d.getDate();
    const mes = MESES[d.getMonth()];
    const fechaLimpia = `${diaSem}, ${diaNum} de ${mes}`;

    return {
      titulo: esHoy ? "Hoy" : esAyer ? "Ayer" : fechaLimpia,
      esHoy,
      esAyer,
      fechaLimpia,
    };
  } catch {
    return { titulo: "Fecha desconocida", esHoy: false, esAyer: false, fechaLimpia: "Fecha desconocida" };
  }
}

