// Cálculo de distancia geográfica en metros entre dos coordenadas (Fórmula de Haversine)
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const RADIO_TIERRA_METROS = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(RADIO_TIERRA_METROS * c);
}

// Formato amigable de distancia para interfaces de usuario
export function formatearDistancia(metros: number): string {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }
  return `${(metros / 1000).toFixed(1)} km`;
}

// Extrae latitud y longitud de cualquier formato o enlace de Google Maps
export function extraerCoordenadasDeTexto(input: string): { lat: number; lon: number } | null {
  if (!input || typeof input !== "string") return null;
  let texto = input.trim();

  // Decodifica secuencias de escape de URLs (ej: %2C para comas)
  try {
    texto = decodeURIComponent(texto);
  } catch {
    // Continuar con el texto original si no es decodificable
  }

  // 1. DMS: 9°18'48.2"N 70°36'25.7"W o variantes con O (Oeste)
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([NSns])[, \t]+(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([EWewEOeo])/;
  const dmsMatch = texto.match(dmsRegex);
  if (dmsMatch) {
    let lat = parseInt(dmsMatch[1], 10) + parseInt(dmsMatch[2], 10) / 60 + parseFloat(dmsMatch[3]) / 3600;
    if (dmsMatch[4].toUpperCase() === "S") lat = -lat;
    let lon = parseInt(dmsMatch[5], 10) + parseInt(dmsMatch[6], 10) / 60 + parseFloat(dmsMatch[7]) / 3600;
    if (dmsMatch[8].toUpperCase() === "W" || dmsMatch[8].toUpperCase() === "O") lon = -lon;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
    }
  }

  // 2. Parámetros embebidos de Google Maps (!3dlat!4dlon)
  const embedMatch = texto.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (embedMatch) {
    const lat = parseFloat(embedMatch[1]);
    const lon = parseFloat(embedMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  // 3. Formato estándar @lat,lon de la barra de direcciones de Google Maps
  const arrobaMatch = texto.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (arrobaMatch) {
    const lat = parseFloat(arrobaMatch[1]);
    const lon = parseFloat(arrobaMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  // 4. Parámetros de consulta ?q=lat,lon o ?ll=lat,lon o query=lat,lon o daddr=lat,lon
  const paramMatch = texto.match(/[?&](?:q|ll|query|daddr)=(-?\d{1,2}\.\d+)(?:,|%2C|\+|\s)+(-?\d{1,3}\.\d+)/i);
  if (paramMatch) {
    const lat = parseFloat(paramMatch[1]);
    const lon = parseFloat(paramMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  // 5. Formato de ruta /place/lat,lon o /place/Nombre/@lat,lon
  const placeMatch = texto.match(/\/place\/(-?\d{1,2}\.\d+)(?:,|%2C|\+|\s)+(-?\d{1,3}\.\d+)/i);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lon = parseFloat(placeMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  // 6. Detección universal de par de coordenadas decimales en cualquier posición del texto
  const coordMatch = texto.match(/(-?\d{1,2}\.\d{3,})(?:,|%2C|\s)+(-?\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  return null;
}
