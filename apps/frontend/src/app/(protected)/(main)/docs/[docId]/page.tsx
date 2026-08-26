"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocView } from "@/features/dashboard/views/generic/DocView";

interface PageProps {
  params: Promise<{ docId: string }>;
}

export default function DocumentPage({ params }: PageProps) {
  const { docId } = use(params);
  const router = useRouter();

  return (
    <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden bg-white">
      <div className="px-6 pt-2 flex-shrink-0 border-b sticky">
        <Button
          variant="ghost"
          onClick={() => router.push('/docs')}
          className="text-muted-foreground hover:text-foreground mb-[8px] -ml-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Docs
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <DocView viewId={docId} />
      </div>
    </div>
  );
}
