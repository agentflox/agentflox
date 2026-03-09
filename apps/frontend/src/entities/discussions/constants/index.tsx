export const DISCUSSSION_FILTERS = [
  { key: "all", label: "All Discussions", description: "View all discussions" },
  { key: "feature", label: "Feature Ideas", description: "Feature requests and suggestions" },
  { key: "design", label: "Design & UI", description: "Design discussions and feedback" },
  { key: "implementation", label: "Implementation", description: "Technical implementation topics" },
  { key: "bugs", label: "Bugs / Fixes", description: "Bug reports and fixes" },
  { key: "announcements", label: "Announcements", description: "Important announcements" },
  { key: "issues", label: "Issues", description: "General issues and concerns" },
  { key: "others", label: "Others", description: "Other topics" },
  { key: "pinned", label: "Pinned", description: "Pinned discussions" },
  { key: "author", label: "My Posts", description: "Discussions you created" },
  { key: "active", label: "Most Active", description: "Most commented discussions" },
  { key: "upvoted", label: "Most Upvoted", description: "Highest voted discussions" },
] as const;

export const POST_TOPICS = {
  FEATURE: { label: "Feature", color: "blue" },
  DESIGN: { label: "Design", color: "purple" },
  IMPLEMENTATION: { label: "Implementation", color: "green" },
  BUGS: { label: "Bug", color: "red" },
  ANNOUNCEMENT: { label: "Announcement", color: "yellow" },
  ISSUE: { label: "Issue", color: "orange" },
  OTHERS: { label: "Other", color: "gray" },
} as const;

export type DiscussionFilterKey = typeof DISCUSSSION_FILTERS[number]["key"];
export type PostTopic = keyof typeof POST_TOPICS;
