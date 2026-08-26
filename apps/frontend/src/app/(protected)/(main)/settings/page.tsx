import SettingsView from "@/features/settings/views/SettingsView";
import Shell from "@/components/layout/Shell";
import React from "react";

export const metadata = {
    title: "Settings | Agentflox",
    description: "Manage your interface settings.",
};

export default function SettingsPage() {
    return (
        <Shell noPadding>
            <SettingsView />
        </Shell>
    );
}
