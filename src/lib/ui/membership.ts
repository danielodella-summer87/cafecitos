export type MembershipTier = {
  key: "bronce" | "plata" | "oro" | "reserva" | "leyenda";
  name: string;
  tagline: string;
  emoji: string;
  badgeClass: string; // pill
  dotClass: string; // dot color
  min: number;
  nextMin: number | null;
};

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    key: "bronce",
    name: "Bronce",
    tagline: "Nuevo cliente · Empezás a sumar cafecitos",
    emoji: "🟤",
    badgeClass: "bg-black text-white border border-black/10",
    dotClass: "bg-amber-700",
    min: 0,
    nextMin: 10,
  },
  {
    key: "plata",
    name: "Plata",
    tagline: "Cliente frecuente · Sumás más rápido",
    emoji: "⚪️",
    badgeClass: "bg-black text-white border border-black/10",
    dotClass: "bg-neutral-300",
    min: 10,
    nextMin: 30,
  },
  {
    key: "oro",
    name: "Oro",
    tagline: "Cliente VIP · Cafecitos extra en cada visita",
    emoji: "🟡",
    badgeClass: "bg-black text-white border border-black/10",
    dotClass: "bg-yellow-400",
    min: 30,
    nextMin: 60,
  },
  {
    key: "reserva",
    name: "Reserva",
    tagline: "Beneficios exclusivos · Experiencia premium",
    emoji: "🔴",
    badgeClass: "bg-black text-white border border-black/10",
    dotClass: "bg-red-500",
    min: 60,
    nextMin: 100,
  },
  {
    key: "leyenda",
    name: "Leyenda",
    tagline: "Máximo nivel · Sorpresas especiales",
    emoji: "💎",
    badgeClass: "bg-black text-white border border-black/10",
    dotClass: "bg-purple-500",
    min: 100,
    nextMin: null,
  },
];

export function getMembershipTier(balance: number): MembershipTier {
  const b = Number.isFinite(balance) ? balance : 0;
  // buscamos el último tier cuyo min <= balance
  let current = MEMBERSHIP_TIERS[0];
  for (const t of MEMBERSHIP_TIERS) {
    if (b >= t.min) current = t;
  }
  return current;
}

export function getNextTierInfo(balance: number): { nextName: string | null; remaining: number } {
  const tier = getMembershipTier(balance);
  if (!tier.nextMin) return { nextName: null, remaining: 0 };

  const next = MEMBERSHIP_TIERS.find((t) => t.min === tier.nextMin) ?? null;
  const remaining = Math.max(0, tier.nextMin - Math.max(0, balance));
  return { nextName: next?.name ?? null, remaining };
}
