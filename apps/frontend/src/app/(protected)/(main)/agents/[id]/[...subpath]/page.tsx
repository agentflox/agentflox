import { AgentDetailPage } from "../page";

export default async function Page({ params }: { params: Promise<{ id: string; subpath?: string[] }> }) {
  const resolvedParams = await params;
  return <AgentDetailPage initialSlug={resolvedParams?.subpath} />;
}
