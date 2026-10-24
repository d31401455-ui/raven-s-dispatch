import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Feather, Crown, Play, Copy, Circle, Volume2, VolumeX, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AlertPlayer } from "@/lib/alert/player";
import { sanitizeUser } from "@/lib/alert/fit";
import { ALERT_DURATION, type AlertType } from "@/lib/alert/engine";
import bgAsset from "@/assets/Bground.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Raven's Dispatch — Cinematic OBS Stream Alerts" },
      { name: "description", content: "Test, preview, and export the gothic Raven's Dispatch follower and subscriber alert for OBS." },
      { property: "og:title", content: "Raven's Dispatch — Cinematic OBS Stream Alerts" },
      { property: "og:description", content: "Test, preview, and export the gothic Raven's Dispatch follower and subscriber alert for OBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Bg = "transparent" | "gothic" | "dark";
const LONG_NAMES = ["TheMidnightCartographerOfSorrows", "xX_NevermoreNightshade_Xx", "LadyMorrigan", "Poe", "GravekeeperGuildmaster99"];

function Dashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<AlertPlayer | null>(null);
  const [user, setUser] = useState("NightshadeWanderer");
  const [type, setType] = useState<AlertType>("follower");
  const [msg, setMsg] = useState("");
  const [bg, setBg] = useState<Bg>("gothic");
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [withAudio, setWithAudio] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const p = new AlertPlayer(canvasRef.current!);
    playerRef.current = p;
    void p.renderAt({ user: "NightshadeWanderer", type: "follower" }, 3.4);
    return () => p.destroy();
  }, []);

  useEffect(() => { playerRef.current?.setVolume(volume); }, [volume]);
  useEffect(() => { if (playerRef.current) playerRef.current.muted = muted; }, [muted]);

  const trigger = (t: AlertType, name = user) => {
    setType(t);
    void playerRef.current?.play({ user: sanitizeUser(name), type: t, message: msg || undefined });
    // also notify any overlay open in this same browser
    try { new BroadcastChannel("raven-dispatch").postMessage({ type: "raven-alert", user: sanitizeUser(name), alertType: t, message: msg || undefined }); } catch { /* unsupported */ }
  };

  const overlayUrl = useMemo(() => `${origin}/overlay`, [origin]);
  const testUrl = useMemo(() => {
    const q = new URLSearchParams({ user: sanitizeUser(user), type });
    if (msg) q.set("msg", msg);
    return `${origin}/overlay?${q.toString()}`;
  }, [origin, user, type, msg]);

  const copy = (s: string) => navigator.clipboard.writeText(s).then(() => toast.success("Copied to clipboard"));

  const record = async () => {
    const p = playerRef.current!;
    const canvas = canvasRef.current!;
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) { toast.error("This browser can't record WebM. Try Chrome or Edge."); return; }
    const stream = canvas.captureStream(60);
    if (withAudio && !muted) {
      const a = p.ensureAudio();
      await a.resume();
      a.recordDest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    setRecording(true);
    rec.start(100);
    await p.play({ user: sanitizeUser(user), type, message: msg || undefined });
    await new Promise((r) => setTimeout(r, 150));
    rec.stop();
    await done;
    stream.getVideoTracks().forEach((t) => t.stop());
    setRecording(false);
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ravens-dispatch-${type}-${sanitizeUser(user).replace(/[^\w-]+/g, "_")}.webm`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success(mime.includes("vp8") ? "Exported WebM (VP8 — transparency may not be kept)" : "Exported transparent WebM");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Feather className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-display text-2xl tracking-wide text-gold">The Raven's Dispatch</h1>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Cinematic stream alerts</p>
            </div>
          </div>
          <a href="#obs" className="text-sm text-muted-foreground hover:text-primary">OBS setup ↓</a>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className={`relative aspect-video overflow-hidden rounded-lg border border-border shadow-plate ${bg === "transparent" ? "bg-checker" : bg === "dark" ? "bg-stage" : ""}`}
            style={bg === "gothic" ? { backgroundImage: `url(${bgAsset.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            {recording && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded bg-background/80 px-2 py-1 text-xs text-destructive">
                <Circle className="h-3 w-3 animate-pulse fill-current" /> Recording
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs uppercase tracking-widest text-muted-foreground">Preview backdrop</span>
            {(["gothic", "transparent", "dark"] as Bg[]).map((b) => (
              <Button key={b} size="sm" variant={bg === b ? "default" : "outline"} onClick={() => setBg(b)} className="capitalize">{b === "gothic" ? "Gothic scene" : b}</Button>
            ))}
          </div>
        </section>

        <aside className="space-y-6 rounded-lg border border-border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="user">Username</Label>
            <div className="flex gap-2">
              <Input id="user" value={user} maxLength={40} onChange={(e) => setUser(e.target.value)} />
              <Button size="icon" variant="outline" title="Random name" onClick={() => setUser(LONG_NAMES[Math.floor(Math.random() * LONG_NAMES.length)])}><Shuffle className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="msg">Banner text (optional)</Label>
            <Input id="msg" placeholder="A NEW SOUL JOINS THE FLOCK" value={msg} onChange={(e) => setMsg(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => trigger("follower")} disabled={recording}><Play className="h-4 w-4" /> New Follower</Button>
            <Button variant="secondary" onClick={() => trigger("subscriber")} disabled={recording}><Crown className="h-4 w-4" /> New Subscriber</Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Volume</Label>
              <Button size="icon" variant="ghost" onClick={() => setMuted((m) => !m)}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
            </div>
            <Slider value={[volume * 100]} max={100} step={1} onValueChange={(v) => setVolume(v[0] / 100)} disabled={muted} />
          </div>

          <div className="space-y-3 border-t border-border pt-5">
            <h2 className="font-display text-lg text-gold">Export WebM</h2>
            <p className="text-xs text-muted-foreground">Records the current username and alert type as a transparent {ALERT_DURATION.toFixed(1)}s WebM (VP9 alpha). Chrome or Edge recommended.</p>
            <div className="flex items-center gap-2">
              <Switch id="aud" checked={withAudio} onCheckedChange={setWithAudio} />
              <Label htmlFor="aud">Include sound effects</Label>
            </div>
            <Button className="w-full" variant="outline" onClick={record} disabled={recording}>
              <Circle className="h-4 w-4 fill-destructive text-destructive" /> {recording ? "Recording…" : `Record ${type} alert`}
            </Button>
          </div>
        </aside>
      </main>

      <section id="obs" className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-2xl text-gold">OBS Studio setup</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>In OBS, add a new source: <b className="text-foreground">Sources → + → Browser</b>.</li>
            <li>Paste the overlay URL below. Set <b className="text-foreground">Width 1280</b>, <b className="text-foreground">Height 720</b> (or 1920×1080 — it scales).</li>
            <li>Tick <b className="text-foreground">Control audio via OBS</b> so the sound effects go through your mixer.</li>
            <li>Leave Custom CSS empty or use <code className="text-primary">body {"{"} background: transparent; {"}"}</code>.</li>
            <li>To trigger an alert, set <code className="text-primary">?user=Name&amp;type=follower</code> (or <code className="text-primary">subscriber</code>) on the URL, call <code className="text-primary">window.ravenAlert("Name","follower")</code>, or send a <code className="text-primary">postMessage({"{"}type:"raven-alert", user, alertType{"}"})</code>.</li>
            <li>Streamlabs: add the same URL as a Browser Source widget.</li>
          </ol>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <UrlBox label="Overlay (waits for events)" url={overlayUrl} onCopy={copy} />
            <UrlBox label="Test URL (plays on load)" url={testUrl} onCopy={copy} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Tip: add <code>&amp;loop=10</code> to replay every 10 seconds while positioning the source, <code>&amp;volume=0.5</code> to set loudness, or <code>&amp;mute=1</code> to silence it.</p>
        </div>
      </section>
    </div>
  );
}

function UrlBox({ label, url, onCopy }: { label: string; url: string; onCopy: (s: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button size="icon" variant="outline" onClick={() => onCopy(url)}><Copy className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
