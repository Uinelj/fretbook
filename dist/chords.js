export const strings = ['E', 'A', 'D', 'G', 'B', 'E'];
const tuning = [4, 9, 2, 7, 11, 4];
const notes = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const qualities = {
  '': [0, 4, 7], m: [0, 3, 7], '5': [0, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10],
  '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], mMaj7: [0, 3, 7, 11],
  m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '7b5': [0, 4, 6, 10], '7#5': [0, 4, 8, 10],
  '7#11': [0, 4, 7, 10, 6], '7#5#9': [0, 4, 8, 10, 3], '7b13': [0, 4, 7, 10, 8],
  add9: [0, 4, 7, 2], madd9: [0, 3, 7, 2], add11: [0, 4, 7, 5],
  '9': [0, 4, 7, 10, 2], maj9: [0, 4, 7, 11, 2], m9: [0, 3, 7, 10, 2],
  '7b9': [0, 4, 7, 10, 1], '7#9': [0, 4, 7, 10, 3], '6/9': [0, 4, 7, 9, 2],
  '11': [0, 4, 7, 10, 2, 5], m11: [0, 3, 7, 10, 2, 5],
  '13': [0, 4, 7, 10, 2, 5, 9], maj13: [0, 4, 7, 11, 2, 5, 9], m13: [0, 3, 7, 10, 2, 5, 9],
  '13#11': [0, 4, 7, 10, 2, 6, 9]
};
const aliases = {
  maj: '', major: '', M: '', min: 'm', minor: 'm', '-': 'm', sus: 'sus4', '+': 'aug', o: 'dim',
  '°': 'dim', o7: 'dim7', '°7': 'dim7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7',
  'ø': 'm7b5', 'ø7': 'm7b5', min7: 'm7', '-7': 'm7', M9: 'maj9', min9: 'm9',
  mM7: 'mMaj7', mmaj7: 'mMaj7'
};
const familiar = {
  C: 'x32010', D: 'xx0232', E: '022100', F: '133211', G: '320003', A: 'x02220', B: 'x24442',
  Am: 'x02210', Em: '022000', Dm: 'xx0231', Bm: 'x24432', Cm: 'x35543',
  A7: 'x02020', B7: 'x21202', C7: 'x32310', D7: 'xx0212', E7: '020100', G7: '320001',
  Am7: 'x02010', Bm7: 'x24232', Cm7: 'x35343', Dm7: 'xx0211', Em7: '020000',
  Cmaj7: 'x32000', Fmaj7: 'xx3210', Gmaj7: '320002', Asus4: 'x02230', 'D/F#': '2x0232'
};
const pitch = (name, accidental) => (notes[name.toUpperCase()] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12;
const voicingCache = new Map();

export function lookupChord(input) {
  const chord = chordVoicings(input);
  return chord ? { name: chord.name, frets: chord.voicings[0] } : null;
}

export function chordVoicings(input) {
  const clean = input.trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/[\s()]/g, '');
  const parsed = /^([a-g])([#b]?)(.*?)(?:\/([a-g])([#b]?))?$/i.exec(clean);
  if (!parsed) return null;
  const [, letter, sharp, suffix, bassLetter, bassAlteration] = parsed;
  const lower = suffix.toLowerCase();
  const quality = Object.hasOwn(aliases, suffix) ? aliases[suffix] : aliases[lower] ?? (suffix === 'mMaj7' ? suffix : lower);
  if (!Object.hasOwn(qualities, quality)) return null;
  const name = letter.toUpperCase() + sharp + quality + (bassLetter ? '/' + bassLetter.toUpperCase() + bassAlteration : '');
  if (voicingCache.has(name)) return voicingCache.get(name);
  const root = pitch(letter, sharp);
  const bass = bassLetter ? pitch(bassLetter, bassAlteration) : root;
  const intervals = qualities[quality];
  const chordNotes = intervals.map(interval => (root + interval) % 12);
  const required = intervals.filter(interval => {
    if (intervals.length >= 5 && interval === 7) return false;
    if (quality === '13#11' && interval === 2) return false;
    return !(quality.endsWith('13') && (interval === 5 || interval === 2));
  }).map(interval => (root + interval) % 12);
  const voicings = findVoicings(bass, chordNotes, required);
  if (Object.hasOwn(familiar, name)) {
    const preferred = [...familiar[name]].map(fret => fret === 'x' ? -1 : Number(fret));
    const existing = voicings.findIndex(frets => String(frets) === String(preferred));
    if (existing >= 0) voicings.splice(existing, 1);
    voicings.unshift(preferred);
  }
  const result = voicings.length ? { name, voicings } : null;
  if (voicingCache.size >= 128) voicingCache.delete(voicingCache.keys().next().value);
  voicingCache.set(name, result);
  return result;
}

function findVoicings(bass, chordNotes, required) {
  const candidates = new Map();
  const allowed = new Set([...chordNotes, bass]);
  for (let start = 1; start <= 13; start += 1) {
    const choices = tuning.map(open => [-1, 0, start, start + 1, start + 2, start + 3]
      .filter(fret => fret < 0 || allowed.has((open + fret) % 12)));
    const current = [];
    const visit = (string, seen) => {
      if (string === 6) {
        if (required.some(note => !seen.has(note))) return;
        const pressed = current.filter(fret => fret > 0);
        const first = pressed.length ? Math.min(...pressed) : 0;
        const span = pressed.length ? Math.max(...pressed) - first : 0;
        const open = current.filter(fret => fret === 0).length;
        const muted = current.filter(fret => fret === -1).length;
        const barre = pressed.filter(fret => fret === first).length > 1;
        const fingers = pressed.length - (barre ? pressed.filter(fret => fret === first).length - 1 : 0);
        if (fingers > 4) return;
        const lowestString = current.findIndex(fret => fret >= 0);
        const highestString = current.findLastIndex(fret => fret >= 0);
        const gaps = current.slice(lowestString, highestString).filter(fret => fret < 0).length;
        if (barre && current.some((fret, index) => fret === 0 && index > current.indexOf(first) && index < current.lastIndexOf(first))) return;
        const score = first * .63 + span * 1.3 + fingers * .62 + muted * .72 + gaps * 1.4
          + (first > 4 ? open * 2.5 : -open * .25) + (chordNotes.every(note => seen.has(note)) ? 0 : 1.5);
        const key = String(current);
        if (!candidates.has(key)) candidates.set(key, { frets: [...current], score, first });
        return;
      }
      for (const fret of choices[string]) {
        const note = (tuning[string] + fret) % 12;
        if (fret >= 0 && (!seen.size ? note !== bass : !chordNotes.includes(note))) continue;
        current.push(fret);
        visit(string + 1, fret < 0 || seen.has(note) ? seen : new Set([...seen, note]));
        current.pop();
      }
    };
    visit(0, new Set());
  }
  const ranked = [...candidates.values()].sort((left, right) => left.score - right.score);
  const perPosition = new Map();
  return ranked.filter(({ first }, index) => {
    const count = perPosition.get(first) ?? 0;
    perPosition.set(first, count + 1);
    return index < 8 || count < 2;
  }).map(({ frets }) => frets);
}

function handPosition(frets) {
  const pressed = frets.filter(fret => fret > 0);
  return pressed.length ? (Math.min(...pressed) + Math.max(...pressed)) / 2 : 1;
}

function movement(from, to) {
  let cost = 3 * Math.abs(handPosition(from) - handPosition(to));
  for (let string = 0; string < from.length; string += 1) {
    if (from[string] === to[string]) continue;
    cost += from[string] > 0 && to[string] > 0 ? 1 + Math.abs(from[string] - to[string]) : 1;
  }
  return cost;
}

function shapeEffort(frets) {
  const pressed = frets.filter(fret => fret > 0);
  if (pressed.length < 2) return 0;
  const lowest = Math.min(...pressed);
  const span = Math.max(...pressed) - lowest;
  const first = frets.indexOf(lowest);
  const last = frets.lastIndexOf(lowest);
  const wideBarre = last - first >= 3 && !frets.slice(first, last).includes(0);
  return .7 * span + .5 * Math.max(0, pressed.length - 2) + (wideBarre ? 1.2 : 0);
}

export function estimateDifficulty(sequence, tempo) {
  if (!sequence.length) return null;
  let peakEffort = 0;
  let previous;
  let heldBeats = 0;
  for (const chord of sequence) {
    const shape = shapeEffort(chord.frets);
    peakEffort = Math.max(peakEffort, shape);
    if (previous) {
      const shift = movement(previous, chord.frets);
      if (shift === 0) {
        heldBeats += chord.beats;
        continue;
      }
      const secondsToPrepare = heldBeats * 60 / tempo;
      const transition = (.24 * shift + .7) / Math.sqrt(secondsToPrepare) + .3 * shape;
      peakEffort = Math.max(peakEffort, transition);
    }
    previous = chord.frets;
    heldBeats = chord.beats;
  }
  return peakEffort >= 6.5 ? 'Hard' : peakEffort >= 3.2 ? 'Medium' : 'Easy';
}

export function closeVoicings(chords) {
  if (!chords.length) return [];
  const rows = [];
  for (const chord of chords) {
    const alternatives = chord.mode === 'lookup' && !chord.pinned ? chordVoicings(chord.name)?.voicings ?? [] : [];
    const choices = [chord.frets, ...alternatives.filter(frets => String(frets) !== String(chord.frets))];
    const previous = rows.at(-1);
    rows.push(choices.map((frets, choice) => {
      const changed = Number(choice !== 0);
      if (!previous) return { frets, cost: 0, changes: changed, previous: null };
      let best = null;
      for (const from of previous) {
        const cost = from.cost + movement(from.frets, frets);
        const changes = from.changes + changed;
        if (!best || cost < best.cost || (cost === best.cost && changes < best.changes)) {
          best = { frets, cost, changes, previous: from };
        }
      }
      return best;
    }));
  }
  const result = [];
  let best = rows.at(-1).reduce((left, right) => left.cost < right.cost || (left.cost === right.cost && left.changes <= right.changes) ? left : right);
  while (best) {
    result.push(best.frets);
    best = best.previous;
  }
  return result.reverse();
}
