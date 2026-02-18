import { useState, useEffect, useCallback } from "react";
import { useMenu } from "@/contexts/MenuContext";
import { apiCall } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Key, Copy, Eye, EyeOff, Loader2, FileCode, Globe } from "lucide-react";

interface APIInfo {
  api_key_dev: string;
  api_key_build: string;
  payment_api_key: string;
  name: string;
  status: string;
}

export default function APITab() {
  const { selectedMenu } = useMenu();
  const [apiInfo, setApiInfo] = useState<APIInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const loadAPI = useCallback(async () => {
    if (!selectedMenu) return;
    setLoading(true);
    try {
      const data = await apiCall<{ api: APIInfo }>("get_api_info", { menu_id: selectedMenu.id });
      setApiInfo(data.api);
    } catch {
      toast({ title: "Error", description: "Failed to load API info", variant: "destructive" });
    }
    setLoading(false);
  }, [selectedMenu]);

  useEffect(() => {
    loadAPI();
  }, [loadAPI]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  const toggleShow = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!selectedMenu) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <FileCode className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p>Select a menu to view API info</p>
        </div>
      </div>
    );
  }

  if (loading || !apiInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const keys = [
    { id: "dev", label: "Dev Build API Key", value: apiInfo.api_key_dev, description: "Use this key to access the dev build of your menu from the loader." },
    { id: "build", label: "Public Build API Key", value: apiInfo.api_key_build, description: "Use this key to access the public/release build of your menu." },
    { id: "payment", label: "Payment / Management API Key", value: apiInfo.payment_api_key, description: "Use this key for payment webhooks, user management, blacklisting, and debug logging." },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">API Information</h2>
        <Badge variant="secondary" className="text-xs">{apiInfo.name}</Badge>
      </div>

      {!["active", "maintenance"].includes(apiInfo.status) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-400">
            API keys are shown but the menu must be approved and active for the API to work.
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      <div className="space-y-3">
        {keys.map(k => (
          <Card key={k.id} className="border-border/60 card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="w-3 h-3 text-primary" />
                {k.label}
              </CardTitle>
              <CardDescription className="text-xs">{k.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded-md p-2 font-mono text-muted-foreground overflow-hidden">
                  {showKeys[k.id] ? k.value : "****" + k.value.slice(-8)}
                </code>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => toggleShow(k.id)}>
                  {showKeys[k.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyToClipboard(k.value, k.label)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Documentation */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            API Endpoints
          </CardTitle>
          <CardDescription>Use these endpoints to integrate with your menu loader and payment system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">Get Menu Code (Loader)</h4>
            <code className="block text-xs bg-muted rounded-md p-3 font-mono text-muted-foreground whitespace-pre-wrap">
{`POST /functions/v1/external-api
Authorization: Bearer <dev_or_build_api_key>
Content-Type: application/json

{"action": "get_code", "build_type": "dev"}`}
            </code>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">Create User (Payment Webhook)</h4>
            <code className="block text-xs bg-muted rounded-md p-3 font-mono text-muted-foreground whitespace-pre-wrap">
{`POST /functions/v1/external-api
Authorization: Bearer <payment_api_key>
Content-Type: application/json

{"action": "create_user", "email": "buyer@example.com", "hwid": "optional"}`}
            </code>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">Blacklist User</h4>
            <code className="block text-xs bg-muted rounded-md p-3 font-mono text-muted-foreground whitespace-pre-wrap">
{`POST /functions/v1/external-api
Authorization: Bearer <payment_api_key>
Content-Type: application/json

{"action": "blacklist_user", "email": "user@example.com", "reason": "Debug detected"}`}
            </code>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">Check Blacklist</h4>
            <code className="block text-xs bg-muted rounded-md p-3 font-mono text-muted-foreground whitespace-pre-wrap">
{`POST /functions/v1/external-api
Authorization: Bearer <payment_api_key>
Content-Type: application/json

{"action": "check_blacklist", "email": "user@example.com"}`}
            </code>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">Send Debug Log</h4>
            <code className="block text-xs bg-muted rounded-md p-3 font-mono text-muted-foreground whitespace-pre-wrap">
{`POST /functions/v1/external-api
Authorization: Bearer <payment_api_key>
Content-Type: application/json

{"action": "debug_log", "details": "Attempted debug at...", "email": "user@example.com"}`}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
