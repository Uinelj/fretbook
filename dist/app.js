import { chordVoicings, closeVoicings, estimateDifficulty, lookupChord, strings } from './chords.js';
import { ChordPlayer, instruments } from './player.js';
import { songbook } from './songbook.js';
import { createSongbookIssue } from './submission.js';

const $ = id => document.getElementById(id);
const make = (tag, className = '', content = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  return element;
};
const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
const storageKey = 'fretbook.v1';
const beatsPerMeasure = 4;
const chordBeats = chord => chord.beats ?? beatsPerMeasure;
const fretText = frets => frets.map(fret => fret < 0 ? 'x' : fret).join(' ');
const sameFrets = (left, right) => String(left) === String(right);
const formatBeats = beats => {
  const whole = Math.floor(beats);
  const number = beats % 1 ? (whole || '') + '½' : String(whole);
  return number + (beats <= 1 ? ' beat' : ' beats');
};
const displayTitle = song => song.title.trim() || 'Untitled song';
const newSong = (title = '') => ({ id: createId(), title, chords: [] });
const defaultTemplate = songbook.find(entry => entry.id === 'sunday-morning');

function readSongs() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved?.songs)) return saved;
  } catch {}
  return { libraryVersion: 2, songs: [], activeId: null, activeTemplateId: defaultTemplate.id };
}

const state = readSongs();
const favourites = new Set(Array.isArray(state.favourites) ? state.favourites : []);
let favouritesOnly = false;
let songbookView = null;
const activeSong = () => songbookView ?? state.songs.find(song => song.id === state.activeId);
let mode = 'lookup';
let editedIndex = null;
let voicingName = null;
let draftFrets = null;
let draftVoicingChanged = false;
let displayedVoicings = [];
let playbackSegments = [];
let highlighted;
let measureButtons = [];
let selectedMeasure = null;
let playbackPosition = 0;
let playbackMode = 'stopped';
let playbackRequest = 0;
const player = new ChordPlayer();
const templateCharts = new WeakMap();
const songLevels = new WeakMap();

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
  diagram.append(board, make('span', 'fret-values', fretText(frets)));
  return diagram;
}

function renderLibrary() {
  const nav = $('songs');
  const focused = document.activeElement?.dataset.song;
  nav.replaceChildren();
  if (!state.songs.length) nav.append(make('p', 'songbook-empty', 'No songs yet.'));
  for (const song of state.songs) {
    const button = make('button', 'song-link');
    button.type = 'button';
    button.dataset.song = song.id;
    button.append(make('span', 'difficulty-dot'), make('span', '', displayTitle(song)));
    if (!songLevels.has(song)) {
      const frets = song.closeVoicings ? closeVoicings(song.chords) : song.chords.map(chord => chord.frets);
      songLevels.set(song, estimateDifficulty(playbackSequence(song.chords, frets), song.tempo ?? 92));
    }
    updateDifficultyDot(button, songLevels.get(song));
    if (song === activeSong()) button.setAttribute('aria-current', 'true');
    button.onclick = () => openSong(song.id);
    nav.append(button);
    if (focused === song.id) button.focus();
  }
}

function updateDifficultyDot(button, level) {
  const dot = button.querySelector('.difficulty-dot');
  const description = level ? 'Difficulty ' + level : 'No chords yet';
  dot.dataset.level = level?.toLowerCase() ?? '';
  dot.title = description;
  dot.setAttribute('aria-hidden', 'true');
  button.setAttribute('aria-description', description);
}

function templateChart(template) {
  if (!templateCharts.has(template)) {
    const chords = template.chords ?? template.measures.flatMap(measure => {
      const names = measure.split(' ');
      return names.map((name, index) => ({ ...lookupChord(name), mode: 'lookup', beats: names.length === 3 ? (index === 0 ? 2 : 1) : beatsPerMeasure / names.length }));
    });
    templateCharts.set(template, { chords, level: estimateDifficulty(chords, template.tempo) });
  }
  return templateCharts.get(template);
}

const songTemplate = song => songbook.find(entry => entry.id === song.templateId);
const creditedAuthor = song => song.author?.trim() || songTemplate(song)?.credit || '';
const chartSource = song => {
  const source = song.source ?? songTemplate(song)?.source ?? '';
  return /^https?:\/\//i.test(source) ? source : '';
};

function openSong(id) {
  songbookView = null;
  state.activeId = id;
  state.activeTemplateId = null;
  resetEditor();
  render();
  save();
}

