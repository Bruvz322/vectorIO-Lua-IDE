import { useState } from "react";
import { useMenu } from "@/contexts/MenuContext";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Settings, Wrench, Pause, Play, Trash2, Loader2, FileCode, AlertTriangle } from "lucide-react";

export default function ManagementTab() {
  const { selectedMenu, refreshMenus } = useMenu();
  const [updating, setUpdating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!selectedMenu) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <FileCode className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p>Select a menu to manage</p>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (status: string) => {
    setUpdating(true);
    try {
      await apiCall("update_menu_status", { menu_id: selectedMenu.id, status });
      toast({ title: "Updated", description: `Menu status changed to ${status}` });
      await refreshMenus();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setUpdating(false);
  };

  const handleDeletionRequest = async () => {
    if (!deleteReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      await apiCall("request_deletion", { menu_id: selectedMenu.id, reason: deleteReason });
      toast({ title: "Submitted", description: "Deletion request submitted to admins" });
      setDeleteDialog(false);
      setDeleteReason("");
      await refreshMenus();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setDeleting(false);
  };

  const isActive = selectedMenu.status === "active";
  const isMaintenance = selectedMenu.status === "maintenance";
  const isPaused = selectedMenu.status === "paused";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Menu Management</h2>
        <Badge variant="secondary" className="text-xs">{selectedMenu.name}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Maintenance */}
        <Card className="border-border/60 card-glow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>Put your menu into maintenance mode. Users will be unable to access it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={isMaintenance ? "default" : "secondary"}
              onClick={() => handleStatusChange(isMaintenance ? "active" : "maintenance")}
              disabled={updating || (!isActive && !isMaintenance)}
              className="w-full"
            >
              {updating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isMaintenance ? "Exit Maintenance" : "Enter Maintenance"}
            </Button>
          </CardContent>
        </Card>

        {/* Pause */}
        <Card className="border-border/60 card-glow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-orange-400" />}
              Pause Menu Access
            </CardTitle>
            <CardDescription>Temporarily pause all access to your menu for all users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={isPaused ? "default" : "secondary"}
              onClick={() => handleStatusChange(isPaused ? "active" : "paused")}
              disabled={updating || (!isActive && !isPaused)}
              className="w-full"
            >
              {updating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPaused ? "Resume Access" : "Pause All Access"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete */}
      <Card className="border-destructive/20 card-glow">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />
            Request Deletion
          </CardTitle>
          <CardDescription>
            Request your menu to be deleted. An admin will review your request. The menu will not be permanently deleted - it will remain in storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialog(true)}
            disabled={selectedMenu.status === "deletion_requested" || selectedMenu.status === "terminated"}
          >
            <AlertTriangle className="w-4 h-4" />
            Request Deletion
          </Button>
          {selectedMenu.status === "deletion_requested" && (
            <p className="text-xs text-amber-400 mt-2">Deletion request pending admin review</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Menu Deletion</DialogTitle>
            <DialogDescription>
              Explain why you want to delete &quot;{selectedMenu.name}&quot;. An admin will review this.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Why do you want to delete this menu?"
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletionRequest} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
