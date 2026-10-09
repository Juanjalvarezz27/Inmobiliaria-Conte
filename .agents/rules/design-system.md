---
trigger: always_on
---

# Inmobiliaria Conté - Sistema de Diseño Institucional (UI/UX)

Este documento define la regla de diseño oficial, obligatoria y transversal para todas las vistas, modales, formularios y componentes del sistema Inmobiliaria Conté (tanto en Desktop como en Mobile). 
Debe aplicarse de manera estricta y consistente en todos los módulos existentes y en las siguientes fases del roadmap (Inquilinos, Contratos, Cobranzas, Mantenimientos y Reportes).


## 1. Identidad de Color y Tokens Visuales

- **Color Primario Institucional (Verde Esmeralda `#175E38`)**:
  - Botones principales y acciones afirmativas: `bg-[#175E38]` con hover `hover:bg-[#124b2d]`.
  - Gradiente en botones de confirmación/guardar: `bg-gradient-to-r from-[#175E38] to-[#124b2d]`.
  - Relieve 3D inferior en botones primarios: `border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5`.
  - Insignias de paso y badges destacados: `bg-[#175E38] text-white`.
  - Focus Ring en inputs y selectores: `focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]`.
  - Sombras con acento de color: `shadow-[0_2px_8px_rgba(23,94,56,0.25)]`.

- **Color Secundario (Azul Marino Ejecutivo `#1C2539`)**:
  - Encabezados principales, botones secundarios destacados y barras de navegación: `#1C2539`.
  - Botones de acción complementaria: `bg-[#1C2539] text-white hover:bg-[#2a3754]`.
  - Badges oscuros de conteo y subtítulos institucionales: `bg-[#1C2539] text-white`.

- **Color de Alerta y Eliminación (Rojo Institucional `#CC1A22`)**:
  - Botones destructivos y modales de borrado: `bg-[#CC1A22] hover:bg-[#a81219] text-white`.
  - Badges de morosidad o inactividad: `bg-rose-50 text-rose-700 border-rose-200`.

- **Fondos y Superficies**:
  - Fondo general de la plataforma: `#F1F5F9` (`var(--color-conte-bg)`).
  - Paneles y modales: blanco puro con bordes finos `border-slate-200/90`.
  - Tarjetas y contenedores con gradiente sutil: `bg-gradient-to-b from-white via-white to-slate-50/60`.
## 2. Tarjetas de Vista Principal (Cards Grid Pattern)

Toda pantalla principal de catálogo o gestión debe renderizar tarjetas visuales de alto impacto con las siguientes características obligatorias:

1. **Efecto Sol / Resplandor Ambiental en Esquina Superior Izquierda**:
   - Elemento decorativo flotante compuesto por 3 capas concéntricas:
     - Resplandor difuminado: `blur-xl bg-[color]/20`.
     - Anillo intermedio con borde fino: `rounded-full border border-[color]/25 bg-[color]/[0.08]`.
     - Núcleo con gradiente que se amplía en hover: `bg-gradient-to-br from-[color]/25 to-transparent transition-transform duration-500 group-hover:scale-125`.
2. **Estructura y Borde 3D**:
   - Bordes redondeados: `rounded-2xl`.
   - Borde sutil general con relieve inferior acentuado: `border border-slate-200/90 border-b-[3px] border-b-slate-300/90`.
   - Sombra compuesta con elevación interactiva: `shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300`.
3. **Cabecera de la Tarjeta**:
   - Badge de tipología o estado a la izquierda con icono temático.
   - **Acciones Rápidas en la Esquina Superior Derecha**:
     - Botón Editar: Cuadrado suave en azul pastel `w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:scale-105 active:scale-95`.
     - Botón Eliminar: Cuadrado suave en rosa pastel `w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/90 hover:bg-rose-100 hover:scale-105 active:scale-95`.
     - Tooltips flotantes oscuros con micro-animación `group-hover:opacity-100`.
4. **Contacto y WhatsApp**:
   - Enlace directo a WhatsApp con icono oficial `WhatsAppIcon` (`w-3.5 h-3.5 text-[#25D366]`), enlace `https://wa.me/[numero]` y micro-animación `hover:scale-105 active:scale-95`.
