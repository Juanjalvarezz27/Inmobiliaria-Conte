"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rol } from "@prisma/client";
import { LogoutButton } from "@/components/auth/logout-button";

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
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cerrar menús al cambiar de ruta ajustando el estado durante renderizado (React 19 pattern)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }

  // Configuración de menús por rol
  const adminGroups: NavGroup[] = [
    {
      title: "Inmuebles & Contratos",
      items: [
        { label: "Propiedades", href: "/admin/propiedades", description: "Centros comerciales y locales" },
        { label: "Inquilinos", href: "/admin/inquilinos", description: "Gestión de arrendatarios" },
        { label: "Contratos", href: "/admin/contratos", description: "Arrendamientos y ajustes de renta" },
      ],
    },
    {
      title: "Cobranza & Finanzas",
      items: [
        { label: "Panel de Cobranza", href: "/admin/cobranza", description: "Pagos mensuales y vencimientos" },
        { label: "Facturación & Recibos", href: "/admin/facturacion", description: "Emisión de comprobantes PDF" },
        { label: "Finanzas & Balance", href: "/admin/finanzas", description: "Ingresos, egresos y cierres de mes" },
      ],
    },
    {
      title: "Operaciones",
      items: [
        { label: "Mantenimiento", href: "/admin/mantenimiento", description: "Tickets y reporte de averías" },
        { label: "Personal & Asistencia", href: "/admin/personal", description: "Empleados, tareas y marcaje" },
        { label: "Bóveda de Documentos", href: "/admin/documentos", description: "Archivos y contratos digitales" },
        { label: "Agenda & Alertas", href: "/admin/agenda", description: "Eventos y recordatorios del sistema" },
      ],
    },
  ];

  const empleadoItems: NavItem[] = [
    { label: "Panel Principal", href: "/empleado/dashboard", description: "Resumen de jornada" },
    { label: "Mis Tareas", href: "/empleado/tareas", description: "Tareas operativas asignadas" },
    { label: "Mantenimiento", href: "/empleado/mantenimiento", description: "Tickets de averías activas" },
    { label: "Marcaje de Asistencia", href: "/empleado/asistencia", description: "Registro de entrada y salida" },
  ];

  const inquilinoItems: NavItem[] = [
    { label: "Mi Estado de Cuenta", href: "/inquilino/dashboard", description: "Resumen de cuenta y pagos" },
    { label: "Historial de Pagos", href: "/inquilino/pagos", description: "Comprobantes y recibos digitales" },
    { label: "Mi Contrato", href: "/inquilino/contrato", description: "Detalles del contrato de alquiler" },
    { label: "Reportar Incidente", href: "/inquilino/mantenimiento", description: "Solicitud de asistencia técnica" },
  ];

  // Estilos de badge según rol
  const roleBadges: Record<Rol, { label: string; bg: string; border: string; text: string }> = {
    ADMIN: {
      label: "ADMINISTRADOR",
      bg: "bg-amber-500/10",
      border: "border-amber-400/30",
      text: "text-amber-300",
    },
    EMPLEADO: {
      label: "PERSONAL DE CAMPO",
      bg: "bg-sky-500/10",
      border: "border-sky-400/30",
      text: "text-sky-300",
    },
    INQUILINO: {
      label: "INQUILINO",
      bg: "bg-emerald-500/10",
      border: "border-emerald-400/30",
      text: "text-emerald-300",
    },
  };

  const currentRoleStyle = roleBadges[user.rol] || roleBadges.ADMIN;
  const userInitials = `${user.nombre?.charAt(0) || "U"}${user.apellido?.charAt(0) || ""}`.toUpperCase();

  const isLinkActive = (href: string) => {
    return pathname === href || (href !== "/admin/dashboard" && href !== "/empleado/dashboard" && href !== "/inquilino/dashboard" && pathname.startsWith(href));
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1C2539] text-white border-b border-white/10 shadow-lg backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Marca */}
          <div className="flex items-center gap-6">
            <Link
              href={user.rol === "ADMIN" ? "/admin/dashboard" : user.rol === "EMPLEADO" ? "/empleado/dashboard" : "/inquilino/dashboard"}
              className="flex items-center gap-3 group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white to-slate-200 text-[#1C2539] flex items-center justify-center font-heading font-black text-lg shadow-md group-hover:scale-105 transition-transform duration-200">
                C
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-base tracking-tight leading-none group-hover:text-emerald-400 transition-colors">
                  Inmobiliaria CONTÉ
                </span>
                <span className="text-[10px] text-slate-300 font-medium tracking-wider uppercase mt-1">
                  Gestión Integral
                </span>
              </div>
            </Link>

            {/* Navegación Desktop - ADMIN con Dropdowns */}
            {user.rol === "ADMIN" && (
              <nav className="hidden lg:flex items-center gap-1.5" ref={dropdownRef}>
                <Link
                  href="/admin/dashboard"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    pathname === "/admin/dashboard"
                      ? "bg-white/15 text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
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
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                          hasActiveChild || isOpen
                            ? "bg-white/15 text-white shadow-xs font-semibold"
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {group.title}
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown flotante */}
                      {isOpen && (
                        <div className="absolute left-0 mt-2 w-64 rounded-xl bg-[#1C2539]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-2 z-50 animate-fadeIn">
                          {group.items.map((item) => {
                            const active = isLinkActive(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setActiveDropdown(null)}
                                className={`block px-3 py-2 rounded-lg transition-colors duration-150 ${
                                  active
                                    ? "bg-white/20 text-white font-medium"
                                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <div className="text-xs font-medium">{item.label}</div>
                                {item.description && (
                                  <div className="text-[11px] text-slate-300 truncate mt-0.5">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        active
                          ? "bg-white/15 text-white shadow-xs font-semibold"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        active
                          ? "bg-white/15 text-white shadow-xs font-semibold"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Área de Usuario & Cerrar Sesión */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="w-8 h-8 rounded-full bg-slate-700/80 border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {userInitials}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight">
                  {user.nombre} {user.apellido || ""}
                </span>
                <span
                  className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider border w-fit mt-0.5 ${currentRoleStyle.bg} ${currentRoleStyle.border} ${currentRoleStyle.text}`}
                >
                  {currentRoleStyle.label}
                </span>
              </div>
            </div>

            <LogoutButton />
          </div>

          {/* Botón Hamburger Móvil */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none cursor-pointer"
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

      {/* Drawer Móvil (Slide-over menú responsive) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-50 bg-[#1C2539]/98 backdrop-blur-xl border-t border-white/10 overflow-y-auto animate-fadeIn">
          <div className="p-4 space-y-6">
            {/* Perfil del usuario en móvil */}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="w-10 h-10 rounded-full bg-slate-700 border border-white/20 flex items-center justify-center text-sm font-bold text-white">
                {userInitials}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  {user.nombre} {user.apellido || ""}
                </div>
                <div className="text-xs text-slate-300 truncate">{user.email}</div>
                <span
                  className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded tracking-wider border mt-1 ${currentRoleStyle.bg} ${currentRoleStyle.border} ${currentRoleStyle.text}`}
                >
                  {currentRoleStyle.label}
                </span>
              </div>
            </div>

            {/* Enlaces según rol en móvil */}
            {user.rol === "ADMIN" && (
              <div className="space-y-4">
                <Link
                  href="/admin/dashboard"
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                    pathname === "/admin/dashboard" ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  📊 Inicio
                </Link>

                {adminGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const active = isLinkActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            active ? "bg-white/20 text-white font-semibold" : "text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {user.rol === "EMPLEADO" && (
              <div className="space-y-1">
                {empleadoItems.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active ? "bg-white/20 text-white font-semibold" : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {user.rol === "INQUILINO" && (
              <div className="space-y-1">
                {inquilinoItems.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active ? "bg-white/20 text-white font-semibold" : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Botón de Logout en móvil */}
            <div className="pt-4 border-t border-white/10">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
