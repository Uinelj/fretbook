const issueUrl = 'https://github.com/Uinelj/fretbook/issues/new';

export function createSongbookIssue(chart, notes) {
  const { chords, ...metadata } = chart;
  const properties = JSON.stringify(metadata, null, 2).slice(0, -2);
  const changes = chords.map(chord => '    ' + JSON.stringify(chord)).join(',\n');
  const json = properties + ',\n  "chords": [\n' + changes + '\n  ]\n}';
  const title = '[Songbook] ' + chart.title;
  const body = '### Fretbook chart\n\n' + '```json\n' + json + '\n```' + (notes ? '\n\n### Notes\n\n' + notes : '');
  const query = new URLSearchParams({ title, body });
  return { issueUrl, title, body, needsPaste: issueUrl.length + 1 + query.toString().length > 6000 };
}
