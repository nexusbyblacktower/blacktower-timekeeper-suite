import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RefreshCw, MapPin, Clock, Hash, X, FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const generateRefNumber = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const timestamp = Date.now().toString(36).toUpperCase();
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `BT-${timestamp}-${random}`;
};

const PhotoProof = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [refNumber, setRefNumber] = useState(generateRefNumber());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setLocationError(null);
        },
        (err) => setLocationError(err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported");
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setCapturedImage(null);
    } catch {
      alert("Unable to access camera. Please grant camera permissions.");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const now = new Date();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Overlay bar at bottom
    const barH = canvas.height * 0.18;
    const barY = canvas.height - barH;
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, barY, canvas.width, barH);

    // Accent line
    ctx.fillStyle = "#00bfff";
    ctx.fillRect(0, barY, canvas.width, 3);

    const fontSize = Math.max(14, canvas.width * 0.022);
    const smallFont = Math.max(11, canvas.width * 0.016);
    const pad = canvas.width * 0.03;
    let textY = barY + fontSize + 12;

    // Brand
    ctx.font = `bold ${fontSize * 1.1}px Orbitron, monospace`;
    ctx.fillStyle = "#00bfff";
    ctx.fillText("BLACKTOWER™ PROOF", pad, textY);

    // Reference
    textY += fontSize + 10;
    ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`REF: ${refNumber}`, pad, textY);

    // Timestamp
    textY += fontSize + 8;
    ctx.font = `${smallFont}px JetBrains Mono, monospace`;
    ctx.fillStyle = "#cccccc";
    const ts = now.toISOString();
    const unix = Math.floor(now.getTime() / 1000);
    ctx.fillText(`TIME: ${ts}`, pad, textY);
    textY += smallFont + 6;
    ctx.fillText(`UNIX: ${unix}`, pad, textY);

    // Location
    textY += smallFont + 6;
    if (location) {
      ctx.fillText(
        `LOC: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (±${location.accuracy.toFixed(0)}m)`,
        pad,
        textY
      );
    } else {
      ctx.fillStyle = "#ff6666";
      ctx.fillText(`LOC: ${locationError || "Unavailable"}`, pad, textY);
    }

    // Hash watermark (right side)
    ctx.textAlign = "right";
    ctx.font = `${smallFont * 0.9}px JetBrains Mono, monospace`;
    ctx.fillStyle = "rgba(0, 191, 255, 0.5)";
    const hashInput = `${refNumber}|${ts}|${location?.latitude ?? 0}|${location?.longitude ?? 0}`;
    const simpleHash = btoa(hashInput).slice(0, 16);
    ctx.fillText(`HASH: ${simpleHash}`, canvas.width - pad, barY + fontSize + 12);
    ctx.textAlign = "left";

    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
    stopCamera();

    // Auto-submit proof to the BLACKTOWER™ control channel
    setSendState("sending");
    supabase.functions
      .invoke("telegram-proof", {
        body: {
          imageBase64: dataUrl,
          refNumber,
          isoTime: ts,
          unixTime: unix,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          accuracy: location?.accuracy ?? null,
          hash: simpleHash,
          userAgent: navigator.userAgent,
        },
      })
      .then(async ({ error }) => {
        if (error) {
          const details =
            error instanceof FunctionsHttpError ? await error.context.text() : error.message;
          console.error("telegram-proof failed:", details);
          setSendState("error");
          return;
        }
        setSendState("sent");
      })
      .catch((e) => {
        console.error("telegram-proof failed:", e);
        setSendState("error");
      });
  }, [location, locationError, refNumber, stopCamera]);



  const retake = useCallback(() => {
    setCapturedImage(null);
    setSendState("idle");
    setRefNumber(generateRefNumber());
    startCamera();
  }, [startCamera]);

  const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour12: false });
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  return (
    <Card className="col-span-1 lg:col-span-2 border-border glow-cyan">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
          <Camera className="w-4 h-4" />
          LOCATION PROOF CAPTURE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground">TIME</span>
              <p className="text-foreground">{formatDate(currentTime)} {formatTime(currentTime)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground">LOCATION</span>
              <p className="text-foreground">
                {location
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : locationError || "Acquiring..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
            <Hash className="w-3.5 h-3.5 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground">REF #</span>
              <p className="text-foreground">{refNumber}</p>
            </div>
          </div>
        </div>

        {/* Camera / Preview */}
        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border border-border">
          {!isCameraActive && !capturedImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Camera className="w-12 h-12 text-muted-foreground" />
              <Button onClick={startCamera} className="font-display tracking-wider text-xs">
                <Camera className="w-4 h-4 mr-2" /> START CAMERA
              </Button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive ? "" : "hidden"}`}
          />

          {capturedImage && (
            <img src={capturedImage} alt="Captured proof" className="w-full h-full object-contain" />
          )}

          {isCameraActive && (
            <div className="absolute top-3 right-3 flex gap-2">
              <Button size="icon" variant="secondary" onClick={flipCamera} className="bg-background/60 backdrop-blur-sm border border-border">
                <FlipHorizontal className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={stopCamera} className="bg-background/60 backdrop-blur-sm border border-border">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Submission status */}
        {capturedImage && (
          <div
            className={`text-xs font-mono text-center rounded-md px-3 py-2 border ${
              sendState === "sent"
                ? "border-primary/50 text-primary bg-primary/5"
                : sendState === "error"
                ? "border-destructive/50 text-destructive bg-destructive/5"
                : "border-border text-muted-foreground bg-secondary/40"
            }`}
          >
            {sendState === "sending" && "SUBMITTING PROOF TO CONTROL CHANNEL..."}
            {sendState === "sent" && "PROOF SUBMITTED — RECORDED UNDER " + refNumber}
            {sendState === "error" && "SUBMISSION FAILED — PLEASE RETAKE"}
            {sendState === "idle" && "PROOF LOGGED"}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          {isCameraActive && (
            <Button onClick={capturePhoto} className="font-display tracking-wider text-xs glow-cyan-strong">
              <Camera className="w-4 h-4 mr-2" /> CAPTURE PROOF
            </Button>
          )}
          {capturedImage && (
            <Button onClick={retake} variant="outline" className="font-display tracking-wider text-xs">
              <RefreshCw className="w-4 h-4 mr-2" /> RETAKE
            </Button>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default PhotoProof;
