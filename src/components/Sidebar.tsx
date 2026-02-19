import { useAuth } from "@/contexts/AuthContext";
import { useMenu, type Menu } from "@/contexts/MenuContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Terminal, Code, Users, Activity, Settings, MessageSquare, Key,
  LogOut, Shield, ChevronLeft, ChevronRight, Plus
} from "lucide-react";

export type DashboardTab = "ide" | "users" | "status" | "management" | "tickets" | "api";
export type AdminTab = "menus" | "users" | "audit" | "tickets" | "deletion-requests";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCreateMenu?: () => void;
}

const devTabs = [
  { id: "ide", label: "IDE", icon: Code },
  { id: "users", label: "Users", icon: Users },
  { id: "status", label: "Status", icon: Activity },
  { id: "management", label: "Management", icon: Settings },
  { id: "tickets", label: "Tickets", icon: MessageSquare },
  { id: "api", label: "API Info", icon: Key },
];

const adminTabs = [
  { id: "menus", label: "Menus", icon: Terminal },
  { id: "users", label: "Users", icon: Users },
  { id: "audit", label: "Audit Log", icon: Activity },
  { id: "tickets", label: "Tickets", icon: MessageSquare },
  { id: "deletion-requests", label: "Deletion Requests", icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse, onCreateMenu }: SidebarProps) {
  const { user, logout } = useAuth();
  const { menus, selectedMenu, setSelectedMenu } = useMenu();
  const isAdmin = user?.role === "admin";
  const tabs = isAdmin ? adminTabs : devTabs;

  return (
    <div
      className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground text-sm tracking-tight">
              Vector<span className="text-primary">IDE</span>
            </span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="shrink-0 text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Menu selector (dev only) */}
      {!isAdmin && !collapsed && (
        <div className="p-3 border-b border-sidebar-border">
          {menus.length > 0 ? (
            <Select
              value={selectedMenu?.id || ""}
              onValueChange={(val) => {
                const m = menus.find((menu: Menu) => menu.id === val);
                if (m) setSelectedMenu(m);
              }}
            >
              <SelectTrigger className="bg-input border-border text-sm h-9">
                <SelectValue placeholder="Select menu" />
              </SelectTrigger>
              <SelectContent>
                {menus.map((m: Menu) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground text-center">No menus yet</p>
          )}
          {onCreateMenu && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/10 text-xs"
              onClick={onCreateMenu}
            >
              <Plus className="w-3 h-3 mr-1" />
              New Menu
            </Button>
          )}
        </div>
      )}

      {/* Role badge */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 px-2">
            {isAdmin ? (
              <Shield className="w-3 h-3 text-primary" />
            ) : (
              <Code className="w-3 h-3 text-primary" />
            )}
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              {isAdmin ? "Admin Panel" : "Developer"}
            </span>
          </div>
        </div>
      )}

      <Separator className="mx-3 my-2 bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1 py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-9 text-sm transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary rounded-l-none"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                } ${collapsed ? "justify-center px-0" : ""}`}
                onClick={() => onTabChange(tab.id)}
                title={collapsed ? tab.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && <span>{tab.label}</span>}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="shrink-0 text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={logout} className="w-full text-muted-foreground hover:text-destructive" title="Sign out">
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
