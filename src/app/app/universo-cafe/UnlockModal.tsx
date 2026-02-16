"use client";

type Props = {
  minTierSlug: string;
  missingPoints?: number;
  onClose: () => void;
};

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  leyenda: "Leyenda",
};

export default function UnlockModal({ minTierSlug, missingPoints, onClose }: Props) {
  const tierName = TIER_LABELS[minTierSlug] ?? minTierSlug;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-modal-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="mb-4 text-center text-2xl" aria-hidden>
          🔒
        </div>
        <h2 id="unlock-modal-title" className="text-lg font-semibold text-center text-neutral-900">
          Contenido exclusivo
        </h2>
        <p className="mt-2 text-sm text-neutral-600 text-center">
          Desbloqueá esta guía con nivel <strong>{tierName}</strong>.
        </p>
        {missingPoints != null && missingPoints > 0 && (
          <p className="mt-1 text-sm text-neutral-500 text-center">
            Te faltan <strong>{missingPoints}</strong> cafecitos para llegar a {tierName}.
          </p>
        )}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
