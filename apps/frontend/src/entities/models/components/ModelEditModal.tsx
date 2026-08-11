'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconColorSelector } from '@/components/ui/icon-color-selector';
import { EntityIcon } from '@/entities/shared/components/EntityIcon';
import { Bot, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getProviderAuthConfig,
  type AiModelAuthType,
  type AiModelView,
} from '@agentflox/types';
import { useModelMutations } from '../hooks/useModels';
import { LuBrainCog } from "react-icons/lu";

export function ModelEditModal({
  model,
  open,
  onOpenChange,
}: {
  model: AiModelView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateCustom } = useModelMutations();

  const [authType, setAuthType] = React.useState<AiModelAuthType>('API_KEY');
  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [icon, setIcon] = React.useState('');
  const [color, setColor] = React.useState('#FFFFFF');
  const [hasManualIcon, setHasManualIcon] = React.useState(true);
  const [credentials, setCredentials] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  const provider = model?.provider;
  const authCfg = provider ? getProviderAuthConfig(provider) : null;
  const fields = authCfg?.fields?.[authType] || [];

  React.useEffect(() => {
    if (open && model) {
      setDisplayName(model.displayName);
      setDescription(model.description || '');
      setIcon(model.icon || '');
      setColor(model.color || '#FFFFFF');
      setHasManualIcon(true);
      setAuthType(model.authType || 'API_KEY');
      setCredentials({});
      setError(null);
    }
  }, [open, model]);

  const submit = async () => {
    if (!model) return;
    setError(null);
    try {
      const hasCreds = Object.values(credentials).some(v => v.trim() !== '');
      await updateCustom.mutateAsync({
        id: model.id,
        displayName,
        authType,
        credentials: hasCreds ? credentials : undefined,
        description: description || undefined,
        icon: icon || undefined,
        color: color || undefined,
      });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to update model');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] px-0 py-0 gap-2">
        <DialogHeader className="pt-4 pb-2 px-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "mt-1 p-3 rounded-2xl border transition-all duration-300",
              "bg-violet-500/5 border-violet-500/10 text-violet-600 shadow-[0_0_15px_-3px_rgba(139,92,246,0.1)]",
              "group-hover:scale-105"
            )}>
              <LuBrainCog className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="pt-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
                Edit Model
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed text-left max-w-sm">
                Manage settings and credentials for your custom model.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {model && (
          <div className="space-y-4 py-4 px-6">
            {(authCfg?.authMethods.length || 0) > 1 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-normal text-slate-700">Auth type</Label>
                <Select value={authType} onValueChange={(v) => { setAuthType(v as AiModelAuthType); setCredentials({}); }}>
                  <SelectTrigger className="font-normal text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {authCfg!.authMethods.map((m) => (
                      <SelectItem key={m} value={m} disabled={m === 'OAUTH_TOKEN' && !authCfg?.oauthEnabled} className="text-sm font-normal [&_span]:font-normal">
                        {m === 'API_KEY' ? 'API Key' : m === 'OAUTH_TOKEN' ? 'OAuth Token' : m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">{f.label} {model.hasCredentials ? '(Leave blank to keep existing)' : ''}</Label>
                <Input
                  type={f.inputType}
                  value={credentials[f.key] || ''}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={model.hasCredentials ? '••••••••' : f.label}
                  autoComplete="off"
                  className="focus-visible:ring-1 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 h-10 rounded-lg"
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Display name</Label>
              <div className="flex items-center gap-2">
                <IconColorSelector
                  icon={icon}
                  color={color}
                  onIconChange={(newIcon) => {
                    setIcon(newIcon);
                    setHasManualIcon(true);
                  }}
                  onColorChange={setColor}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-lg shrink-0 overflow-hidden"
                    style={{ backgroundColor: icon ? color : 'transparent' }}
                  >
                    {icon && icon.length <= 2 ? (
                      <span className="text-white text-sm font-bold leading-none">{icon}</span>
                    ) : (
                      <EntityIcon icon={icon} className={icon ? "text-white" : "text-zinc-400"} size={20} fallback={Bot} fill />
                    )}
                  </Button>
                </IconColorSelector>
                <Input
                  value={displayName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setDisplayName(newName);
                    if (!hasManualIcon) {
                      setIcon(newName.trim().charAt(0).toUpperCase() || '');
                    }
                  }}
                  placeholder="My Custom Model"
                  className="flex-1 focus-visible:ring-1 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 h-10 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="focus-visible:ring-violet-500/30 focus-visible:border-violet-500 rounded-lg min-h-[100px] resize-none border-none"
              />
            </div>

            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        )}

        <div className="flex justify-end gap-3 py-4 border-t px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-6 border border-zinc-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!displayName || updateCustom.isPending}
            className="rounded-xl px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm transition-all shadow-violet-500/20 hover:shadow-violet-500/40"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateCustom.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
