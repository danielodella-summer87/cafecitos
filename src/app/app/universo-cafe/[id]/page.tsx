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

  const slug = (guide as { slug?: string }).slug;

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
          <div className="p-6">
            <GuideContent
              title={guide.title}
              excerpt={guide.excerpt}
              coverUrl={guide.cover_url}
              slug={slug ?? ""}
              contentJson={guide.content_json}
              guideId={guide.id}
              profileId={session.profileId}
              initialProgress={initialProgress}
            />
          </div>
        </article>
      </div>
    </main>
  );
}
