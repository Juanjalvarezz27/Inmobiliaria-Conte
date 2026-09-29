import { Montserrat, Poppins } from "next/font/google";

// Fuente para texto del cuerpo y lectura general
export const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

// Fuente para títulos y encabezados
export const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});
