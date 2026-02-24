"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Container, Button, Card, CardTitle, Badge } from "@/app/ui/components";
import CafeName from "@/app/ui/CafeName";
import { getNextImageCode } from "@/app/actions/cafes";
import type { CafeListItem } from "@/app/actions/cafes";
import { resolveCafeImage } from "@/lib/resolveCafeImage";
import { SHOW_MEDIA_DEBUG, getImageDebugLabel } from "@/lib/mediaDebug";
import CafeForm from "./CafeForm";
import CafeInfoModal from "@/app/app/consumer/CafeInfoModal";

const COVER_DEFAULT = "/media/cover-default.jpg";

function CafeListCard({
  cafe,
  onOpenInfo,
  onEdit,
}: {
  cafe: CafeListItem;
  onOpenInfo: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const imgPath = resolveCafeImage(cafe);
  const [src, setSrc] = useState(imgPath);

  useEffect(() => {
    setSrc(imgPath);
  }, [imgPath]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative h-36 w-full bg-[#F1F5F9]">
        <Image
          src={src}
          alt={cafe.name ? `Foto ${cafe.name}` : "Cafetería"}
          fill
          className="object-cover"
          onError={() => setSrc(COVER_DEFAULT)}
        />
      </div>
      {SHOW_MEDIA_DEBUG && (
        <div className="text-[10px] opacity-60 mt-1 break-all px-4">
          {getImageDebugLabel(src, COVER_DEFAULT)}
        </div>
      )}
      <div className="p-4">
        <CardTitle>
          <CafeName cafe={cafe} />
        </CardTitle>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {cafe.is_active ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Activa
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Inactiva
            </span>
          )}
          <button
            type="button"
            onClick={() => onEdit(cafe.id)}
            className="text-sm font-medium text-amber-600 hover:underline"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onOpenInfo(cafe.id)}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Info
          </button>
        </div>
      </div>
    </Card>
  );
}

type Props = {
  cafes: CafeListItem[];
  nextCode: string;
};

export default function CafeListClient({ cafes: initialCafes, nextCode }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [nextCodeState, setNextCodeState] = useState(nextCode);
  const [openInfoCafeId, setOpenInfoCafeId] = useState<string | null>(null);

  useEffect(() => {
    setNextCodeState(nextCode);
  }, [nextCode]);

  async function openForm() {
    const code = await getNextImageCode();
    setNextCodeState(code);
    setCreating(true);
  }

  return (
    <Container>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="danger"
          onClick={() => router.push("/app/admin")}
        >
          ← Volver
        </Button>
        <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-[#0F172A]">
          Cafeterías
        </h1>
        <Button type="button" onClick={openForm}>
          + Nueva cafetería
        </Button>
      </div>

      {!creating && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialCafes.length === 0 ? (
            <p className="text-[#64748B]">Aún no hay cafeterías. Creá la primera.</p>
          ) : (
            initialCafes.map((cafe) => (
              <CafeListCard
                key={cafe.id}
                cafe={cafe}
                onOpenInfo={setOpenInfoCafeId}
                onEdit={(id) => router.push(`/app/admin/cafes/${id}/edit`)}
              />
            ))
          )}
        </div>
      )}

      {creating && (
        <CafeForm
          initialCode={nextCodeState}
          onCancel={() => setCreating(false)}
          onSave={() => setCreating(false)}
        />
      )}

      {openInfoCafeId && (
        <CafeInfoModal
          open={true}
          cafeId={openInfoCafeId}
          cafeName={initialCafes.find((c) => c.id === openInfoCafeId)?.name}
          onClose={() => setOpenInfoCafeId(null)}
          isAdmin={true}
        />
      )}
    </Container>
  );
}
