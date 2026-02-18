import { useState, useEffect, useCallback } from "react";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Users, Search, Plus, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SystemUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersTab() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("menu_dev");
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiCall<{ users: SystemUser[] }>("admin_get_all_users");
      setUsers(data.users || []);
    } catch {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async () => {
    if (!newEmail || !newPassword || !newName) {
      toast({ title: "Error", description: "Fill in all fields", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await apiCall("admin_create_user", {
        email: newEmail, password: newPassword, display_name: newName, role: newRole,
      });
      toast({ title: "Created", description: `User ${newEmail} created` });
      setCreateDialog(false);
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("menu_dev");
      loadUsers();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setCreating(false);
  };

  const handleToggle = async (userId: string, currentActive: boolean) => {
    setToggling(userId);
    try {
      await apiCall("admin_toggle_user", { user_id: userId, is_active: !currentActive });
      toast({ title: "Updated", description: `User ${!currentActive ? "activated" : "deactivated"}` });
      loadUsers();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setToggling(null);
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">System Users</h2>
          <Badge variant="secondary" className="text-xs">{users.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Button size="sm" onClick={() => setCreateDialog(true)}>
            <Plus className="w-4 h-4" />
            Create User
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filtered.map(u => (
              <TableRow key={u.id} className="border-border">
                <TableCell className="font-medium text-foreground">{u.display_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                    {u.role === "admin" ? "Admin" : "Menu Dev"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Disabled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(u.created_at), "MMM d, yy")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleToggle(u.id, u.is_active)}
                    disabled={toggling === u.id}
                    className={`text-xs ${u.is_active ? "text-destructive" : "text-emerald-400"}`}
                  >
                    {toggling === u.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : u.is_active ? (
                      <><ShieldOff className="w-3 h-3 mr-1" /> Disable</>
                    ) : (
                      <><ShieldCheck className="w-3 h-3 mr-1" /> Enable</>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new menu developer or admin account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Display name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            <Input placeholder="Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="menu_dev">Menu Developer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
