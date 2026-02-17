"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardTitle, CardSubtitle, Button } from "./components";

const DEFAULT_COVER = "/media/cover-default.jpg";

export function PromoCard({
  title,
  description,
  image,
  cta,
  fallbackImage = DEFAULT_COVER,
}: {
  title: string;
  description: string;
  image: string;
  cta?: string;
  fallbackImage?: string;
}) {
  const [src, setSrc] = useState(image);
  const handleError = () => setSrc(fallbackImage);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative h-40 w-full">
        <Image
          src={src}
          alt={title}
          fill
          className="object-cover"
          onError={handleError}
        />
      </div>

      <div className="p-4 space-y-2">
        <CardTitle>{title}</CardTitle>
        <CardSubtitle>{description}</CardSubtitle>

        {cta && (
          <Button variant="primary" size="sm">
            {cta}
          </Button>
        )}
      </div>
    </Card>
  );
}

export function CafeCard({
  name,
  image,
  tag,
  fallbackImage = DEFAULT_COVER,
}: {
  name: string;
  image: string;
  tag?: string;
  fallbackImage?: string;
}) {
  const [src, setSrc] = useState(image);
  const handleError = () => setSrc(fallbackImage);

  return (
    <Card className="overflow-hidden p-0 hover:scale-[1.01] transition">
      <div className="relative h-32 w-full">
        <Image src={src} alt={name} fill className="object-cover" onError={handleError} />
      </div>

      <div className="p-4">
        <CardTitle>{name}</CardTitle>
        {tag && <CardSubtitle>{tag}</CardSubtitle>}
      </div>
    </Card>
  );
}
