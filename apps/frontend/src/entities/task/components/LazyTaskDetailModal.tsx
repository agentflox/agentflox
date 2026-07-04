"use client";

import dynamic from "next/dynamic";

/** Code-split TaskDetailModal — loads only when a task detail is opened. */
export const LazyTaskDetailModal = dynamic(
  () => import("./TaskDetailModal").then((mod) => mod.TaskDetailModal),
  { ssr: false }
);
