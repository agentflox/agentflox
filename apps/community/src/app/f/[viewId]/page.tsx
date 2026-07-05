"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type PublicFormField = {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
  content?: string;
};

export default function PublicFormPage() {
  const params = useParams<{ viewId: string }>();
  const viewId = params?.viewId;
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = trpc.view.getPublicForm.useQuery(
    { viewId: viewId as string },
    { enabled: !!viewId }
  );
  const submitMutation = trpc.view.submitPublicFormResponse.useMutation();

  const config = (data?.config ?? {}) as any;
  const fields = ((config.fields ?? []) as PublicFormField[]).filter((f) => f.type !== "block");
  const blockFields = ((config.fields ?? []) as PublicFormField[]).filter((f) => f.type === "block");
  const settings = (config.settings ?? {}) as any;
  const title = config.title || data?.name || "Form";
  const description = config.description || "";
  const endPageMessage =
    config.endPageMessage || "<p><strong>Thank you!</strong></p><p>your submission has been received.</p>";

  const missingRequired = useMemo(
    () => fields.filter((f) => f.required && !values[f.id]),
    [fields, values]
  );

  const onSubmit = async () => {
    if (!viewId) return;
    if (missingRequired.length > 0) {
      toast.error("Please fill all required fields");
      return;
    }
    await submitMutation.mutateAsync({ viewId, values });
    setSubmitted(true);
    toast.success("Response submitted");
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-zinc-600">Form not found.</div>;
  }

  return (
    <div
      className="min-h-screen py-10"
      style={{ backgroundColor: settings.backgroundColor || "#F8FAFC" }}
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        {!submitted ? (
          <>
            <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
            {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}

            <div className="mt-6 space-y-4">
              {blockFields.map((field) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700"
                  dangerouslySetInnerHTML={{ __html: field.content || "" }}
                />
              ))}

              {fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-900">
                    {field.label}
                    {field.required ? <span className="ml-1 text-red-500">*</span> : null}
                  </Label>
                  {field.description ? <p className="text-xs text-zinc-500">{field.description}</p> : null}
                  {["textarea"].includes(field.type) ? (
                    <Textarea
                      value={values[field.id] || ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder || "Enter response..."}
                    />
                  ) : ["select", "radio"].includes(field.type) ? (
                    <select
                      className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                      value={values[field.id] || ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    >
                      <option value="">Select an option</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : ["checkbox", "multiselect"].includes(field.type) ? (
                    <div className="space-y-1">
                      {(field.options || []).map((opt) => {
                        const selected = (values[field.id] as string[] | undefined) || [];
                        const checked = selected.includes(opt);
                        return (
                          <label key={opt} className="flex items-center gap-2 text-sm text-zinc-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selected, opt]
                                  : selected.filter((x) => x !== opt);
                                setValues((prev) => ({ ...prev, [field.id]: next }));
                              }}
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <Input
                      type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
                      value={values[field.id] || ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder || "Enter response..."}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => void onSubmit()}
                disabled={submitMutation.isPending}
                style={{ backgroundColor: settings.buttonColor || "#18181B" }}
              >
                {submitMutation.isPending ? "Submitting..." : settings.submitButtonText || "Submit"}
              </Button>
            </div>
          </>
        ) : (
          <div
            className="prose prose-sm max-w-none text-zinc-700"
            dangerouslySetInnerHTML={{ __html: endPageMessage }}
          />
        )}
      </div>
    </div>
  );
}