function templateSong(template) {
  return {
    title: template.title,
    templateId: template.id,
    tempo: template.tempo,
    instrument: template.instrument ?? 'nylon',
    chords: templateChart(template).chords.map(chord => ({ ...chord }))
  };
}

function openTemplate(template) {
  if (songbookView?.templateId === template.id) return;
  songbookView = templateSong(template);
  state.activeId = null;
  state.activeTemplateId = template.id;
  resetEditor();
  render();
  save();
}

function copyToLibrary(source) {
  if (!source) return;
  const baseTitle = displayTitle(source);
  let title = baseTitle;
  let copy = 2;
  while (state.songs.some(song => displayTitle(song) === title)) title = baseTitle + ' (' + copy++ + ')';
  const song = { ...source, id: createId(), title, chords: source.chords.map(chord => ({ ...chord })) };
  state.songs.unshift(song);
  openSong(song.id);
  $('song-title').focus();
}

function sameShapes(chords, originals) {
  return chords.length === originals.length && chords.every((chord, index) => {
    const original = originals[index];
    return chord.name === original.name && chord.mode === original.mode && sameFrets(chord.frets, original.frets);
  });
}

function migrateLibrary() {
  if (state.libraryVersion === 2) return;
  state.songbookDrafts ??= {};
  state.songs = state.songs.filter(song => {
    let template = songbook.find(entry => entry.id === song.templateId);
    if (!template && !song.templateId && song.title === defaultTemplate.title) {
      const starter = templateChart(defaultTemplate).chords;
      if (sameShapes(song.chords, starter) && song.chords.every(chord => chord.beats == null || chord.beats === 2)) template = defaultTemplate;
    }
    if (!template) return true;

    const original = templateSong(template);
    const edited = song.title !== original.title || !sameShapes(song.chords, original.chords) ||
      song.chords.some((chord, index) => chordBeats(chord) !== chordBeats(original.chords[index])) ||
      (song.tempo ?? original.tempo) !== original.tempo || (song.instrument ?? original.instrument) !== original.instrument || song.closeVoicings;
    if (edited) state.songbookDrafts[template.id] = { ...song, templateId: template.id };
    if (song.id === state.activeId) state.activeTemplateId = template.id;
    return false;
  });
  state.libraryVersion = 2;
}

function restoreView() {
  migrateLibrary();
  const template = songbook.find(entry => entry.id === state.activeTemplateId);
  if (template || !state.songs.length) {
    songbookView = templateSong(template ?? defaultTemplate);
    state.activeTemplateId = songbookView.templateId;
    state.activeId = null;
  } else {
    state.activeTemplateId = null;
    if (!state.songs.some(song => song.id === state.activeId)) state.activeId = state.songs[0].id;
  }
}

