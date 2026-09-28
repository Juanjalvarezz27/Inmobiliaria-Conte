export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior (Navbar) */}
      <header className="bg-brand-navy text-white px-8 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold text-xl tracking-tight">
            Inmobiliaria Conte
          </span>
        </div>
        <span className="text-sm font-medium text-brand-gray bg-white/10 px-3 py-1 rounded-full">
          Portal Inmobiliario
        </span>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Sistema de Diseño & Colores de Marca
          </h1>
          <p className="text-brand-gray mt-1 text-base">
            Paleta de colores corporativos integrada directamente en Tailwind CSS.
          </p>
        </div>

        {/* Muestrario de paleta de colores */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray/15">
            <div className="h-14 rounded-lg bg-brand-navy mb-3"></div>
            <h3 className="font-semibold text-sm">Azul Marino</h3>
            <p className="text-xs text-brand-gray mt-1">#1C2539 • bg-brand-navy</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray/15">
            <div className="h-14 rounded-lg bg-brand-gray mb-3"></div>
            <h3 className="font-semibold text-sm">Gris Corporativo</h3>
            <p className="text-xs text-brand-gray mt-1">#707378 • text-brand-gray</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray/15">
            <div className="h-14 rounded-lg bg-brand-green mb-3"></div>
            <h3 className="font-semibold text-sm">Verde Inmobiliaria</h3>
            <p className="text-xs text-brand-gray mt-1">#175E38 • bg-brand-green</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-gray/15">
            <div className="h-14 rounded-lg bg-brand-red mb-3"></div>
            <h3 className="font-semibold text-sm">Rojo Inmobiliaria</h3>
            <p className="text-xs text-brand-gray mt-1">#CC1A22 • bg-brand-red</p>
          </div>
        </section>

        {/* Ejemplo práctico de tarjeta de propiedad y semáforo de cobranza */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray/15 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-brand-gray/10 pb-4">
            <div>
              <h2 className="text-xl font-bold">
                Departamento Edificio Bellavista #402
              </h2>
              <p className="text-sm text-brand-gray">
                Avenida Libertador 1240, Santiago Centro
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-green/10 text-brand-green border border-brand-green/20">
                Pagado
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-red/10 text-brand-red border border-brand-red/20">
                Vencido
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-brand-gray">
              Estado de cobranza mensual y gestión del contrato.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-brand-red text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Cancelar Contrato
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-brand-green text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}