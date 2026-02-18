import { useState, useEffect, useCallback } from "react";
import { useMenu } from "@/contexts/MenuContext";
import { apiCall } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Activity, Users, ShieldBan, Bug, Clock, Loader2, FileCode } from "lucide-react";
import { format } from "date-fns";

interface Stats {
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_users: number;
  blacklisted_users: number;
  debug_logs: number;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending_approval: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  maintenance: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paused: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  terminated: "bg-destructive/20 text-destructive border-destructive/30",
  deletion_requested: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function StatusTab() {
  const { selectedMenu } = useMenu();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!selectedMenu) return;
    setLoading(true);
    try {
      const data = await apiCall<Stats>("get_menu_stats", { menu_id: selectedMenu.id });
      setStats(data);
    } catch {
      toast({ title: "Error", description: "Failed to load stats", variant: "destructive" });
    }
    setLoading(false);
  }, [selectedMenu]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (!selectedMenu) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <FileCode className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p>Select a menu to view status</p>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.total_users, color: "text-blue-400" },
    { icon: ShieldBan, label: "Blacklisted", value: stats.blacklisted_users, color: "text-destructive" },
    { icon: Bug, label: "Debug Logs", value: stats.debug_logs, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Menu Status</h2>
      </div>

      {/* Status header */}
      <Card className="border-border/60 card-glow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">{stats.name}</h3>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={statusColors[stats.status] || "bg-secondary text-secondary-foreground"}>
                  {stats.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                Created {format(new Date(stats.created_at), "MMM d, yyyy")}
              </div>
              <div className="text-xs text-muted-foreground">
                Updated {format(new Date(stats.updated_at), "MMM d, yyyy HH:mm")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60 card-glow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
