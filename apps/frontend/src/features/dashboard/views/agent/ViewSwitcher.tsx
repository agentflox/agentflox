import { OverviewView } from './OverviewView';
import { OperatorView } from './OperatorView';
import { AutomationView } from './AutomationView';
import { ChatView } from './ChatView';
import { ActivitiesView } from './ActivitiesView';
import { TasksView } from './TasksView';
import { LogsView } from './LogsView';

import { TeamView } from './TeamView';

interface ViewSwitcherProps {
  activeTab: string;
  agent?: any;
}

export default function ViewSwitcher({ activeTab, agent }: ViewSwitcherProps) {

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView agent={agent} />;
      case 'team':
        return <TeamView agent={agent} />;
      case 'builder':
        return <OperatorView agent={agent} />;
      case 'automation':
        return <AutomationView agent={agent} />;
      case 'chat':
        return <ChatView agent={agent} />;
      case 'activities':
        return <ActivitiesView agentId={agent?.id} />;
      case 'tasks':
        return <TasksView agentId={agent?.id} />;
      case 'logs':
        return <LogsView agentId={agent?.id} />;
      default:
        return <OverviewView agent={agent} />;
    }
  };

  const isChatView = activeTab === 'chat' || activeTab === 'builder';

  return (
    <div className={`flex-1 ${isChatView ? 'h-full overflow-hidden' : 'overflow-auto bg-slate-50'}`}>
      {renderView()}
    </div>
  );
}
