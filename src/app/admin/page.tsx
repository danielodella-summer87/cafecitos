import { createOwner } from "@/app/actions/admin";

export default function AdminPage() {
  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Panel Admin</h1>

      <form action={createOwner as unknown as (formData: FormData) => void}>
        <input name="full_name" placeholder="Nombre owner" required />
        <input name="cedula" placeholder="Cédula" required />
        <input name="pin" placeholder="PIN" required />
        <input name="cafe_name" placeholder="Nombre cafetería" required />

        <button type="submit">Crear Owner</button>
      </form>
    </div>
  );
}