import { spawn } from "child_process";
import pkg from 'fft-js';
import { ButtplugClient, ButtplugNodeWebsocketClientConnector } from "buttplug";
const { fft, util } = pkg;


const audioSource = "alsa_output.pci-0000_00_1f.3.analog-stereo.monitor";
const sampleRate = 44100;
const fftSize = 1024;

const freqRange = [20, 150];   // Bass range in Hz
const threshold = 0.15;         // min Vibration intensity (%)
const bpHost = "127.0.0.1:12345"


const connector = new ButtplugNodeWebsocketClientConnector(`ws://${bpHost}`);
const client = new ButtplugClient("Music Vibes");

async function setupButtplug() {
  await client.connect(connector);
  console.log("✅ Connected to Buttplug Server");
}

setupButtplug().catch(console.error);

const ffmpeg = spawn("ffmpeg", [
  "-loglevel", "quiet",
  "-f", "pulse",
  "-i", audioSource,
  "-ac", "1",
  "-ar", sampleRate.toString(),
  "-f", "s16le",
  "pipe:1"
]);

let audioBuffer = Buffer.alloc(0);
let lastLevel = 0;

ffmpeg.stdout.on("data", (chunk) => {
  audioBuffer = Buffer.concat([audioBuffer, chunk]);
  processAudio();
});

ffmpeg.on("error", (err) => {
  console.error("FFmpeg error:", err);
});

function processAudio() {
  const bytesPerSample = 2;
  
  while (audioBuffer.length >= fftSize * bytesPerSample) {
    const slice = audioBuffer.slice(0, fftSize * bytesPerSample);
    audioBuffer = audioBuffer.slice(fftSize * bytesPerSample);

    const samples = new Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      samples[i] = slice.readInt16LE(i * 2) / 32768;
    }

    analyzeFFT(samples);
  }
}

function analyzeFFT(samples) {
  const phasors = fft(samples);
  const magnitudes = util.fftMag(phasors);

  const binSize = sampleRate / fftSize;

  let energy = 0;
  let count = 0;

  for (let i = 0; i < magnitudes.length / 2; i++) {
    const freq = i * binSize;
    if (freq >= freqRange[0] && freq <= freqRange[1]) {
      energy += magnitudes[i];
      count++;
    }
  }

  if (count === 0) return;

  let level = energy / count;

  level = level * 0.7 + lastLevel * 0.3;
  lastLevel = level;

  triggerBass(level);
}

async function triggerBass(level) {
  if (client.devices.length==0) return;

  const strength = (Math.min((level/100), 1.0)*2);

  try {
    if (strength > threshold) {
      client.devices.forEach(async device=>await device.vibrate(strength))
      console.log(`BASS TRIGGER: ${(strength*100).toFixed(2)}%`);
    } else {
      client.devices.forEach(async device=>await device.stop())
    }
  } catch (err) {
    console.error("Buttplug command error:", err.message);
  }
}

process.on("SIGINT", () => {
  ffmpeg.kill("SIGINT");
  if (client.devices.length>0) client.devices.forEach(device=>device.stop());
  client.disconnect();
  process.exit(0);
});
