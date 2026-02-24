"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOwnerStaff,
  getOwnerStaff,
  updateOwnerStaff,
  resetOwnerStaffPin,
  type CafeStaffRow,
} from "@/app/actions/ownerStaff";
import { isValidCi, normalizeCi } from "@/lib/ci";
import Modal from "@/app/ui/Modal";

export default function OwnerStaffManager() {
  const router = useRouter();
  const [list, setList] = useState<CafeStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOwnerStaff();
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar personal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showSuccess = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  // —— Agregar staff ———
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("Staff");
  const [addCedula, setAddCedula] = useState("");
  const [addPin, setAddPin] = useState("");
  const [addPinConfirm, setAddPinConfirm] = useState("");
  const [addCanIssue, setAddCanIssue] = useState(true);
  const [addCanRedeem, setAddCanRedeem] = useState(true);
  const [addIsActive, setAddIsActive] = useState(true);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addName.trim();
    const cedula = normalizeCi(addCedula);
    const pin = addPin.trim();
    const pinConfirm = addPinConfirm.trim();
    setAddError(null);
    if (name.length < 2) {
      setAddError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (addRole.trim().length < 2) {
      setAddError("El rol es obligatorio (mín. 2 caracteres).");
      return;
    }
    if (!isValidCi(cedula)) {
      setAddError("La cédula debe tener exactamente 8 dígitos.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setAddError("El PIN debe ser exactamente 4 dígitos.");
      return;
    }
    if (pin !== pinConfirm) {
      setAddError("El PIN y la confirmación no coinciden.");
      return;
    }

    setAddSubmitting(true);
    setAddError(null);
    try {
      const res = await createOwnerStaff({
        full_name: name,
        role: addRole.trim(),
        cedula,
        pin_4: pin,
        can_issue: addCanIssue,
        can_redeem: addCanRedeem,
        is_active: addIsActive,
      });
      if (res.ok) {
        setAddOpen(false);
        setAddName("");
        setAddRole("Staff");
        setAddCedula("");
        setAddPin("");
        setAddPinConfirm("");
        setAddCanIssue(true);
        setAddCanRedeem(true);
        setAddIsActive(true);
        setAddError(null);
        await load();
        router.refresh();
        showSuccess("Staff creado");
      } else {
        setAddError(res.error ?? "No se pudo crear el staff.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setAddError(message || "No se pudo crear el staff.");
    } finally {
      setAddSubmitting(false);
    }
  };

  // —— Editar staff ———
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<CafeStaffRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editCanIssue, setEditCanIssue] = useState(true);
  const [editCanRedeem, setEditCanRedeem] = useState(true);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const openEdit = (row: CafeStaffRow) => {
    setEditRow(row);
    setEditName(row.full_name ?? "");
    setEditRole(row.role);
    setEditCanIssue(row.can_issue);
    setEditCanRedeem(row.can_redeem);
    setEditIsActive(row.is_active);
    setEditOpen(true);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    if (editName.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (editRole.trim().length < 2) {
      setError("El rol es obligatorio.");
      return;
    }
    setEditSubmitting(true);
    setError(null);
    try {
      const res = await updateOwnerStaff({
        staff_id: editRow.id,
        full_name: editName.trim(),
        role: editRole.trim(),
        is_active: editIsActive,
        can_issue: editCanIssue,
        can_redeem: editCanRedeem,
      });
      if (res.ok) {
        setEditOpen(false);
        setEditRow(null);
        await load();
        router.refresh();
        showSuccess("Cambios guardados");
      } else {
        setError(res.error ?? "No se pudo guardar");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setEditSubmitting(false);
    }
  };

  // —— Activar/Inactivar (toggle) ———
  const handleSetActive = async (row: CafeStaffRow, is_active: boolean) => {
    if (row.is_owner && !is_active) {
      setError("No se puede inactivar al dueño.");
      return;
    }
    const action = is_active ? "activar" : "inactivar";
    if (!window.confirm(`¿Confirmás que querés ${action} a ${row.full_name ?? row.role}?`)) return;
    setError(null);
    try {
      const res = await updateOwnerStaff({
        staff_id: row.id,
        full_name: row.full_name ?? "",
        role: row.role,
        is_active,
        can_issue: row.can_issue,
        can_redeem: row.can_redeem,
      });
      if (res.ok) {
        await load();
        router.refresh();
        showSuccess(is_active ? "Staff activado" : "Staff inactivado");
      } else {
        setError(res.error ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    }
  };

  // —— Reset PIN ———
  const [resetPinOpen, setResetPinOpen] = useState(false);
  const [resetPinRow, setResetPinRow] = useState<CafeStaffRow | null>(null);
  const [resetPinValue, setResetPinValue] = useState("");
  const [resetPinConfirm, setResetPinConfirm] = useState("");
  const [resetPinSubmitting, setResetPinSubmitting] = useState(false);

  const openResetPin = (row: CafeStaffRow) => {
    setResetPinRow(row);
    setResetPinValue("");
    setResetPinConfirm("");
    setResetPinOpen(true);
    setError(null);
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinRow) return;
    const pin = resetPinValue.trim();
    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN debe ser exactamente 4 dígitos.");
      return;
    }
    if (pin !== resetPinConfirm.trim()) {
      setError("El PIN y la confirmación no coinciden.");
      return;
    }
    setResetPinSubmitting(true);
    setError(null);
    try {
      const res = await resetOwnerStaffPin(resetPinRow.id, pin);
      if (res.ok) {
        setResetPinOpen(false);
        setResetPinRow(null);
        setResetPinValue("");
        setResetPinConfirm("");
        showSuccess("PIN actualizado");
        await load();
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo actualizar el PIN");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el PIN");
    } finally {
      setResetPinSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-4">
        <h2 className="text-lg font-semibold mb-3">Personal</h2>
        <p className="text-sm text-neutral-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold">Personal</h2>
        <button
          type="button"
          onClick={() => { setAddOpen(true); setAddError(null); setError(null); }}
          className="rounded-lg px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Agregar staff
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-2" role="alert">{error}</p>
      )}
      {message && (
        <p className="text-sm text-green-700 mb-2" role="status">{message}</p>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-neutral-500">No hay personal cargado.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="p-2 font-medium">Nombre</th>
                  <th className="p-2 font-medium">Rol</th>
                  <th className="p-2 font-medium">Cédula</th>
                  <th className="p-2 font-medium">Permisos</th>
                  <th className="p-2 font-medium">Estado</th>
                  <th className="p-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const tipoLabel = row.profile_role === "owner" ? "Owner" : (row.role === "admin" || row.role === "staff" ? (row.role.charAt(0).toUpperCase() + row.role.slice(1)) : "—");
                  const isOwnerTipo = row.profile_role === "owner";
                  return (
                  <tr key={row.id} className="border-b border-neutral-200">
                    <td className="p-2 font-medium">{row.full_name ?? "—"}</td>
                    <td className="p-2">
                      {tipoLabel !== "—" ? (
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${isOwnerTipo ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-700"}`}>
                          {tipoLabel}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2 font-mono text-sm">{row.cedula ?? "—"}</td>
                    <td className="p-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs mr-1 ${row.can_issue ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"}`}>
                        Asignar {row.can_issue ? "ON" : "OFF"}
                      </span>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs ${row.can_redeem ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"}`}>
                        Cobrar {row.can_redeem ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${row.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {row.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded px-2 py-1 text-xs border border-red-600 text-red-600 hover:bg-red-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openResetPin(row)}
                          className="rounded px-2 py-1 text-xs border border-amber-600 text-amber-700 hover:bg-amber-50"
                        >
                          Reset PIN
                        </button>
                        {!row.is_owner && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(row, !row.is_active)}
                            className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700"
                          >
                            {row.is_active ? "Inactivar" : "Activar"}
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {list.map((row) => {
              const tipoLabel = row.profile_role === "owner" ? "Owner" : (row.role === "admin" || row.role === "staff" ? (row.role.charAt(0).toUpperCase() + row.role.slice(1)) : "—");
              const isOwnerTipo = row.profile_role === "owner";
              return (
              <div key={row.id} className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium">{row.full_name ?? "—"}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${row.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {row.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                  <span className="text-neutral-600"><b>Rol:</b></span>
                  {tipoLabel !== "—" ? (
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${isOwnerTipo ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-700"}`}>
                      {tipoLabel}
                    </span>
                  ) : (
                    <span className="text-neutral-500">—</span>
                  )}
                </div>
                {row.cedula && <p className="text-xs text-neutral-400 font-mono">Cédula: {row.cedula}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${row.can_issue ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"}`}>Asignar {row.can_issue ? "ON" : "OFF"}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${row.can_redeem ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"}`}>Cobrar {row.can_redeem ? "ON" : "OFF"}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => openEdit(row)} className="rounded-lg px-3 py-1.5 text-sm border border-red-600 text-red-600 hover:bg-red-50">Editar</button>
                  <button type="button" onClick={() => openResetPin(row)} className="rounded-lg px-3 py-1.5 text-sm border border-amber-600 text-amber-700 hover:bg-amber-50">Reset PIN</button>
                  {!row.is_owner && (
                    <button type="button" onClick={() => handleSetActive(row, !row.is_active)} className="rounded-lg px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700">
                      {row.is_active ? "Inactivar" : "Activar"}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Agregar staff */}
      <Modal open={addOpen} title="Agregar staff" onClose={() => { setAddOpen(false); setAddError(null); setError(null); }}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre (mín. 2 caracteres)</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Nombre completo"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cargo (rol en cafetería)</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              required
            >
              <option value="Staff">Staff</option>
              <option value="Cajero">Cajero</option>
              <option value="Barista">Barista</option>
              <option value="Encargado">Encargado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cédula (8 dígitos)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono"
              value={addCedula}
              onChange={(e) => setAddCedula(normalizeCi(e.target.value))}
              placeholder="8 dígitos"
              inputMode="numeric"
              autoComplete="off"
              required
            />
            {addCedula.length > 0 && !isValidCi(addCedula) && (
              <p className="text-xs text-amber-600 mt-1">La cédula debe tener exactamente 8 dígitos.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PIN (4 dígitos)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono"
              type="password"
              value={addPin}
              onChange={(e) => setAddPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar PIN</label>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono"
              type="password"
              value={addPinConfirm}
              onChange={(e) => setAddPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              required
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={addCanIssue} onChange={(e) => setAddCanIssue(e.target.checked)} />
              <span className="text-sm">Puede asignar cafecitos</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={addCanRedeem} onChange={(e) => setAddCanRedeem(e.target.checked)} />
              <span className="text-sm">Puede cobrar/canjear</span>
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={addIsActive} onChange={(e) => setAddIsActive(e.target.checked)} />
            <span className="text-sm">Activo</span>
          </label>
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
              <button type="submit" disabled={!isValidCi(addCedula) || addSubmitting} className="rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50">
                {addSubmitting ? "Creando…" : "Crear"}
              </button>
              <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg px-4 py-2 border border-neutral-300 hover:bg-neutral-100">
                Cancelar
              </button>
            </div>
            {addError && (
              <p className="text-sm text-red-600" role="alert">{addError}</p>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal Editar staff */}
      <Modal open={editOpen} title="Editar staff" onClose={() => { setEditOpen(false); setEditRow(null); setError(null); }}>
        {editRow && (
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre (mín. 2 caracteres)</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cargo (rol en cafetería)</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editCanIssue} onChange={(e) => setEditCanIssue(e.target.checked)} />
                <span className="text-sm">Puede asignar cafecitos</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editCanRedeem} onChange={(e) => setEditCanRedeem(e.target.checked)} />
                <span className="text-sm">Puede cobrar/canjear</span>
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
              <span className="text-sm">Activo</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={editSubmitting} className="rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50">
                {editSubmitting ? "Guardando…" : "Guardar"}
              </button>
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-lg px-4 py-2 border border-neutral-300 hover:bg-neutral-100">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Reset PIN */}
      <Modal open={resetPinOpen} title="Reset PIN" onClose={() => { setResetPinOpen(false); setResetPinRow(null); setError(null); }}>
        {resetPinRow && (
          <form onSubmit={handleResetPin} className="space-y-3">
            <p className="text-sm text-neutral-600">Nuevo PIN de 4 dígitos para {resetPinRow.full_name ?? resetPinRow.role}.</p>
            <div>
              <label className="block text-sm font-medium mb-1">PIN (4 dígitos)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 font-mono"
                type="password"
                value={resetPinValue}
                onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirmar PIN</label>
              <input
                className="w-full border rounded-lg px-3 py-2 font-mono"
                type="password"
                value={resetPinConfirm}
                onChange={(e) => setResetPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={resetPinSubmitting} className="rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50">
                {resetPinSubmitting ? "Actualizando…" : "Actualizar PIN"}
              </button>
              <button type="button" onClick={() => setResetPinOpen(false)} className="rounded-lg px-4 py-2 border border-neutral-300 hover:bg-neutral-100">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
