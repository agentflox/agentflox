"use client";

import React, { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-themes-all";
import { cn } from "@/lib/utils";

export type StepCodeLanguage = "PYTHON" | "JAVASCRIPT";

export type StepCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language: StepCodeLanguage;
  height?: string;
  className?: string;
  placeholder?: string;
};

/**
 * Shared CodeMirror editor for Python/JS tool steps — same stack as ToolCodeView.
 */
export function StepCodeEditor({
  value,
  onChange,
  language,
  height = "240px",
  className,
}: StepCodeEditorProps) {
  const langExtension = useMemo(
    () =>
      language === "PYTHON"
        ? python()
        : javascript({ jsx: false, typescript: false }),
    [language],
  );

  return (
    <div className={cn("overflow-hidden rounded-b-lg", className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={vscodeDark}
        extensions={[langExtension]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          autocompletion: true,
          indentOnInput: true,
        }}
        height={height}
        style={{ fontSize: "13px", height }}
      />
    </div>
  );
}