5. **Footer de Acciones (Grid 50/50 de 2 Columnas)**:
   - **Prohibido** amontonar botones o usar anchos variables que se desborden en pantallas estrechas.
   - Se debe usar siempre una cuadrícula de 2 columnas de igual ancho:
     ```tsx
     <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
       <button className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5">
         <Icon className="w-3.5 h-3.5 shrink-0" />
         <span className="truncate">Ver Detalles</span>
       </button>
       <button className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5">
         <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
         <span className="truncate">Acción Principal</span>
       </button>
     </div>
     ```

---

## 3. Acordeón Desplegable para Listados Agrupados (Smooth Grid Accordion Pattern)

Para mostrar entidades jerárquicas (por ejemplo: Inmueble con sus Espacios, o Inquilino con sus Contratos):

1. **Cabecera del Acordeón**:
   - Efecto Sol ambiental en la esquina superior izquierda.
   - Icono institucional del contenedor en caja redondeada con fondo blanco `bg-white/95 border border-slate-200/90 shadow-2xs`.
   - Título en negro profundo `font-black text-black font-heading tracking-tight`.
   - Badges informativos compactos integrados debajo del título (conteo total, disponibles, alquilados).
   - **Distribución de Acciones en la Cabecera**:
     - **Extremo izquierdo**: Botón desplegable ("Ver detalles" / "Cerrar") con icono chevron que rota 180° (`rotate-180`).
     - **Extremo derecho**: Botón de acción rápida verde (`#175E38`) con `e.stopPropagation()` para que hacer clic en él no active el acordeón.
2. **Animación CSS Grid ultra-fluida (60 FPS)**:
   - **Nunca** usar transiciones basadas en `max-height` (generan tirones y lag visual).
   - Usar la técnica de CSS Grid rows para transiciones nativas perfectas:
     ```tsx
     <div className={`grid transition-all duration-300 ease-in-out ${
       estaDesplegada ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
     }`}>
       <div className="overflow-hidden">
         {/* Contenido interior (tarjetas, paginación, etc.) */}
       </div>
     </div>
     ```
3. **Carga Diferida Inteligente (Lazy Mounting)**:
   - No renderizar imágenes ni DOM pesado en grupos cerrados. Mantener un registro `cargados[id] = true` tras el primer clic para evitar descargas innecesarias en el primer renderizado.
4. **Paginación Local**:
   - Bloques de 15 elementos por página con botones anterior/siguiente, números de página activos en verde esmeralda y elipses (`···`).

---

## 4. Formularios Modales y Componentes de Entrada (Form Pattern)

Usar siempre el componente `<Modal />` (`@/components/ui/modal`):

1. **Cabecera del Modal**:
   - `headerVariant="green"` para altas y ediciones ordinarias (`bg-[#175E38]`).
   - `headerVariant="red"` para modales de confirmación de borrado (`bg-[#CC1A22]`).
   - Efecto Sol en la esquina superior derecha (`blur-xl` y círculos concéntricos).
   - Título con icono temático al lado. Sin subtítulos redundantes.
2. **Secciones con Pasos**:
   - Usar `<FormSectionHeader step={1} title="..." />` (`@/components/ui/form-section-header`).
   - Divisor degradado con fade lateral: `h-px bg-gradient-to-r from-slate-200/40 via-slate-400 to-slate-200/40`.
   - Número de paso en caja redondeada esmeralda: `w-6 h-6 rounded-lg bg-[#175E38] text-white font-black text-xs`.
3. **Distribución en Cuadrícula (Form Grid)**:
   - Para maximizar el espacio útil en pantalla sin obligar al usuario a hacer scroll infinito, usar layout de 2 columnas: `grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4`.
   - Campos de texto largo (descripciones, notas) en ancho completo: `sm:col-span-2`.
4. **Selector Telefónico Internacional**:
   - Usar siempre `<PhoneInput />` (`@/components/ui/phone-input`):
   - Selector de código de país con banderas (Venezuela `+58`, USA `+1`, Colombia `+57`, España `+34`, etc.).
   - Validación y limpieza automática de caracteres no numéricos.
