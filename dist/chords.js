export const strings = ['E', 'A', 'D', 'G', 'B', 'E'];
const tuning = [4, 9, 2, 7, 11, 4];
const notes = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const qualities = {
  '': [0, 4, 7], m: [0, 3, 7], '5': [0, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10],
  '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], mMaj7: [0, 3, 7, 11],
  m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '7b5': [0, 4, 6, 10], '7#5': [0, 4, 8, 10],
  add9: [0, 4, 7, 2], madd9: [0, 3, 7, 2], add11: [0, 4, 7, 5],
  '9': [0, 4, 7, 10, 2], maj9: [0, 4, 7, 11, 2], m9: [0, 3, 7, 10, 2],
  '7b9': [0, 4, 7, 10, 1], '7#9': [0, 4, 7, 10, 3], '6/9': [0, 4, 7, 9, 2],
  '11': [0, 4, 7, 10, 2, 5], m11: [0, 3, 7, 10, 2, 5],
  '13': [0, 4, 7, 10, 2, 5, 9], maj13: [0, 4, 7, 11, 2, 5, 9], m13: [0, 3, 7, 10, 2, 5, 9]
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

export function lookupChord(input) {
  const clean = input.trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/[\s()]/g, '');
  const parsed = /^([a-g])([#b]?)(.*?)(?:\/([a-g])([#b]?))?$/i.exec(clean);
  if (!parsed) return null;
  const [, letter, sharp, suffix, bassLetter, bassAlteration] = parsed;
  const lower = suffix.toLowerCase();
  const quality = Object.hasOwn(aliases, suffix) ? aliases[suffix] : aliases[lower] ?? (suffix === 'mMaj7' ? suffix : lower);
  if (!Object.hasOwn(qualities, quality)) return null;
  const name = letter.toUpperCase() + sharp + quality + (bassLetter ? '/' + bassLetter.toUpperCase() + bassAlteration : '');
  if (Object.hasOwn(familiar, name)) return { name, frets: [...familiar[name]].map(fret => fret === 'x' ? -1 : Number(fret)) };
  const root = pitch(letter, sharp);
  const bass = bassLetter ? pitch(bassLetter, bassAlteration) : root;
  const intervals = qualities[quality];
  const chordNotes = intervals.map(interval => (root + interval) % 12);
  const required = intervals.filter(interval => {
    if (intervals.length >= 5 && interval === 7) return false;
    return !(quality.endsWith('13') && (interval === 5 || interval === 2));
  }).map(interval => (root + interval) % 12);
  const frets = findVoicing(bass, chordNotes, required);
  return frets ? { name, frets } : null;
}

function findVoicing(bass, chordNotes, required) {
  let best = null;
  let bestScore = Infinity;
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
        if (score < bestScore) { best = [...current]; bestScore = score; }
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
  return best;
}
