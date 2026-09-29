import Image from "next/image";

export function Footer() {
  return (
    <footer className="relative bg-conte-navy text-slate-200 font-sans shrink-0 border-t border-slate-800/50">
      {/* Línea superior con el verde sólido corporativo */}
      <div className="h-2 w-full bg-conte-green" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Columna 1: Identidad de Inmobiliaria CONTÉ C.A */}
          <div className="md:col-span-7 space-y-3.5">
            <div className="flex items-center gap-3.5">
              <div className="p-2 rounded-xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center">
                <Image
                  src="/Logo.png"
                  alt="Inmobiliaria CONTÉ C.A"
                  width={130}
                  height={125}
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-heading text-white leading-tight tracking-tight">
                  Inmobiliaria CONTÉ C.A
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-emerald-400 mt-0.5">
                  Sistema de Gestión Inmobiliaria
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-xl">
              Soluciones inmobiliarias integrales, administración transparente de propiedades, 
              control de contratos de arrendamiento y atención de primer nivel.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-500/30 text-emerald-300">
                Residencial & Comercial
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700/60 text-slate-200">
                Transparencia & Respaldo
              </span>
            </div>
          </div>

          {/* Columna 2: Tarjeta del Desarrollador y Contacto */}
          <div className="md:col-span-5 flex flex-col justify-center space-y-2.5">
            <div className="bg-slate-900/60 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shadow-lg space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Desarrollado por:
                </span>
                <p className="text-base sm:text-lg font-bold font-heading text-white mt-0.5">
                  Juan Alvarez
                </p>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  Desarrollo de Sistemas & Soluciones de Software
                </p>
              </div>

              {/* Botones de contacto */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {/* Botón WhatsApp */}
                <a
                  href="https://wa.me/584129164371"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Contactar a Juan Alvarez por WhatsApp"
                  className="group flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 fill-current shrink-0 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.031 2C6.495 2 2 6.495 2 12.031c0 1.808.479 3.567 1.39 5.123L2 22l4.98-1.341a9.98 9.98 0 005.051 1.372h.005c5.532 0 10.027-4.495 10.027-10.031C22.063 6.495 17.568 2 12.031 2zm0 18.337c-1.545 0-3.056-.416-4.37-1.203l-.314-.186-3.25.875.87-3.167-.203-.324a8.318 8.318 0 01-1.272-4.298c0-4.603 3.746-8.349 8.349-8.349 2.23 0 4.327.869 5.903 2.446a8.307 8.307 0 012.441 5.903c0 4.604-3.746 8.349-8.354 8.349z" />
                    <path d="M16.904 14.545c-.267-.134-1.58-.78-1.825-.87-.245-.089-.423-.134-.602.134-.178.267-.69 1.134-.846 1.312-.156.178-.312.2-.579.067-.267-.134-1.127-.416-2.147-1.325-.794-.707-1.33-1.58-1.486-1.848-.156-.267-.016-.412.118-.545.12-.12.267-.312.4-.468.134-.156.178-.267.267-.445.089-.178.045-.334-.022-.468-.067-.134-.602-1.448-.824-1.984-.216-.522-.435-.451-.602-.46-.156-.008-.334-.01-.512-.01-.178 0-.468.067-.713.334-.245.267-.935.913-.935 2.227 0 1.314.957 2.583 1.09 2.762.134.178 1.884 2.876 4.564 4.033.638.275 1.136.44 1.525.564.64.204 1.223.175 1.684.106.514-.077 1.58-.646 1.803-1.27.223-.624.223-1.159.156-1.27-.067-.111-.245-.178-.512-.312z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>

                {/* Botón Instagram sobrio corporativo */}
                <a
                  href="https://instagram.com/Juanjalvarezz"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Perfil de Instagram de Juan Alvarez"
                  className="group flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 transition-all shadow-sm cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 fill-current shrink-0 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>Instagram</span>
                </a>
              </div>
            </div>

            {/* Atribución al pie de la card */}
            <p className="text-xs text-slate-400 text-center sm:text-right pr-1">
              Diseño & Plataforma Web por{" "}
              <span className="font-bold text-white">Juan Alvarez</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
