import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogIn, ShieldCheck, Terminal } from "lucide-react";
import logo from "@/assets/blacktower-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, enableLocalTerminalSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (!isSupabaseConfigured) {
      enableLocalTerminalSession(email || "operator@blacktower.com", "Kelvin Ong");
      setBusy(false);
      navigate("/", { replace: true });
      return;
    }

    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      setBusy(false);
      if (err) {
        setError(err.message);
        return;
      }
      navigate("/", { replace: true });
    } catch (fetchErr) {
      setBusy(false);
      setError(
        fetchErr instanceof Error
          ? `${fetchErr.message} (Use Offline Forensic Terminal Mode if cloud connection is unreachable)`
          : "Authentication request failed."
      );
    }
  };

  const enterOfflineTerminal = () => {
    enableLocalTerminalSession(
      email.trim() || "blackmasterong@blacktower.com",
      "Kelvin Ong"
    );
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <img src={logo} alt="BLACKTOWER™ logo" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground">
            BLACKTOWER<span className="text-primary">™</span>
          </h1>
          <p className="text-xs text-muted-foreground font-display tracking-widest">
            FIELD PROOF TERMINAL — AUTHORISED PERSONNEL ONLY
          </p>
        </div>

        <Card className="border-border glow-cyan">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> SECURE SIGN IN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-mono tracking-widest text-muted-foreground">
                  BLACKTOWER EMAIL
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@blacktower.com"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-mono tracking-widest text-muted-foreground">
                  PASSWORD
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                />
              </div>

              {error && (
                <p className="text-xs font-mono text-destructive border border-destructive/40 bg-destructive/5 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={busy} className="w-full font-display tracking-wider text-xs glow-cyan-strong">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                ENTER TERMINAL
              </Button>

              {(!isSupabaseConfigured || error) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={enterOfflineTerminal}
                  className="w-full font-display tracking-wider text-xs border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  LAUNCH LOCAL FORENSIC TERMINAL
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="text-[11px] text-center text-muted-foreground font-mono">
          Accounts are issued by BLACKTOWER™ control. No public sign-up.
        </p>
      </div>
    </div>
  );
};

export default Auth;
