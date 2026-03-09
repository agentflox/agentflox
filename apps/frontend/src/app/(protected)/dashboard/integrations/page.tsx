import { IntegrationsView } from '@/features/integrations/views/IntegrationsView';

export const metadata = {
    title: 'Integrations | Agentflox',
    description: 'Manage your workspace integrations.',
};

export default function IntegrationsPage() {
    return (
        <div className="flex-1 w-full bg-slate-50/50 p-8 h-full overflow-hidden">
            <div className="mx-auto w-full max-w-[1600px] h-full">
                <IntegrationsView />
            </div>
        </div>
    );
}
