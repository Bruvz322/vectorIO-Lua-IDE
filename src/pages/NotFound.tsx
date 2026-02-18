import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Terminal, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center red-glow-bg">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
          <Terminal className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
          <p className="text-muted-foreground">This page does not exist</p>
        </div>
        <Button onClick={() => navigate("/")} variant="secondary">
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
