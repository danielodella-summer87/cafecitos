"use client";

import * as React from "react";
import Image from "next/image";

type Props = {
  className?: string;
  iconSize?: number;
  iconAlt?: string;
  /** Si true, solo renderiza el ícono (logo), sin el texto "CafecitoS". */
  iconOnly?: boolean;
  /** Si false, solo ícono (igual que iconOnly). Default true. */
  showText?: boolean;
};

const LOGO_SRC = "/logocafecito2026.png";

/** Fallback cuando la imagen no carga: círculo neutro (sin emoji taza). */
function LogoFallback({ size }: { size: number }) {
  return (
    <span
      className="inline-block rounded-full bg-slate-300"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export function AppMark({
  className,
  iconSize,
  iconAlt = "Cafecitos logo",
  iconOnly = false,
  showText = true,
}: Props) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const size = iconSize ?? 32;
  const iconOnlyMode = iconOnly || !showText;

  const iconEl = (
    <span
      className="relative box-border flex shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-slate-100"
      style={{ width: size, height: size }}
    >
      {!imgFailed ? (
        <Image
          src={LOGO_SRC}
          alt={iconAlt}
          width={size}
          height={size}
          className={`h-full w-full shrink-0 object-contain ${iconOnlyMode ? "translate-y-[1px]" : ""}`}
          priority={false}
          unoptimized
          onError={() => setImgFailed(true)}
        />
      ) : (
        <LogoFallback size={size} />
      )}
    </span>
  );

  if (iconOnlyMode) {
    return <span className={["inline-flex items-center", className].filter(Boolean).join(" ")}>{iconEl}</span>;
  }

  return (
    <div
      className={[
        "inline-flex items-center gap-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {iconEl}
      <span className="text-lg font-bold tracking-tight">
        <span className="text-red-600">C</span>
        <span className="font-bold text-slate-900">afecito</span>
        <span className="text-red-600">S</span>
      </span>
    </div>
  );
}
