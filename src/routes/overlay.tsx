import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { AlertPlayer } from "@/lib/alert/player";
import { sanitizeUser } from "@/lib/alert/fit";
import type { AlertType } from "@/lib/alert/engine";

const search = z.object({
  user: z.string().optional(),
  type: z.enum(["follower", "subscriber"]).optional(),
  msg: z.string().optional(),
  volume: z.coerce.number().min(0).max(1).optional(),
  mute: z.coerce.number().optional(),
  loop: z.coerce.number().min(0).optional(),
});

export const Route = createFileRoute("/overlay")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Raven's Dispatch — OBS Alert Overlay" },
      { name: "description", content: "Transparent browser-source overlay for the Raven's Dispatch cinematic stream alert." },
      { property: "og:title", content: "Raven's Dispatch — OBS Alert Overlay" },
      { property: "og:description", content: "Transparent browser-source overlay for the Raven's Dispatch cinematic stream alert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overlay,
});

type AlertMsg = { type?: string; user?: string; alertType?: AlertType; message?: string };

function Overlay() {
  const s = Route.useSearch();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const prev = [html.style.background, document.body.style.background];
    html.style.background = "transparent";
    document.body.style.background = "transparent";
    const player = new AlertPlayer(ref.current!);
    player.muted = s.mute === 1;
    player.setVolume(s.volume ?? 0.8);
    const fire = (user?: string, type?: AlertType, message?: string) =>
      player.enqueue({ user: sanitizeUser(user), type: type ?? "follower", message });

    const onMsg = (e: MessageEvent<AlertMsg>) => {
      const d = e.data;
      if (d && typeof d === "object" && d.type === "raven-alert") fire(d.user, d.alertType, d.message);
    };
    window.addEventListener("message", onMsg);
    (window as unknown as { ravenAlert: typeof fire }).ravenAlert = fire;
    const bc = "BroadcastChannel" in window ? new BroadcastChannel("raven-dispatch") : null;
    if (bc) bc.onmessage = (e) => onMsg(e as MessageEvent<AlertMsg>);

    let timer: ReturnType<typeof setInterval> | undefined;
    if (s.user) {
      fire(s.user, s.type, s.msg);
      if (s.loop) timer = setInterval(() => fire(s.user, s.type, s.msg), Math.max(6, s.loop) * 1000);
    }
    return () => {
      window.removeEventListener("message", onMsg);
      bc?.close();
      clearInterval(timer);
      player.destroy();
      html.style.background = prev[0];
      document.body.style.background = prev[1];
    };
  }, [s.user, s.type, s.msg, s.mute, s.volume, s.loop]);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 h-screen w-screen"
      style={{ objectFit: "contain", background: "transparent" }}
    />
  );
}
