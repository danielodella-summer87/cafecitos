"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container, Button, Card, CardTitle, Badge } from "@/app/ui/components";
import CafeName from "@/app/ui/CafeName";
import { getNextImageCode } from "@/app/actions/cafes";
import type { CafeListItem } from "@/app/actions/cafes";
import CafeForm from "./CafeForm";

const COVER_DEFAULT = "/media/cover-default.jpg";

function CafeListCard({ cafe }: { cafe: CafeListItem }) {
  const code = (cafe.image_code ?? "").trim();
  const imgPath = /^[0-9]{2}$/.test(code)
    ? `/media/cafes/${code}.jpg`
    : COVER_DEFAULT;
  const [src, setSrc] = useState(imgPath);

  useEffect(() => {
    setSrc(imgPath);
  }, [imgPath]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative h-36 w-full bg-[#F1F5F9]">
        <Image
          src={src}
          alt={`${(cafe.image_code ?? "").toString().padStart(2, "0")} - ${cafe.name}`}
          fill
          className="object-cover"
          onError={() => setSrc(COVER_DEFAULT)}
        />
      </div>
      <div className="p-4">
        <CardTitle>
          <CafeName cafe={cafe} />
        </CardTitle>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {cafe.is_active ? (
            <Badge variant="success">Activa</Badge>
          ) : (
            <Badge variant="neutral">Inactiva</Badge>
          )}
          <Link
            href={`/app/admin/cafes/${cafe.id}/edit`}
            className="text-sm font-medium text-[#C0841A] hover:underline"
          >
            Editar
          </Link>
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
              <CafeListCard key={cafe.id} cafe={cafe} />
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
    </Container>
  );
}
