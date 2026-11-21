export const instruments = {
  nylon: 'Nylon guitar',
  steel: 'Steel-string guitar',
  jazz: 'Jazz guitar',
  keys: 'Electric piano'
};

const tuning = [40, 45, 50, 55, 59, 64];
const sampleNotes = Array.from({ length: 17 }, (_, index) => 40 + index * 3);
const nearestSample = midi => Math.max(40, Math.min(88, 40 + 3 * Math.round((midi - 40) / 3)));

export class ChordPlayer {
  #context;
  #instruments = new Map();
  #pending = new Set();
  #timer;
  #frame;
  #run = 0;
  #readBeat;

  get position() { return this.#readBeat?.(); }

  async #load(instrument) {
    if (!this.#instruments.has(instrument)) {
      const request = (async () => {
        const response = await fetch(new URL('./soundfonts/' + instrument + '.json', import.meta.url));
        if (!response.ok) throw new Error('Soundfont request failed');
        const encoded = await response.json();
        const decoded = await Promise.all(sampleNotes.map(async note => {
          const bytes = Uint8Array.from(atob(encoded[note]), character => character.charCodeAt(0));
          return [note, await this.#context.decodeAudioData(bytes.buffer)];
        }));
        return new Map(decoded);
      })();
      this.#instruments.set(instrument, request);
      request.catch(() => this.#instruments.delete(instrument));
    }
    return this.#instruments.get(instrument);
  }

  async play(sequence, { tempo, instrument, startBeat = 0, isLooping = () => false, onStart, onBeat, onEnd }) {
    this.stop();
    if (!sequence.length) { onEnd(); return; }
    const run = this.#run;
    this.#context ??= new AudioContext();
    const [, samples] = await Promise.all([this.#context.resume(), this.#load(instrument)]);
    if (run !== this.#run) return;

    const secondsPerBeat = 60 / tempo;
    const startsAt = this.#context.currentTime + .07;
    let nextTime = startsAt;
    let index = 0;
    let completedPasses = 0;
    const totalBeats = sequence.reduce((total, chord) => total + chord.beats, 0);
    const passSeconds = totalBeats * secondsPerBeat;
    const initialBeat = Math.min(Math.max(0, startBeat), totalBeats - .001);
    let offsetBeats = initialBeat;
    while (offsetBeats >= sequence[index].beats) offsetBeats -= sequence[index++].beats;
    const clockBeat = () => initialBeat + Math.max(0, this.#context.currentTime - startsAt) / secondsPerBeat;
    const endBeat = () => (completedPasses + 1) * totalBeats;
    this.#readBeat = () => Math.max(0, Math.min(clockBeat(), endBeat() - .001)) % totalBeats;

    const schedule = () => {
      const now = this.#context.currentTime;
      const horizon = now + .18;
      while (nextTime <= horizon) {
        if (index === sequence.length) {
          if (!isLooping() || nextTime > now + .045) break;
          const skipped = Math.max(0, Math.floor((now - nextTime) / passSeconds));
          nextTime += skipped * passSeconds;
          completedPasses += skipped + 1;
          index = 0;
        }
        const chord = sequence[index++];
        const start = Math.max(nextTime, now);
        const age = offsetBeats * secondsPerBeat + start - nextTime;
        nextTime += (chord.beats - offsetBeats) * secondsPerBeat;
        offsetBeats = 0;
        const duration = nextTime - start;
        if (duration < .035) continue;
        const strum = instrument === 'keys' || age > .001 ? 0 : Math.min(.012, duration / 14);
        let offset = 0;
        chord.frets.forEach((fret, string) => {
          if (fret < 0) return;
          const midi = tuning[string] + fret;
          const sample = nearestSample(midi);
          this.#note(samples.get(sample), midi - sample, start + offset, duration - offset, age);
          offset += strum;
        });
      }
    };

    const draw = () => {
      if (clockBeat() >= endBeat() + .12 / secondsPerBeat && !isLooping()) {
        this.stop();
        onEnd();
        return;
      }
      onBeat(this.position);
      this.#frame = requestAnimationFrame(draw);
    };

    onStart();
    schedule();
    this.#timer = setInterval(schedule, 35);
    draw();
  }

  #note(buffer, transpose, start, duration, age) {
    const context = this.#context;
    const rate = 2 ** (transpose / 12);
    const offset = age * rate;
    if (offset >= buffer.duration) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(gain).connect(context.destination);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.linearRampToValueAtTime(.145, start + .006);
    gain.gain.setValueAtTime(.145, start + duration - .015);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration + .09);
    this.#pending.add(source);
    source.onended = () => {
      this.#pending.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(start, offset);
    source.stop(start + duration + .1);
  }

  stop() {
    this.#run += 1;
    this.#readBeat = null;
    clearInterval(this.#timer);
    cancelAnimationFrame(this.#frame);
    for (const source of this.#pending) source.stop();
    this.#pending.clear();
  }
}
