import { useState, useEffect, useCallback, useRef } from "react";
import { apiCall } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Loader2, User } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  sender?: { display_name: string; role: string } | null;
}

interface TicketChatProps {
  ticketId: string;
  onBack: () => void;
}

export default function TicketChat({ ticketId, onBack }: TicketChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await apiCall<{ messages: Message[] }>("get_ticket_messages", { ticket_id: ticketId });
      setMessages(data.messages || []);
    } catch {
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const data = await apiCall<{ message: Message }>("send_ticket_message", { ticket_id: ticketId, message: message.trim() });
      setMessages(prev => [...prev, data.message]);
      setMessage("");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Ticket Chat</h2>
          <p className="text-xs text-muted-foreground">{ticketId.slice(0, 8)}...</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden py-4" ref={scrollRef}>
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No messages yet. Start the conversation.
            </div>
          ) : (
            <div className="space-y-3 px-1">
              {messages.map(msg => {
                const isOwn = msg.sender_id === user?.id;
                const isAdmin = msg.sender?.role === "admin";
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] ${isOwn ? "order-1" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isAdmin ? "bg-primary/20" : "bg-secondary"}`}>
                          <User className="w-3 h-3 text-foreground" />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {msg.sender?.display_name || "Unknown"}
                        </span>
                        {isAdmin && <Badge variant="default" className="text-[10px] px-1 py-0">Admin</Badge>}
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                      </div>
                      <Card className={`${isOwn ? "bg-primary/10 border-primary/20" : "bg-secondary border-border/60"}`}>
                        <CardContent className="p-3">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={sending || !message.trim()} size="icon">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
