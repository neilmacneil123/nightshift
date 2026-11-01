# Nightshift DJ

A local-first, two-deck DJ workspace built with React, TypeScript, Vite, an AudioWorklet and original C++ WebAssembly DSP. No backend, account, upload, or SharedArrayBuffer.

## Run

Node 22.12+ (or 24), npm, and either Emscripten (`emcc` on PATH) or Clang with the wasm32 target and wasm-ld:

```sh
npm install
npm run dev
# open http://localhost:5173
npm run build
npm run preview
```

`npm run build:wasm` prefers Emscripten and emits standalone `public/dsp.wasm`. When Emscripten is missing, the script uses freestanding Clang with the same C++ source and exported ABI. The supplied binary was compiled with Clang; Emscripten compilation has not been verified in this environment. See [Emscripten standalone compilation](https://emscripten.org/docs/compiling/Building-Projects.html). The binary is included so a JS-only host can serve it; the full build requires a compiler. Serve the app at an origin root on HTTPS or localhost (secure context required for AudioWorklet).

## Docker Compose

```sh
docker compose up -d --build
# open http://localhost:8080
docker compose logs -f webdj
docker compose down
```

To change the port: `WEB_DJ_PORT=8090 docker compose up -d --build`.
The multi-stage image compiles WASM using Clang and builds the frontend with Node,
then serves only the production assets with nginx. Building requires internet
access to download base images, OS packages and npm dependencies. No host Node or
C++ toolchain is required. The unrelated `mixxx/` checkout is excluded from the
build context.

For access from another computer, put the service behind an HTTPS reverse proxy;
plain HTTP on a LAN IP does not provide the secure context required for
AudioWorklet. Localhost HTTP works locally. Audio and IndexedDB data remain in
each user's browser, so no Docker data volume is required. Preserve the browser
origin (scheme, hostname and port) to keep access to its saved metadata.

## Mixing

Import multiple audio files or drop them anywhere. The first fills A, subsequent files fill B and stay in the collection. Use each library row's A/B buttons to load a track. Press PLAY on both decks, move the crossfader, and adjust gain, three-band EQ, channel volume and master volume. A/L toggle playback when focus is outside a form control.

Click the overview for an absolute seek; click the scrolling waveform to seek relative to its playhead. CUE stops and returns to the stored cue; SET CUE stores the current position. Click an empty hot cue to store it and a populated cue to seek; right-click to clear. SET IN / SET OUT defines an unquantized manual loop; EXIT LOOP releases it. Importing does not start playback. Audio is activated by a user gesture.

Speed is resampling (75–125%): **pitch changes with speed**. This is not pitch-preserving stretching or sync. EQ bands use complementary one-pole crossovers at 250 Hz and 4 kHz, with independently adjustable band gains. This is a lightweight EQ, not a model of Mixxx's filters.

## Audio architecture

- **Main UI:** file reading and browser `decodeAudioData`, controls and Canvas rendering. Decode uses the AudioContext sample rate. PCM channels transfer to the worklet rather than copying during playback. Decode errors, missing WASM and unsupported formats surface in the status bar. Files above 150 MB are rejected; decoded audio can still consume substantial RAM. Files are fully decoded, not streamed.
- **Background worker:** computes full-track peak envelopes from actual decoded stereo samples. Waveforms always represent loaded audio; the empty state has no invented waveform. No BPM analysis yet.
- **AudioWorklet:** owns PCM, play/pause, fractional linear resampling, seek, loop boundaries and transport state. Each 128-frame render block fills fixed WASM input buffers. No explicit allocations, blocking I/O, fetches or logging in `process`. Telemetry uses a reusable typed array, posted every 32 blocks; browser message serialization may allocate internally. Incoming commands and file installation occur outside the render callback.
- **WASM:** stereo three-band EQ, deck gain/volume and equal-power crossfade plus master gain. The worklet reads actual post-processing channel/master peaks and clamps final output to [-1,1]. The master clipping lamp latches until clicked; deck CLIP lamps show current overload. Reduce levels when clipping occurs; no lookahead limiter is included.
- **IndexedDB:** library metadata, waveform summaries, hot cues, crossfader and master preferences. Original files are not stored. Reloaded library rows ask you to select the original file. Manual loops, regular cue and channel settings are session-only. Storage failures do not disable playback.

No shared memory is used, so COOP/COEP headers are unnecessary. Worklet initialization/compilation occurs before audio starts. Control updates are block-based and are not smoothed: abrupt gain, seek or cue changes can click. Imported compressed audio can have encoder padding. Loops are sample-position loops, not beat-aware loops.

## Verification

The production build and a Node runtime smoke test of the **actual worklet plus WASM** passed. That smoke test feeds two real generated PCM signals, renders blocks, and asserts playback, crossfader isolation, gain mute, all-band EQ kill, seek, speed, loop wrap, meters and pause:

```sh
node scripts/smoke-dsp.mjs
```

The sandbox prevented a preview server from binding a port, so browser file import, device output and audible playback are **not verified here**. A browser smoke script is included; install Playwright, run the dev server, then run it in another terminal:

```sh
npm install --no-save playwright
CHROME_PATH=/path/to/chrome npm run smoke
```

It generates two PCM WAV files, imports them through the interface, plays both decks and measures the rendered output through a real AnalyserNode. It also sends seek/loop commands and writes `smoke.png`. It needs Chromium/Chrome and defaults to `/opt/google/chrome/chrome` on this machine.

## Boundaries and unfinished work

The first mixing milestone, hot cues, manual loops, saved metadata, search/sort and A/L shortcuts are implemented. BPM detection, beat-grid estimation/editing, tempo and phase sync, quantization, pitch-preserving stretching, MIDI mapping and headphone routing are **not implemented**. Nothing in the UI is labeled sync.

Browser format support varies (WAV/MP3 are good first choices; FLAC/AAC depend on browser/platform). This app sends one stereo master output to the browser's default device. Independent headphone cueing requires extra output channels/device routing; multiple output devices and `setSinkId` support vary and can require user permission. Web MIDI also varies by browser and requires permission, especially for system-exclusive access. Mobile/background tabs, sleep, Bluetooth and OS audio policies can suspend playback or add latency; this is not a guaranteed unattended performance system.

## Licensing

The new application and DSP are original; no Mixxx source, graphics or third-party DSP libraries are integrated. The pre-existing `mixxx/` reference checkout remains separate and retains its own GPL licensing and notices; it is not bundled into `dist`. React is MIT licensed, Vite is MIT licensed, and TypeScript is Apache-2.0 licensed. Preserve their notices when redistributing their code. No third-party time-stretch library has been selected or licensed yet.
