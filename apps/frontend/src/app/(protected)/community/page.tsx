"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StartHereView } from "../../../features/community/views/StartHereView";
import { SectionFeedView } from "../../../features/community/views/SectionFeedView";
import { DiscussionGroupsView } from "../../../features/community/views/DiscussionGroupsView";
import { CommunityGuidelinesView } from "../../../features/community/views/CommunityGuidelinesView";
import { WELCOME_ITEMS, SUPPORT_ITEMS } from "../../../features/community/components/CommunitySidebar";

export default function CommunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("space") || searchParams.get("section") || "start-here";

  useEffect(() => {
    if (!searchParams.has("space") && !searchParams.has("section")) {
      router.replace("/community?space=start-here");
    }
  }, [searchParams, router]);

  const selectedSection = [...WELCOME_ITEMS, ...SUPPORT_ITEMS].find((item) => item.key === activeSection);

  const handleSectionClick = (key: string) => {
    router.push(`/community?space=${key}`);
  };

  return (
    <>
      {activeSection === "start-here" && <StartHereView />}

      {activeSection === "discussion-groups" && <DiscussionGroupsView />}

      {activeSection === "community-guidelines" && <CommunityGuidelinesView />}

      {activeSection !== "start-here" && 
       activeSection !== "discussion-groups" && 
       activeSection !== "community-guidelines" && 
       selectedSection && (
        <SectionFeedView
          sectionKey={selectedSection.key}
          title={selectedSection.title}
          subtitle={selectedSection.subtitle}
          label={selectedSection.label}
          composerEnabled={true}
          hideSort={false}
          icon={selectedSection.icon}
        />
      )}
    </>
  );
}
