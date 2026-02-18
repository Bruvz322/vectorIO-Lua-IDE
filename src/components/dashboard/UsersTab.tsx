import { useState, useEffect, useCallback } from "react";
import { useMenu } from "@/contexts/MenuContext";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Users, Search, Ban, ShieldCheck, Loader2, FileCode } from "lucide-react";
import { format } from "date-fns";

interface MenuUser {
  id: string;
  email: string;
  hwid: string | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  created_at: string;
}

export default function UsersTab() {
  const { selectedMenu } = useMenu();
  const [users, setUsers] = useState<MenuUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [blacklistDialog, setBlacklistDialog] = useState<MenuUser | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!selectedMenu) return;
    setLoading(true);
    try {
      const data = await apiCall<{ users: MenuUser[] }>("get_menu_users", { menu_id: selectedMenu.id });
      setUsers(data.users || []);
    } catch {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    }
    setLoading(false);
  }, [selectedMenu]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBlacklist = async () => {
    if (!blacklistDialog || !selectedMenu) return;
    setProcessing(true);
    try {
      await apiCall("blacklist_user", { menu_user_id: blacklistDialog.id, reason, menu_id: selectedMenu.id });
      toast({ title: "Blacklisted", description: `${blacklistDialog.email} has been blacklisted` });
      setBlacklistDialog(null);
      setReason("");
      loadUsers();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleUnblacklist = async (user: MenuUser) => {
    if (!selectedMenu) return;
    try {
      await apiCall("unblacklist_user", { menu_user_id: user.id, menu_id: selectedMenu.id });
      toast({ title: "Unblacklisted", description: `${user.email} has been unblacklisted` });
      loadUsers();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  if (!selectedMenu) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <FileCode className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p>Select a menu to manage users</p>
        </div>
      </div>
    );
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.hwid?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Menu Users</h2>
          <Badge variant="secondary" className="text-xs">{users.length}</Badge>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      <Card className="border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Email</TableHead>
              <TableHead>HWID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {users.length === 0 ? "No users registered yet" : "No matching users"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(u => (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{u.email}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{u.hwid || "N/A"}</TableCell>
                  <TableCell>
                    {u.is_blacklisted ? (
                      <Badge variant="destructive" className="text-xs">Blacklisted</Badge>
                    ) : (
                      <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(u.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.is_blacklisted ? (
                      <Button variant="ghost" size="sm" onClick={() => handleUnblacklist(u)} className="text-emerald-400 hover:text-emerald-300 text-xs">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Unblacklist
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setBlacklistDialog(u)} className="text-destructive hover:text-destructive text-xs">
                        <Ban className="w-3 h-3 mr-1" />
                        Blacklist
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!blacklistDialog} onOpenChange={() => { setBlacklistDialog(null); setReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Blacklisting <span className="text-foreground font-medium">{blacklistDialog?.email}</span>
          </p>
          <Textarea placeholder="Reason for blacklisting..." value={reason} onChange={e => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setBlacklistDialog(null); setReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlacklist} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Blacklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
