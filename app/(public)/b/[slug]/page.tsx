import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DemoBusinessProfile } from "@/components/demo/demo-pages";
import { BusinessProfile, BusinessProfileSkeleton } from "@/components/public/business-profile";
import { PageShell } from "@/components/public/page-shell";
import { IS_DEMO } from "@/lib/demo/flag";
import { getServerRepos } from "@/lib/repositories/server";
import { getBusinessPage } from "@/modules/businesses/public-pages.service";

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  // En la demo los negocios viven en el navegador: el servidor no los conoce.
  if (IS_DEMO) return { title: "Reservar turno" };
  const { slug } = await params;
  const data = await getBusinessPage(getServerRepos(), slug);
  if (!data) return { title: "Negocio no encontrado" };
  return { title: data.business.name, description: data.business.description ?? undefined };
}

export default function BusinessPage({ params }: PageProps<"/b/[slug]">) {
  return (
    <PageShell>
      <Suspense fallback={<BusinessProfileSkeleton />}>
        <BusinessContent params={params} />
      </Suspense>
    </PageShell>
  );
}

async function BusinessContent({ params }: { params: PageProps<"/b/[slug]">["params"] }) {
  const { slug } = await params;
  if (IS_DEMO) return <DemoBusinessProfile slug={slug} />;

  const data = await getBusinessPage(getServerRepos(), slug);
  if (!data) notFound();
  return <BusinessProfile business={data.business} services={data.services} />;
}
