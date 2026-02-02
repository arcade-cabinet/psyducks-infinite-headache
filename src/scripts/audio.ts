/**
 * Enhanced Audio System using Tone.js
 */
import * as Tone from "tone";

let isInitialized = false;
const dropSynthPool: Tone.Synth[] = [];

export async function initAudio() {
  if (!isInitialized) {
    await Tone.start();
    // Initialize synth pool for drop sound
    for (let i = 0; i < 3; i++) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0,
          release: 0.15,
        },
      }).toDestination();
      synth.volume.value = -10;
      dropSynthPool.push(synth);
    }
    isInitialized = true;
  }
}

/**
 * Play drop sound - descending pitch
 */
export function playDrop() {
  if (!isInitialized || dropSynthPool.length === 0) return;

  const synth = dropSynthPool[0];
  const now = Tone.now();
  synth.triggerAttackRelease("400Hz", "0.15", now);
  synth.frequency.exponentialRampTo("100Hz", 0.15, now);
}

/**
 * Play land sound - thud effect
 */
export function playLand() {
  if (!isInitialized) return;

  const synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    },
  }).toDestination();

  const now = Tone.now();
  synth.triggerAttackRelease("150Hz", "0.1", now);
  synth.frequency.exponentialRampTo("50Hz", 0.1, now);
  synth.volume.value = -5;

  setTimeout(() => synth.dispose(), 150);
}

/**
 * Play perfect landing sound - magical chime
 */
export function playPerfect() {
  if (!isInitialized) return;

  // Main chime
  const synth1 = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.1,
      release: 0.3,
    },
  }).toDestination();

  // Harmony
  const synth2 = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.1,
      release: 0.3,
    },
  }).toDestination();

  synth1.volume.value = -15;
  synth2.volume.value = -18;

  const now = Tone.now();

  // Ascending chord progression
  synth1.triggerAttackRelease("600Hz", "0.15", now);
  synth1.triggerAttackRelease("800Hz", "0.15", now + 0.1);
  synth1.triggerAttackRelease("1200Hz", "0.2", now + 0.2);

  synth2.triggerAttackRelease("300Hz", "0.3", now);
  synth2.frequency.linearRampTo("600Hz", 0.3, now);

  setTimeout(() => {
    synth1.dispose();
    synth2.dispose();
  }, 500);
}

/**
 * Play fail sound - descending dramatic tone
 */
export function playFail() {
  if (!isInitialized) return;

  const synth = new Tone.Synth({
    oscillator: { type: "sawtooth" },
    envelope: {
      attack: 0.01,
      decay: 0.4,
      sustain: 0.3,
      release: 0.4,
    },
  }).toDestination();

  synth.volume.value = -12;

  const now = Tone.now();
  synth.triggerAttackRelease("200Hz", "0.8", now);
  synth.frequency.linearRampTo("50Hz", 0.8, now);

  setTimeout(() => synth.dispose(), 1000);
}

/**
 * Play merge sound - ascending powerful tone
 */
export function playMerge() {
  if (!isInitialized) return;

  // Main powerful synth
  const synth1 = new Tone.Synth({
    oscillator: { type: "square" },
    envelope: {
      attack: 0.01,
      decay: 0.3,
      sustain: 0.2,
      release: 0.4,
    },
  }).toDestination();

  // Bass emphasis
  const synth2 = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.02,
      decay: 0.4,
      sustain: 0.1,
      release: 0.5,
    },
  }).toDestination();

  synth1.volume.value = -8;
  synth2.volume.value = -10;

  const now = Tone.now();

  // Ascending power chord
  synth1.triggerAttackRelease("200Hz", "0.4", now);
  synth1.triggerAttackRelease("300Hz", "0.4", now + 0.15);
  synth1.triggerAttackRelease("500Hz", "0.5", now + 0.3);

  synth2.triggerAttackRelease("100Hz", "0.8", now);
  synth2.frequency.exponentialRampTo("200Hz", 0.6, now);

  setTimeout(() => {
    synth1.dispose();
    synth2.dispose();
  }, 1000);
}

/**
 * Play level up sound - triumphant ascending tone
 */
export function playLevelUp() {
  if (!isInitialized) return;

  // Main triumphant synth
  const synth1 = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.3,
      release: 0.5,
    },
  }).toDestination();

  // Harmony synth
  const synth2 = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.02,
      decay: 0.3,
      sustain: 0.2,
      release: 0.4,
    },
  }).toDestination();

  synth1.volume.value = -8;
  synth2.volume.value = -12;

  const now = Tone.now();

  // Victory fanfare
  synth1.triggerAttackRelease("C4", "0.3", now);
  synth1.triggerAttackRelease("E4", "0.3", now + 0.2);
  synth1.triggerAttackRelease("G4", "0.3", now + 0.4);
  synth1.triggerAttackRelease("C5", "0.5", now + 0.6);

  synth2.triggerAttackRelease("G3", "0.8", now);
  synth2.triggerAttackRelease("C4", "0.6", now + 0.4);

  setTimeout(() => {
    synth1.dispose();
    synth2.dispose();
  }, 1200);
}

/**
 * Play ambient background music (optional - can be enabled)
 */
export function playBackgroundMusic(enable = false) {
  if (!isInitialized || !enable) {
    return () => {}; // Return no-op cleanup function
  }

  // Create a simple ambient loop
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 1,
      decay: 0.5,
      sustain: 0.3,
      release: 2,
    },
  }).toDestination();

  synth.volume.value = -25;

  const sequence = new Tone.Sequence(
    (time, note) => {
      synth.triggerAttackRelease(note, "2n", time);
    },
    ["C4", "E4", "G4", "A4"],
    "2n",
  );

  Tone.Transport.bpm.value = 60;
  sequence.start(0);
  Tone.Transport.start();

  return () => {
    sequence.stop();
    Tone.Transport.stop();
    synth.dispose();
  };
}
