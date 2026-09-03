import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RefreshCw, MapPin, Clock, Hash, X, FlipHorizontal, User, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  OPERATORS,
  detectOperator,
  rememberOperator,
  deviceName,
  reverseGeocode,
  type Operator,
} from "@/lib/tracelock";

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
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [refNumber, setRefNumber] = useState(generateRefNumber());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [trust, setTrust] = useState<{ level: string; score: number } | null>(null);

  const [operator, setOperator] = useState<Operator | null>(null);
  const [identitySource, setIdentitySource] = useState("UNIDENTIFIED");
  const [device] = useState(() => deviceName());

  useEffect(() => {
    const detected = detectOperator();
    setOperator(detected.operator);
    setIdentitySource(detected.source);
  }, []);

  const chooseOperator = useCallback((op: Operator) => {
    rememberOperator(op.telegramId);
    setOperator(op);
    setIdentitySource("DEVICE MEMORY");
  }, []);

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
          reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(setPlaceName);
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

    ctx.drawImage(video, 0, 0);

    const smallFont = Math.max(11, canvas.width * 0.0155);
    const fontSize = Math.max(14, canvas.width * 0.021);
    const lineGap = smallFont * 1.55;
    const pad = canvas.width * 0.025;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localStamp = now.toLocaleString("en-GB", { hour12: false });
    const ts = now.toISOString();
    const unix = Math.floor(now.getTime() / 1000);
    const hashInput = `${refNumber}|${ts}|${operator?.telegramId ?? "NA"}|${location?.latitude ?? 0}|${location?.longitude ?? 0}`;
    const simpleHash = btoa(hashInput).slice(0, 20);

    const lines: string[] = [
      `REF   : ${refNumber}`,
      `USER  : ${operator ? `${operator.name} (TG ${operator.telegramId})` : "UNIDENTIFIED OPERATOR"}`,
      `LOCAL : ${localStamp} (${tz})`,
      `UTC   : ${ts}  |  UNIX: ${unix}`,
      location
        ? `GPS   : ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (±${location.accuracy.toFixed(0)}m)`
        : `GPS   : ${locationError || "UNAVAILABLE"}`,
      `PLACE : ${(placeName || "Resolving / unavailable").slice(0, 90)}`,
      `DEVICE: ${device}  |  CAM: ${facingMode === "user" ? "FRONT" : "REAR"}`,
      `HASH  : ${simpleHash}  |  ID SRC: ${identitySource}`,
    ];

    const barH = fontSize * 1.6 + lines.length * lineGap + pad * 1.6;
    const barY = canvas.height - barH;
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    ctx.fillRect(0, barY, canvas.width, barH);
    ctx.fillStyle = "#00bfff";
    ctx.fillRect(0, barY, canvas.width, 3);

    let textY = barY + pad * 0.6 + fontSize;
    ctx.textAlign = "left";
    ctx.font = `bold ${fontSize}px Orbitron, monospace`;
    ctx.fillStyle = "#00bfff";
    ctx.fillText("BLACKTOWER™ TRACELOCK", pad, textY);

    ctx.font = `${smallFont}px JetBrains Mono, monospace`;
    for (const line of lines) {
      textY += lineGap;
      ctx.fillStyle = line.startsWith("USER") || line.startsWith("REF") ? "#ffffff" : "#cfd8dc";
      if (line.startsWith("GPS") && !location) ctx.fillStyle = "#ff6666";
      ctx.fillText(line, pad, textY);
    }

    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
    stopCamera();

    setSendState("sending");
    setTrust(null);
    supabase.functions
      .invoke("telegram-proof", {
        body: {
          imageBase64: dataUrl,
          refNumber,
          isoTime: ts,
          unixTime: unix,
          localTime: localStamp,
          timeZone: tz,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          accuracy: location?.accuracy ?? null,
          placeName,
          hash: simpleHash,
          userAgent: navigator.userAgent,
          deviceName: device,
          camera: facingMode,
          operatorId: operator?.telegramId ?? null,
          operatorName: operator?.name ?? null,
          identitySource,
        },
      })
      .then(async ({ data, error }) => {
        if (error) {
          const details =
            error instanceof FunctionsHttpError ? await error.context.text() : error.message;
          console.error("telegram-proof failed:", details);
          setSendState("error");
          return;
        }
        const trustData = (data as { trust?: { level: string; score: number } } | null)?.trust;
        if (trustData) setTrust(trustData);
        setSendState("sent");
      })
      .catch((e) => {
        console.error("telegram-proof failed:", e);
        setSendState("error");
      });
  }, [location, locationError, placeName, refNumber, stopCamera, operator, identitySource, device, facingMode]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setSendState("idle");
    setTrust(null);
    setRefNumber(generateRefNumber());
    startCamera();
  }, [startCamera]);

  const formatTime = (d: Date) => d.toLocaleTimeString("en-GB", { hour12: false });
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  return (
    <Card className="col-span-1 lg:col-span-2 border-border glow-cyan">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
          <Camera className="w-4 h-4" />
          TRACELOCK CAPTURE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Operator identity */}
        <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs font-mono space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">OPERATOR</span>
            <span className="text-foreground">
              {operator ? `${operator.name} · TG ${operator.telegramId}` : "NOT IDENTIFIED"}
            </span>
            <span className="ml-auto text-muted-foreground">{identitySource}</span>
          </div>
          {(!operator || identitySource !== "TELEGRAM WEBAPP") && (
            <div className="flex flex-wrap gap-2">
              {OPERATORS.map((op) => (
                <Button
                  key={op.telegramId}
                  size="sm"
                  variant={operator?.telegramId === op.telegramId ? "default" : "outline"}
                  className="h-7 text-[10px] font-mono"
                  onClick={() => chooseOperator(op)}
                >
                  {op.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Info strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground">TIME</span>
              <p className="text-foreground">{formatDate(currentTime)} {formatTime(currentTime)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground">LOCATION</span>
              <p className="text-foreground truncate">
                {placeName ||
                  (location
                    ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : locationError || "Acquiring...")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
            <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground">DEVICE</span>
              <p className="text-foreground truncate">{device}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-2">
            <Hash className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground">REF #</span>
              <p className="text-foreground truncate">{refNumber}</p>
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
            <img src={capturedImage} alt="TRACELOCK proof capture" className="w-full h-full object-contain" />
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
            {sendState === "sending" && "SUBMITTING TRACELOCK TO CONTROL CHANNEL..."}
            {sendState === "sent" &&
              `TRACELOCK SUBMITTED — ${refNumber}${trust ? ` · TRUST ${trust.level} (${trust.score}/100)` : ""}`}
            {sendState === "error" && "SUBMISSION FAILED — PLEASE RETAKE"}
            {sendState === "idle" && "TRACELOCK LOGGED"}
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
