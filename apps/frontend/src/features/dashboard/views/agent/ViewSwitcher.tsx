import { OverviewView } from './OverviewView';
import { OperatorView } from './OperatorView';
import { AutomationView } from './AutomationView';
import { ChatView } from './ChatView';
import { ActivitiesView } from './ActivitiesView';
import { TasksView } from './TasksView';
import { LogsView } from './LogsView';
import { SettingsView } from './SettingsView';


interface ViewSwitcherProps {
  activeTab: string;
  agent?: any;
}

export default function ViewSwitcher({ activeTab, agent }: ViewSwitcherProps) {

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView agent={agent} />;
      case 'ai-builder':
        return <OperatorView agent={agent} />;
      case 'automation':
        return <AutomationView agent={agent} />;
      case 'chat':
        return <ChatView agent={agent} />;
      case 'activities':
        return <ActivitiesView agentId={agent?.id} />;
      case 'settings':
        return <SettingsView agent={agent} />;
      case 'tasks':
        return <TasksView agentId={agent?.id} />;
      case 'logs':
        return <LogsView agentId={agent?.id} />;
      default:
        return <OverviewView agent={agent} />;
    }
  };

  const isChatView = activeTab === 'chat' || activeTab === 'ai-builder';

  return (
    <div className={`flex-1 flex flex-col ${isChatView ? 'h-full overflow-hidden' : 'overflow-auto bg-white'}`}>
      {renderView()}
    </div>
  );
}
