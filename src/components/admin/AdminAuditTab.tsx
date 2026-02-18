import { useState, useEffect, useCallback } from "react";
import { apiCall } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Activity, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  browser_fingerprint: string | null;
  hwid: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  user: { email: string; display_name: string } | null;
}

const actionColors: Record<string, string> = {
  login: "bg-blue-500/20 text-blue-400",
  logout: "bg-muted text-muted-foreground",
  create_menu: "bg-emerald-500/20 text-emerald-400",
  update_code: "bg-amber-500/20 text-amber-400",
  push_to_dev: "bg-purple-500/20 text-purple-400",
  push_to_build: "bg-purple-500/20 text-purple-400",
  blacklist_user: "bg-destructive/20 text-destructive",
  admin_approve_menu: "bg-emerald-500/20 text-emerald-400",
  admin_reject_menu: "bg-destructive/20 text-destructive",
  admin_terminate_menu: "bg-destructive/20 text-destructive",
  admin_create_user: "bg-blue-500/20 text-blue-400",
  admin_toggle_user: "bg-amber-500/20 text-amber-400",
};

export default function AdminAuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      const data = await apiCall<{ logs: AuditLog[] }>("admin_get_audit_logs", { limit: 200 });
      setLogs(data.logs || []);
    } catch {
      toast({ title: "Error", description: "Failed to load audit logs", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Audit Log</h2>
        <Badge variant="secondary" className="text-xs">{logs.length} entries</Badge>
      </div>

      <Card className="border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Fingerprint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audit logs</TableCell></TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id} className="border-border">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "MMM d HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-foreground">{log.user?.display_name || "System"}</span>
                    {log.user?.email && <span className="text-xs text-muted-foreground block">{log.user.email}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${actionColors[log.action] || "bg-secondary text-secondary-foreground"}`}>
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-48">
                    <code className="text-[10px] text-muted-foreground truncate block">
                      {JSON.stringify(log.details)}
                    </code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{log.ip_address || "N/A"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {log.browser_fingerprint ? log.browser_fingerprint.slice(0, 12) + "..." : "N/A"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
