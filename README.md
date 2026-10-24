# Raven’s Dispatch

Create a premium OBS Browser Source stream alert web application based on the attached "PROJECT: THE RAVEN'S DISPATCH — CINEMATIC FOLLOWER ALERT" specification and the attached artwork assets (follower.png, sub.png, ralert.png, overlay frames, raven illustrations, and gothic atmosphere).

Key requirements:
1. Dedicated OBS Browser Source route (/overlay or /alert) with a fully transparent background (alpha), designed to run cleanly in OBS Studio / Streamlabs as a browser source.
2. Dynamic follower / subscriber username support at runtime via URL parameters (e.g. ?user=Username&type=follower) or postMessage/events. Automatic font scaling and centering for long usernames to prevent clipping.
3. Complete 5–6 second cinematic gothic animation sequence as specified:
   - Atmospheric mist intro (0.0–0.3s)
   - Animated raven arrival from off-screen landing onto the nameplate with wing swoosh and claw grip (0.3–0.9s)
   - Skull awakening with supernatural glowing red eye pulse reflecting onto the bronze/metal frame (0.9–1.2s)
   - Name engraving into the metal plate: progressive left-to-right stroke/chisel reveal with metallic sparks, gold scratches, and readable typography (1.2–2.8s)
   - Final impact: metallic strike, gold shimmer across the name, skull eye flash, and secondary banner text "A NEW SOUL JOINS THE FLOCK" (2.8–3.3s)
   - Raven exit: flight away leaving drifting black feathers and mist, smooth exit fade (3.3–5.5s), with clean reset for subsequent alerts.
4. Synchronized synthesized/audio sound effects (wing flap swoosh, distant raven call, metallic chiseling/sparks, gong/impact strike).
5. Streamer Control & Testing Dashboard (/):
   - Interactive preview of the alert over both transparent background and preview backgrounds (such as the attached gothic backdrop).
   - Test alert trigger controls for New Follower, New Subscriber, and custom test usernames.
   - OBS setup guide with copyable browser source URLs and instructions for OBS Studio.
   - Built-in transparent WebM recording / export tool (canvas MediaRecorder) so the alert can also be exported directly as a transparent WebM video clip.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4edca4ee-be00-4d41-8d9f-a930279afee3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
