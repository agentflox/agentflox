import { PersonalPage } from "@/features/personal/PersonalPage";

export default async function Page({ params }: { params: Promise<{ subpath?: string[] }> }) {
    const resolvedParams = await params;
    return <PersonalPage initialSlug={resolvedParams?.subpath} />;
}
