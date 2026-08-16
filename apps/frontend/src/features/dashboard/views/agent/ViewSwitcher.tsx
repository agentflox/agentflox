import dynamic from "next/dynamic";

const OverviewView = dynamic(() => import("./OverviewView").then((mod) => mod.OverviewView));
const OperatorView = dynamic(() => import("./OperatorView").then((mod) => mod.OperatorView));
const ChatView = dynamic(() => import("./ChatView").then((mod) => mod.ChatView));
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
      case 'chat':
        return (
          <ChatView
            agent={agent}
            conversationType="AGENT_EXECUTOR"
            chatId={chatId}
            onChatIdChange={onChatIdChange}
          />
        );
      case 'settings':
        return <SettingsView agent={agent} />;
      default:
        return <OverviewView agent={agent} />;
    }
  };

  const isFillHeightView =
    activeTab === 'chat' || activeTab === 'ai-builder' || activeTab === 'settings';

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${isFillHeightView ? 'h-full overflow-hidden' : 'overflow-auto bg-white'}`}>
      {renderView()}
    </div>
  );
}
