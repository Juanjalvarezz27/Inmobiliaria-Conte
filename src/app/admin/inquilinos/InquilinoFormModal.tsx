"use client";

import React, { useState } from "react";
import {
  User,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  RefreshCw,
  Phone,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { TipoPersona } from "@prisma/client";
import type { InquilinoConContratos } from "./types";
import type { CreateInquilinoInput, UpdateInquilinoInput } from "@/lib/actions/inquilinos";
import { toast } from "sonner";

interface InquilinoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInquilinoInput | UpdateInquilinoInput) => void;
  initialData?: InquilinoConContratos | null;
  isLoading?: boolean;
}

// Modal con formulario de alta y edición de inquilinos
export function InquilinoFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: InquilinoFormModalProps) {
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>(
    initialData?.tipoPersona ?? TipoPersona.NATURAL
  );
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [apellido, setApellido] = useState(initialData?.apellido ?? "");
  const [documentoIdentidad, setDocumentoIdentidad] = useState(
    initialData?.documentoIdentidad ?? ""
  );
  const [telefono, setTelefono] = useState(initialData?.telefono ?? "");
  const [telefonoSecundario, setTelefonoSecundario] = useState(
    initialData?.telefonoSecundario ?? ""
  );
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [direccion, setDireccion] = useState(initialData?.direccion ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error(
        tipoPersona === TipoPersona.NATURAL
          ? "El nombre del arrendatario es obligatorio."
          : "La razón social de la empresa es obligatoria."
      );
      return;
    }
    if (!documentoIdentidad.trim()) {
      toast.error("El documento de identidad o RIF es obligatorio.");
      return;
    }
    if (!telefono.trim() || telefono === "+58") {
      toast.error("El teléfono de contacto es obligatorio.");
      return;
    }

    onSubmit({
      nombre: nombre.trim(),
      apellido: tipoPersona === TipoPersona.NATURAL ? apellido.trim() || null : null,
      tipoPersona,
      documentoIdentidad: documentoIdentidad.trim().toUpperCase(),
      telefono: telefono.trim(),
      telefonoSecundario: telefonoSecundario.trim() || null,
      email: email.trim() || null,
      direccion: direccion.trim() || null,
    });
  };

  const isEditing = !!initialData;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Arrendatario" : "Registrar Nuevo Inquilino"}
      icon={User}
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paso 1: Datos de Identificación */}
        <div className="space-y-3.5">
          <FormSectionHeader step={1} title="Identificación del Arrendatario" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Tipo de Persona */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tipo de Persona <span className="text-[#CC1A22]">*</span>
              </label>
              <Select
                value={tipoPersona}
                onChange={(val) => setTipoPersona(val as TipoPersona)}
                icon={
                  tipoPersona === TipoPersona.NATURAL ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )
                }
                options={[
                  { value: TipoPersona.NATURAL, label: "Persona Natural" },
                  { value: TipoPersona.JURIDICA, label: "Empresa / Persona Jurídica" },
                ]}
              />
            </div>

            {/* Documento de Identidad (Cédula o RIF) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {tipoPersona === TipoPersona.NATURAL ? "Cédula de Identidad" : "RIF de la Empresa"}{" "}
                <span className="text-[#CC1A22]">*</span>
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={documentoIdentidad}
                  onChange={(e) => setDocumentoIdentidad(e.target.value)}
                  placeholder={tipoPersona === TipoPersona.NATURAL ? "Ej: V-12345678" : "Ej: J-12345678-0"}
                  className="w-full pl-9 pr-3.5 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] uppercase transition-all"
                />
              </div>
            </div>

            {/* Nombres o Razón Social */}
            <div className={tipoPersona === TipoPersona.JURIDICA ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {tipoPersona === TipoPersona.NATURAL ? "Nombres" : "Razón Social / Nombre Comercial"}{" "}
                <span className="text-[#CC1A22]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={tipoPersona === TipoPersona.NATURAL ? "Ej: Carlos Eduardo" : "Ej: Inversiones El Éxito C.A."}
                  className="w-full pl-9 pr-3.5 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>

            {/* Apellidos (solo persona natural) */}
            {tipoPersona === TipoPersona.NATURAL && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Apellidos
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej: Pérez Rodríguez"
                    className="w-full pl-9 pr-3.5 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paso 2: Información de Contacto */}
        <div className="space-y-3.5">
          <FormSectionHeader step={2} title="Contacto y Ubicación" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Teléfono Principal con Selector Internacional */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Teléfono Principal / WhatsApp <span className="text-[#CC1A22]">*</span>
              </label>
              <PhoneInput
                value={telefono}
                onChange={setTelefono}
                defaultCountryCode="VE"
              />
            </div>

            {/* Teléfono Secundario */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Teléfono Secundario / Oficina
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={telefonoSecundario}
                  onChange={(e) => setTelefonoSecundario(e.target.value)}
                  placeholder="Ej: 0276-3456789"
                  className="w-full pl-9 pr-3.5 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Correo Electrónico (para notificaciones y recibos)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: cliente@correo.com"
                  className="w-full pl-9 pr-3.5 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dirección Fiscal o de Habitación
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Av. Principal, Edif. Torre Centro, Piso 2"
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] resize-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(23,94,56,0.3)] border-b-[3px] border-b-[#0e3a23] hover:from-[#145231] hover:to-[#0f3d25] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>{isEditing ? "Guardar Cambios" : "Registrar Inquilino"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
