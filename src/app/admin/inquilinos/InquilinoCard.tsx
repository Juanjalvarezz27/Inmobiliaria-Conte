"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  CreditCard,
  Mail,
  Pencil,
  Archive,
  RotateCcw,
  Store,
  ArrowUpRight,
  Plus,
  KeyRound,
  ShieldCheck,
  Lock,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TipoPersona } from "@prisma/client";
import { WhatsAppIcon, getWhatsAppUrl } from "@/lib/formatters";
import type { InquilinoConContratos } from "./types";

// Sol decorativo en esquina según el tipo de persona
const getPersonaCornerSun = (tipo: TipoPersona) => {
  if (tipo === TipoPersona.JURIDICA) {
    return {
      glow: "bg-indigo-500/20",
      ring: "bg-indigo-500/[0.08] border-indigo-400/25",
      sun: "from-indigo-600/25 to-indigo-400/5",
    };
  }
  return {
    glow: "bg-emerald-500/20",
    ring: "bg-emerald-500/[0.08] border-emerald-400/25",
    sun: "from-[#175E38]/30 to-emerald-400/5",
  };
};

interface InquilinoCardProps {
  inquilino: InquilinoConContratos;
  vistaArchivados?: boolean;
  isPending?: boolean;
  onEditar: (inq: InquilinoConContratos) => void;
  onArchivar: (inq: InquilinoConContratos) => void;
  onReactivar: (inq: InquilinoConContratos) => void;
  onVerFicha: (inq: InquilinoConContratos) => void;
  onGestionarAcceso: (inq: InquilinoConContratos) => void;
}

