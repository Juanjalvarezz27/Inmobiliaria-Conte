# Inmobiliaria Conté - Sistema de Diseño Institucional (UI/UX)

Este documento define la regla de diseño oficial y obligatoria para todas las vistas, modales y componentes del sistema Inmobiliaria Conté (tanto en Desktop como en Mobile).

---

## 1. Identidad de Color y Tokens Visuales

- **Color Primario Institucional (Verde Esmeralda)**:
  - Botones principales y acciones afirmativas: `bg-[#175E38]` con hover `hover:bg-[#124b2d]`.
  - Gradiente en botones de guardar: `from-[#175E38] to-[#124b2d]`.
  - Relieve 3D inferior en botones primarios: `border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5`.
  - Indicadores / Insignias de paso: `bg-[#175E38] text-white`.
  - Focus Ring en inputs: `focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]`.
- **Color Secundario (Azul Marino Ejecutivo)**:
  - Encabezados y botones secundarios destacados: `#1C2539`.
  - Fondo de tablas e iconos de cabecera: `bg-[#1C2539] text-white`.
- **Fondos y Superficies**:
  - Paneles y modales: blanco puro con bordes finos `border-slate-200/90`.
  - Tarjetas y contenedores con gradiente sutil: `bg-gradient-to-b from-white via-white to-slate-50/70`.

---

## 2. Tarjetas de Estadísticas Ejecutivas (KPIs)

Usar siempre el componente `<StatCard />` (`@/components/ui/stat-card`):
- Efecto **Sol / Resplandor Ambiental** en la esquina superior izquierda con círculos concéntricos y blur.
- Borde fino con relieve 3D inferior: `border-b-[3px] border-b-slate-300/90`.
- Hover con elevación suave: `hover:-translate-y-1.5 duration-300`.
- Icono en caja redondeada `rounded-xl`.
- Cifras en tipografía destacada: `text-2xl sm:text-3xl font-extrabold font-heading text-slate-900`.
- Barra de progreso inferior opcional.

---

## 3. Modales de Acción y Formularios

Usar el componente `<Modal />` (`@/components/ui/modal`):
- **Cabecera**:
  - Fondo institucional verde `bg-[#175E38]` (o navy según el contexto).
  - Efecto Sol / Resplandor en la esquina superior derecha (`blur-xl` y círculos concéntricos).
  - Título con icono Lucide al lado (`icon={<Icon className="w-5 h-5" />}`).
  - **Sin subtítulos redundantes** para maximizar el área visible.
- **Secciones del Formulario**:
  - Usar `<FormSectionHeader step={1} title="..." />` (`@/components/ui/form-section-header`).
  - Divisor degradado con fade lateral: `h-px bg-gradient-to-r from-slate-200/40 via-slate-400 to-slate-200/40`.
  - Número de paso en caja redondeada: `w-6 h-6 rounded-lg bg-[#175E38] text-white font-black`.
- **Campos e Inputs**:
  - Icono izquierdo en `text-slate-400` alineado con `pl-10`.
  - Bordes redondeados: `rounded-xl`.
  - **Microcopy Minimalista**: Placeholders concisos de 1 o 2 palabras (`Ej: Gran Bazar`, `Ej: Caracas`, `Ej: Av. Principal`). No oraciones largas.
- **Botones de Acción Inferiores**:
  - **Móvil**: `grid grid-cols-2 gap-2.5 w-full h-11`. Mismo tamaño exacto, alineados horizontalmente.
  - **Desktop**: Centrados `sm:flex sm:items-center sm:justify-center`, con `min-w-[130px]` para Cancelar y `min-w-[180px]` para Guardar.
  - Botón Guardar con relieve 3D `border-b-[3px] border-b-[#0e3a23]` y gradiente esmeralda.

---

## 4. Barra de Filtros y Búsqueda

- Contenedor con fondo suave `bg-[#1C2539]/[0.03]` y borde `border-[#1C2539]/10`.
- Pestañas con contador numérico en cápsula (`activeTab`).
- Buscador con icono izquierdo y botón `X` de limpieza automática cuando tiene texto.
- **Vista Exclusiva en Tarjetas (Cards Grid)**: Todas las vistas de catálogo (Inmuebles y Espacios) se presentan en tarjetas visuales ricas (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`) con fotografía, badges de tipología y disponibilidad, especificaciones y acciones rápidas, sin botones de alternancia a tabla.

---

## 5. Selectores e Inputs Desplegables (Hybrid Select Pattern)

Usar **siempre** el componente `<Select />` (`@/components/ui/select` o `@/components/ui`):
- **Desktop (`>= md`)**:
  - **Prohibido** usar `<select>` y `<option>` nativos feos sin estilizar.
  - Se despliega un menú flotante personalizado con sombra profunda `shadow-xl`, bordes finos `border-slate-200/90`, focus ring en esmeralda `focus:ring-2 focus:ring-[#175E38]/20` y esquinas redondeadas `rounded-xl`.
  - La opción activa se resalta en verde esmeralda institucional (`bg-emerald-50/80 text-[#175E38] font-bold`) acompañada del icono `<Check className="w-4 h-4 text-[#175E38]" />`.
  - Animación fluida de apertura (`animate-in fade-in zoom-in-95 duration-100`) y cierre al hacer clic afuera (`mousedown`) o con la tecla `Escape`.
- **Móvil (iOS / Android / Pantallas táctiles `< md`)**:
  - Superpone un elemento `<select>` nativo transparente (`md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20`).
  - Al tocarlo en un teléfono o tablet, el sistema operativo activa el **picker nativo** de cada plataforma (la rueda táctil en iOS, el diálogo de selección táctil en Android), garantizando una experiencia de usuario perfecta sin desbordes de pantalla ni problemas de teclado virtual.
- **Soporte de Iconos y Microcopy**:
  - Admite icono decorativo izquierdo (`icon={<Building2 className="w-4 h-4" />}`) manteniendo el padding interno `pl-10`.
  - Placeholder conciso y minimalista cuando no hay valor seleccionado.

