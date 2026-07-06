"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { WELCOME_ITEMS, SUPPORT_ITEMS } from "../../../features/community/components/CommunitySidebar";

const StartHereView = dynamic(() =>
  import("../../../features/community/views/StartHereView").then((mod) => mod.StartHereView)
);
const SectionFeedView = dynamic(() =>
  import("../../../features/community/views/SectionFeedView").then((mod) => mod.SectionFeedView)
);
const DiscussionGroupsView = dynamic(() =>
  import("../../../features/community/views/DiscussionGroupsView").then((mod) => mod.DiscussionGroupsView)
);
const CommunityGuidelinesView = dynamic(() =>
  import("../../../features/community/views/CommunityGuidelinesView").then((mod) => mod.CommunityGuidelinesView)
);

export default function CommunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("space") || searchParams.get("section") || "start-here";

  useEffect(() => {
    if (!searchParams.has("space") && !searchParams.has("section")) {
      router.replace("/?space=start-here");
    }
  }, [searchParams, router]);

  const selectedSection = [...WELCOME_ITEMS, ...SUPPORT_ITEMS].find((item) => item.key === activeSection);

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
