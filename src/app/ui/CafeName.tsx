"use client";

import React from "react";
import { AppMark } from "@/components/brand/AppMark";

type CafeLike = {
  name?: string | null;
  image_code?: string | number | null;
};

function pad2(code: CafeLike["image_code"]) {
  const s = (code ?? "").toString().trim();
  if (!s) return "--";
  return s.padStart(2, "0").slice(-2);
}

export default function CafeName({
  cafe,
  className = "",
  codeClassName = "",
  sep = " - ",
  showCup = false,
}: {
  cafe: CafeLike;
  className?: string;
  codeClassName?: string;
  sep?: string;
  showCup?: boolean;
}) {
  const code = pad2(cafe.image_code);
  const name = (cafe.name ?? "Cafetería").toString().trim() || "Cafetería";

  return (
    <span className={className}>
      {showCup ? <AppMark iconOnly iconSize={32} className="mr-2" /> : null}
      <span className={codeClassName || "font-semibold"}>{code}</span>
      <span>{sep}</span>
      <span>{name}</span>
    </span>
  );
}
