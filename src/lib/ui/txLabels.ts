export type TxType = "earn" | "redeem" | "transfer_out" | "transfer_in" | "adjust";

export type TxMeta = {
  label: string;
  icon: string;
  tone: "plus" | "minus" | "neutral";
};

export function getTxMeta(type: TxType): TxMeta {
  switch (type) {
    case "earn":
      return { label: "Sumar cafecitos", icon: "☕", tone: "plus" };
    case "redeem":
      return { label: "Canjear cafecitos", icon: "☕", tone: "minus" };
    case "transfer_in":
      return { label: "Transferencia recibida", icon: "↘️", tone: "plus" };
    case "transfer_out":
      return { label: "Transferencia enviada", icon: "↗️", tone: "minus" };
    case "adjust":
      return { label: "Ajuste", icon: "🛠️", tone: "neutral" };
    default:
      return { label: "Movimiento", icon: "•", tone: "neutral" };
  }
}

export function getTxLabel(type: TxType): string {
  return getTxMeta(type).label;
}
