import { LogOut, UserRound } from "lucide-react";
import logo from "@/assets/blacktower-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import LiveClock from "@/components/LiveClock";
import TimestampConverter from "@/components/TimestampConverter";
import TimeDifference from "@/components/TimeDifference";
import WorldClocks from "@/components/WorldClocks";
import TimestampFormats from "@/components/TimestampFormats";
import EpochCountdown from "@/components/EpochCountdown";
import PhotoProof from "@/components/PhotoProof";

const Index = () => {
  const { user, fullName, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <img src={logo} alt="BLACKTOWER™" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-display text-lg font-bold tracking-wider text-foreground">
              BLACKTOWER<span className="text-primary">™</span>
            </h1>
            <p className="text-xs text-muted-foreground font-display tracking-widest">TIMESTAMP TOOLS</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-secondary/50 rounded-md px-3 py-2">
              <UserRound className="w-3.5 h-3.5 text-primary" />
              <span className="text-foreground">{fullName || user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="font-display tracking-wider text-[11px]">
              <LogOut className="w-3.5 h-3.5 mr-2" /> SIGN OUT
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PhotoProof />
        <LiveClock />
        <TimestampConverter />
        <TimeDifference />
        <EpochCountdown />
        <WorldClocks />
        <TimestampFormats />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6 text-center">
        <p className="text-xs text-muted-foreground font-display tracking-widest">
          © {new Date().getFullYear()} BLACKTOWER™ — ALL RIGHTS RESERVED
        </p>
      </footer>
    </div>
  );
};

export default Index;
