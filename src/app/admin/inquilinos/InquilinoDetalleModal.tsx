"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Mail,
  MapPin,
  Pencil,
  FileText,
  Plus,
  Store,
  ArrowUpRight,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { TipoPersona } from "@prisma/client";
import { WhatsAppIcon, getWhatsAppUrl, formatCurrency } from "../propiedades/constants";
import type { InquilinoConContratos } from "./types";

interface InquilinoDetalleModalProps {
  isOpen: boolean;
  inquilino: InquilinoConContratos | null;
  onClose: () => void;
  onEditar: () => void;
  onCrearContrato: () => void;
}

// Modal visor de ficha técnica y contratos del inquilino
export function InquilinoDetalleModal({
  isOpen,
  inquilino,
  onClose,
  onEditar,
  onCrearContrato,
}: InquilinoDetalleModalProps) {
  const router = useRouter();
  if (!inquilino) return null;

  const nombreCompleto =
    inquilino.tipoPersona === TipoPersona.NATURAL
      ? `${inquilino.nombre} ${inquilino.apellido ?? ""}`.trim()
      : inquilino.nombre;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={nombreCompleto}
      subtitle={`Documento: ${inquilino.documentoIdentidad}`}
      icon={inquilino.tipoPersona === TipoPersona.NATURAL ? User : Building2}
      headerVariant="green"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Tarjetas de Datos Clave organizadas de 2 en 2 */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tipo de Persona */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tipo
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
              {inquilino.tipoPersona === TipoPersona.NATURAL ? "Persona Natural" : "Empresa / Jurídica"}
            </p>
          </div>

          {/* Cédula o RIF */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Documento
            </span>
            <p className="text-xs sm:text-sm font-black text-slate-900 font-heading mt-1">
              {inquilino.documentoIdentidad}
            </p>
          </div>

          {/* Contratos Activos */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Alquileres Activos
            </span>
            <div className="mt-1">
              <Badge variant={inquilino._count.contratos > 0 ? "DISPONIBLE" : "INACTIVO"} dot size="sm">
                {inquilino._count.contratos}{" "}
                {inquilino._count.contratos === 1 ? "espacio" : "espacios"}
              </Badge>
            </div>
          </div>

          {/* Estado de Cuenta */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Estado
            </span>
            <div className="mt-1">
              <Badge variant={inquilino.activo ? "DISPONIBLE" : "INACTIVO"} size="sm">
                {inquilino.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Contacto y Comunicación Directa */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Información de Contacto
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* WhatsApp Principal */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Teléfono:</span>
              <a
                href={getWhatsAppUrl(inquilino.telefono)}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir chat en WhatsApp"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                <span className="underline decoration-emerald-300 underline-offset-2">
                  {inquilino.telefono}
                </span>
              </a>
            </div>

            {/* Teléfono Secundario */}
            {inquilino.telefonoSecundario && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Secundario:</span>
                <span className="font-semibold text-slate-700">{inquilino.telefonoSecundario}</span>
              </div>
            )}

            {/* Correo Electrónico */}
            {inquilino.email && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-400 font-medium">Email:</span>
                <a
                  href={`mailto:${inquilino.email}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {inquilino.email}
                </a>
              </div>
            )}

            {/* Dirección */}
            {inquilino.direccion && (
              <div className="flex items-start gap-2 sm:col-span-2 pt-1 border-t border-slate-200/50">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium block">Dirección:</span>
                  <span className="text-slate-700 leading-relaxed">{inquilino.direccion}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sección de Contratos y Espacios Arrendados */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">Espacios y Contratos</span>
            </h4>
            {inquilino.contratos && inquilino.contratos.length > 0 && (
              <button
                type="button"
                onClick={onCrearContrato}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-[#175E38] hover:bg-emerald-100 hover:text-[#124b2d] border border-emerald-200/80 transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                title="Crear un nuevo contrato para este inquilino"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nuevo Contrato</span>
              </button>
            )}
          </div>

          {inquilino.contratos && inquilino.contratos.length > 0 ? (
            <div className="space-y-2">
              {inquilino.contratos.map((c) => (
                <div
                  key={c.id}
                  className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#175E38] flex items-center justify-center shrink-0 border border-emerald-200">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{c.unidad.codigo}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          ({c.codigo})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {c.unidad.propiedad.nombre} · {c.unidad.propiedad.ciudad}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mensualidad
                      </span>
                      <span className="font-black text-slate-900 text-sm font-heading">
                        {formatCurrency(c.montoAlquiler)}/mes
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(`/admin/contratos?search=${encodeURIComponent(c.codigo)}`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1C2539] hover:bg-[#2a3754] transition-all cursor-pointer shadow-xs active:translate-y-0.5 shrink-0"
                      title="Ver contrato completo"
                    >
                      <span>Ver</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Este inquilino no tiene contratos activos en este momento.
              </p>
              <button
                type="button"
                onClick={onCrearContrato}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs active:translate-y-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Asignar Espacio y Crear Contrato</span>
              </button>
            </div>
          )}
        </div>

        {/* Botones de Pie */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={onEditar}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#175E38] rounded-xl hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar Datos</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
