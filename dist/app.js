import { lookupChord, strings } from './chords.js';

const $ = id => document.getElementById(id);
const make = (tag, className = '', content = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  return element;
};
const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
const storageKey = 'fretbook.v1';
const displayTitle = song => song.title.trim() || 'Untitled song';
const newSong = (title = '') => ({ id: createId(), title, chords: [] });
const example = newSong('Sunday Morning');
example.chords = ['Am7', 'D7', 'Gmaj7', 'Cmaj7'].map(name => ({ ...lookupChord(name), mode: 'lookup' }));

function readSongs() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved?.songs) && saved.songs.length) return saved;
  } catch {}
  return { songs: [example], activeId: example.id };
}

const state = readSongs();
const activeSong = () => state.songs.find(song => song.id === state.activeId) ?? state.songs[0];
let mode = 'lookup';
let editedIndex = null;

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    $('save-status').textContent = '✓   All changes saved locally';
  } catch {
    $('save-status').textContent = 'Browser storage is unavailable. Changes are saved for this tab only.';
  }
}

function drawDiagram(frets) {
  const playable = frets.filter(fret => fret > 0);
  const base = playable.length && Math.max(...playable) > 4 ? Math.min(...playable) : 1;
  const count = Math.max(4, ...playable.map(fret => fret - base + 1));
  const names = ['Low E', 'A', 'D', 'G', 'B', 'High E'];
  const diagram = make('div', base === 1 ? 'diagram open-position' : 'diagram');
  diagram.setAttribute('role', 'img');
  diagram.setAttribute('aria-label', frets.map((fret, i) => names[i] + ': ' + (fret < 0 ? 'muted' : fret === 0 ? 'open' : 'fret ' + fret)).join(', '));
  const board = make('div', 'fretboard');
  if (base > 1) diagram.append(make('span', 'position', base + 'fr'));
  const markers = make('div', 'markers');
  for (const fret of frets) markers.append(make('span', '', fret < 0 ? '×' : fret === 0 ? '○' : ''));
  board.append(markers);
  for (let offset = 0; offset < count; offset += 1) {
    const row = make('div', 'fret');
    for (const fret of frets) row.append(make('i', fret === base + offset ? 'finger' : ''));
    board.append(row);
  }
  diagram.append(board, make('span', 'fret-values', frets.map(fret => fret < 0 ? 'x' : fret).join(' ')));
  return diagram;
}

function renderLibrary() {
  const nav = $('songs');
  const focused = document.activeElement?.dataset.song;
  nav.replaceChildren();
  for (const song of state.songs) {
    const button = make('button', 'song-link', displayTitle(song));
    button.type = 'button';
    button.dataset.song = song.id;
    if (song === activeSong()) button.setAttribute('aria-current', 'true');
    button.onclick = () => {
      state.activeId = song.id;
      resetEditor();
      render();
      save();
    };
    nav.append(button);
    if (focused === song.id) button.focus();
  }
}

function updateTitle() {
  const song = activeSong();
  const count = song.chords.length;
  $('print-title').textContent = displayTitle(song);
  $('song-meta').textContent = count + (count === 1 ? ' chord' : ' chords');
}

function cardAction(symbol, title, action, disabled = false) {
  const button = make('button', 'icon-button', symbol);
  button.type = 'button';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.disabled = disabled;
  button.onclick = action;
  return button;
}

function renderCards() {
  const container = $('cards');
  const { chords } = activeSong();
  container.replaceChildren();
  chords.forEach((chord, index) => {
    const card = make('article', 'card');
    card.append(make('h3', '', chord.name), drawDiagram(chord.frets));
    const actions = make('div', 'card-actions');
    const name = chord.name + ' at position ' + (index + 1);
    const move = direction => {
      const next = index + direction;
      [chords[index], chords[next]] = [chords[next], chords[index]];
      if (editedIndex === index) editedIndex = next;
      else if (editedIndex === next) editedIndex = index;
      updateCards();
      const buttons = container.children[next].querySelectorAll('button');
      const sameAction = buttons[direction < 0 ? 0 : 1];
      (sameAction.disabled ? buttons[2] : sameAction).focus();
    };
    actions.append(
      cardAction('‹', 'Move ' + name + ' earlier', () => move(-1), index === 0),
      cardAction('›', 'Move ' + name + ' later', () => move(1), index === chords.length - 1),
      cardAction('✎', 'Edit ' + name, () => editChord(index)),
      cardAction('×', 'Remove ' + name, () => {
        chords.splice(index, 1);
        if (editedIndex === index) resetEditor();
        else if (editedIndex !== null && editedIndex > index) editedIndex -= 1;
        updateCards();
        (container.children[index].querySelector('button:not(:disabled)') ?? container.lastElementChild).focus();
      })
    );
    card.append(actions);
    container.append(card);
  });
  const add = make('button', 'add-card');
  add.type = 'button';
  const icon = make('span', '', '+');
  icon.setAttribute('aria-hidden', 'true');
  add.append(icon, document.createTextNode('Add chord'));
  add.onclick = () => {
    resetEditor();
    $('chord-name').focus();
  };
  container.append(add);
  $('print').disabled = chords.length === 0;
}

