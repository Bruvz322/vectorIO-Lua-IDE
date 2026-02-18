import { useState } from "react";
import { useMenu } from "@/contexts/MenuContext";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateMenuDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateMenuDialog({ open, onClose }: CreateMenuDialogProps) {
  const { refreshMenus, setSelectedMenu } = useMenu();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: "Error", description: "Menu name must be at least 2 characters", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const data = await apiCall<{ menu: { id: string; name: string; status: string; owner_id: string; created_at: string; updated_at: string } }>("create_menu", { name: name.trim() });
      toast({ title: "Menu Created", description: "Your menu is pending admin approval" });
      setSelectedMenu(data.menu);
      await refreshMenus();
      setName("");
      onClose();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create menu", variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Menu</DialogTitle>
          <DialogDescription>
            Give your FiveM Lua menu a name. It will need admin approval before it becomes active.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Menu name (e.g. MyMenu)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
