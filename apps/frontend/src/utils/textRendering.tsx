import React from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function renderCommentText(
  text: string,
  mentionItems: { title: string; type: string; status?: string }[],
  isDisplayMode: boolean = false
) {
  let result: React.ReactNode[] = [text];

  mentionItems.forEach((item) => {
    const prefix = "@";
    const mentionStr = `${prefix}${item.title}`;
    result = result.flatMap((part, idx) => {
      if (typeof part === "string") {
        const pieces = part.split(mentionStr);
        const newParts: React.ReactNode[] = [];
        pieces.forEach((piece, i) => {
          newParts.push(piece);
          if (i < pieces.length - 1) {
            if (item.type === "user") {
              newParts.push(
                <span
                  key={`${item.title}-${idx}-${i}`}
                  className={cn(
                    "text-indigo-700 cursor-pointer hover:underline",
                    isDisplayMode ? "font-medium" : "bg-indigo-100 px-1 -mx-1 rounded-sm"
                  )}
                >
                  {mentionStr}
                </span>
              );
            } else if (item.type === "task") {
              newParts.push(
                <span
                  key={`${item.title}-${idx}-${i}`}
                  className="relative inline-flex items-center cursor-pointer group/mention align-bottom"
                >
                  <div className="absolute left-[-4px] w-[14px] h-[14px] rounded-full border-[3px] border-zinc-400 group-hover/mention:border-zinc-500 bg-white z-10" />
                  <span className="text-transparent">{prefix}</span>
                  <span className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 group-hover/mention:decoration-zinc-400">
                    {item.title}
                  </span>
                </span>
              );
            } else if (item.type === "doc") {
              newParts.push(
                <span
                  key={`${item.title}-${idx}-${i}`}
                  className="relative inline-flex items-center cursor-pointer group/mention align-bottom"
                >
                  <FileText className="absolute left-[-7px] h-[15px] w-[15px] text-blue-500 fill-blue-500 bg-white z-10" />
                  <span className="text-transparent">{prefix}</span>
                  <span className="border-b border-zinc-200 group-hover/mention:border-zinc-400 pb-[1px] text-zinc-900">
                    {item.title}
                  </span>
                </span>
              );
            }
          }
        });
        return newParts;
      }
      return part;
    });
  });

  return result;
}
