import { useState, useEffect, useCallback } from "react";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Terminal, Search, Check, X, Eye, Ban, Wrench, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface MenuWithOwner {
  id: string;
  name: string;
  status: string;
  created_at: string;
  api_key_dev: string;
  api_key_build: string;
  payment_api_key: string;
  owner: { email: string; display_name: string } | null;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending_approval: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  maintenance: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paused: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  terminated: "bg-destructive/20 text-destructive border-destructive/30",
  deletion_requested: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function AdminMenusTab() {
  const [menus, setMenus] = useState<MenuWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [codeDialog, setCodeDialog] = useState<{ menuId: string; name: string; buildType: string } | null>(null);
  const [viewCode, setViewCode] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadMenus = useCallback(async () => {
    try {
      const data = await apiCall<{ menus: MenuWithOwner[] }>("admin_get_all_menus");
      setMenus(data.menus || []);
    } catch {
      toast({ title: "Error", description: "Failed to load menus", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMenus(); }, [loadMenus]);

  const handleAction = async (menuId: string, action: string) => {
    setProcessing(menuId);
    try {
      await apiCall(action, { menu_id: menuId });
      toast({ title: "Success", description: `Menu ${action.replace("admin_", "")}` });
      loadMenus();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setProcessing(null);
  };

  const viewMenuCode = async (menuId: string, name: string, buildType: string) => {
    setCodeDialog({ menuId, name, buildType });
    setLoadingCode(true);
    try {
      const data = await apiCall<{ code: string }>("admin_view_code", { menu_id: menuId, build_type: buildType });
      setViewCode(data.code || "");
    } catch {
      toast({ title: "Error", description: "Failed to load code", variant: "destructive" });
    }
    setLoadingCode(false);
  };

  const downloadCode = () => {
    if (!codeDialog || !viewCode) return;
    const blob = new Blob([viewCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${codeDialog.name}_${codeDialog.buildType}.lua`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = menus.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.owner?.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">All Menus</h2>
          <Badge variant="secondary" className="text-xs">{menus.length}</Badge>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search menus..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      <Card className="border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>API Keys</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No menus found</TableCell></TableRow>
            ) : (
              filtered.map(menu => (
                <TableRow key={menu.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{menu.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{menu.owner?.email || "N/A"}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${statusColors[menu.status] || "bg-secondary"}`}>
                      {menu.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-[10px] text-muted-foreground">
                      ...{menu.payment_api_key?.slice(-6)}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(menu.created_at), "MMM d, yy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {menu.status === "pending_approval" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleAction(menu.id, "admin_approve_menu")} disabled={processing === menu.id} className="text-emerald-400 text-xs">
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleAction(menu.id, "admin_reject_menu")} disabled={processing === menu.id} className="text-destructive text-xs">
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => viewMenuCode(menu.id, menu.name, "dev")} className="text-xs">
                        <Eye className="w-3 h-3" />
                      </Button>
                      {menu.status === "active" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleAction(menu.id, "update_menu_status")} className="text-blue-400 text-xs" title="Maintenance">
                            <Wrench className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleAction(menu.id, "admin_terminate_menu")} disabled={processing === menu.id} className="text-destructive text-xs">
                            <Ban className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!codeDialog} onOpenChange={() => setCodeDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{codeDialog?.name} - {codeDialog?.buildType} code</DialogTitle>
            <DialogDescription>Viewing menu code. You can download it below.</DialogDescription>
          </DialogHeader>
          {loadingCode ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <pre className="bg-muted rounded-md p-4 text-xs font-mono text-muted-foreground overflow-auto max-h-96 whitespace-pre-wrap">
              {viewCode || "No code available"}
            </pre>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => viewMenuCode(codeDialog!.menuId, codeDialog!.name, codeDialog!.buildType === "dev" ? "build" : "dev")}>
              View {codeDialog?.buildType === "dev" ? "Build" : "Dev"} Code
            </Button>
            <Button onClick={downloadCode}>
              <Download className="w-4 h-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