5. **Selector Híbrido (`<Select />`)**:
   - Usar siempre `<Select />` (`@/components/ui/select`):
   - **Desktop (`>= md`)**: Menú flotante animado, con sombra profunda, check esmeralda en opción seleccionada y soporte para cerrar con `Escape` o clic afuera.
   - **Móvil (`< md`)**: Selector nativo transparente superpuesto que invoca la rueda táctil nativa de iOS o el menú táctil de Android.
6. **Carga Multimedia con UploadThing**:
   - Zona de subida (Dropzone) compacta con bordes punteados `border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/80`.
   - Cuadrícula de fotos cargadas con previsualización en miniatura (`aspect-square`), botón flotante de eliminación `Trash2` sobre fondo oscuro con blur y badge de cantidad.
7. **Microcopy Conciso**:
   - Placeholders de máximo 1 o 2 palabras (`Ej: Local 10`, `Ej: 150`, `Ej: San Cristóbal`).
8. **Botones de Acción Inferiores**:
   - **Móvil**: `grid grid-cols-2 gap-2.5 w-full h-11`. Mismo tamaño horizontal sin desbordes.
   - **Desktop**: Centrados `sm:flex sm:items-center sm:justify-center gap-3`, con `min-w-[130px]` para Cancelar y `min-w-[180px]` para Guardar.
   - Botón Guardar con relieve 3D `border-b-[3px] border-b-[#0e3a23]` y gradiente esmeralda.

---

## 5. Modal de Visor de Detalles y Galería de Fotos

Para vistas previas rápidas sin salir de la pantalla (Quick View):

1. **Visor de Fotos Principal**:
   - Contenedor con relación de aspecto cinematográfica `aspect-[16/9]` y fondo oscuro `bg-slate-950`.
   - Imagen en `object-contain` para apreciar planos o fotografías sin recortes distorsionados.
   - Controles circulares de navegación anterior/siguiente con efecto de cristal esmerilado: `bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs w-9 h-9 rounded-full`.
   - Contador de imagen activa flotante en esquina inferior derecha (`1 de 6`).
2. **Tira de Miniaturas Horizontales**:
   - Miniaturas rectangulares `w-20 h-14 rounded-xl overflow-hidden`.
   - La foto activa se resalta con borde institucional: `border-2 border-[#175E38] ring-2 ring-[#175E38]/20 scale-102`.
3. **Métricas Clave en Cajas de Datos**:
   - Cuadrícula de 4 tarjetas de datos clave (`grid grid-cols-2 sm:grid-cols-4 gap-3`).
   - Fondo suave `bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5`.
   - Etiqueta superior en mayúsculas pequeñas: `text-[11px] font-semibold text-slate-400 uppercase tracking-wider`.
   - Valor numérico o estado en tipografía Poppins destacada: `text-base sm:text-lg font-black text-slate-900 font-heading`.

---

## 6. Tarjetas de Estadísticas Ejecutivas (StatCards)

Usar siempre el componente `<StatCard />` (`@/components/ui/stat-card`):
- Efecto **Sol / Resplandor Ambiental** en la esquina superior izquierda.
- Borde fino con relieve 3D inferior: `border-b-[3px] border-b-slate-300/90`.
- Hover con elevación suave: `hover:-translate-y-1.5 duration-300`.
- Icono en caja redondeada `rounded-xl`.
- Cifras en tipografía destacada: `text-2xl sm:text-3xl font-extrabold font-heading text-slate-900`.
- Soporte para variantes de color temático: `emerald`, `navy`, `indigo`, `blue`, `amber`, `red`.

---

## 7. Estándares Obligatorios de Responsividad Móvil (Mobile-First)

Para garantizar que el sistema funcione impecablemente en teléfonos y tablets:

1. **Regla de Oro de Botones en Móvil**:
   - Los pares de botones ("Guardar" y "Cancelar", o "Ver Espacios" y "Añadir Espacio") deben usar siempre `grid grid-cols-2 gap-2` o `gap-2.5`.
   - **Nunca** colocar botones apilados asimétricamente o con anchos que excedan el viewport de 320px–375px.
