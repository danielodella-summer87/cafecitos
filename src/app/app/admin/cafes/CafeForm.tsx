"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, CardSubtitle } from "@/app/ui/components";
import { createCafe, updateCafe } from "@/app/actions/cafes";

type Staff = {
  name: string;
  role: string;
};

type CafeFormMode = "create" | "edit";

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
  staff?: Staff[];
};

function pad2(s: string): string {
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return "01";
  return String(Math.max(1, Math.min(99, n))).padStart(2, "0");
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
  const [hoursText, setHoursText] = useState(initialValues?.hours_text ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  const [staff, setStaff] = useState<Staff[]>(
    initialValues?.staff?.length ? initialValues.staff : [{ name: "", role: "Dueño/a" }]
  );

  const canSave = name.trim().length >= 5 && !loading;
  const primaryLabel = mode === "edit" ? "Guardar cambios" : "Guardar cafetería";

  function updateStaff(idx: number, field: keyof Staff, value: string) {
    const copy = [...staff];
    copy[idx] = { ...copy[idx], [field]: value };
    setStaff(copy);
  }

  function addStaff() {
    if (staff.length >= 5) return;
    setStaff([...staff, { name: "", role: "Staff" }]);
  }

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    setLoading(true);
    try {
      const code = pad2(initialCode);
      const staffPayload = staff
        .filter((s) => s.name.trim() && s.role.trim())
        .map((s, idx) => ({
          name: s.name.trim(),
          role: idx === 0 ? "Dueño/a" : s.role.trim(),
          is_owner: idx === 0,
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
          staff: staffPayload,
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
        {staff.map((s, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Nombre"
              value={s.name}
              onChange={(e) => updateStaff(idx, "name", e.target.value)}
            />
            <input
              className="input"
              placeholder={idx === 0 ? "Dueño/a (fijo)" : "Rol (Barista, Cajero...)"}
              value={s.role}
              onChange={(e) => updateStaff(idx, "role", e.target.value)}
              readOnly={idx === 0}
              disabled={idx === 0}
            />
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
