"use client";

import { useRouter } from "next/navigation";
import { Container, PageHeader, Button } from "@/app/ui/components";
import { AppMark } from "@/components/brand/AppMark";
import CafeForm from "../../CafeForm";

type StaffRow = {
  id?: string;
  name: string;
  role: string;
  is_owner?: boolean;
};

export default function EditCafeClient({
  cafe,
  staff,
}: {
  cafe: {
    id: string;
    name: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    email?: string | null;
    instagram?: string | null;
    description?: string | null;
    image_code?: string | null;
    is_active?: boolean | null;
    hours_text?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  staff: StaffRow[];
}) {
  const router = useRouter();

  const initial = {
    id: cafe.id,
    name: cafe.name ?? "",
    city: cafe.city ?? "",
    address: cafe.address ?? "",
    phone: cafe.phone ?? "",
    email: cafe.email ?? "",
    instagram: cafe.instagram ?? "",
    description: cafe.description ?? "",
    hours_text: cafe.hours_text ?? "",
    image_code: cafe.image_code ?? "",
    is_active: cafe.is_active ?? true,
    lat: cafe.lat ?? undefined,
    lng: cafe.lng ?? undefined,
    staff:
      staff.length > 0
        ? staff
        : [{ name: "", role: "Dueño/a", is_owner: true }],
  };

  return (
    <Container>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <AppMark iconOnly iconSize={18} />
            <span>Editar cafetería</span>
          </span>
        }
        subtitle="Actualizá datos, horario y personas autorizadas."
        rightSlot={
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/app/admin/cafes")}
          >
            Volver
          </Button>
        }
      />

      <CafeForm
        mode="edit"
        initialCode={(initial.image_code || "").toString().padStart(2, "0")}
        initialValues={initial}
        onCancel={() => router.push("/app/admin/cafes")}
        onSave={() => router.push("/app/admin/cafes")}
      />
    </Container>
  );
}
