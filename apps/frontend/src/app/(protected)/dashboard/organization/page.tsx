import OrganizationSettingsView from "@/features/organization/views/OrganizationSettingsView";

export const metadata = {
    title: "Organization Settings | Agentflox",
    description: "Manage your organization profile",
};

export default function OrganizationPage() {
    return <OrganizationSettingsView />;
}
