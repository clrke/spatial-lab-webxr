// Leg-capture tool: records a headset camera stream (MediaRecorder, WebM) plus
// head/hand poses (and WebXR body-tracking joints, if the browser grants them)
// while a beep-guided protocol asks for seated leg motions. Produces two files
// for offline development of a camera-based leg-gesture detector:
//   legcap-<stamp>.webm  and  legcap-<stamp>.json  (labels, poses, frame times).
// Nothing is uploaded; files are offered as downloads on the headset.
import * as THREE from 'three';
import { pollMicrogestures } from '../input/microgestures.js';
import { createLabel } from '../ui/label.js';
import { COUNTDOWN, getProtocol, stepDuration } from './protocol.js';

const PROTOCOL = getProtocol();

const $ = (id) => document.getElementById(id);
const logEl = $('log');
function log(msg) {
  const line = `[${(performance.now() / 1000).toFixed(1)}s] ${msg}`;
  logEl.textContent += `${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
  console.log(line);
}
window.addEventListener('error', (e) => log(`ERROR ${e.message}`));
window.addEventListener('unhandledrejection', (e) => log(`ERROR ${e.reason?.message ?? e.reason}`));

// ---------------------------------------------------------------- camera
let stream = null;
let devices = [];
const preview = $('preview');
let frameTimes = []; // [performance.now(), mediaTime] per delivered camera frame
let framesSinceCheck = 0;

async function allowCamera() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser has no camera API (needs HTTPS)');
  const s = await navigator.mediaDevices.getUserMedia({ video: true });
  s.getTracks().forEach((t) => t.stop());
  devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  const sel = $('cams');
  sel.innerHTML = '';
  devices.forEach((d, i) => {
    const o = document.createElement('option');
    o.value = d.deviceId;
    o.textContent = d.label || `camera ${i}`;
    sel.appendChild(o);
  });
  sel.disabled = devices.length === 0;
  log(`cameras: ${devices.map((d) => d.label || '(no label)').join(' | ') || 'none'}`);
  if (devices.length) await openCamera(devices[0].deviceId);
}

async function openCamera(deviceId) {
  stream?.getTracks().forEach((t) => t.stop());
  stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 }, frameRate: { ideal: 30 } },
  });
  preview.srcObject = stream;
  await preview.play();
  const track = stream.getVideoTracks()[0];
  log(`opened "${track.label}" ${JSON.stringify(track.getSettings())}`);
  $('start').disabled = finished;
  watchFrames();
}

function watchFrames() {
  if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return;
  const cb = (now, meta) => {
    framesSinceCheck += 1;
    if (recording) frameTimes.push([round(now), round(meta.mediaTime)]);
    preview.requestVideoFrameCallback(cb);
  };
  preview.requestVideoFrameCallback(cb);
}

// ---------------------------------------------------------------- audio cues
let audio = null;
function beep(freq, dur = 0.09, gain = 0.25) {
  if (!audio) return;
  const t0 = audio.currentTime;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audio.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

// ---------------------------------------------------------------- recording state
let recorder = null;
let chunks = [];
let recording = false;
let recStart = 0;
const events = [];
const rows = []; // pose samples
const bodyRows = [];
const gestures = []; // microgesture events
const rawButtons = []; // every hand-gamepad button press, any index
const rawPrev = new Map();
let lastGesture = '';
let bodyJointNames = null;
let sessionInfo = {};

const round = (v) => (v == null ? null : Math.round(v * 10000) / 10000);
const HAND_JOINTS = ['wrist', 'thumb-tip', 'index-finger-tip', 'middle-finger-metacarpal'];
const FIELDS = [
  't', 'hx', 'hy', 'hz', 'hqx', 'hqy', 'hqz', 'hqw',
  ...['L', 'R'].flatMap((h) => HAND_JOINTS.flatMap((j) => ['x', 'y', 'z'].map((a) => `${h}.${j}.${a}`))),
];

function startRecorder() {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  const mimeType = types.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) ?? '';
  recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 });
  chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstart = () => {
    recStart = performance.now();
    recording = true;
    log(`recording (${recorder.mimeType})`);
  };
  recorder.start(1000);
}

// ---------------------------------------------------------------- XR scene
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(1);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 50);
const panel = new THREE.Group();
scene.add(panel);
const label = createLabel({ widthM: 0.62, heightM: 0.2, maxHz: 15 });
panel.add(label.mesh);
const camTex = new THREE.VideoTexture(preview);
camTex.colorSpace = THREE.SRGBColorSpace;
const camPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.21), new THREE.MeshBasicMaterial({ map: camTex }));
camPlane.position.set(0, -0.22, 0);
panel.add(camPlane);
let placed = false;

// ---------------------------------------------------------------- protocol runner
let stepIdx = -1;
let phase = 'idle'; // countdown | active | done
let phaseStart = 0;
let nextBeep = 0;
let current = null;
let lastFpsCheck = 0;
let fps = 0;

function beginStep(i, now) {
  stepIdx = i;
  if (i >= PROTOCOL.length) {
    phase = 'done';
    beep(660, 0.15);
    setTimeout(() => beep(880, 0.25), 180);
    finish('protocol complete');
    return;
  }
  phase = 'countdown';
  phaseStart = now;
  nextBeep = now;
}

function tickProtocol(now) {
  if (phase === 'countdown') {
    const left = COUNTDOWN - (now - phaseStart) / 1000;
    if (now >= nextBeep && left > 0) {
      beep(440, 0.07, 0.15);
      nextBeep += 1000;
    }
    if (left <= 0) {
      const s = PROTOCOL[stepIdx];
      phase = 'active';
      phaseStart = now;
      current = { step: stepIdx, action: s.action, side: s.side, look: s.look, start: round(now), end: null, cues: [] };
      nextBeep = now;
    }
  } else if (phase === 'active') {
    const s = PROTOCOL[stepIdx];
    if (s.reps && current.cues.length < s.reps && now >= nextBeep) {
      beep(1046, 0.08);
      current.cues.push(round(now));
      nextBeep += s.period * 1000;
    }
    if ((now - phaseStart) / 1000 >= stepDuration(s)) {
      current.end = round(now);
      events.push(current);
      beep(330, 0.12, 0.12);
      beginStep(stepIdx + 1, now);
    }
  }
}

function panelText(now) {
  if (now - lastFpsCheck > 1000) {
    fps = (framesSinceCheck * 1000) / (now - lastFpsCheck || 1);
    framesSinceCheck = 0;
    lastFpsCheck = now;
  }
  const camLine = {
    text: fps > 1 ? `camera ${fps.toFixed(0)} fps` : 'camera: NO FRAMES (tell the developer)',
    size: 46, weight: 600, color: fps > 1 ? '#7be07b' : '#ffb84f',
  };
  camLine.text += `   |   microgesture: ${lastGesture || 'none yet'}`;
  if (phase === 'done') return [{ text: 'Done! Thank you.', size: 84 }, { text: 'Leaving VR...', size: 52 }, camLine];
  const s = PROTOCOL[stepIdx];
  if (!s) return [{ text: 'Starting...', size: 70 }, camLine];
  const header = `Step ${stepIdx + 1} of ${PROTOCOL.length}`;
  if (phase === 'countdown') {
    const left = Math.max(1, Math.ceil(COUNTDOWN - (now - phaseStart) / 1000));
    return [{ text: header, size: 44, color: '#9aa7bb' }, { text: s.text, size: 62 }, { text: `Get ready... ${left}`, size: 56, color: '#ffd166' }, camLine];
  }
  const progress = s.reps ? `${current.cues.length} / ${s.reps}  (one per beep)` : `${Math.max(0, Math.ceil(stepDuration(s) - (now - phaseStart) / 1000))} s`;
  return [{ text: header, size: 44, color: '#9aa7bb' }, { text: s.text, size: 62 }, { text: progress, size: 56, color: '#7fb2ff' }, camLine];
}

// ---------------------------------------------------------------- per-frame sampling
const q = new THREE.Quaternion();
const fwd = new THREE.Vector3();
let lastSample = 0;
function onXRFrame(t, frame) {
  const now = performance.now();
  const ref = renderer.xr.getReferenceSpace();
  const pose = frame?.getViewerPose(ref);
  if (pose && !placed) {
    // Panel 0.8 m ahead and ~30° below eye level, so it is readable both
    // looking ahead and looking down at the knees.
    const p = pose.transform.position;
    const o = pose.transform.orientation;
    q.set(o.x, o.y, o.z, o.w);
    fwd.set(0, 0, -1).applyQuaternion(q);
    fwd.y = 0;
    fwd.normalize();
    panel.position.set(p.x + fwd.x * 0.8, p.y - 0.42, p.z + fwd.z * 0.8);
    panel.lookAt(p.x, p.y - 0.1, p.z);
    placed = true;
    beginStep(0, now);
  }
  if (recording && pose && now - lastSample >= 33) {
    lastSample = now;
    const p = pose.transform.position;
    const o = pose.transform.orientation;
    const row = [round(now), round(p.x), round(p.y), round(p.z), round(o.x), round(o.y), round(o.z), round(o.w)];
    for (const hand of ['left', 'right']) {
      const src = [...frame.session.inputSources].find((s) => s.hand && s.handedness === hand);
      for (const j of HAND_JOINTS) {
        const jp = src ? frame.getJointPose?.(src.hand.get(j), ref) : null;
        const v = jp?.transform.position;
        row.push(round(v?.x), round(v?.y), round(v?.z));
      }
    }
    rows.push(row);
    sampleBody(frame, ref, now);
  }
  const pads = pollMicrogestures(frame?.session, (g) => {
    gestures.push({ t: round(now), ...g });
    lastGesture = `${g.hand} ${g.name}`;
    beep(1568, 0.05, 0.12);
  });
  sessionInfo.handGamepads = Math.max(sessionInfo.handGamepads ?? 0, pads);
  for (const src of frame?.session.inputSources ?? []) {
    if (!src.hand || !src.gamepad) continue;
    sessionInfo.handButtons = src.gamepad.buttons.length;
    src.gamepad.buttons.forEach((btn, i) => {
      const key = `${src.handedness}:${i}`;
      if (btn.pressed && !rawPrev.get(key)) rawButtons.push({ t: round(now), hand: src.handedness, index: i });
      rawPrev.set(key, btn.pressed);
    });
  }
  if (phase !== 'idle' && phase !== 'done') tickProtocol(now);
  label.setLines(panelText(now));
  label.flush(now);
  renderer.render(scene, camera);
}

function sampleBody(frame, ref, now) {
  const body = frame.body;
  if (!body) return;
  try {
    if (!bodyJointNames) {
      bodyJointNames = [...body.keys()];
      log(`body-tracking granted: ${bodyJointNames.length} joints`);
    }
    const row = [round(now)];
    for (const name of bodyJointNames) {
      const v = frame.getPose(body.get(name), ref)?.transform.position;
      row.push(round(v?.x), round(v?.y), round(v?.z));
    }
    bodyRows.push(row);
  } catch (e) {
    if (!sessionInfo.bodyError) log(`body-tracking read failed: ${e.message}`);
    sessionInfo.bodyError = String(e.message);
  }
}

// ---------------------------------------------------------------- session
let session = null;
async function startCapture() {
  audio ??= new AudioContext();
  await audio.resume();
  const init = { requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking', 'body-tracking'] };
  let mode = 'immersive-ar'; // passthrough on: the native camera API needs it
  if (!(await navigator.xr?.isSessionSupported('immersive-ar'))) mode = 'immersive-vr';
  session = await navigator.xr.requestSession(mode, init);
  sessionInfo = { mode, enabledFeatures: session.enabledFeatures ? [...session.enabledFeatures] : 'unknown' };
  log(`session ${mode}, features ${JSON.stringify(sessionInfo.enabledFeatures)}`);
  if (mode === 'immersive-vr') scene.background = new THREE.Color(0x10141c);
  session.addEventListener('end', () => finish('session ended'));
  await renderer.xr.setSession(session);
  placed = false;
  phase = 'idle';
  startRecorder();
  renderer.setAnimationLoop(onXRFrame);
}

let finished = false;
function finish(reason) {
  if (finished) return;
  finished = true;
  if (current && current.end == null) {
    current.end = round(performance.now());
    current.partial = true;
    events.push(current);
  }
  log(`finishing: ${reason}`);
  const stopRec = new Promise((resolve) => {
    if (!recorder || recorder.state === 'inactive') return resolve();
    recorder.onstop = resolve;
    recorder.stop();
  });
  stopRec.then(() => {
    recording = false;
    $('start').disabled = true;
    $('start').textContent = 'Reload the page to record again';
    offerDownloads();
    setTimeout(() => session?.end().catch(() => {}), 1500);
  });
}

function offerDownloads() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const track = stream?.getVideoTracks()[0];
  const data = {
    version: 1,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    session: sessionInfo,
    camera: track ? { label: track.label, settings: track.getSettings(), capabilities: track.getCapabilities?.() } : null,
    cameras: devices.map((d) => d.label),
    recorder: { mimeType: recorder?.mimeType, startPerf: round(recStart) },
    timeBase: 'All times are performance.now() ms. Video time (s) = (perfMs - recorder.startPerf) / 1000. videoFrames.mediaTimeS is the preview element clock, not the file clock.',
    protocol: PROTOCOL,
    events,
    microgestures: gestures,
    handButtonPresses: rawButtons,
    videoFrames: { fields: ['perfMs', 'mediaTimeS'], rows: frameTimes },
    poses: { fields: FIELDS, rows },
    body: bodyJointNames ? { joints: bodyJointNames, fields: 't then x,y,z per joint', rows: bodyRows } : null,
  };
  const items = [
    [new Blob(chunks, { type: recorder?.mimeType || 'video/webm' }), `legcap-${stamp}.${(recorder?.mimeType || '').includes('mp4') ? 'mp4' : 'webm'}`],
    [new Blob([JSON.stringify(data)], { type: 'application/json' }), `legcap-${stamp}.json`],
  ];
  const box = $('downloads');
  box.innerHTML = '<p>Downloads (saved to the headset\'s Download folder):</p>';
  for (const [blob, name] of items) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.textContent = `${name} (${(blob.size / 1e6).toFixed(1)} MB)`;
    box.appendChild(a);
  }
  log(`ready: ${events.length} labelled steps, ${rows.length} pose samples, ${frameTimes.length} camera frames`);
}

// ---------------------------------------------------------------- wiring
$('perm').addEventListener('click', () =>
  allowCamera().catch((e) => {
    log(`camera error: ${e.name}: ${e.message}`);
    if (e.name === 'NotFoundError') {
      log('No camera visible to the browser. The Browser app itself probably lacks camera permission:'
        + ' allow Camera for Browser in the headset settings (app permissions), restart Browser, and try again.'
        + ' Please tell the developer whether Browser asked you for it.');
    }
  }),
);
$('cams').addEventListener('change', (e) => openCamera(e.target.value).catch((err) => log(`camera error: ${err.message}`)));
$('start').addEventListener('click', () => {
  $('start').disabled = true;
  startCapture().catch((e) => {
    log(`XR error: ${e.name}: ${e.message}`);
    $('start').disabled = false;
  });
});
log(`ready. WebXR: ${'xr' in navigator}, MediaRecorder: ${'MediaRecorder' in window}`);