function renderSongbook() {
  const nav = $('templates');
  const normalize = value => value.normalize('NFD').replace(/[’'\p{Mark}]/gu, '').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
  const words = normalize($('songbook-search').value).split(' ').filter(Boolean);
  const groups = new Map();
  nav.replaceChildren();
  for (const entry of songbook) {
    if (favouritesOnly && !favourites.has(entry.id)) continue;
    const description = normalize([entry.title, entry.credit, entry.group].join(' '));
    if (!words.every(word => description.includes(word))) continue;
    if (!groups.has(entry.group)) {
      const section = make('div', 'template-group');
      section.append(make('h2', '', entry.group));
      groups.set(entry.group, section);
      nav.append(section);
    }
    const button = make('button', 'template-link');
    button.type = 'button';
    button.dataset.template = entry.id;
    if (songbookView?.templateId === entry.id) button.setAttribute('aria-current', 'true');
    button.append(make('span', 'difficulty-dot'), make('span', '', entry.title), make('small', '', entry.credit));
    updateDifficultyDot(button, templateChart(entry).level);
    button.onclick = () => openTemplate(entry);
    const row = make('div', 'template-row');
    row.append(button, favouriteButton(entry));
    groups.get(entry.group).append(row);
  }
  if (!groups.size) {
    const message = favouritesOnly && !favourites.size ? 'Star a song to keep it here.' : 'No matching songs.';
    const empty = make('p', 'songbook-empty', message);
    empty.setAttribute('role', 'status');
    nav.append(empty);
  }
  nav.scrollTop = 0;
}

function favouriteButton(entry) {
  const button = make('button', 'template-star');
  button.type = 'button';
  button.setAttribute('aria-label', 'Favourite ' + entry.title);
  const update = () => {
    const marked = favourites.has(entry.id);
    button.textContent = marked ? '★' : '☆';
    button.setAttribute('aria-pressed', String(marked));
    button.title = marked ? 'Remove from favourites' : 'Add to favourites';
  };
  update();
  button.onclick = () => {
    const removed = favourites.delete(entry.id);
    if (!removed) favourites.add(entry.id);
    state.favourites = [...favourites];
    save();
    if (removed && favouritesOnly) {
      renderSongbook();
      $('favourites-filter').focus();
    } else update();
  };
  return button;
}

function updateTitle() {
  const song = activeSong();
  const count = song.chords.length;
  const measures = Math.ceil(song.chords.reduce((total, chord) => total + chordBeats(chord), 0) / beatsPerMeasure);
  $('print-title').textContent = displayTitle(song);
  $('song-meta').textContent = count + (count === 1 ? ' chord' : ' chords') + ' · ' + measures + (measures === 1 ? ' measure' : ' measures');
  const template = songTemplate(song);
  const source = chartSource(song);
  const credit = $('song-credit');
  credit.hidden = !songbookView && !source;
  credit.replaceChildren();
  if (source) {
    const link = make('a', '', songbookView ? creditedAuthor(song) : 'Source chart');
    link.href = source;
    link.target = '_blank';
    link.rel = 'noopener';
    credit.append(link);
    if (songbookView) credit.append(' · ' + (template?.arrangement ?? 'Guitar arrangement'));
  } else if (songbookView) credit.textContent = creditedAuthor(song);
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

function voicingStepper(lookup, frets, label, choose) {
  const choices = lookup.voicings;
  const selected = choices.findIndex(shape => sameFrets(shape, frets));
  const stepper = make('div', 'voicing-stepper');
  stepper.setAttribute('role', 'group');
  stepper.setAttribute('aria-label', 'Voicing for ' + label);
  const step = direction => {
    const next = selected === -1 ? (direction > 0 ? 0 : choices.length - 1) : (selected + direction + choices.length) % choices.length;
    choose(choices[next], direction > 0 ? 2 : 0);
  };
  const previous = cardAction('‹', 'Previous voicing for ' + label, () => step(-1), choices.length === 1 && selected === 0);
  const rank = cardAction(selected < 0 ? 'Saved' : String(selected + 1), 'Reset voicing for ' + label + ' to default', () => choose(choices[0], 1), selected === 0);
  rank.classList.add('voicing-rank');
  rank.title = selected < 0 ? 'Saved fingering · reset to default' : 'Voicing ' + (selected + 1) + ' of ' + choices.length + (selected === 0 ? ' · default' : ' · reset to default');
  if (selected === 0) rank.setAttribute('aria-label', 'Default voicing for ' + label);
  const caption = make('span', 'voicing-caption', 'Voicing');
  caption.setAttribute('aria-hidden', 'true');
  const next = cardAction('›', 'Next voicing for ' + label, () => step(1), choices.length === 1 && selected === 0);
  stepper.append(caption, previous, rank, next);
  return stepper;
}

function renderChord(chord, index, beats, continued, continues) {
  const card = make('article', continued ? 'card continued' : 'card');
  const timing = formatBeats(beats) + (continued ? ' · continued' : continues ? ' · continues' : '');
  const frets = displayedVoicings[index];
  card.append(make('h4', '', chord.name), make('p', 'chord-length', timing), drawDiagram(frets));
  if (!continued) {
    card.dataset.chordIndex = index;
    const name = chord.name + ' at position ' + (index + 1);
    const lookup = chord.mode === 'lookup' && chordVoicings(chord.name);
    if (lookup) card.append(voicingStepper(lookup, frets, name, (choice, control) => {
      chord.frets = choice;
      chord.pinned = Boolean(activeSong().closeVoicings);
      updateCards();
      refreshDraftVoicing(index);
      focusStepper($('cards').querySelector('[data-chord-index="' + index + '"]'), control);
    }));
    if (songbookView) return card;
    const { chords } = activeSong();
    const actions = make('div', 'card-actions');
    const move = direction => {
      const next = index + direction;
      [chords[index], chords[next]] = [chords[next], chords[index]];
      if (editedIndex === index) editedIndex = next;
      else if (editedIndex === next) editedIndex = index;
      updateCards();
      const buttons = $('cards').querySelector('[data-chord-index="' + next + '"]').querySelectorAll('.card-actions button');
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
        const nextCard = $('cards').querySelector('[data-chord-index="' + Math.min(index, chords.length - 1) + '"]');
        (nextCard?.querySelector('button:not(:disabled)') ?? $('add-card')).focus();
      })
    );
    card.append(actions);
  }
  return card;
}

function chartMeasures(chords) {
  const measures = [];
  let available = 0;
  chords.forEach((chord, index) => {
    let remaining = chordBeats(chord);
    let continued = false;
    while (remaining > 0) {
      if (available === 0) {
        measures.push([]);
        available = beatsPerMeasure;
      }
      const beats = Math.min(remaining, available);
      measures.at(-1).push({ index, beats, continued, continues: remaining > beats });
      remaining -= beats;
      available -= beats;
      continued = true;
    }
  });
  return measures;
}

function renderCards() {
  stopPlayback();
  const container = $('cards');
  const { chords, closeVoicings: useCloseVoicings } = activeSong();
  displayedVoicings = useCloseVoicings ? closeVoicings(chords) : chords.map(chord => chord.frets);
  playbackSegments = [];
  measureButtons = [];
  container.replaceChildren();
  let elapsed = 0;
  chartMeasures(chords).forEach((parts, measureIndex) => {
    const measure = make('section', 'measure');
    const header = make('div', 'measure-header');
    const track = make('div', 'beat-track');
    track.setAttribute('aria-hidden', 'true');
    const heading = make('h3');
    const seek = make('button', 'measure-start', 'Measure ' + (measureIndex + 1));
    seek.type = 'button';
    seek.title = 'Set the playback position here';
    seek.onclick = () => seekMeasure(measureIndex);
    measureButtons.push(seek);
    heading.append(seek);
    header.append(heading, track);
    const grid = make('div', 'measure-grid');
    measure.append(header, grid);
    measure.onclick = event => {
      if (!event.target.closest('button')) seekMeasure(measureIndex);
    };
    container.append(measure);
    for (const { index, beats, continued, continues } of parts) {
      const segment = make('span', continued ? 'beat-segment held' : 'beat-segment');
      segment.style.setProperty('--beat-width', (beats / beatsPerMeasure) * 100 + '%');
      track.append(segment);
      const card = renderChord(chords[index], index, beats, continued, continues);
      grid.append(card);
      elapsed += beats;
      playbackSegments.push({ end: elapsed, card, segment, measure });
    }
  });
  if (selectedMeasure !== null && selectedMeasure >= measureButtons.length) selectedMeasure = null;
  playbackPosition = (selectedMeasure ?? 0) * beatsPerMeasure;
  updateMeasureSelection();
  $('print').disabled = chords.length === 0;
  $('play').disabled = chords.length === 0;
  $('suggest-song').disabled = chords.length === 0;
  $('close-voicings').checked = Boolean(useCloseVoicings);
  $('close-voicings').disabled = !useCloseVoicings && (chords.length < 2 || !chords.some(chord => chord.mode === 'lookup'));
  $('reset-song-voicings').hidden = !useCloseVoicings && !chords.some(chord => chord.mode === 'lookup' && !sameFrets(lookupChord(chord.name)?.frets, chord.frets));
  updateDifficulty();
}

function focusStepper(container, control) {
  const buttons = container.querySelectorAll('.voicing-stepper button');
  const fallback = container.querySelector('.voicing-stepper button:not(:disabled), .card-actions button:not(:disabled)');
  (buttons[control]?.disabled ? fallback : buttons[control])?.focus({ preventScroll: true });
}

function highlightBeat(beat) {
  const next = playbackSegments.find(segment => beat < segment.end);
  if (next === highlighted) return;
  if (highlighted) {
    highlighted.card.classList.remove('playing');
    highlighted.segment.classList.remove('playing');
    highlighted.card.removeAttribute('aria-current');
  }
  if (next) {
    next.card.classList.add('playing');
    next.segment.classList.add('playing');
    next.card.setAttribute('aria-current', 'true');
  }
  highlighted = next;
  updateTransportPosition();
  followPlayback();
}

function updateTransportPosition() {
  const position = $('transport-position');
  const measure = playbackMode === 'stopped' ? selectedMeasure : Math.floor(playbackPosition / beatsPerMeasure);
  position.hidden = measure === null;
  const text = measure === null ? '' : (playbackMode === 'stopped' ? 'From measure ' : 'Measure ') + (measure + 1);
  if (position.textContent !== text) position.textContent = text;
}

function followPlayback() {
  if (!$('autoscroll').checked || playbackMode !== 'playing' || !highlighted) return;
  const top = Math.max(0, $('transport').getBoundingClientRect().bottom) + 8;
  const bottom = window.innerHeight - 8;
  let bounds = highlighted.measure.getBoundingClientRect();
  if (bounds.height > bottom - top) bounds = highlighted.card.getBoundingClientRect();
  const distance = bounds.top < top ? bounds.top - top : Math.max(0, bounds.bottom - bottom);
  if (Math.abs(distance) > 2) {
    window.scrollBy({ top: distance, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
}

function updateMeasureSelection() {
  measureButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selectedMeasure)));
  updateTransportPosition();
}

function seekMeasure(index) {
  selectedMeasure = index;
  playbackPosition = index * beatsPerMeasure;
  updateMeasureSelection();
  if (playbackMode === 'playing' || playbackMode === 'loading') startPlayback();
  else if (playbackMode === 'paused') highlightBeat(playbackPosition);
}

function setPlaybackMode(mode, message = '') {
  playbackMode = mode;
  const running = mode === 'playing' || mode === 'loading';
  const text = running ? 'Pause' : mode === 'paused' ? 'Resume' : 'Play';
  const icon = make('span', '', running ? 'Ⅱ' : '▶');
  icon.setAttribute('aria-hidden', 'true');
  $('play').replaceChildren(icon, document.createTextNode(' ' + text));
  const stop = $('stop');
  stop.hidden = mode === 'stopped';
  if (stop.hidden && document.activeElement === stop) $('play').focus({ preventScroll: true });
  $('playback-status').textContent = message;
  $('playback-status').hidden = !message;
  updateTransportPosition();
}

function stopPlayback() {
  playbackRequest += 1;
  player.stop();
  playbackPosition = (selectedMeasure ?? 0) * beatsPerMeasure;
  setPlaybackMode('stopped');
  highlightBeat(Infinity);
}

function pausePlayback() {
  playbackRequest += 1;
  playbackPosition = player.position ?? playbackPosition;
  player.stop();
  setPlaybackMode('paused');
  highlightBeat(playbackPosition);
}

function currentTempo() {
  const input = $('tempo');
  const entered = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : activeSong().tempo ?? 92;
  return Math.min(Number(input.max), Math.max(Number(input.min), Math.round(entered)));
}

function playbackSequence(chords, frets) {
  return chords.map((chord, index) => ({ beats: chordBeats(chord), frets: frets[index] }));
}

function currentSequence() {
  return playbackSequence(activeSong().chords, displayedVoicings);
}

function renderPrintSheet() {
  const song = activeSong();
  const sheet = $('print-sheet');
  const header = make('header', 'print-heading');
  header.append(make('h1', '', displayTitle(song)));
  const credit = songbookView ? $('song-credit').textContent : creditedAuthor(song);
  if (credit) header.append(make('p', 'print-credit', credit));
  header.append(make('p', 'print-meta', '4/4  ·  ' + currentTempo() + ' BPM  ·  Standard tuning E A D G B E'));
  sheet.replaceChildren(header);
  if (!song.chords.length) {
    sheet.append(make('p', '', 'No chords yet.'));
    return;
  }

  const byName = new Map();
  const fingerings = [];
  const voicings = song.chords.map((chord, index) => {
    if (!byName.has(chord.name)) byName.set(chord.name, []);
    const variants = byName.get(chord.name);
    const frets = displayedVoicings[index];
    const existing = variants.find(variant => sameFrets(variant.frets, frets));
    if (existing) return existing;
    const entry = { name: chord.name, frets, number: variants.length + 1 };
    variants.push(entry);
    fingerings.push(entry);
    return entry;
  });
  const chordLabel = (tag, className, voicing) => {
    const label = make(tag, className, voicing.name);
    if (byName.get(voicing.name).length > 1) label.append(make('sup', '', voicing.number));
    return label;
  };

  const measures = chartMeasures(song.chords);
  const systems = make('div', 'print-systems');
  for (let start = 0; start < measures.length; start += 4) {
    const system = make('div', 'print-system');
    for (const [offset, parts] of measures.slice(start, start + 4).entries()) {
      const bar = make('div', 'print-bar');
      const changes = make('div', 'print-changes');
      bar.append(make('span', 'print-measure-number', start + offset + 1), changes);
      for (const { index, beats, continued } of parts) {
        const change = make('div', 'print-change');
        change.append(chordLabel('strong', 'print-chord-name', voicings[index]));
        if (beats !== beatsPerMeasure || continued) {
          change.append(make('small', 'print-duration', (continued ? 'Hold · ' : '') + formatBeats(beats)));
        }
        changes.append(change);
      }
      system.append(bar);
    }
    systems.append(system);
  }
  sheet.append(systems);

  const key = make('section', 'print-fingerings');
  const keyHeading = make('header', 'print-key-heading');
  keyHeading.append(make('h2', '', 'Guitar fingerings'), make('p', '', displayTitle(song)));
  key.append(keyHeading);
  for (let start = 0; start < fingerings.length; start += 6) {
    const row = make('div', 'print-fingering-row');
    for (const voicing of fingerings.slice(start, start + 6)) {
      const shape = make('figure', 'print-fingering');
      shape.append(chordLabel('figcaption', 'print-chord-name', voicing), drawDiagram(voicing.frets));
      row.append(shape);
    }
    key.append(row);
  }
  sheet.append(key);
}

function updateDifficulty() {
  const level = estimateDifficulty(currentSequence(), currentTempo());
  const badge = $('difficulty');
  badge.hidden = !level;
  badge.dataset.level = level?.toLowerCase() ?? '';
  const text = $('difficulty-level');
  if (text.textContent !== (level ?? '')) text.textContent = level ?? '';
  songLevels.set(activeSong(), level);
  const selectedSong = $('songs').querySelector('[aria-current="true"]');
  if (selectedSong) updateDifficultyDot(selectedSong, level);
}

function saveTempo() {
  const tempo = currentTempo();
  $('tempo').value = tempo;
  const song = activeSong();
  if (song.tempo !== tempo) {
    song.tempo = tempo;
    save();
  }
  updateDifficulty();
  return tempo;
}

function updateCards() {
  renderCards();
  updateTitle();
  save();
}

function render() {
  const browsing = Boolean(songbookView);
  selectedMeasure = null;
  renderLibrary();
  for (const item of $('templates').querySelectorAll('[data-template]')) {
    if (item.dataset.template === songbookView?.templateId) item.setAttribute('aria-current', 'true');
    else item.removeAttribute('aria-current');
  }
  for (const id of ['song-title', 'edit-title-label', 'rename-song', 'song-byline', 'suggest-song', 'add-card', 'editor', 'workspace-footer']) $(id).hidden = browsing;
  $('print-title').classList.toggle('screen-title', browsing);
  $('copy-template').hidden = !browsing;
  $('copy-template-draft').hidden = !browsing || !state.songbookDrafts?.[songbookView.templateId];
  $('song-title').value = activeSong().title;
  $('song-author').value = creditedAuthor(activeSong());
  $('tempo').value = activeSong().tempo ?? 92;
  $('instrument').value = activeSong().instrument ?? 'nylon';
  $('loop').checked = Boolean(activeSong().loop);
  $('autoscroll').checked = Boolean(state.autoScroll);
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

function readVoicing(name) {
  const lookup = name && chordVoicings(name);
  if (!lookup) {
    voicingName = null;
    return null;
  }
  if (voicingName !== lookup.name) {
    voicingName = lookup.name;
    const saved = activeSong().chords[editedIndex];
    draftFrets = saved?.name === lookup.name ? displayedVoicings[editedIndex] ?? saved.frets : lookup.voicings[0];
    draftVoicingChanged = false;
  }
  return { name: lookup.name, frets: draftFrets };
}

function readChord() {
  const name = $('chord-name').value.trim();
  const beats = Number($('chord-beats').value);
  if (mode === 'lookup') {
    const chord = readVoicing(name);
    return chord ? { chord: { ...chord, mode, beats } } : {
      error: name ? 'No fingering found. Check the chord symbol or enter a custom fingering.' : 'Enter a chord name.'
    };
  }
  const values = stringInputs.map(input => input.value.trim().toLowerCase() || 'x');
  if (values.some(value => !/^(x|[0-9]|1[0-9]|2[0-4])$/.test(value))) {
    return { error: 'Enter x, 0, or a fret from 1 to 24 for each string.' };
  }
  const frets = values.map(value => value === 'x' ? -1 : Number(value));
  if (frets.every(fret => fret < 0)) return { error: 'Enter at least one open or fretted string.' };
  return { chord: { name: name || 'Custom chord', frets, mode, beats } };
}

function preview(showError = false) {
  const { chord, error } = readChord();
  $('chord-error').hidden = !(showError && error);
  $('chord-error').textContent = showError ? error ?? '' : '';
  const target = $('preview');
  target.hidden = !chord;
  target.replaceChildren();
  if (chord) target.append(drawDiagram(chord.frets));
  if (chord?.mode === 'lookup') {
    target.append(voicingStepper(chordVoicings(chord.name), chord.frets, 'chord preview', (choice, control) => {
      draftFrets = choice;
      draftVoicingChanged = true;
      preview();
      focusStepper(target, control);
    }));
  }
  return chord;
}

function refreshDraftVoicing(index = editedIndex) {
  if (index !== editedIndex || editedIndex === null || draftVoicingChanged || mode !== 'lookup') return;
  voicingName = null;
  preview();
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
  voicingName = null;
  draftVoicingChanged = false;
  $('editor-title').textContent = index === null ? 'Add a chord' : 'Edit chord';
  $('submit-chord').textContent = index === null ? 'Add to progression' : 'Save chord';
  $('cancel-edit').hidden = index === null;
}

function resetEditor(beats = beatsPerMeasure) {
  $('chord-name').value = '';
  $('chord-beats').value = beats;
  stringInputs.forEach(input => { input.value = ''; });
  editing(null);
  setMode('lookup');
}

function editChord(index) {
  const chord = activeSong().chords[index];
  editing(index);
  $('chord-name').value = chord.name;
  $('chord-beats').value = chordBeats(chord);
  stringInputs.forEach((input, string) => { input.value = chord.frets[string] < 0 ? 'x' : chord.frets[string]; });
  setMode(chord.mode);
  $('chord-name').focus();
}

$('lookup-tab').onclick = () => setMode('lookup');
$('close-voicings').onchange = event => {
  const song = activeSong();
  song.closeVoicings = event.target.checked;
  if (!song.closeVoicings) song.chords.forEach(chord => { delete chord.pinned; });
  updateCards();
  refreshDraftVoicing();
};
$('reset-song-voicings').onclick = () => {
  const song = activeSong();
  song.closeVoicings = false;
  for (const chord of song.chords) {
    if (chord.mode !== 'lookup') continue;
    chord.frets = lookupChord(chord.name)?.frets ?? chord.frets;
    delete chord.pinned;
  }
  updateCards();
  refreshDraftVoicing();
  ($('close-voicings').disabled ? $(songbookView ? 'copy-template' : 'add-card') : $('close-voicings')).focus({ preventScroll: true });
};
$('add-card').onclick = () => {
  resetEditor(Number($('chord-beats').value));
  $('chord-name').focus();
};
$('custom-tab').onclick = () => {
  if (mode === 'lookup') {
    const current = readVoicing($('chord-name').value);
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
  const previous = chords[editedIndex];
  if (chord.mode === 'lookup' && previous?.mode === 'lookup' && previous.name === chord.name && !draftVoicingChanged) {
    chord.frets = previous.frets;
    if (previous.pinned) chord.pinned = true;
  } else if (chord.mode === 'lookup' && draftVoicingChanged && activeSong().closeVoicings) {
    chord.pinned = true;
  }
  if (editedIndex === null) chords.push(chord);
  else chords[editedIndex] = chord;
  resetEditor(chord.beats);
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
$('song-author').oninput = event => {
  activeSong().author = event.target.value;
  save();
};
$('rename-song').onclick = () => { $('song-title').focus(); $('song-title').select(); };
$('copy-template').onclick = () => copyToLibrary(songbookView);
$('copy-template-draft').onclick = () => copyToLibrary(state.songbookDrafts?.[songbookView?.templateId]);
$('new-song').onclick = () => {
  const song = newSong();
  state.songs.unshift(song);
  openSong(song.id);
  $('song-title').focus();
};

function prepareSubmission() {
  const title = $('submission-title').value.trim();
  const credit = $('submission-author').value.trim();
  const source = $('submission-source').value.trim();
  const slug = title.normalize('NFD').replace(/\p{Mark}/gu, '').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '');
  const chart = {
    id: 'community-' + (slug || 'chart'),
    group: 'Community',
    title,
    credit,
    ...(source ? { source } : {}),
    tempo: currentTempo(),
    instrument: $('instrument').value,
    chords: activeSong().chords.map((chord, index) => ({
      name: chord.name,
      mode: chord.mode,
      beats: chordBeats(chord),
      frets: displayedVoicings[index]
    }))
  };
  const draft = createSongbookIssue(chart, $('submission-notes').value.trim());
  $('submission-form').action = draft.issueUrl;
  $('submission-issue-title').value = draft.title;
  $('submission-issue-body').value = draft.body;
  $('submission-issue-body').disabled = draft.needsPaste;
  $('submission-text').value = draft.body;
  $('submission-needs-paste').hidden = !draft.needsPaste;
  if (draft.needsPaste) $('submission-preview').open = true;
}

$('suggest-song').onclick = () => {
  const song = activeSong();
  $('submission-title').value = song.title;
  $('submission-author').value = creditedAuthor(song);
  $('submission-source').value = chartSource(song);
  $('submission-notes').value = '';
  $('submission-copy-status').textContent = '';
  $('submission-preview').open = false;
  prepareSubmission();
  $('submission-dialog').showModal();
};
$('submission-form').oninput = () => {
  $('submission-copy-status').textContent = '';
  prepareSubmission();
};
$('submission-form').onsubmit = () => {
  prepareSubmission();
  const song = activeSong();
  song.author = $('submission-author').value.trim();
  song.source = $('submission-source').value.trim();
  $('song-author').value = song.author;
  updateTitle();
  save();
};
$('copy-submission').onclick = async () => {
  const text = $('submission-text');
  const status = $('submission-copy-status');
  try {
    await navigator.clipboard.writeText(text.value);
    status.textContent = 'Issue text copied.';
  } catch {
    text.focus();
    text.select();
    status.textContent = 'Issue text selected. Copy it to the clipboard.';
  }
};
$('close-submission').onclick = () => $('submission-dialog').close();

$('tempo').oninput = updateDifficulty;
$('tempo').onchange = () => {
  if (playbackMode === 'playing' || playbackMode === 'loading') pausePlayback();
  saveTempo();
};
$('loop').onchange = event => {
  activeSong().loop = event.target.checked;
  save();
};
$('autoscroll').onchange = event => {
  state.autoScroll = event.target.checked;
  save();
  followPlayback();
};
$('instrument').onchange = event => {
  if (playbackMode === 'playing' || playbackMode === 'loading') pausePlayback();
  activeSong().instrument = event.target.value;
  save();
};
async function startPlayback() {
  const request = ++playbackRequest;
  const sequence = currentSequence();
  const tempo = saveTempo();
  const startBeat = playbackPosition;
  setPlaybackMode('loading', 'Loading instrument…');
  highlightBeat(startBeat);
  try {
    await player.play(sequence, {
      tempo,
      instrument: $('instrument').value,
      startBeat,
      isLooping: () => $('loop').checked,
      onStart: () => {
        setPlaybackMode('playing');
        followPlayback();
      },
      onBeat: beat => {
        playbackPosition = beat;
        highlightBeat(beat);
      },
      onEnd: stopPlayback
    });
  } catch {
    if (request !== playbackRequest) return;
    stopPlayback();
    setPlaybackMode('stopped', 'Could not load the instrument. Try playing again.');
  }
}
$('play').onclick = () => {
  if (playbackMode === 'playing' || playbackMode === 'loading') pausePlayback();
  else startPlayback();
};
$('stop').onclick = stopPlayback;
$('print').onclick = () => window.print();
addEventListener('beforeprint', renderPrintSheet);
$('delete-song').onclick = () => {
  $('delete-description').textContent = '“' + displayTitle(activeSong()) + '” and its chords will be deleted from this browser.';
  $('delete-dialog').returnValue = 'cancel';
  $('delete-dialog').showModal();
};
$('delete-dialog').onclose = () => {
  if ($('delete-dialog').returnValue !== 'delete') return;
  state.songs = state.songs.filter(song => song !== activeSong());
  if (state.songs.length) {
    openSong(state.songs[0].id);
    $('song-title').focus();
  } else {
    openTemplate(defaultTemplate);
    $('new-song').focus();
  }
};
for (const [value, label] of Object.entries(instruments)) {
  const option = make('option', '', label);
  option.value = value;
  $('instrument').append(option);
}
restoreView();
renderSongbook();
$('songbook-search').oninput = renderSongbook;
$('favourites-filter').onclick = event => {
  favouritesOnly = !favouritesOnly;
  event.currentTarget.setAttribute('aria-pressed', String(favouritesOnly));
  renderSongbook();
};
$('songbook').open = matchMedia('(min-width: 781px)').matches;
render();
save();
