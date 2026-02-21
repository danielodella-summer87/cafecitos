/**
 * Contrato de bloques para contenido premium de Universo Café.
 * Compatible con formato legacy (h2/p/bullets) vía normalizeCoffeeContent.
 */
export type CoffeeBlock =
  | { type: "section"; title: string; variant?: "neutral" | "info" | "tip" | "warning" | "pro"; icon?: string }
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "checklist"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "callout"; variant: "info" | "tip" | "warning" | "pro"; title?: string; text: string }
  | { type: "quote"; text: string; author?: string }
  | { type: "divider" }
  // Legacy / compat (image no está en el contrato premium pero el renderer puede soportarlo)
  | { type: "image"; url?: string; alt?: string };

export type CoffeeContent = { blocks: CoffeeBlock[] };

const PREMIUM_TYPES = ["section", "callout", "steps", "checklist", "quote", "divider"] as const;

function isPremiumShape(blocks: unknown[]): boolean {
  return blocks.some((b) => b && typeof b === "object" && PREMIUM_TYPES.includes((b as { type?: string }).type as any));
}

function mapLegacyBlock(block: { type?: string; text?: string; content?: string; items?: string[] }): CoffeeBlock | null {
  if (!block || typeof block.type !== "string") return null;
  switch (block.type) {
    case "h2":
      return {
        type: "section",
        title: typeof block.text === "string" ? block.text : "",
        variant: "neutral",
        icon: "logo",
      };
    case "p":
      return { type: "p", text: typeof block.text === "string" ? block.text : "" };
    case "text":
      return { type: "p", text: typeof block.content === "string" ? block.content : "" };
    case "bullets":
      return { type: "bullets", items: Array.isArray(block.items) ? block.items : [] };
    case "image":
      return {
        type: "image",
        url: typeof (block as { url?: string }).url === "string" ? (block as { url: string }).url : undefined,
        alt: typeof (block as { alt?: string }).alt === "string" ? (block as { alt: string }).alt : undefined,
      };
    default:
      return null;
  }
}

/**
 * Normaliza contenido a { blocks: CoffeeBlock[] }.
 * Si ya viene en formato premium (section/callout/steps/...) lo devuelve tal cual.
 * Si viene en formato viejo (h2/p/bullets) lo convierte manteniendo compatibilidad.
 */
export function normalizeCoffeeContent(input: unknown): CoffeeContent {
  if (!input || typeof input !== "object") return { blocks: [] };
  const raw = input as { blocks?: unknown[] };
  const blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  if (blocks.length === 0) return { blocks: [] };

  if (isPremiumShape(blocks)) {
    return { blocks: blocks as CoffeeBlock[] };
  }

  const out: CoffeeBlock[] = [];
  for (const b of blocks) {
    const mapped = mapLegacyBlock(b as Record<string, unknown>);
    if (mapped) out.push(mapped);
  }
  return { blocks: out };
}
