import { useState, useEffect, useCallback } from "react";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Loader2, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

interface TicketsTabProps {
  onOpenChat: (ticketId: string) => void;
}

export default function TicketsTab({ onOpenChat }: TicketsTabProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      const data = await apiCall<{ tickets: Ticket[] }>("get_tickets");
      setTickets(data.tickets || []);
    } catch {
      toast({ title: "Error", description: "Failed to load tickets", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) {
      toast({ title: "Error", description: "Fill in all fields", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const data = await apiCall<{ ticket: Ticket }>("create_ticket", { subject, description });
      toast({ title: "Created", description: "Ticket created successfully" });
      setCreateDialog(false);
      setSubject("");
      setDescription("");
      loadTickets();
      onOpenChat(data.ticket.id);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Support Tickets</h2>
          <Badge variant="secondary" className="text-xs">{tickets.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setCreateDialog(true)}>
          <Plus className="w-4 h-4" />
          New Ticket
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-2 text-muted-foreground/50" />
            <p>No tickets yet</p>
            <p className="text-xs mt-1">Create a ticket for support</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => (
            <Card
              key={ticket.id}
              className="border-border/60 card-glow cursor-pointer hover:border-primary/20 transition-all"
              onClick={() => onOpenChat(ticket.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground truncate">{ticket.subject}</h3>
                      <Badge className={`text-xs ${statusColors[ticket.status] || ""}`}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(ticket.created_at), "MMM d, yyyy HH:mm")}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ticket</DialogTitle>
            <DialogDescription>Describe your issue and an admin will respond.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
            <Textarea placeholder="Describe your issue in detail..." value={description} onChange={e => setDescription(e.target.value)} rows={5} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
