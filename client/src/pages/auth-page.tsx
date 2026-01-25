
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

export default function AuthPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="flex flex-col justify-center space-y-6 text-center md:text-left">
           <div className="flex items-center justify-center md:justify-start gap-2 text-primary">
             <ShieldCheck size={48} />
             <h1 className="text-4xl font-bold">OTC Signals</h1>
           </div>
           <p className="text-xl text-muted-foreground">
             Professional trading signals for Pocket Option OTC markets. Real-time analysis, sparklines, and expiration tracking.
           </p>
           <ul className="space-y-2 text-muted-foreground hidden md:block">
             <li>✅ Real-time Signals</li>
             <li>✅ 85%+ Accuracy Goals</li>
             <li>✅ Sparkline Visualization</li>
             <li>✅ Expired Signal History</li>
           </ul>
        </div>
        
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md hover-elevate">
            <CardHeader className="text-center">
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Login to access the dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full" onClick={handleLogin}>
                Login with Replit
              </Button>
            </CardContent>
            <CardFooter className="text-xs text-center text-muted-foreground">
              By logging in, you agree to our Terms of Service. Trading involves risk.
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
