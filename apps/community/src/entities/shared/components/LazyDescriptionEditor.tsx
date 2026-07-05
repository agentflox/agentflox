"use client";

import dynamic from "next/dynamic";
import type { DescriptionEditorProps, DescriptionEditorRef } from "./DescriptionEditor";
import { forwardRef } from "react";

const DescriptionEditor = dynamic(
  () => import("./DescriptionEditor").then((mod) => mod.DescriptionEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[80px] animate-pulse rounded-md bg-muted/40" />
    ),
  }
);

export const LazyDescriptionEditor = forwardRef<DescriptionEditorRef, DescriptionEditorProps>(
  function LazyDescriptionEditor(props, ref) {
    return <DescriptionEditor {...props} ref={ref} />;
  }
);

export type { DescriptionEditorProps, DescriptionEditorRef };