2. **Alturas Táctiles Mínimas**:
   - Todo botón o input interactivo debe tener una altura mínima de `h-10` (40px) o `h-11` (44px) para ser cómodamente pulsable con el pulgar.
3. **Gestión de Textos Largos**:
   - Usar siempre `truncate` o `line-clamp-1` / `line-clamp-2` en títulos y subtítulos móviles.
   - En botones con texto e iconos, mantener el texto conciso o utilizar utilidades responsivas (`<span className="hidden sm:inline">...</span>`).
4. **Despliegues y Menús Flotantes**:
   - Los menús contextuales en tarjetas (por ejemplo, el menú flotante de cambio rápido de estado) deben abrirse hacia arriba (`bottom-full pb-1.5`) para no salirse de la pantalla en dispositivos móviles y cerrarse automáticamente al hacer clic en cualquier otra parte.

---

## 8. Desplegables de Filtro Institucionales (Compound Hybrid Dropdown Pattern)

Todo filtro desplegable en barras de herramientas, catálogos o cabeceras (por ejemplo: Selector de Inmueble, Selector de Tipología, Selector de Estado, etc.) debe implementar de manera obligatoria el patrón híbrido de alta fidelidad:

1. **Botón Disparador (Trigger)**:
   - Contenedor con ancho responsivo: `w-full md:w-60` o `md:w-64`.
   - Altura estándar alineada con el input de búsqueda: `h-11` (o `h-10 sm:h-11`).
   - Borde sutil y fondo limpio: `border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer`.
   - Focus Ring institucional: `focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20`.
   - Lado izquierdo: Icono temático (`Building2`, `Layers`, `Clock`, etc.) en `text-slate-500 shrink-0` y texto truncado de la opción seleccionada.
   - Lado derecho: Icono `ChevronDown` en `text-slate-400 shrink-0` con micro-animación de rotación de 180° al abrir (`rotate-180`).

2. **Capa Táctil Nativa para Móviles (`< md`)**:
   - Superponer un elemento nativo `<select>` transparente:
     ```tsx
     <select
       value={valorFiltro}
       onChange={(e) => handleCambio(e.target.value)}
       className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
       aria-label="Filtrar opción"
     >
       <option value="TODOS">Todos ({total})</option>
       {opciones.map((opt) => (
         <option key={opt.id} value={opt.id}>
           {opt.label} ({opt.count})
         </option>
       ))}
     </select>
     ```
   - Garantiza que en pantallas táctiles (iOS y Android) se active el picker/rueda nativa del sistema operativo con soporte táctil ergonómico sin desbordamientos de pantalla.

3. **Menú Flotante Desktop (`>= md`)**:
   - Flotante animado: `hidden md:block absolute right-0 top-full mt-1.5 w-64 (o w-68) bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-72 overflow-y-auto`.
   - **Opción Global ("Todos...")**:
     - Primera opción con icono temático general (`Building2` o `Layers`).
     - Badge numérico en píldora con el total de registros: `bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[11px] font-medium`.
     - Check verde esmeralda institucional (`<Check className="w-3.5 h-3.5 text-[#175E38]" />`) cuando está seleccionada.
     - Divisor tenue inferior: `<div className="my-1 border-t border-slate-100" />`.
   - **Opciones Específicas**:
     - Icono temático a la izquierda en `text-slate-400 shrink-0`.
     - Tipografía a 1 o 2 líneas: Nombre principal en `font-medium` y subtítulo secundario en `text-[10px] text-slate-400` (ej: ciudad o tipología).
     - Píldora de conteo con la cifra dinámica individual.
     - Check verde esmeralda si la opción está seleccionada.
     - Estados de color:
       - Activo: `bg-slate-50 text-slate-900 font-semibold`.
       - Inactivo: `text-slate-600 hover:bg-slate-50 hover:text-slate-900`.

4. **Control de Cierre y Concurrencia**:
   - Detección de clic exterior (`mousedown`) con `useRef` y tecla `Escape` (`keydown`).
   - Al abrir un dropdown, cerrar automáticamente cualquier otro dropdown adyacente para evitar superposiciones visuales.

