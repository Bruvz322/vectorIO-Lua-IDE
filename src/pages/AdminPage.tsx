import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import AdminMenusTab from "@/components/admin/AdminMenusTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import AdminTicketsTab from "@/components/admin/AdminTicketsTab";
import AdminDeletionTab from "@/components/admin/AdminDeletionTab";
import TicketChat from "@/components/dashboard/TicketChat";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("menus");
  const [collapsed, setCollapsed] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const renderContent = () => {
    if (activeTicketId) {
      return <TicketChat ticketId={activeTicketId} onBack={() => setActiveTicketId(null)} />;
    }
    switch (activeTab) {
      case "menus": return <AdminMenusTab />;
      case "users": return <AdminUsersTab />;
      case "audit": return <AdminAuditTab />;
      case "tickets": return <AdminTicketsTab onOpenChat={setActiveTicketId} />;
      case "deletion-requests": return <AdminDeletionTab />;
      default: return <AdminMenusTab />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setActiveTicketId(null); }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <main className="flex-1 overflow-auto p-6">
        <div className="h-full animate-fade-in">{renderContent()}</div>
      </main>
    </div>
  );
}
