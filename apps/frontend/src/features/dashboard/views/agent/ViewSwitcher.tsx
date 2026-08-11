import dynamic from "next/dynamic";

const OverviewView = dynamic(() => import("./OverviewView").then((mod) => mod.OverviewView));
const OperatorView = dynamic(() => import("./OperatorView").then((mod) => mod.OperatorView));
const AutomationView = dynamic(() => import("./AutomationView").then((mod) => mod.AutomationView));
const ChatView = dynamic(() => import("./ChatView").then((mod) => mod.ChatView));
const ActivitiesView = dynamic(() => import("./ActivitiesView").then((mod) => mod.ActivitiesView));
const TasksView = dynamic(() => import("./TasksView").then((mod) => mod.TasksView));
const LogsView = dynamic(() => import("./LogsView").then((mod) => mod.LogsView));
const SettingsView = dynamic(() => import("./SettingsView").then((mod) => mod.SettingsView));

interface ViewSwitcherProps {
  activeTab: string;
  agent?: any;
  chatId?: string | null;
  onChatIdChange?: (chatId: string | null) => void;
}

export default function ViewSwitcher({ activeTab, agent, chatId, onChatIdChange }: ViewSwitcherProps) {

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView agent={agent} />;
      case 'ai-builder':
        return <OperatorView agent={agent} />;
      case 'automation':
        return <AutomationView agent={agent} />;
      case 'chat':
        return (
          <ChatView
            agent={agent}
            conversationType="AGENT_EXECUTOR"
            chatId={chatId}
            onChatIdChange={onChatIdChange}
          />
        );
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
