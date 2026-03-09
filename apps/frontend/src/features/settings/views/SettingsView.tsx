"use client";

import React from "react";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Moon, Sun, Monitor, Globe, MessageSquare, Bot } from "lucide-react";
import { useTheme } from "next-themes";

export default function SettingsView() {
    const {
        language, setLanguage,
        showAgentIcon, setShowAgentIcon,
        showMessageIcon, setShowMessageIcon,
        t
    } = useInterfaceSettings();

    const { theme, setTheme } = useTheme();

    return (
        <div className="mx-auto max-w-2xl space-y-8 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{t("settings.title")}</h1>
                <p className="text-sm text-zinc-500">{t("settings.subtitle")}</p>
            </div>

            <Separator />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t("settings.appearance")}</Label>
                        <p className="text-sm text-zinc-500">{t("settings.appearance.desc")}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 p-1 bg-zinc-50">
                        <Button
                            variant={theme === 'light' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setTheme('light')}
                            className="h-8 w-8 px-0"
                        >
                            <Sun size={16} />
                            <span className="sr-only">{t("settings.theme.light")}</span>
                        </Button>
                        <Button
                            variant={theme === 'dark' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setTheme('dark')}
                            className="h-8 w-8 px-0"
                        >
                            <Moon size={16} />
                            <span className="sr-only">{t("settings.theme.dark")}</span>
                        </Button>
                        <Button
                            variant={theme === 'system' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setTheme('system')}
                            className="h-8 w-8 px-0"
                        >
                            <Monitor size={16} />
                            <span className="sr-only">{t("settings.theme.system")}</span>
                        </Button>
                    </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t("settings.language")}</Label>
                        <p className="text-sm text-zinc-500">{t("settings.language.desc")}</p>
                    </div>
                    <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-[180px]">
                            <Globe size={16} className="mr-2 text-zinc-500" />
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English (US)</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                    <div>
                        <Label className="text-base font-medium">{t("settings.header_options")}</Label>
                        <p className="text-sm text-zinc-500">{t("settings.header_options.desc")}</p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <Bot size={20} />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t("settings.agent_interface")}</Label>
                                <p className="text-xs text-zinc-500">{t("settings.agent_interface.desc")}</p>
                            </div>
                        </div>
                        <Switch
                            checked={showAgentIcon}
                            onCheckedChange={setShowAgentIcon}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t("settings.messages")}</Label>
                                <p className="text-xs text-zinc-500">{t("settings.messages.desc")}</p>
                            </div>
                        </div>
                        <Switch
                            checked={showMessageIcon}
                            onCheckedChange={setShowMessageIcon}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
