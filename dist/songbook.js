import { jazzStandards } from './jazz-standards.js';

export const songbook = [
  ...jazzStandards,
  {
    id: 'the-entertainer',
    group: 'Ragtime',
    title: 'The Entertainer',
    credit: 'Scott Joplin',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263',
    arrangement: 'Opening strain · simplified 4/4 guitar chart',
    tempo: 90,
    measures: ['C C7/G F C/E', 'C/G G7 C C', 'C C7/G F C/E', 'D7 G7', 'C C7/G F C/E', 'C/G G7 C C', 'C C7 F F', 'C/G G7 C C']
  },
  {
    id: 'maple-leaf-rag',
    group: 'Ragtime',
    title: 'Maple Leaf Rag',
    credit: 'Scott Joplin',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=23',
    arrangement: 'Opening strain · simplified 4/4 guitar chart',
    tempo: 86,
    measures: ['Ab Eb7', 'Ab Eb7', 'E Eb7 E Eb7', 'Abm', 'Bdim7 Ab', 'E Ab', 'Bdim7 Ab', 'E Ab']
  },
  {
    id: 'when-the-saints-go-marching-in',
    group: 'Classics',
    title: 'When the Saints Go Marching In',
    credit: 'Traditional · New Orleans jazz standard',
    source: 'https://www.loc.gov/static/programs/national-recording-preservation-board/documents/When-the-Saint-Go-Marching-In_Riccardi.pdf',
    tempo: 108,
    measures: ['C', 'C', 'C', 'G7', 'C', 'F', 'C G7', 'C']
  },
  {
    id: 'ode-to-joy',
    group: 'Classics',
    title: 'Ode to Joy',
    credit: 'Ludwig van Beethoven',
    source: 'https://www.carnegiehall.org/Education/Programs/Link-Up/National-Program/The-Orchestra-Sings/Building-on-Melody-Lyrics',
    tempo: 104,
    measures: ['D', 'A7', 'D', 'D A7', 'D', 'A7', 'D', 'A7 D']
  },
  {
    id: 'auld-lang-syne',
    group: 'Classics',
    title: 'Auld Lang Syne',
    credit: 'Robert Burns · traditional Scottish tune',
    source: 'https://blogs.loc.gov/music/2018/12/auld-lang-syne-sharing-a-cup-of-kindness-with-old-friends/',
    tempo: 84,
    measures: ['G', 'D', 'G', 'C', 'G', 'D', 'Em C', 'G D G']
  },
  {
    id: 'aura-lee',
    group: 'Classics',
    title: 'Aura Lee',
    credit: 'George R. Poulton · words by W. W. Fosdick',
    source: 'https://www.loc.gov/collections/songs-of-america/articles-and-essays/timeline/1850-to-1899/',
    tempo: 76,
    measures: ['C', 'D7 G7', 'C Am', 'D7 G7', 'C', 'D7 G7', 'C F', 'C G7 C']
  },
  {
    id: 'sunday-morning',
    group: 'Neo-soul',
    title: 'Sunday Morning',
    credit: 'Fretbook · original progression',
    tempo: 92,
    measures: ['Am7 D7', 'Gmaj7 Cmaj7']
  },
  {
    id: 'honey-tea',
    group: 'Neo-soul',
    title: 'Honey Tea',
    credit: 'Fretbook · original progression',
    tempo: 72,
    instrument: 'keys',
    measures: ['Cmaj7', 'Am7', 'Dm7', 'G7']
  },
  {
    id: 'window-seat',
    group: 'Neo-soul',
    title: 'Window Seat',
    credit: 'Fretbook · original progression',
    tempo: 78,
    instrument: 'jazz',
    measures: ['Gmaj7', 'Em7', 'Am7', 'D7']
  },
  {
    id: 'quiet-sunday',
    group: 'Neo-soul',
    title: 'Quiet Sunday',
    credit: 'Fretbook · original progression',
    tempo: 70,
    instrument: 'nylon',
    measures: ['Am7', 'Em7', 'Fmaj7', 'Cmaj7']
  },
  {
    id: 'blue-hour',
    group: 'Neo-soul',
    title: 'Blue Hour',
    credit: 'Fretbook · original progression',
    tempo: 76,
    instrument: 'keys',
    measures: ['Dm7', 'Em7', 'Fmaj7', 'Cmaj7']
  },
  {
    id: 'after-hours',
    group: 'Neo-soul',
    title: 'After Hours',
    credit: 'Fretbook · original progression',
    tempo: 76,
    instrument: 'keys',
    measures: ['Fmaj9', 'Em7 A7b9', 'Dm9', 'G13 Cmaj9']
  },
  {
    id: 'peach-light',
    group: 'Neo-soul',
    title: 'Peach Light',
    credit: 'Fretbook · original progression',
    tempo: 88,
    instrument: 'jazz',
    measures: ['Abmaj7', 'Gm7b5 C7#9', 'Fm9', 'Bbm9 Eb13#11']
  },
  {
    id: 'night-bus',
    group: 'Neo-soul',
    title: 'Night Bus',
    credit: 'Fretbook · original progression',
    tempo: 91,
    instrument: 'keys',
    measures: ['Bm9', 'E13', 'Amaj9', 'Dmaj7 C#7b9']
  }
];
