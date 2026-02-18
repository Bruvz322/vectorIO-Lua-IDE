import { useState, useEffect, useCallback } from "react";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Trash2, Check, X, ArrowRightLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface DeletionRequest {
  id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  transfer_to_email: string | null;
  created_at: string;
  menu: { name: string } | null;
  requester: { email: string; display_name: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  transferred: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function AdminDeletionTab() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [handleDialog, setHandleDialog] = useState<DeletionRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | "transferred">("approved");
  const [response, setResponse] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const data = await apiCall<{ requests: DeletionRequest[] }>("admin_get_deletion_requests");
      setRequests(data.requests || []);
    } catch {
      toast({ title: "Error", description: "Failed to load requests", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleSubmit = async () => {
    if (!handleDialog) return;
    if (decision === "transferred" && !transferEmail) {
      toast({ title: "Error", description: "Transfer email required", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      await apiCall("admin_handle_deletion", {
        request_id: handleDialog.id,
        decision,
        response,
        transfer_to_email: decision === "transferred" ? transferEmail : undefined,
      });
      toast({ title: "Done", description: `Request ${decision}` });
      setHandleDialog(null);
      setResponse("");
      setTransferEmail("");
      loadRequests();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Deletion Requests</h2>
        <Badge variant="secondary" className="text-xs">{requests.length}</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <Card className="border-border/60"><CardContent className="py-12 text-center text-muted-foreground">No deletion requests</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id} className="border-border/60 card-glow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {req.menu?.name || "Unknown Menu"} - {req.requester?.display_name}
                  </CardTitle>
                  <Badge className={`text-xs ${statusColors[req.status] || ""}`}>
                    {req.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{req.reason}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{format(new Date(req.created_at), "MMM d, yyyy HH:mm")}</span>
                  {req.status === "pending" && (
                    <Button size="sm" onClick={() => setHandleDialog(req)}>Handle Request</Button>
                  )}
                </div>
                {req.admin_response && (
                  <div className="bg-muted rounded-md p-2 text-xs text-muted-foreground">
                    <strong>Admin:</strong> {req.admin_response}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!handleDialog} onOpenChange={() => setHandleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Handle Deletion Request</DialogTitle>
            <DialogDescription>
              Menu: {handleDialog?.menu?.name} | By: {handleDialog?.requester?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Reason: {handleDialog?.reason}</p>
            <div className="flex gap-2">
              <Button
                variant={decision === "approved" ? "default" : "secondary"}
                size="sm"
                onClick={() => setDecision("approved")}
              >
                <Check className="w-3 h-3 mr-1" /> Approve (Terminate)
              </Button>
              <Button
                variant={decision === "rejected" ? "default" : "secondary"}
                size="sm"
                onClick={() => setDecision("rejected")}
              >
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
              <Button
                variant={decision === "transferred" ? "default" : "secondary"}
                size="sm"
                onClick={() => setDecision("transferred")}
              >
                <ArrowRightLeft className="w-3 h-3 mr-1" /> Transfer
              </Button>
            </div>
            {decision === "transferred" && (
              <Input placeholder="Transfer to email" value={transferEmail} onChange={e => setTransferEmail(e.target.value)} />
            )}
            <Textarea placeholder="Your response/thoughts..." value={response} onChange={e => setResponse(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setHandleDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
