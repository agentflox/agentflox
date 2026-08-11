'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
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
import { Bot } from 'lucide-react';
import {
  getProviderAuthConfig,
  type AiModelAuthType,
  type AiModelProvider,
} from '@agentflox/types';
import { useModelMutations, useModels } from '../hooks/useModels';
import { ProviderIcon } from './ModelManagerModal';
import { LuBrain } from "react-icons/lu";
import { cn } from '@/lib/utils';

export function ModelCreateModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (modelId: string) => void;
}) {
  const { createCustom } = useModelMutations();
  const { data: models = [] } = useModels();
  const systemModels = React.useMemo(() => models.filter(m => m.isSystem), [models]);

  const [selectedModelId, setSelectedModelId] = React.useState('');
  const [authType, setAuthType] = React.useState<AiModelAuthType>('API_KEY');
  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [icon, setIcon] = React.useState('');
  const [color, setColor] = React.useState('#8B5CF6');
  const [hasManualIcon, setHasManualIcon] = React.useState(false);
  const [credentials, setCredentials] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  const selectedModel = systemModels.find(m => m.id === selectedModelId);
  const provider = selectedModel?.provider as AiModelProvider;

  const authCfg = getProviderAuthConfig(provider);
  const fields = authCfg?.fields?.[authType] || [];

  React.useEffect(() => {
    if (provider) {
      const cfg = getProviderAuthConfig(provider);
      const next = cfg?.authMethods[0] || 'API_KEY';
      setAuthType(next);
      setCredentials({});
    }
  }, [provider]);

  React.useEffect(() => {
    if (open) {
      setSelectedModelId('');
      setDisplayName('');
      setDescription('');
      setIcon('');
      setColor('#8B5CF6');
      setHasManualIcon(false);
      setCredentials({});
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!selectedModel) return;
    setError(null);
    try {
      const res = await createCustom.mutateAsync({
        displayName,
        provider: selectedModel.provider,
        apiModelId: selectedModel.apiModelId,
        contextWindow: selectedModel.contextWindow ?? undefined,
        maxOutputTokens: selectedModel.maxOutputTokens ?? undefined,
        maxTokens: ((selectedModel as any).maxTokens ?? selectedModel.maxOutputTokens) ?? undefined,
        creditTier: (selectedModel.creditTier ?? undefined) as any,
        supportsThinking: selectedModel.supportsThinking,
        authType,
        credentials,
        description: description || undefined,
        icon: icon || undefined,
        color: color || undefined,
      });
      onCreated(res.id);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to create model');
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
              <LuBrain className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="pt-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
                Add Custom Model
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed text-left">
                Create a custom AI model with your own API key.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4 px-6">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Base Model</Label>
            <Select value={selectedModelId} onValueChange={(val) => {
              setSelectedModelId(val);
              const sm = systemModels.find(m => m.id === val);
              if (sm && !hasManualIcon && !displayName) {
                setDisplayName(sm.displayName + ' (Custom)');
                setIcon(sm.displayName.charAt(0).toUpperCase());
              }
            }}>
              <SelectTrigger className="h-9 text-sm font-normal">
                <SelectValue placeholder="Select a model..." />
              </SelectTrigger>
              <SelectContent>
                {systemModels.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-sm font-normal [&_span]:font-normal">
                    <div className="flex items-center gap-1">
                      <ProviderIcon provider={m.provider} className="w-4 h-4 shrink-0" />
                      {m.displayName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(authCfg?.authMethods.length || 0) > 1 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-slate-700">Auth type</Label>
              <Select value={authType} onValueChange={(v) => { setAuthType(v as AiModelAuthType); setCredentials({}); }}>
                <SelectTrigger className="text-sm font-normal [&_span]:font-normal">
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
              <Label className="text-sm font-medium text-slate-700">{f.label}</Label>
              <Input
                type={f.inputType}
                value={credentials[f.key] || ''}
                onChange={(e) => setCredentials((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.label}
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
                className="flex-1 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 h-10 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="focus-visible:ring-1 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 rounded-lg min-h-[100px] resize-none border-none"
            />
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

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
            disabled={!selectedModel || !displayName || createCustom.isPending}
            className="rounded-xl px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm transition-all shadow-violet-500/20 hover:shadow-violet-500/40"
          >
            {createCustom.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