export function InquilinoCard({
  inquilino: inq,
  vistaArchivados = false,
  isPending = false,
  onEditar,
  onArchivar,
  onReactivar,
  onVerFicha,
  onGestionarAcceso,
}: InquilinoCardProps) {
  const router = useRouter();
  const [espaciosAbiertos, setEspaciosAbiertos] = useState(false);
  const cornerSun = getPersonaCornerSun(inq.tipoPersona);
  const esJuridica = inq.tipoPersona === TipoPersona.JURIDICA;
  const nombreCompleto = esJuridica
    ? inq.nombre
    : `${inq.nombre} ${inq.apellido ?? ""}`.trim();

  return (
    <div
      key={inq.id}
      className="group/inqcard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col"
    >
      {/* Sol decorativo en esquina superior izquierda */}
      <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
        <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
        <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/inqcard:scale-125`} />
      </div>

      <div className="p-5 sm:p-6 space-y-4 relative z-10 flex flex-col">
        <div className="space-y-3.5">
          {/* Header con Badge y Botones de Acción */}
          <div className="flex items-center justify-between gap-2 relative z-10">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border shadow-xs ${
                esJuridica
                  ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                  : "bg-emerald-50 text-[#175E38] border-emerald-200"
              }`}
            >
              {esJuridica ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              {esJuridica ? "Empresa / Jurídica" : "Persona Natural"}
            </span>

            {/* Botones rápidos Editar / Eliminar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Acceso Digital */}
              <div className="relative group/btn">
                <button
                  type="button"
                  onClick={() => onGestionarAcceso(inq)}
                  disabled={isPending}
                  title="Gestionar acceso digital"
                  aria-label="Gestionar acceso digital"
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                    inq.usuario
                      ? inq.usuario.activo
                        ? inq.usuario.mustChangePassword
                          ? "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100"
                          : "bg-emerald-50 text-[#175E38] border-emerald-200/90 hover:bg-emerald-100"
                        : "bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100"
                      : "bg-purple-50 text-purple-700 border-purple-200/90 hover:bg-purple-100"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                  <span>{inq.usuario ? "Acceso Digital" : "Habilitar Acceso"}</span>
                </div>
              </div>

              {/* Editar */}
              <div className="relative group/btn">
                <button
                  type="button"
                  onClick={() => onEditar(inq)}
                  disabled={isPending}
                  title="Editar inquilino"
                  aria-label="Editar inquilino"
                  className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                  <span>Editar</span>
                </div>
              </div>

              {/* Reactivar o Archivar */}
              {vistaArchivados ? (
                <div className="relative group/btn">
                  <button
                    type="button"
                    onClick={() => onReactivar(inq)}
                    disabled={isPending}
                    title="Reactivar inquilino"
                    aria-label="Reactivar inquilino"
                    className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] border border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300 hover:text-[#124b2d] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                    <span>Reactivar</span>
                  </div>
                </div>
              ) : (
                <div className="relative group/btn">
                  <button
                    type="button"
                    onClick={() => onArchivar(inq)}
                    disabled={isPending}
                    title="Archivar inquilino"
                    aria-label="Archivar inquilino"
                    className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/90 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                    <span>Archivar</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nombre y Documento */}
          <div>
            <h3 className="font-extrabold text-slate-900 text-xl leading-snug line-clamp-1 group-hover/inqcard:text-slate-950 transition-colors">
              {nombreCompleto}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{inq.documentoIdentidad}</span>
              </span>
              {!inq.activo ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  Archivado / Inactivo
                </span>
              ) : inq._count.contratos > 0 ? (
                <Badge variant="DISPONIBLE" size="sm">
                  {inq._count.contratos}{" "}
                  {inq._count.contratos === 1 ? "alquiler activo" : "alquileres activos"}
                </Badge>
              ) : (
                <Badge variant="INACTIVO" size="sm">
                  Sin alquileres activos
                </Badge>
              )}

              {/* Badge de Acceso Digital */}
              {inq.usuario ? (
                inq.usuario.activo ? (
                  inq.usuario.mustChangePassword ? (
                    <button
                      type="button"
                      onClick={() => onGestionarAcceso(inq)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-all cursor-pointer"
                      title="Clave temporal asignada. Clic para gestionar"
                    >
                      <KeyRound className="w-3 h-3 text-amber-600" />
                      <span>Clave 123456</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onGestionarAcceso(inq)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#175E38] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-all cursor-pointer"
                      title="Portal digital activo con clave personalizada. Clic para gestionar"
                    >
                      <ShieldCheck className="w-3 h-3 text-[#175E38]" />
                      <span>Portal Activo</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => onGestionarAcceso(inq)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 transition-all cursor-pointer"
                    title="Acceso suspendido. Clic para gestionar"
                  >
                    <Lock className="w-3 h-3 text-rose-500" />
                    <span>Acceso Suspendido</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onGestionarAcceso(inq)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-all cursor-pointer"
                  title="Habilitar acceso al portal digital"
                >
                  <KeyRound className="w-3 h-3 text-purple-500" />
                  <span>Sin Acceso</span>
                </button>
              )}
            </div>
          </div>

          {/* Contacto Directo: WhatsApp y Correo */}
          <div className="space-y-1.5 pt-1 text-xs">
            {/* WhatsApp */}
            <div className="flex items-center gap-2">
              <a
                href={getWhatsAppUrl(inq.telefono)}
                target="_blank"
                rel="noopener noreferrer"
                title="Enviar WhatsApp"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer group/ws"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                <span className="underline decoration-emerald-300 underline-offset-2 group-hover/ws:decoration-emerald-600">
                  {inq.telefono}
                </span>
              </a>
            </div>

            {/* Correo */}
            <p className="text-slate-500 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {inq.email ? (
                <span className="truncate">{inq.email}</span>
              ) : (
                <span className="text-slate-400 italic text-[11px]">Sin correo registrado</span>
              )}
            </p>
          </div>
        </div>

        {/* Espacios arrendados / Acordeón desplegable uniforme */}
        {inq.contratos && inq.contratos.length > 0 ? (
          <div className="pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEspaciosAbiertos(!espaciosAbiertos)}
              className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer shadow-2xs active:translate-y-0.5 ${
                espaciosAbiertos
                  ? "bg-emerald-50/90 border-emerald-300 text-[#175E38] shadow-xs"
                  : "bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/90 text-slate-700"
              }`}
              aria-expanded={espaciosAbiertos}
              title={espaciosAbiertos ? "Ocultar espacios en posesión" : "Ver espacios en posesión"}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    espaciosAbiertos
                      ? "bg-[#175E38] text-white"
                      : "bg-emerald-100/80 text-[#175E38]"
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                </div>
                <span>Espacios en posesión ({inq.contratos.length})</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span>{espaciosAbiertos ? "Ocultar" : "Ver"}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    espaciosAbiertos ? "rotate-180 text-[#175E38]" : "text-slate-400"
                  }`}
                />
              </div>
            </button>

            {/* Transición CSS Grid Row ultra fluida */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                espaciosAbiertos
                  ? "grid-rows-[1fr] opacity-100 mt-2"
                  : "grid-rows-[0fr] opacity-0 pointer-events-none"
              }`}
            >
              <div className="overflow-hidden space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {inq.contratos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => router.push(`/admin/contratos?search=${encodeURIComponent(c.codigo)}`)}
                    title={`Ir al contrato ${c.codigo} del espacio ${c.unidad.codigo}`}
                    className="w-full text-left p-2 rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/60 hover:from-emerald-50/50 hover:to-white hover:border-emerald-300 transition-all duration-200 flex items-center justify-between gap-2 group/spacebtn cursor-pointer shadow-2xs hover:shadow-xs active:translate-y-0.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#175E38] border border-emerald-200/70 flex items-center justify-center shrink-0 group-hover/spacebtn:scale-105 group-hover/spacebtn:bg-[#175E38] group-hover/spacebtn:text-white transition-all">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900 font-heading">
                            Espacio {c.unidad.codigo}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            ({c.codigo})
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 truncate" title={c.unidad.propiedad.nombre}>
                          {c.unidad.propiedad.nombre}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#175E38] group-hover/spacebtn:text-[#124b2d] bg-white group-hover/spacebtn:bg-emerald-50 px-2 py-1 rounded-md border border-slate-200/80 group-hover/spacebtn:border-emerald-300 shrink-0 shadow-2xs transition-all">
                      <span>Ver</span>
                      <ArrowUpRight className="w-3 h-3 group-hover/spacebtn:translate-x-0.5 group-hover/spacebtn:-translate-y-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2.5 border-t border-slate-100">
            <div className="w-full px-3 py-2 rounded-xl border border-slate-200/70 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500 select-none">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-200/70 text-slate-400 flex items-center justify-center shrink-0">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-slate-600">Espacios en posesión</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                0 activos
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer 50/50: Ver Ficha y Crear Contrato */}
      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10 mt-auto">
        <button
          type="button"
          onClick={() => onVerFicha(inq)}
          className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
          title="Ver ficha técnica completa del inquilino"
        >
          <User className="w-3.5 h-3.5 text-slate-200 shrink-0" />
          <span className="truncate">Ver Ficha</span>
        </button>

        {vistaArchivados ? (
          <button
            type="button"
            onClick={() => onReactivar(inq)}
            disabled={isPending}
            className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
            title="Reactivar inquilino en operaciones"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
            <span className="truncate">Reactivar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              router.push(`/admin/contratos?inquilinoId=${inq.id}`);
            }}
            className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
            title="Crear un nuevo contrato para este inquilino"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
            <span className="truncate">Crear Contrato</span>
          </button>
        )}
      </div>
    </div>
  );
}
