"use client";

import dynamic from "next/dynamic";

const PreviewKanban = dynamic(() => import("@/app/preview/preview-kanban"), {
  ssr: false,
});

export function ClientPortal({
  orgSlug,
  orgName,
}: {
  orgSlug: string;
  orgName: string;
}): JSX.Element {
  return <PreviewKanban orgSlug={orgSlug} orgName={orgName} />;
}
