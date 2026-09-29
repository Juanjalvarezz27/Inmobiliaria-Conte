"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Rol } from "@prisma/client";
import { LogoutButton } from "@/components/auth/logout-button";

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

interface NavbarUser {
  id: string;
  rol: Rol;
  nombre: string;
  apellido?: string | null;
  cedula?: string | null;
  email?: string | null;
}

interface NavbarProps {
  user: NavbarUser;
}

interface NavItem {
  label: string;
  href: string;
  description?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar menús al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Bloquear scroll de la página cuando el menú móvil esté abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Cerrar menús al cambiar de ruta ajustando estado en render
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }

  // Grupos de navegación de Administrador
  const adminGroups: NavGroup[] = [
    {
      title: "Inmuebles & Contratos",
      items: [
        { label: "Propiedades", href: "/admin/propiedades", description: "Centros comerciales y locales" },
        { label: "Inquilinos", href: "/admin/inquilinos", description: "Directorio de arrendatarios" },
        { label: "Contratos", href: "/admin/contratos", description: "Arrendamientos y ajustes de renta" },
      ],
    },
    {
      title: "Cobranza & Finanzas",
      items: [
        { label: "Panel de Cobranza", href: "/admin/cobranza", description: "Mensualidades y vencimientos" },
        { label: "Facturación & Recibos", href: "/admin/facturacion", description: "Emisión de comprobantes digitales" },
        { label: "Finanzas & Balance", href: "/admin/finanzas", description: "Ingresos, egresos y cierres de mes" },
      ],
    },
    {
      title: "Operaciones",
      items: [
        { label: "Mantenimiento", href: "/admin/mantenimiento", description: "Averías y reparaciones técnicas" },
        { label: "Personal & Asistencia", href: "/admin/personal", description: "Control de equipo y jornada" },
        { label: "Bóveda de Documentos", href: "/admin/documentos", description: "Archivos y contratos legales" },
        { label: "Agenda & Alertas", href: "/admin/agenda", description: "Citas y recordatorios automáticos" },
      ],
    },
  ];

  const empleadoItems: NavItem[] = [
    { label: "Panel Principal", href: "/empleado/dashboard", description: "Resumen de jornada" },
    { label: "Mis Tareas", href: "/empleado/tareas", description: "Pendientes operativos asignados" },
    { label: "Mantenimiento", href: "/empleado/mantenimiento", description: "Averías asignadas para reparar" },
    { label: "Marcaje de Asistencia", href: "/empleado/asistencia", description: "Registro diario de entrada y salida" },
  ];

  const inquilinoItems: NavItem[] = [
    { label: "Estado de Cuenta", href: "/inquilino/dashboard", description: "Resumen de cuenta y pagos" },
    { label: "Historial de Pagos", href: "/inquilino/pagos", description: "Mensualidades y recibos oficiales" },
    { label: "Mi Contrato", href: "/inquilino/contrato", description: "Condiciones de alquiler y copia digital" },
    { label: "Reportar Problema", href: "/inquilino/mantenimiento", description: "Solicitar asistencia por averías" },
  ];

  // Insignias y colores por rol
  const roleBadges: Record<Rol, { label: string; bg: string; border: string; text: string }> = {
    ADMIN: {
      label: "ADMINISTRADOR",
      bg: "bg-amber-400/10",
      border: "border-amber-400/30",
      text: "text-amber-300",
    },
    EMPLEADO: {
      label: "PERSONAL",
      bg: "bg-sky-400/10",
      border: "border-sky-400/30",
      text: "text-sky-300",
    },
    INQUILINO: {
      label: "INQUILINO",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/30",
      text: "text-emerald-300",
    },
  };

  const currentRoleStyle = roleBadges[user.rol] || roleBadges.ADMIN;

  const isLinkActive = (href: string) => {
    return (
      pathname === href ||
      (href !== "/admin/dashboard" &&
        href !== "/empleado/dashboard" &&
        href !== "/inquilino/dashboard" &&
        pathname.startsWith(href))
    );
  };

  // Gris azulado armónico con el fondo marino institucional #1C2539
  const activeRouteClasses = "bg-[#253758] text-white shadow-xs font-semibold border border-[#3C588A]/60";
  const inactiveRouteClasses = "text-slate-200 hover:text-white hover:bg-[#202E4A]/70 hover:border-[#334B76]/50 border border-transparent transition-all";

  return (
    <header className="sticky top-0 z-50 bg-[#1C2539] text-white border-b border-white/10 shadow-lg">
      {/* Contenedor fluido de ancho completo con padding lateral generoso */}
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="flex items-center justify-between h-20">
          
          {/* 1. Logotipo oficial con imagen y nombre (Estático, sin comportamiento de botón ni subtítulo) */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 select-none">
              <Image
                src="/Logo.png"
                alt="Inmobiliaria Conté C.A"
                width={46}
                height={46}
                priority
                className="h-11 w-auto object-contain rounded-lg bg-white p-0.5"
              />
              <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-white">
                Inmobiliaria CONTÉ
              </span>
            </div>

            {/* 2. Navegación Desktop - ADMIN con la paleta de color oficial */}
            {user.rol === "ADMIN" && (
              <nav className="hidden lg:flex items-center gap-2" ref={dropdownRef}>
                <Link
                  href="/admin/dashboard"
                  className={`px-4 py-2 rounded-xl text-sm transition-all duration-150 ${
                    pathname === "/admin/dashboard" ? activeRouteClasses : inactiveRouteClasses
                  }`}
                >
                  Inicio
                </Link>

                {adminGroups.map((group) => {
                  const hasActiveChild = group.items.some((item) => isLinkActive(item.href));
                  const isOpen = activeDropdown === group.title;

                  return (
                    <div key={group.title} className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveDropdown(isOpen ? null : group.title)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all duration-150 cursor-pointer ${
                          hasActiveChild || isOpen ? activeRouteClasses : inactiveRouteClasses
                        }`}
                      >
                        <span>{group.title}</span>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown flotante en gris azulado sobre fondo marino */}
                      {isOpen && (
                        <div className="absolute left-0 mt-2.5 w-76 rounded-2xl bg-[#162134]/98 backdrop-blur-2xl border border-[#2D4166] shadow-2xl p-2 space-y-0.5 z-50 animate-fadeIn">
                          {group.items.map((item) => {
                            const active = isLinkActive(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setActiveDropdown(null)}
                                className={`block px-3.5 py-2 rounded-xl transition-all duration-150 ${
                                  active
                                    ? "bg-[#253758] text-white font-semibold shadow-xs border border-[#3C588A]/60"
                                    : "text-slate-200 hover:bg-[#202E4A]/80 hover:text-white"
                                }`}
                              >
                                <div className="text-sm font-semibold text-white">{item.label}</div>
                                {item.description && (
                                  <div className="text-xs text-slate-300 mt-0.5 truncate">
                                    {item.description}
                                  </div>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            )}

            {/* Navegación Desktop - EMPLEADO */}
            {user.rol === "EMPLEADO" && (
              <nav className="hidden lg:flex items-center gap-2">
                {empleadoItems.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-2 rounded-xl text-sm transition-all duration-150 ${
                        active ? activeRouteClasses : inactiveRouteClasses
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Navegación Desktop - INQUILINO */}
            {user.rol === "INQUILINO" && (
              <nav className="hidden lg:flex items-center gap-2">
                {inquilinoItems.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-2 rounded-xl text-sm transition-all duration-150 ${
                        active ? activeRouteClasses : inactiveRouteClasses
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* 3. Área de Usuario y Botón de Salir Rojo #CC1A22 */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex flex-col text-right pl-4 border-l border-white/10 select-none">
              <span className="text-sm font-semibold text-white leading-tight">
                {user.nombre} {user.apellido || ""}
              </span>
              <span
                className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider border w-fit mt-1 self-end ${currentRoleStyle.bg} ${currentRoleStyle.border} ${currentRoleStyle.text}`}
              >
                {currentRoleStyle.label}
              </span>
            </div>

            {/* Botón de Cerrar Sesión en Rojo vibrante institucional #CC1A22 */}
            <LogoutButton variant="red" />
          </div>

          {/* 4. Botón Hamburger Móvil */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none cursor-pointer border border-white/10"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Móvil montado en Portal para garantizar visibilidad libre de Stacking Context */}
      {isMounted && mobileMenuOpen && createPortal(
        <div className="lg:hidden fixed inset-x-0 top-20 bottom-0 z-40 bg-[#1C2539] border-t border-white/10 overflow-y-auto animate-fadeIn">
          <div className="p-4 sm:p-6 space-y-5 max-w-md mx-auto pb-24">
            
            {/* 1. Tarjeta Ejecutiva de Usuario */}
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-[#202E4A] to-[#1A253C] border border-[#2D4166] rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#253758] border border-[#3C588A]/60 flex items-center justify-center shrink-0 shadow-inner">
                  <svg className="w-5 h-5 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white tracking-tight truncate">
                    {user.nombre} {user.apellido || ""}
                  </div>
                  {user.email && (
                    <div className="text-xs text-slate-300 truncate mt-0.5 font-normal">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider border uppercase ml-2 ${currentRoleStyle.bg} ${currentRoleStyle.border} ${currentRoleStyle.text}`}>
                {currentRoleStyle.label}
              </span>
            </div>

            {/* 2. Navegación por Rol */}
            {user.rol === "ADMIN" && (
              <div className="space-y-4">
                {/* Enlace Inicio exactamente idéntico al desktop */}
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                    pathname === "/admin/dashboard"
                      ? "bg-[#253758] text-white border border-[#3C588A]/70 shadow-sm"
                      : "bg-white/[0.03] text-slate-200 hover:bg-[#202E4A]/80 hover:text-white border border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <span>Inicio</span>
                  </div>
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Grupos organizados en bloques exactamente iguales a desktop */}
                {adminGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2.5">
                      <span>{group.title}</span>
                      <div className="flex-1 h-0.5 bg-emerald-500/70 rounded-full" />
                    </div>
                    <div className="space-y-1 bg-white/[0.02] border border-white/5 rounded-2xl p-1.5">
                      {group.items.map((item) => {
                        const active = isLinkActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                              active
                                ? "bg-[#253758] text-white font-semibold border border-[#3C588A]/60 shadow-xs"
                                : "text-slate-300 hover:bg-[#202E4A]/80 hover:text-white"
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="text-sm font-semibold leading-tight">{item.label}</span>
                              {item.description && (
                                <span className="text-xs text-slate-400 mt-0.5 leading-snug truncate">
                                  {item.description}
                                </span>
                              )}
                            </div>
                            <svg
                              className={`w-4 h-4 shrink-0 transition-transform ${active ? "text-white translate-x-0.5" : "text-slate-500"}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user.rol === "EMPLEADO" && (
              <div className="space-y-1 bg-white/[0.02] border border-white/5 rounded-2xl p-1.5">
                {empleadoItems.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                        active
                          ? "bg-[#253758] text-white font-semibold border border-[#3C588A]/60 shadow-xs"
                          : "text-slate-300 hover:bg-[#202E4A]/80 hover:text-white"
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-sm font-semibold leading-tight">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-slate-400 mt-0.5 leading-snug truncate">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-4 h-4 shrink-0 transition-transform ${active ? "text-white translate-x-0.5" : "text-slate-500"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            )}

            {user.rol === "INQUILINO" && (
              <div className="space-y-1 bg-white/[0.02] border border-white/5 rounded-2xl p-1.5">
                {inquilinoItems.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                        active
                          ? "bg-[#253758] text-white font-semibold border border-[#3C588A]/60 shadow-xs"
                          : "text-slate-300 hover:bg-[#202E4A]/80 hover:text-white"
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-sm font-semibold leading-tight">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-slate-400 mt-0.5 leading-snug truncate">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-4 h-4 shrink-0 transition-transform ${active ? "text-white translate-x-0.5" : "text-slate-500"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* 3. Botón de Cerrar Sesión Rojo */}
            <div className="pt-2 border-t border-white/10">
              <LogoutButton variant="red" className="w-full justify-center py-3.5 text-sm rounded-xl font-semibold shadow-md" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
