export type TxType =
  | "earn"
  | "redeem"
  | "transfer_in"
  | "transfer_out"
  | "adjust"
  | string;

export type TxMeta = {
  label: string;
  icon: string;
  color: string; // tailwind class (ej: "text-green-600")
};

export function getTxLabel(type: TxType): string {
  return getTxMeta(type).label;
}

export function getTxMeta(type: TxType): TxMeta {
  switch (type) {
    case "earn":
      return {
        label: "Sumar cafecitos",
        icon: "logo",
        color: "text-green-700",
      };
    case "redeem":
      return {
        label: "Canjear cafecitos",
        icon: "✅",
        color: "text-orange-700",
      };
    case "transfer_in":
      return {
        label: "Transferencia recibida",
        icon: "⬇️",
        color: "text-green-700",
      };
    case "transfer_out":
      return {
        label: "Transferencia enviada",
        icon: "⬆️",
        color: "text-red-700",
      };
    case "adjust":
      return {
        label: "Ajuste",
        icon: "🛠️",
        color: "text-neutral-700",
      };
    default:
      return {
        label: "Movimiento",
        icon: "•",
        color: "text-neutral-700",
      };
  }
}
