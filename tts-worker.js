// Generates natural-voice audio on the device with Kokoro (runs off the main thread so the mic and timers stay responsive).
import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";

let ttsPromise = null;
function load() {
  if (!ttsPromise) {
    ttsPromise = KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
      device: "wasm",
      progress_callback: p => {
        if (p.status === "progress") postMessage({ type: "progress", file: p.file, loaded: p.loaded, total: p.total });
      }
    }).then(tts => { postMessage({ type: "ready" }); return tts; });
    ttsPromise.catch(err => postMessage({ type: "fail", message: String(err?.message || err) }));
  }
  return ttsPromise;
}

// One generation at a time, in the order requested.
let queue = Promise.resolve();
self.onmessage = e => {
  const { type, id, text, voice } = e.data;
  if (type === "load") { load().catch(() => {}); return; }
  if (type !== "gen") return;
  queue = queue.then(async () => {
    try {
      const tts = await load();
      const audio = await tts.generate(text, { voice });
      postMessage({ type: "audio", id, blob: audio.toBlob() });
    } catch (err) {
      postMessage({ type: "error", id, message: String(err?.message || err) });
    }
  });
};
