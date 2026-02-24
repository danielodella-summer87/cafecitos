"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCafePublicInfo, type CafePublicInfo } from "@/app/actions/cafeInfo";
import { resolvePublicImage } from "@/lib/media";
import { resolvePromotionImage } from "@/lib/resolvePromotionImage";
import { Button } from "@/app/ui/components";
import CafeName from "@/app/ui/CafeName";

const FALLBACK_COVER = "/media/cover-default.jpg";

type CafeInfoModalProps = {
  open: boolean;
  cafeId: string;
  onClose: () => void;
  isAdmin?: boolean;
  /** Nombre para el header cuando la data aún no cargó (ej. desde lista). */
  cafeName?: string;
};

/** Campos opcionales para UI (pueden no existir en backend aún). */
type CafeDetailUI = CafePublicInfo["cafe"] & {
  phone?: string | null;
  whatsapp?: string | null;
  history?: string | null;
  gallery_url?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const TAB_IDS = ["info", "promos", "resenas", "historia", "carta", "galeria", "servicios", "pagos"] as const;
const TAB_LABELS: Record<(typeof TAB_IDS)[number], string> = {
  info: "Info",
  promos: "Promos",
  resenas: "Reseñas",
  historia: "Historia",
  carta: "Carta de cafés",
  galeria: "Galería",
  servicios: "Servicios",
  pagos: "Pagos",
};

function formatReviewDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function osmTileUrl(lat: number, lng: number, zoom = 16) {
  const n = Math.pow(2, zoom);

  // X correcto
  const x = Math.floor(((lng + 180) / 360) * n);

  // Y correcto (IMPORTANTE: usar fórmula estándar Web Mercator)
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
  );

  // clamp seguridad
  const tileX = Math.max(0, Math.min(n - 1, x));
  const tileY = Math.max(0, Math.min(n - 1, y));

  return `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
}

/** Normaliza teléfono: quita espacios, guiones, paréntesis. Para wa.me sin '+'. */
function normalizePhone(input: string): string {
  const cleaned = input.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  return cleaned.replace(/\D/g, "").trim();
}

/** E164 sin + para wa.me. */
function toE164(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length >= 9) return digits.startsWith("598") ? digits : `598${digits.slice(-8)}`;
  return digits || "598";
}

/** Para tel: href, con + si es internacional. */
function toTelHref(phone: string): string {
  const digits = normalizePhone(phone);
  const e164 = toE164(phone);
  return `tel:+${e164}`;
}

export default function CafeInfoModal({ open, cafeId, onClose, isAdmin = false, cafeName: propsCafeName }: CafeInfoModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CafePublicInfo | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TAB_IDS)[number]>("info");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [cafeImgSrc, setCafeImgSrc] = useState(FALLBACK_COVER);

  const raw = data as Record<string, unknown> | null;
  const cafeRaw = (raw?.cafe ?? (raw as any)?.data?.cafe ?? (raw as any)?.cafe_public ?? raw) as Record<string, unknown> | null | undefined;
  const cafe = cafeRaw as CafeDetailUI | null | undefined;

  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[CafeInfoModal]", { cafeId });
  }

  const city = String(
    cafeRaw?.city ??
    cafeRaw?.ciudad ??
    cafeRaw?.location_city ??
    (cafeRaw?.location as Record<string, unknown>)?.city ??
    cafeRaw?.address_city ??
    ""
  ).trim();
  const address = String(
    cafeRaw?.address ??
    cafeRaw?.direccion ??
    cafeRaw?.street ??
    cafeRaw?.location_address ??
    (cafeRaw?.location as Record<string, unknown>)?.address ??
    cafeRaw?.address_line ??
    cafeRaw?.street_line ??
    ""
  ).trim();
  const hours = String(
    cafeRaw?.hours_text ??
    cafeRaw?.hours ??
    cafeRaw?.horario ??
    cafeRaw?.schedule ??
    cafeRaw?.opening_hours ??
    ""
  ).trim();
  const addressLine = city || address ? `${city}${city && address ? " · " : ""}${address}` : "—";
  const hoursLine = hours ? hours : "A confirmar";
  const displayTitle = propsCafeName ?? (cafe?.name ?? (cafeRaw as any)?.title ?? "Cafetería");
  const addressText = [city, address].filter(Boolean).join(", ");
  const query = [city, address].filter(Boolean).join(" ");
  const hasQuery = query.trim().length > 0;
  const lat = cafe?.lat ?? null;
  const lng = cafe?.lng ?? null;
  const hasLatLng = lat != null && lng != null;
  const mapHref = hasLatLng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  const mapImgSrc = hasLatLng ? osmTileUrl(lat!, lng!, 16) : null;

  const phone = cafe?.phone?.trim() || null;
  const whatsapp = cafe?.whatsapp?.trim() || cafe?.phone?.trim() || null;
  const waMsg = "Hola! Vi tu cafetería en Cafecitos y quería consultar…";
  const waHref = whatsapp ? `https://wa.me/${toE164(whatsapp)}?text=${encodeURIComponent(waMsg)}` : "#";
  const telHref = phone ? toTelHref(phone) : "#";
  const hasContact = Boolean(phone || whatsapp);
  const promosCount = (data?.promos ?? (raw as any)?.promos)?.length ?? 0;
  const showDebug = false;

  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
      setRating(0);
      setComment("");
      setActiveTab("info");
      setCafeImgSrc(FALLBACK_COVER);
      return;
    }
    if (!cafeId || cafeId.trim() === "") {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setCafeImgSrc(FALLBACK_COVER);
    getCafePublicInfo(cafeId)
      .then((res) => {
        setData(res as CafePublicInfo | null);
        const c = (res as { cafe?: { image_path?: string | null } })?.cafe ?? (res as { data?: { cafe?: { image_path?: string | null } } })?.data?.cafe ?? res;
        const img = resolvePublicImage((c as { image_path?: string | null })?.image_path ?? null);
        if (img) setCafeImgSrc(img);
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cafe-modal-title"
    >
      <div
        className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-2xl bg-[#F6EFE6] shadow-xl animate-[fadeIn_.2s_ease-out] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fijo: nombre + cerrar */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.1)] bg-[#F6EFE6] px-4 py-3">
          {cafe?.id ? (
            <button
              type="button"
              onClick={() => {
                router.push(`/app/cafes/${cafe.id}`);
                onClose();
              }}
              id="cafe-modal-title"
              className="min-w-0 flex-1 text-left text-lg font-semibold text-[#0F172A] hover:opacity-80 transition-opacity"
            >
              <CafeName cafe={cafe as CafePublicInfo["cafe"]} />
            </button>
          ) : (
            <span id="cafe-modal-title" className="text-lg font-semibold text-[#0F172A]">
              {loading ? "Cargando…" : displayTitle}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-600 hover:bg-black/5 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            aria-label="Cerrar"
          >
            <span className="text-xl leading-none" aria-hidden>×</span>
          </button>
        </div>

        {/* Hero imagen */}
        <div className="relative h-44 w-full shrink-0 overflow-hidden bg-slate-200">
          <Image
            src={cafeImgSrc}
            alt={cafe?.name ? `Foto de ${cafe.name}` : "Foto de cafetería"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            onError={() => setCafeImgSrc(FALLBACK_COVER)}
            priority
          />
        </div>

        {/* Tabs: siempre visibles cuando el modal está abierto */}
        <div
          className="sticky top-0 z-10 shrink-0 border-b border-[rgba(15,23,42,0.1)] bg-[#F6EFE6]"
          role="tablist"
          aria-label="Secciones de la cafetería"
        >
          <div className="flex gap-1 overflow-x-auto px-3 py-2 hide-scrollbar">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                aria-controls={`panel-${id}`}
                id={`tab-${id}`}
                onClick={() => setActiveTab(id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-1 inline-flex items-center gap-1.5 ${
                  activeTab === id
                    ? "bg-red-600 text-white shadow-sm ring-1 ring-red-700/20"
                    : "bg-white/60 text-slate-700 hover:bg-white/80"
                }`}
              >
                {TAB_LABELS[id]}
                {id === "promos" && promosCount > 0 && (
                  <span className="rounded-full bg-red-600 text-white text-[10px] font-semibold min-w-[18px] h-[18px] flex items-center justify-center px-2">
                    {promosCount > 99 ? "99+" : promosCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Panel con scroll: loading / error / contenido por tab */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {process.env.NODE_ENV === "development" && showDebug && (
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffe69c",
                borderRadius: 8,
                padding: 8,
                fontSize: 11,
                marginBottom: 8,
                overflow: "auto",
                maxHeight: 70,
                lineHeight: 1.3,
                whiteSpace: "pre-wrap",
              }}
            >
              DEBUG CAFE MODAL
              {"\n"}
              open: {String(open)}
              {"\n"}
              cafeId: {String(cafeId)} (type: {typeof cafeId}, len: {String(cafeId ?? "").length})
              {"\n"}
              loading: {String(loading)}
              {"\n"}
              error: {String((error as any)?.message ?? error ?? "")}
              {"\n\n"}
              data.cafe:
              {"\n"}
              {JSON.stringify((data as any)?.cafe ?? null, null, 2)}
              {"\n\n"}
              data.debug (action):
              {"\n"}
              {JSON.stringify((data as any)?.debug ?? null, null, 2)}
            </div>
          )}
          {loading && (
            <div className="text-center text-slate-500 py-10">
              Cargando…
            </div>
          )}

          {!loading && error && (
            <div className="text-center text-red-500 py-10">
              Error al cargar información.
            </div>
          )}

          {!loading && !error && !cafeId?.trim() && (
            <div className="text-center text-slate-500 py-10">
              Sin ID de cafetería.
            </div>
          )}

          {!loading && !error && cafeId?.trim() && data && !(data as any)?.cafe && (
            <div className="text-center text-slate-600 py-10">
              No se pudieron cargar datos de la cafetería.
            </div>
          )}

          {!loading && !error && !data && (
            <div className="text-center text-slate-600 py-10">
              No se pudieron cargar datos de la cafetería.
            </div>
          )}

          {!loading && !error && data && (data as any)?.cafe && (
            <>
                {/* Panel Info */}
                {activeTab === "info" && (
                  <div id="panel-info" role="tabpanel" aria-labelledby="tab-info" className="space-y-4">
                    <section>
                      <h4 className="text-sm font-semibold text-[#0F172A]">Dirección</h4>
                      <p className="mt-1 text-sm text-slate-700">{addressLine}</p>
                    </section>

                    {/* Mini mapa clickeable (OpenStreetMap, sin API key) + botón Ver en mapa */}
                    {(hasQuery || hasLatLng) && mapHref && (
                      <>
                        {hasLatLng && (
                          <iframe
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 0.002},${lat! - 0.002},${lng! + 0.002},${lat! + 0.002}&layer=mapnik&marker=${lat!},${lng!}`}
                            className="w-full h-[280px] border-0 rounded-lg"
                            loading="lazy"
                          />
                        )}
                        <a
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                          Ver en mapa
                        </a>
                        {process.env.NODE_ENV === "development" && (mapHref || mapImgSrc) && (
                          <div style={{ fontSize: 12, marginTop: 8, wordBreak: "break-all" }}>
                            {mapHref && (
                              <>
                                <div><b>MAP URL:</b></div>
                                <a href={mapHref} target="_blank" rel="noreferrer">{mapHref}</a>
                              </>
                            )}
                            {mapImgSrc && (
                              <>
                                <div style={{ marginTop: 6 }}><b>TILE URL (pegá en el navegador):</b></div>
                                <a href={mapImgSrc} target="_blank" rel="noreferrer">{mapImgSrc}</a>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    <section>
                      <h4 className="text-sm font-semibold text-[#0F172A]">Horario</h4>
                      <p className="mt-1 text-sm text-slate-700">{hoursLine}</p>
                    </section>

                    {/* Contacto: tel + WhatsApp, botones lado a lado */}
                    <section>
                      <h4 className="text-sm font-semibold text-[#0F172A]">Contacto</h4>
                      {hasContact ? (
                        <>
                          {(phone || whatsapp) && (
                            <p className="mt-1 text-sm text-slate-700">
                              {phone && whatsapp && phone !== whatsapp ? `${phone} · ${whatsapp}` : (phone || whatsapp)}
                            </p>
                          )}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {phone && (
                              <a href={telHref} className="inline-block">
                                <Button type="button" variant="ghost" size="sm" className="w-full border border-slate-200">
                                  Llamar
                                </Button>
                              </a>
                            )}
                            {whatsapp && (
                              <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-block">
                                <Button type="button" variant="danger" size="sm" className="w-full">
                                  WhatsApp
                                </Button>
                              </a>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">—</p>
                      )}
                    </section>
                  </div>
                )}

                {/* Panel Promos */}
                {activeTab === "promos" && (
                  <div id="panel-promos" role="tabpanel" aria-labelledby="tab-promos">
                    <h4 className="text-sm font-semibold text-[#0F172A]">Promos activas</h4>
                    {(data?.promos ?? []).length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">Ninguna por el momento</p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {(data?.promos ?? []).map((p) => (
                          <li
                            key={p.promo_id}
                            className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white/50 overflow-hidden"
                          >
                            <div className="relative h-24 w-full bg-neutral-100">
                              <img
                                src={resolvePromotionImage({ image_path: p.image_path ?? null })}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = FALLBACK_COVER;
                                }}
                              />
                            </div>
                            <div className="px-4 py-3">
                              <span className="font-medium text-[#0F172A]">{p.title}</span>
                              {p.description && (
                                <p className="mt-1 text-xs text-slate-600">{p.description}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Panel Reseñas */}
                {activeTab === "resenas" && (
                  <div id="panel-resenas" role="tabpanel" aria-labelledby="tab-resenas" className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[#0F172A]">Reseñas</h4>
                      {data?.reviewsStats != null ? (
                        <p className="mt-1 text-sm text-slate-700">
                          ⭐ {Number(data.reviewsStats.avg_rating).toFixed(1)}
                          <span className="text-slate-500"> ({data.reviewsStats.reviews_count})</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-600">Aún no hay reseñas</p>
                      )}
                    </div>
                    {(data?.reviews ?? []).length > 0 && (
                      <div className="space-y-3">
                        {(data?.reviews ?? []).map((r) => (
                          <div
                            key={r.id}
                            className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white/50 p-3"
                          >
                            <div className="text-sm font-medium text-[#0F172A]">⭐ {r.rating}</div>
                            {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
                            <p className="mt-1 text-xs text-slate-400">{formatReviewDate(r.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isAdmin && (
                      <div className="pt-2">
                        <p className="mb-2 text-sm font-medium text-slate-700">Calificar</p>
                        <div className="mb-3 flex gap-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setRating(n)}
                              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 ${
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
                          className="input min-h-[80px] w-full resize-y"
                          placeholder="Comentario (opcional)"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                        <div className="mt-2">
                          <Button type="button" variant="danger" size="sm" disabled>
                            Enviar
                          </Button>
                          <p className="mt-1 text-[11px] text-slate-500">Próximamente</p>
                        </div>
                      </div>
                    )}
                    {isAdmin && (
                      <p className="text-sm text-slate-600">Solo los clientes pueden calificar.</p>
                    )}
                  </div>
                )}

                {/* Panel Historia */}
                {activeTab === "historia" && (
                  <div id="panel-historia" role="tabpanel" aria-labelledby="tab-historia">
                    <h4 className="text-sm font-semibold text-[#0F172A]">Historia</h4>
                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {(cafe as CafeDetailUI)?.history?.trim() || "Estamos preparando la historia de esta cafetería."}
                    </p>
                  </div>
                )}

                {/* Panel Carta de cafés */}
                {activeTab === "carta" && (
                  <div id="panel-carta" role="tabpanel" aria-labelledby="tab-carta">
                    <h4 className="text-sm font-semibold text-[#0F172A]">Carta de cafés</h4>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {["Espresso", "Capuccino", "Filtrados", "Especialidad"].map((label) => (
                        <li key={label} className="rounded-lg border border-[rgba(15,23,42,0.08)] bg-white/40 px-3 py-2">
                          {label}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">Próximamente</p>
                  </div>
                )}

                {/* Panel Galería */}
                {activeTab === "galeria" && (
                  <div id="panel-galeria" role="tabpanel" aria-labelledby="tab-galeria">
                    <h4 className="text-sm font-semibold text-[#0F172A]">Galería</h4>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-xl bg-slate-200/80 border border-[rgba(15,23,42,0.08)]"
                          aria-hidden
                        />
                      ))}
                    </div>
                    {(cafe as CafeDetailUI)?.gallery_url ? (
                      <a
                        href={(cafe as CafeDetailUI).gallery_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block"
                      >
                        <Button type="button" variant="danger" size="sm">
                          Ver carpeta de fotos
                        </Button>
                      </a>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Fotos próximamente</p>
                    )}
                  </div>
                )}

                {/* Panel Servicios (placeholder) */}
                {activeTab === "servicios" && (
                  <div id="panel-servicios" role="tabpanel" aria-labelledby="tab-servicios">
                    <h4 className="text-sm font-semibold text-[#0F172A]">Servicios</h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Wifi", "Enchufes", "Pet friendly", "Take away"].map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-[rgba(15,23,42,0.15)] bg-white/50 px-3 py-1.5 text-sm text-slate-600"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Próximamente</p>
                  </div>
                )}

                {/* Panel Pagos (placeholder) */}
                {activeTab === "pagos" && (
                  <div id="panel-pagos" role="tabpanel" aria-labelledby="tab-pagos">
                    <h4 className="text-sm font-semibold text-[#0F172A]">Pagos</h4>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {["Efectivo", "Tarjeta", "Mercado Pago"].map((label) => (
                        <li key={label} className="rounded-lg border border-[rgba(15,23,42,0.08)] bg-white/40 px-3 py-2">
                          {label}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">Próximamente</p>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Footer: botón Cerrar siempre visible */}
        <div className="shrink-0 border-t border-[rgba(15,23,42,0.1)] p-4">
          <Button type="button" variant="danger" className="w-full sm:w-auto" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
