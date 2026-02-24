"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, CardSubtitle } from "@/app/ui/components";
import { createCafe, updateCafe, lookupProfileByCedula } from "@/app/actions/cafes";

type Staff = {
  cedula: string;
  profile_id: string | null;
  full_name: string;
  role: "admin" | "staff";
  confirmed: boolean;
};

type CafeFormMode = "create" | "edit";

const STAFF_ROLES = ["staff", "admin"] as const;

type InitialValues = {
  id?: string;
  name?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  description?: string;
  hours_text?: string;
  image_code?: string;
  is_active?: boolean;
  lat?: string | number | null;
  lng?: string | number | null;
  staff?: Array<{ name: string; role: string; profile_id?: string | null }>;
};

function pad2(s: string): string {
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return "01";
  return String(Math.max(1, Math.min(99, n))).padStart(2, "0");
}

function emptyStaffRow(): Staff {
  return { cedula: "", profile_id: null, full_name: "", role: "staff", confirmed: false };
}

export default function CafeForm({
  mode = "create",
  initialCode,
  initialValues,
  onSave,
  onCancel,
}: {
  mode?: CafeFormMode;
  initialCode: string;
  initialValues?: InitialValues;
  onSave: (data?: unknown) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [lat, setLat] = useState(
    initialValues?.lat != null && initialValues?.lat !== ""
      ? String(initialValues.lat)
      : ""
  );
  const [lng, setLng] = useState(
    initialValues?.lng != null && initialValues?.lng !== ""
      ? String(initialValues.lng)
      : ""
  );
  const [hoursText, setHoursText] = useState(initialValues?.hours_text ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  const [staff, setStaff] = useState<Staff[]>(() => {
    if (initialValues?.staff?.length) {
      return initialValues.staff.map((s) => ({
        cedula: "",
        profile_id: s.profile_id ?? null,
        full_name: s.name ?? "",
        role: (s.role === "admin" ? "admin" : "staff") as "admin" | "staff",
        confirmed: true,
      }));
    }
    return [emptyStaffRow()];
  });
  const [lookupLoadingIdx, setLookupLoadingIdx] = useState<number | null>(null);

  const staffIncomplete = staff.some(
    (s) =>
      ((s.cedula.trim() || s.full_name.trim()) && !s.profile_id) ||
      (s.profile_id && !s.confirmed)
  );
  const canSave = name.trim().length >= 5 && !loading && !staffIncomplete;
  const primaryLabel = mode === "edit" ? "Guardar cambios" : "Guardar cafetería";

  function updateStaff(idx: number, field: keyof Staff, value: string | boolean) {
    const copy = [...staff];
    copy[idx] = { ...copy[idx], [field]: value };
    setStaff(copy);
  }

  async function handleLookup(idx: number) {
    const cedula = (staff[idx]?.cedula ?? "").replace(/\D/g, "").trim();
    if (cedula.length !== 8) return;
    setLookupLoadingIdx(idx);
    setError(null);
    try {
      const profile = await lookupProfileByCedula(cedula);
      if (!profile) {
        setError("No se encontró usuario con esa cédula.");
        return;
      }
      const copy = [...staff];
      copy[idx] = {
        ...copy[idx],
        full_name: profile.full_name ?? "",
        profile_id: profile.id,
        cedula,
        confirmed: false,
      };
      setStaff(copy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al buscar");
    } finally {
      setLookupLoadingIdx(null);
    }
  }

  function handleConfirm(idx: number) {
    const copy = [...staff];
    copy[idx] = { ...copy[idx], confirmed: true };
    const confirmedCount = copy.filter((s) => s.confirmed).length;
    const lastRow = copy[copy.length - 1];
    const hasEmptyAtEnd =
      lastRow &&
      !lastRow.cedula.trim() &&
      !lastRow.profile_id &&
      !lastRow.full_name.trim() &&
      !lastRow.confirmed;
    if (confirmedCount < 5 && !hasEmptyAtEnd) {
      setStaff([...copy, emptyStaffRow()]);
    } else {
      setStaff(copy);
    }
  }

  function removeStaff(idx: number) {
    const next = staff.filter((_, i) => i !== idx);
    if (next.length === 0) next.push(emptyStaffRow());
    setStaff(next);
  }

  function addStaff() {
    if (staff.length >= 5) return;
    setStaff([...staff, emptyStaffRow()]);
  }

  function parseLatLng(): { lat: number | null; lng: number | null; error?: string } {
    const latS = lat.trim();
    const lngS = lng.trim();
    if (!latS && !lngS) return { lat: null, lng: null };
    if (latS && !lngS) return { lat: null, lng: null, error: "Completá ambos Latitud y Longitud o dejá ambos vacíos." };
    if (!latS && lngS) return { lat: null, lng: null, error: "Completá ambos Latitud y Longitud o dejá ambos vacíos." };
    const latN = Number(latS);
    const lngN = Number(lngS);
    if (Number.isNaN(latN) || Number.isNaN(lngN)) return { lat: null, lng: null, error: "Lat/Lng inválidos." };
    return { lat: latN, lng: lngN };
  }

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    const { lat: latVal, lng: lngVal, error: latLngError } = parseLatLng();
    if (latLngError) {
      setError(latLngError);
      return;
    }
    setLoading(true);
    try {
      const code = pad2(initialCode);
      const staffPayload = staff
        .filter((s) => s.profile_id && s.confirmed && s.full_name.trim() && s.role.trim())
        .map((s) => ({
          name: s.full_name.trim(),
          role: STAFF_ROLES.includes(s.role.trim().toLowerCase() as "staff" | "admin") ? s.role.trim().toLowerCase() : "staff",
          profile_id: s.profile_id!,
        }));

      if (mode === "edit" && initialValues?.id) {
        await updateCafe({
          id: initialValues.id,
          name: name.trim(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          hours_text: hoursText.trim() || undefined,
          description: description.trim() || undefined,
          image_code: code,
          is_active: initialValues.is_active ?? true,
          lat: latVal,
          lng: lngVal,
          staff: staffPayload,
        });
        onSave();
      } else {
        const cafe = await createCafe({
          name: name.trim(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          hours_text: hoursText.trim() || undefined,
          description: description.trim() || undefined,
          image_code: code,
          lat: latVal,
          lng: lngVal,
          staff: staffPayload.map((p) => ({ name: p.name, role: p.role, profile_id: p.profile_id })),
        });
        onSave(cafe);
        router.push(`/app/admin/cafes/${cafe.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <CardTitle>Ficha de Cafetería</CardTitle>
      <CardSubtitle>
        Código asignado: <strong>{pad2(initialCode)}</strong>
      </CardSubtitle>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        <input
          className="input"
          placeholder="Nombre de la cafetería (mínimo 5 caracteres)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="Ciudad"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="input"
          placeholder="Dirección"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="grid gap-1">
          <label className="text-sm font-medium text-neutral-700">Latitud</label>
          <input
            type="text"
            inputMode="decimal"
            className="input"
            placeholder="-34.8601027"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-medium text-neutral-700">Longitud</label>
          <input
            type="text"
            inputMode="decimal"
            className="input"
            placeholder="-56.1962562"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
        <p className="text-xs text-neutral-500">
          Tip: en Google Maps el formato es @LAT,LNG,ZOOM. Copiá LAT y LNG.
        </p>
        <input
          className="input"
          placeholder="Horario (ej: Lun–Vie 8–19 / Sáb 9–13)"
          value={hoursText}
          onChange={(e) => setHoursText(e.target.value)}
        />
        <input
          className="input"
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <textarea
          className="input"
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <CardTitle>Personas autorizadas</CardTitle>
        <p className="text-xs text-neutral-500">Solo admin o staff. Buscá por cédula → Confirmar/Agregar. Owner se crea en Owners.</p>
        {staffIncomplete && (
          <p className="text-sm text-amber-700">Completá cada persona: Cédula + Buscar, luego Agregar. Todas las filas con usuario deben estar confirmadas.</p>
        )}
        {staff.map((s, idx) => (
          <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-lg p-2 bg-neutral-50/50">
            <div className="flex gap-2 items-center flex-wrap">
              <input
                className="input flex-1 min-w-0"
                placeholder="Cédula (8 dígitos)"
                value={s.cedula}
                onChange={(e) => updateStaff(idx, "cedula", e.target.value.replace(/\D/g, "").slice(0, 8))}
                maxLength={8}
                inputMode="numeric"
                readOnly={!!s.profile_id}
              />
              {!s.profile_id ? (
                <Button
                  variant="secondary"
                  type="button"
                  disabled={lookupLoadingIdx !== null || s.cedula.replace(/\D/g, "").length !== 8}
                  onClick={() => handleLookup(idx)}
                >
                  {lookupLoadingIdx === idx ? "…" : "Buscar"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={s.confirmed}
                    onClick={() => handleConfirm(idx)}
                  >
                    {s.confirmed ? "✓ Agregado" : "Agregar"}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                type="button"
                className="text-red-600 hover:text-red-700"
                onClick={() => removeStaff(idx)}
              >
                Quitar
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <input
                className="input flex-1"
                placeholder="Nombre (se completa al buscar)"
                value={s.full_name}
                readOnly
                aria-readonly
              />
              <select
                className="input w-28"
                value={s.role}
                onChange={(e) => updateStaff(idx, "role", e.target.value === "admin" ? "admin" : "staff")}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r === "admin" ? "Admin" : "Staff"}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {staff.length < 5 && (
          <Button variant="secondary" type="button" onClick={addStaff}>
            + Agregar persona
          </Button>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          variant="primary"
          disabled={!canSave}
          type="button"
          onClick={handleSave}
        >
          {loading ? "Guardando…" : primaryLabel}
        </Button>
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
