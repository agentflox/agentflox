"use client";
import { trpc } from "@/lib/trpc";
import UserForm from "@/entities/users/components/UserForm";
import { useState } from "react";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";

export default function MyProfilePage() {
  const { data: me, isLoading } = trpc.user.me.useQuery();
  const [editing, setEditing] = useState(false);
  const deleteMutation = trpc.user.delete.useMutation();
  const { t } = useInterfaceSettings();

  const handleDelete = async () => {
    const confirmed = window.confirm(t("profile.delete_confirm"));
    if (!confirmed) return;
    await deleteMutation.mutateAsync();
    if (typeof window !== 'undefined') {
      window.location.href = "/";
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("profile.title")}</h1>
        <div className="flex items-center gap-2">
          <button className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted" onClick={() => setEditing((v) => !v)}>
            {editing ? t("profile.action.view") : t("profile.action.edit")}
          </button>
          <button className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {t("profile.action.delete")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-7 w-40 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted/50" />
          <div className="h-24 w-full animate-pulse rounded bg-muted/40" />
        </div>
      ) : editing ? (
        <UserForm />
      ) : me ? (
        <div className="space-y-2 text-sm text-foreground">
          <div><span className="text-muted-foreground">{t("profile.field.name")}:</span> {me.firstName} {me.lastName}</div>
          <div><span className="text-muted-foreground">{t("profile.field.username")}:</span> {me.username}</div>
          <div><span className="text-muted-foreground">{t("profile.field.email")}:</span> {me.email}</div>
          <div><span className="text-muted-foreground">{t("profile.field.phone")}:</span> {me.phone}</div>
          <div><span className="text-muted-foreground">{t("profile.field.website")}:</span> {me.website}</div>
          <div><span className="text-muted-foreground">{t("profile.field.location")}:</span> {me.location}</div>
          <div><span className="text-muted-foreground">{t("profile.field.timezone")}:</span> {me.timezone}</div>
          {me.bio && <div className="pt-2"><span className="text-muted-foreground">{t("profile.field.bio")}:</span><div className="whitespace-pre-wrap">{me.bio}</div></div>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("profile.loading")}</p>
      )}
    </div>
  );
}


