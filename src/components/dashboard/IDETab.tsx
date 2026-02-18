import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useMenu } from "@/contexts/MenuContext";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, Upload, GitBranch, Rocket, Loader2, FileCode, AlertCircle } from "lucide-react";

interface LuaError {
  line: number;
  message: string;
}

function validateLua(code: string): LuaError[] {
  const errors: LuaError[] = [];
  const lines = code.split("\n");
  const blockStack: { type: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.replace(/--.*$/, "").trim();
    if (!trimmed) continue;

    // Check for common Lua syntax patterns
    if (/\bfunction\b/.test(trimmed) && !/\bend\b/.test(trimmed)) {
      blockStack.push({ type: "function", line: i + 1 });
    }
    if (/\bif\b.*\bthen\b/.test(trimmed) && !/\bend\b/.test(trimmed)) {
      blockStack.push({ type: "if", line: i + 1 });
    }
    if (/\bfor\b.*\bdo\b/.test(trimmed) && !/\bend\b/.test(trimmed)) {
      blockStack.push({ type: "for", line: i + 1 });
    }
    if (/\bwhile\b.*\bdo\b/.test(trimmed) && !/\bend\b/.test(trimmed)) {
      blockStack.push({ type: "while", line: i + 1 });
    }
    if (/\brepeat\b/.test(trimmed)) {
      blockStack.push({ type: "repeat", line: i + 1 });
    }
    if (/^\s*end\s*[)\s]*$/.test(trimmed) || trimmed === "end") {
      if (blockStack.length > 0 && blockStack[blockStack.length - 1].type !== "repeat") {
        blockStack.pop();
      }
    }
    if (/\buntil\b/.test(trimmed)) {
      if (blockStack.length > 0 && blockStack[blockStack.length - 1].type === "repeat") {
        blockStack.pop();
      }
    }

    // Check for obvious errors
    if (/[^=!<>]==[^=]/.test(trimmed) && !/~=/.test(trimmed)) {
      // This is fine in Lua (== is equality)
    }
    if (/\bprint\b\s*[^(]/.test(trimmed) && !/\bprint\b\s*\(/.test(trimmed)) {
      errors.push({ line: i + 1, message: "print should be called as a function: print(...)" });
    }
  }

  for (const block of blockStack) {
    errors.push({ line: block.line, message: `Unclosed '${block.type}' block (missing 'end' or 'until')` });
  }

  return errors;
}

export default function IDETab() {
  const { selectedMenu, refreshMenus } = useMenu();
  const [code, setCode] = useState("");
  const [originalCode, setOriginalCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [pushTarget, setPushTarget] = useState<"dev" | "build">("dev");
  const [pushing, setPushing] = useState(false);
  const [errors, setErrors] = useState<LuaError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCode = useCallback(async () => {
    if (!selectedMenu) return;
    try {
      const data = await apiCall<{ menu: { dev_code: string } }>("get_menu", { menu_id: selectedMenu.id });
      setCode(data.menu.dev_code || "");
      setOriginalCode(data.menu.dev_code || "");
    } catch {
      toast({ title: "Error", description: "Failed to load code", variant: "destructive" });
    }
  }, [selectedMenu]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  useEffect(() => {
    if (code) {
      const errs = validateLua(code);
      setErrors(errs);
    } else {
      setErrors([]);
    }
  }, [code]);

  const handleSave = async () => {
    if (!selectedMenu) return;
    setSaving(true);
    try {
      await apiCall("update_code", { menu_id: selectedMenu.id, code });
      setOriginalCode(code);
      toast({ title: "Saved", description: "Code saved successfully" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const handlePush = async () => {
    if (!selectedMenu) return;
    setPushing(true);
    try {
      const action = pushTarget === "dev" ? "push_to_dev" : "push_to_build";
      await apiCall(action, { menu_id: selectedMenu.id, code });
      toast({ title: "Pushed", description: `Code pushed to ${pushTarget} build` });
      await refreshMenus();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Push failed", variant: "destructive" });
    }
    setPushing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMenu) return;
    const text = await file.text();
    setCode(text);
    toast({ title: "File loaded", description: `${file.name} loaded into editor` });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadToBuild = async (target: "dev" | "build") => {
    if (!selectedMenu) return;
    setSaving(true);
    try {
      await apiCall("upload_menu", { menu_id: selectedMenu.id, code, target });
      toast({ title: "Uploaded", description: `Code uploaded to ${target} build` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
    }
    setSaving(false);
  };

  if (!selectedMenu) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <FileCode className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p>Select or create a menu to start coding</p>
        </div>
      </div>
    );
  }

  const hasChanges = code !== originalCode;
  const isEditable = ["active", "maintenance"].includes(selectedMenu.status);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={isEditable ? "default" : "secondary"} className="text-xs">
            {selectedMenu.status.replace("_", " ")}
          </Badge>
          <span className="text-sm font-medium text-foreground">{selectedMenu.name}</span>
          {hasChanges && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              Unsaved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".lua,.txt" className="hidden" onChange={handleFileUpload} />
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3 h-3" />
            Upload .lua
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </Button>
          <div className="flex items-center gap-1 border border-border rounded-md">
            <Select value={pushTarget} onValueChange={(v) => setPushTarget(v as "dev" | "build")}>
              <SelectTrigger className="h-8 w-24 border-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">Dev Build</SelectItem>
                <SelectItem value="build">Public Build</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handlePush} disabled={pushing} className="rounded-l-none h-8">
              {pushing ? <Loader2 className="w-3 h-3 animate-spin" /> : pushTarget === "dev" ? <GitBranch className="w-3 h-3" /> : <Rocket className="w-3 h-3" />}
              Push
            </Button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => handleUploadToBuild("dev")} className="text-xs">
            Upload to Dev
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleUploadToBuild("build")} className="text-xs">
            Upload to Build
          </Button>
        </div>
      </div>

      {/* Editor */}
      <Card className="flex-1 overflow-hidden border-border/60">
        <Editor
          height="100%"
          defaultLanguage="lua"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: "on",
            renderWhitespace: "selection",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 12 },
            readOnly: !isEditable && selectedMenu.status !== "pending_approval",
          }}
        />
      </Card>

      {/* Error panel */}
      {errors.length > 0 && (
        <Card className="p-3 border-destructive/30 bg-destructive/5 max-h-32 overflow-auto">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {errors.length} {errors.length === 1 ? "issue" : "issues"} found
            </span>
          </div>
          <div className="space-y-1">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                <span className="text-destructive font-mono">Line {err.line}:</span> {err.message}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
