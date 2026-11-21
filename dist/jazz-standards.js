// Chord changes adapted from Freed Jazz's public-domain lead sheets.
function standard(id, title, credit, tempo, measures) {
  return {
    id,
    group: 'Jazz standards',
    title,
    credit,
    source: 'https://freedjazz.org/songs/' + id + '/',
    arrangement: 'Chord chart from Freed Jazz',
    tempo,
    instrument: 'jazz',
    measures
  };
}

export const jazzStandards = [
  standard("avalon", "Avalon", "Vincent Rose, Al Jolson & Buddy DeSylva", 118, [
    "Am7", "Am7", "D7", "D7", "G6", "G6", "G6", "E7",
    "Am7", "Am7", "D7", "D7", "G6", "G6", "G6", "G6",
    "Bm7", "Bm7", "E7", "E7", "Am7", "Am7", "Cm7", "F7",
    "G6", "G6", "E7", "E7", "Am7", "D7", "G6", "G6"
  ]),
  standard("charleston", "Charleston", "James P. Johnson · words by Cecil Mack", 112, [
    "Bb", "D7", "G7", "G7", "C7", "F7", "Bb Dbdim7", "Cm7 F7",
    "Bb", "D7", "G7", "Edim7", "Dm7", "A7", "D", "F7",
    "Bb", "D7", "G7", "G7", "C7", "F7", "Bb7 Dbdim7", "Cm7 F7",
    "Bb7", "Bb7", "Eb7", "Ebm7", "Bb Gm7", "Cm7 F7", "Bb", "Cm7 F7"
  ]),
  standard("if-i-could-be-with-you", "If I Could Be With You", "James P. Johnson · words by Henry Creamer", 82, [
    "Fm7", "Bb7 Bb7#5", "Eb6 G7", "C7", "F7", "Bb7", "Eb6 C7", "F7 Bb7",
    "Fm7", "Bb7 Bb7#5", "Eb6 G7", "C7", "Ab6 Adim7", "Eb6 C7", "F7 Bb7", "Eb6"
  ]),
  standard("ill-see-you-in-my-dreams", "I’ll See You in My Dreams", "Isham Jones · words by Gus Kahn", 104, [
    "Bb6", "Bb6", "Bbm6", "Bbm6", "F6", "E7", "F6", "F6",
    "D7", "D7", "D7", "D7", "G7", "G7", "Gm7", "C7",
    "Bb6", "Bb6", "Bbm6", "Bbm6", "F6", "E7", "F6", "F6",
    "Am7b5 D7", "D7", "A7", "Dm7", "Bb6 Bdim7", "C7", "F6", "F6"
  ]),
  standard("it-had-to-be-you", "It Had to Be You", "Isham Jones · words by Gus Kahn", 94, [
    "Gmaj7 D7#5", "Gmaj7 F7", "E7 Bm7", "E7", "A7 Em7", "A7 Em7", "A7 Em7", "A7",
    "D7", "F#dim7 B7b9", "Em7 B7b9", "Em7 Bb7#11", "A7 Em7", "A7", "Am7", "D7 D7#5",
    "Gmaj7 D7#5", "Gmaj7 F7", "E7 Bm7", "E7", "A7 Em7", "A7 Em7", "A7 Em7", "A7 Dm7 G7",
    "Cmaj7", "F7", "Gmaj7 B7b9", "Em7 Bbdim7", "D7 Abdim7", "D7 D7", "G6 E7", "Am7 D7"
  ]),
  standard("look-for-the-silver-lining", "Look for the Silver Lining", "Jerome Kern · words by B. G. DeSylva", 98, [
    "Ebmaj7", "Fm7 Bb7", "Ebmaj7", "Fm7 Bb7", "Gm7", "Ab7", "Gm7", "Cm7",
    "Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Cm7", "F7", "Fm7", "Bb7",
    "Ebmaj7", "Fm7 Bb7", "Ebmaj7", "Fm7 Bb7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7",
    "Cm7", "Am7b5 D7b9", "Gm7", "C7", "Fm7", "Bb7", "Eb6", "Fm7 Bb7"
  ]),
  standard("love-me-or-leave-me", "Love Me or Leave Me", "Walter Donaldson · words by Gus Kahn", 114, [
    "Fm7", "G7 C7", "Fm7", "G7 C7", "Abmaj7 Fm7", "Bbm7 Eb7", "Ab6", "Gm7b5 C7b9",
    "Fm7", "G7 C7", "Fm7", "G7 C7", "Abmaj7 Fm7", "Bbm7 Eb7", "Ab6 Eb7", "Ab6",
    "Cm7", "F7", "Bbm7 F7b9", "Bbm7", "Bbm7", "Eb7", "Cm7 Bdim7", "Bbm7 C7b9",
    "Fm7", "G7 C7", "Fm7", "G7 C7", "Abmaj7 Fm7", "Bbm7 Eb7", "Ab6", "Gm7b5 C7b9"
  ]),
  standard("makin-whoopee", "Makin’ Whoopee", "Walter Donaldson · words by Gus Kahn", 94, [
    "Gmaj7 Abdim7", "Am7 D7", "Dm7 G7", "Cmaj7 F7", "Gmaj7 Em7", "Eb7 D7", "G6 Em7", "Am7 D7",
    "Gmaj7 Abdim7", "Am7 D7", "Dm7 G7", "Cmaj7 F7", "Gmaj7 Em7", "Eb7 D7", "G6", "C7",
    "Bm7b5 E7b9", "Am7", "Cm7 F7", "Gmaj7", "Bm7b5 E7b9", "Am7", "Cm7 F7", "Bm7 E7 Am7 D7",
    "Gmaj7 Abdim7", "Am7 D7", "Dm7 G7", "Cmaj7 F7", "Gmaj7 Em7", "Eb7 D7", "G6 Em7", "Am7 D7"
  ]),
  standard("mean-to-me", "Mean to Me", "Fred E. Ahlert · words by Roy Turk", 92, [
    "Fmaj7 F#dim7", "Gm7 C7", "Fmaj7 Cm7 F7", "Bbmaj7 Eb7", "Am7 D7", "Gm7 C7", "F6 Dm7", "G7 C7",
    "Fmaj7 F#dim7", "Gm7 C7", "Fmaj7 Cm7 F7", "Bbmaj7 Eb7", "Am7 D7", "Gm7 C7", "F6 Dm7", "F6 Cm7 F7",
    "Bbmaj7 Gm7", "Cm7 F7", "Bb6", "Eb7 D7", "Gm7", "Eb7 D7", "G7", "C7",
    "Fmaj7 F#dim7", "Gm7 C7", "Fmaj7 Cm7 F7", "Bbmaj7 Eb7", "Am7 D7", "Gm7 C7", "F6 Dm7", "G7 C7"
  ]),
  standard("poor-butterfly", "Poor Butterfly", "Raymond Hubbell · words by John L. Golden", 86, [
    "Bbm7", "Eb7sus4 Eb7b9", "Abdim7", "Abmaj7", "C7#5#9", "C7#5#9", "F7", "Cm7 F7",
    "Bbm7", "Eb7", "Gm7b5 C7b13", "Fm7", "Bb7", "Bb7", "Bbm7", "Cm7b5 F7b9",
    "Bbm7", "Eb7sus4 Eb7b9", "Abdim7", "Abmaj7", "C7#5#9", "C7#5#9", "F7", "Cm7 F7",
    "Bbm7", "Dbm7 Gb7", "Cm7 Db7#11", "Cm7 Bdim7", "Bbm7", "Eb7", "Ab6 Db7", "Cm7 F7"
  ]),
  standard("rose-room", "Rose Room", "Art Hickman · words by Harry Williams", 106, [
    "Bb7", "Eb7", "Ab6", "Ab6", "Ebm7", "Ab7", "Db6", "Db6",
    "Dbm7", "Gb7", "Abmaj7", "F7", "Bb7", "Bb7", "Bbm7", "Eb7",
    "Bb7", "Eb7", "Ab6", "Ab6", "Ebm7", "Ab7", "Db6", "Db6",
    "Dbm7", "Gb7", "Abmaj7", "F7", "Bb7", "Eb7", "Ab6 G7b9", "Gb7 F7"
  ]),
  standard("therell-be-some-changes-made", "There’ll Be Some Changes Made", "W. Benton Overstreet · words by Billy Higgins", 108, [
    "G7", "G7", "C7", "C7", "D7", "G7", "C7", "C7 F7",
    "G7", "G7", "C7", "C7", "D7", "G7", "C7 F7", "Bb6 G7",
    "C7 F7", "Bb6 A7 Ab7"
  ]),
  standard("you-made-me-love-you", "You Made Me Love You", "James V. Monaco · words by Joseph McCarthy", 84, [
    "Cmaj7 F7#11", "Em7 Ebdim7", "Dm7 G7", "Dm7 G7", "Dm7 G7", "Dm7 G7", "C6", "C6",
    "A7", "A7", "D7", "D7", "D7", "D7", "Dm7", "G7",
    "Cmaj7 F7#11", "Em7 Ebdim7", "Dm7 G7", "Dm7 G7", "Dm7 G7", "G7 F7", "E7", "E7",
    "A7", "A7", "D7", "D7 D#dim7", "Em7 Ebdim7", "Dm7 G7", "C6", "Dm7 G7"
  ])
];