function updateCards() {
  renderCards();
  updateTitle();
  save();
}

function render() {
  renderLibrary();
  $('song-title').value = activeSong().title;
  updateTitle();
  renderCards();
}

const stringInputs = strings.map((note, index) => {
  const label = make('label', '', note);
  const input = make('input');
  input.type = 'text';
  input.maxLength = 2;
  input.placeholder = 'x';
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', index === 0 ? 'Low E string' : index === 5 ? 'High E string' : note + ' string');
  label.append(input);
  $('strings').append(label);
  return input;
});

function readChord() {
  const name = $('chord-name').value.trim();
  if (mode === 'lookup') {
    const chord = name && lookupChord(name);
    return chord ? { chord: { ...chord, mode } } : {
      error: name ? 'No fingering found. Check the chord symbol or enter a custom fingering.' : 'Enter a chord name.'
    };
  }
  const values = stringInputs.map(input => input.value.trim().toLowerCase() || 'x');
  if (values.some(value => !/^(x|[0-9]|1[0-9]|2[0-4])$/.test(value))) {
    return { error: 'Enter x, 0, or a fret from 1 to 24 for each string.' };
  }
  const frets = values.map(value => value === 'x' ? -1 : Number(value));
  if (frets.every(fret => fret < 0)) return { error: 'Enter at least one open or fretted string.' };
  return { chord: { name: name || 'Custom chord', frets, mode } };
}

function preview(showError = false) {
  const { chord, error } = readChord();
  $('chord-error').hidden = !(showError && error);
  $('chord-error').textContent = showError ? error ?? '' : '';
  const target = $('preview');
  target.hidden = !chord;
  target.replaceChildren();
  if (chord) target.append(drawDiagram(chord.frets));
  return chord;
}

function setMode(next) {
  mode = next;
  $('lookup-tab').setAttribute('aria-pressed', String(mode === 'lookup'));
  $('custom-tab').setAttribute('aria-pressed', String(mode === 'custom'));
  $('lookup-tip').hidden = mode === 'custom';
  $('custom-fields').hidden = mode === 'lookup';
  $('chord-label').textContent = mode === 'custom' ? 'Chord name (optional)' : 'Chord name';
  preview();
}

function editing(index) {
  editedIndex = index;
  $('editor-title').textContent = index === null ? 'Add a chord' : 'Edit chord';
  $('submit-chord').textContent = index === null ? 'Add to progression' : 'Save chord';
  $('cancel-edit').hidden = index === null;
}

function resetEditor() {
  $('chord-name').value = '';
  stringInputs.forEach(input => { input.value = ''; });
  editing(null);
  setMode('lookup');
}

function editChord(index) {
  const chord = activeSong().chords[index];
  editing(index);
  $('chord-name').value = chord.name;
  stringInputs.forEach((input, string) => { input.value = chord.frets[string] < 0 ? 'x' : chord.frets[string]; });
  setMode(chord.mode);
  $('chord-name').focus();
}

$('lookup-tab').onclick = () => setMode('lookup');
$('custom-tab').onclick = () => {
  if (mode === 'lookup') {
    const current = lookupChord($('chord-name').value);
    if (current) stringInputs.forEach((input, string) => { input.value = current.frets[string] < 0 ? 'x' : current.frets[string]; });
  }
  setMode('custom');
};
for (const button of document.querySelectorAll('[data-example]')) {
  button.onclick = () => {
    $('chord-name').value = button.dataset.example;
    preview();
    $('chord-name').focus();
  };
}
$('chord-form').oninput = () => preview();
$('chord-form').onsubmit = event => {
  event.preventDefault();
  const chord = preview(true);
  if (!chord) return;
  const chords = activeSong().chords;
  if (editedIndex === null) chords.push(chord);
  else chords[editedIndex] = chord;
  resetEditor();
  updateCards();
  $('chord-name').focus({ preventScroll: true });
};
$('cancel-edit').onclick = () => { resetEditor(); $('chord-name').focus(); };
$('song-title').oninput = event => {
  activeSong().title = event.target.value;
  renderLibrary();
  updateTitle();
  save();
};
$('song-title').onkeydown = event => { if (event.key === 'Enter') event.target.blur(); };
$('rename-song').onclick = () => { $('song-title').focus(); $('song-title').select(); };
$('new-song').onclick = () => {
  const song = newSong();
  state.songs.unshift(song);
  state.activeId = song.id;
  resetEditor();
  render();
  save();
  $('song-title').focus();
};
$('print').onclick = () => window.print();
$('delete-song').onclick = () => {
  $('delete-description').textContent = '“' + displayTitle(activeSong()) + '” and its chords will be deleted from this browser.';
  $('delete-dialog').returnValue = 'cancel';
  $('delete-dialog').showModal();
};
$('delete-dialog').onclose = () => {
  if ($('delete-dialog').returnValue !== 'delete') return;
  state.songs = state.songs.filter(song => song !== activeSong());
  if (!state.songs.length) state.songs.push(newSong());
  state.activeId = state.songs[0].id;
  resetEditor();
  render();
  save();
  $('song-title').focus();
};
render();
save();
