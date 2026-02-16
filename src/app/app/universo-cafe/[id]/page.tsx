import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import {
  getCoffeeGuideById,
  getCurrentUserTierSlug,
  getCoffeeGuideViews,
} from "@/app/actions/coffeeGuides";
import { canAccess } from "@/lib/tierAccess";
import { PRO } from "@/lib/ui/pro";
import GuideContent from "./GuideContent";

type Props = { params: Promise<{ id: string }> };

export default async function GuideDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const guideRes = await getCoffeeGuideById(id);
  if (!guideRes.ok) notFound();
  const { guide } = guideRes;

  const [tierSlug, views] = await Promise.all([
    getCurrentUserTierSlug(session.profileId),
    getCoffeeGuideViews(session.profileId),
  ]);

  if (!canAccess(tierSlug, guide.min_tier_slug)) redirect("/app/universo-cafe");

  const view = views.find((v) => v.guide_id === id);
  const initialProgress = view?.progress_pct ?? 0;

  return (
    <main className={PRO.page}>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/app/universo-cafe"
          className="mb-4 inline-block text-sm text-neutral-600 hover:text-black"
        >
          ← Volver a Universo Café
        </Link>

        <article className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          {guide.cover_url && (
            <div className="relative aspect-[16/9] w-full bg-neutral-200">
              <Image
                src={guide.cover_url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
                priority
              />
            </div>
          )}
          <div className="p-6">
            <h1 className="text-xl font-bold text-neutral-900">{guide.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">{guide.reading_minutes} min de lectura</p>
            {guide.excerpt && (
              <p className="mt-3 text-neutral-600">{guide.excerpt}</p>
            )}
            <div className="mt-6">
              <GuideContent
                guideId={guide.id}
                profileId={session.profileId}
                contentJson={guide.content_json}
                initialProgress={initialProgress}
              />
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
