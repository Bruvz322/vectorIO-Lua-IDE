import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import IDETab from "@/components/dashboard/IDETab";
import UsersTab from "@/components/dashboard/UsersTab";
import StatusTab from "@/components/dashboard/StatusTab";
import ManagementTab from "@/components/dashboard/ManagementTab";
import TicketsTab from "@/components/dashboard/TicketsTab";
import APITab from "@/components/dashboard/APITab";
import TicketChat from "@/components/dashboard/TicketChat";
import CreateMenuDialog from "@/components/CreateMenuDialog";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("ide");
  const [collapsed, setCollapsed] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const handleOpenTicketChat = (ticketId: string) => {
    setActiveTicketId(ticketId);
  };

  const renderContent = () => {
    if (activeTicketId) {
      return (
        <TicketChat
          ticketId={activeTicketId}
          onBack={() => setActiveTicketId(null)}
        />
      );
    }

    switch (activeTab) {
      case "ide":
        return <IDETab />;
      case "users":
        return <UsersTab />;
      case "status":
        return <StatusTab />;
      case "management":
        return <ManagementTab />;
      case "tickets":
        return <TicketsTab onOpenChat={handleOpenTicketChat} />;
      case "api":
        return <APITab />;
      default:
        return <IDETab />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveTicketId(null);
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onCreateMenu={() => setCreateMenuOpen(true)}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="h-full animate-fade-in">
          {renderContent()}
        </div>
      </main>

      <CreateMenuDialog open={createMenuOpen} onClose={() => setCreateMenuOpen(false)} />
    </div>
  );
}
