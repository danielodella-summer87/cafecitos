"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCafePublicInfo, upsertCafeReview, type CafePublicInfo } from "@/app/actions/cafeInfo";
import { Button } from "@/app/ui/components";
import CafeName from "@/app/ui/CafeName";

const FALLBACK_COVER = "/media/cover-default.jpg";

type CafeInfoModalProps = {
  open: boolean;
  cafeId: string;
  onClose: () => void;
};

export default function CafeInfoModal({ open, cafeId, onClose }: CafeInfoModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CafePublicInfo | null>(null);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [cafeImgSrc, setCafeImgSrc] = useState(FALLBACK_COVER);

  useEffect(() => {
    if (!open || !cafeId) {
      setData(null);
      setError(null);
      setRating(0);
      setComment("");
      setCafeImgSrc(FALLBACK_COVER);
      return;
    }
    setLoading(true);
    setError(null);
    setCafeImgSrc(FALLBACK_COVER);
    getCafePublicInfo(cafeId)
      .then((res) => {
        setData(res);
        if (res?.cafe?.image_code != null) {
          const code2 = String(res.cafe.image_code).padStart(2, "0");
          setCafeImgSrc(`/media/cafes/${code2}.jpg`);
        }
      })
      .catch(() => setError("No se pudo cargar la información"))
      .finally(() => setLoading(false));
  }, [open, cafeId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSaveReview() {
    if (!cafeId || rating < 1 || rating > 5) return;
    setSavingReview(true);
    const result = await upsertCafeReview({ cafe_id: cafeId, rating, comment });
    setSavingReview(false);
    if (result.ok && data) {
      const fresh = await getCafePublicInfo(cafeId);
      if (fresh) setData(fresh);
    }
  }

  const titleText = data ? null : "Cargando…";

  const address = (data?.cafe?.address ?? "").trim();
  const city = (data?.cafe?.city ?? "").trim();
  const mapQuery = encodeURIComponent(`${address} ${city}`.trim());
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#F6EFE6] shadow-xl animate-[fadeIn_.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky premium */}
        <div className="sticky top-0 z-10 border-b border-[rgba(15,23,42,0.1)] bg-[#F6EFE6] px-6 py-4">
          {data?.cafe ? (
            <button
              type="button"
              onClick={() => {
                router.push(`/app/cafes/${data.cafe.id}`);
                onClose();
              }}
              className="text-xl font-semibold text-[#0F172A] transition hover:opacity-70 cursor-pointer text-left w-full"
            >
              <CafeName cafe={data.cafe} />
            </button>
          ) : (
            <span className="text-xl font-semibold text-[#0F172A]">{titleText ?? "Cargando…"}</span>
          )}
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {loading && <p className="text-sm text-slate-600">Cargando…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && data && (
            <div className="space-y-5">
              {/* Imagen de la cafetería (image_code 01..99, fallback cover-default) */}
              <div className="mb-4 overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.10)]">
                <div className="relative h-40 w-full">
                  <Image
                    src={cafeImgSrc}
                    alt={data.cafe?.name ? `Foto de ${String(data.cafe.image_code ?? "").padStart(2, "0")} - ${data.cafe.name}` : "Foto de cafetería"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 720px"
                    onError={() => setCafeImgSrc(FALLBACK_COVER)}
                  />
                </div>
              </div>

              {/* Ubicación */}
              <section>
                <h3 className="text-sm font-semibold text-[#0F172A]">Ubicación</h3>
                <p className="mt-1 text-sm text-slate-700">
                  {[data.cafe.city, data.cafe.address].filter(Boolean).join(" · ") || "—"}
                </p>
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block"
                >
                  <Button type="button" variant="ghost" size="sm">
                    Ver en mapa
                  </Button>
                </a>
              </section>

              {/* Horario */}
              <section>
                <h3 className="text-sm font-semibold text-[#0F172A]">Horario</h3>
                <p className="mt-1 text-sm text-slate-700">
                  {data.cafe.hours_text?.trim() || "Horario a confirmar"}
                </p>
              </section>

              {/* Promos activas */}
              <section>
                <h3 className="text-sm font-semibold text-[#0F172A]">Promos activas</h3>
                {data.promos.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-600">Ninguna por el momento</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {data.promos.slice(0, 3).map((p) => (
                      <li key={p.promo_id} className="rounded-lg border border-[rgba(15,23,42,0.1)] bg-white/50 px-3 py-2">
                        <span className="font-medium text-[#0F172A]">{p.title}</span>
                        {p.description && (
                          <p className="mt-0.5 text-xs text-slate-600">{p.description}</p>
                        )}
                      </li>
                    ))}
                    {data.promos.length > 3 && (
                      <p className="text-xs text-slate-500">Ver todas (próximamente)</p>
                    )}
                  </ul>
                )}
              </section>

              {/* Reseñas */}
              <section>
                <h3 className="text-sm font-semibold text-[#0F172A]">Reseñas</h3>
                <p className="mt-1 text-sm text-slate-700">
                  ⭐ {data.reviewsStats ? Number(data.reviewsStats.avg_rating).toFixed(1) : "—"}
                  {data.reviewsStats != null && (
                    <span className="text-slate-500"> ({data.reviewsStats.reviews_count})</span>
                  )}
                </p>
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">Calificar</p>
                  <div className="mb-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          rating === n
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input min-h-[80px] resize-y"
                    placeholder="Comentario (opcional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="mt-2 w-full sm:w-auto"
                    disabled={rating < 1 || savingReview}
                    onClick={handleSaveReview}
                  >
                    {savingReview ? "Guardando…" : "Guardar reseña"}
                  </Button>
                </div>
              </section>

              {/* Cerrar */}
              <div className="pt-2">
                <Button type="button" variant="danger" className="w-full sm:w-auto" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
