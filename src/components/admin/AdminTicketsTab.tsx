import { useState, useEffect, useCallback } from "react";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Clock, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  creator_id: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

interface AdminTicketsTabProps {
  onOpenChat: (ticketId: string) => void;
}

export default function AdminTicketsTab({ onOpenChat }: AdminTicketsTabProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const data = await apiCall<{ tickets: Ticket[] }>("get_tickets");
      setTickets(data.tickets || []);
    } catch {
      toast({ title: "Error", description: "Failed to load tickets", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleStatusChange = async (ticketId: string, status: string) => {
    setUpdatingStatus(ticketId);
    try {
      await apiCall("update_ticket_status", { ticket_id: ticketId, status });
      toast({ title: "Updated", description: `Ticket status changed to ${status}` });
      loadTickets();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setUpdatingStatus(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">All Tickets</h2>
        <Badge variant="secondary" className="text-xs">{tickets.length}</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tickets.length === 0 ? (
        <Card className="border-border/60"><CardContent className="py-12 text-center text-muted-foreground">No tickets</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="border-border/60 card-glow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1 cursor-pointer" onClick={() => onOpenChat(ticket.id)}>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={ticket.status}
                      onValueChange={(val) => handleStatusChange(ticket.id, val)}
                      disabled={updatingStatus === ticket.id}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChat(ticket.id)}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
