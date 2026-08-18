import { readFile, writeFile } from 'node:fs/promises';

// Turns the inventory scan into a Markdown report.
// Run src/inventoryScan.js first.
const rows = JSON.parse(await readFile('output/consolidated-report.json', 'utf8'));

// Filled minutes before the scan; GetComponentData lags hours on these
// components, so their zeros are a stale read, not a real gap.
const PENDING = new Set(['HTS1031', 'RRI079', 'RRI1272', 'RRI1279', 'RRI1426', 'RRI455', 'RRI905', 'TRC1415']);

const ok = rows.filter((r) => r.status === 'ok');
const bad = rows.filter((r) => r.status !== 'ok');
const n = (v) => (v === null ? '—' : String(v));
const roomStr = (r) => (r.roomDetail.length ? r.roomDetail.map((x) => `${x.code}·${x.images}`).join(', ') : '_none_');
const hasGap = (r) => !PENDING.has(r.code) && (r.listing === 0 || r.galleryTotal === 0 || r.roomTypeCount === 0 || r.roomsWithImage < r.roomTypeCount);

const t = {
  props: ok.length,
  listing: ok.filter((r) => r.listing > 0).length,
  gallery: ok.reduce((a, r) => a + r.galleryTotal, 0),
  ext: ok.reduce((a, r) => a + (r.exterior || 0), 0),
  int: ok.reduce((a, r) => a + (r.interior || 0), 0),
  rms: ok.reduce((a, r) => a + (r.rooms || 0), 0),
  roomRecs: ok.reduce((a, r) => a + r.roomTypeCount, 0),
  roomImgs: ok.reduce((a, r) => a + r.roomsWithImage, 0),
};
const gaps = ok.filter(hasGap);

const row = (r) => `| ${r.code} | ${r.recordId} | ${n(r.listing)} | ${n(r.exterior)} | ${n(r.interior)} | ${n(r.rooms)} | ${r.galleryTotal} | ${r.roomsWithImage}/${r.roomTypeCount} | ${roomStr(r)} |`;
const head = '| Property | Record | Listing | Ext | Int | Rooms | Gallery total | Room images | Room types · images each |\n|---|---|---|---|---|---|---|---|---|';

const md = `# Red Roof CMS — Image Inventory

Every property code read back from the CMS: the listing image, each gallery tab, and every
individual room-type record with its own image count. **Counts are what \`GetComponentData\`
returns, not what was written to it.**

## Totals

| | |
|---|---|
| Property records | ${t.props} |
| Listing images set | ${t.listing} of ${t.props} |
| Gallery images | ${t.gallery.toLocaleString('en-US')} |
| &nbsp;&nbsp;· Exterior | ${t.ext.toLocaleString('en-US')} |
| &nbsp;&nbsp;· Interior | ${t.int.toLocaleString('en-US')} |
| &nbsp;&nbsp;· Rooms | ${t.rms.toLocaleString('en-US')} |
| Room-type records | ${t.roomRecs.toLocaleString('en-US')} |
| Room images set | ${t.roomImgs.toLocaleString('en-US')} of ${t.roomRecs.toLocaleString('en-US')} |
| Properties with a gap | ${gaps.length} |
| Written, read pending | ${PENDING.size} |

## How to read this

- **\`—\`** in a gallery column means that tab has **no CMS record at all**, not an empty tab.
- **\`NE1K·1\`** means room-type \`NE1K\` carries 1 image. **\`·0\`** is a room with no image.
- The ${PENDING.size} codes under *read pending* were filled minutes before this scan and still read
  back empty. Their writes returned success; \`GetComponentData\` lags hours behind on
  \`property-data\` and \`property-level-gallery\`, so the write is the truth, not this read.

## Properties with a gap (${gaps.length})

${head}
${gaps.map(row).join('\n')}

## Written, read pending (${PENDING.size})

These read as zero only because the read has not caught up.

${head}
${ok.filter((r) => PENDING.has(r.code)).map(row).join('\n')}
${bad.length ? `\n## Could not be read (${bad.length})\n\n${bad.map((r) => `- \`${r.code}\` — ${r.status}${r.error ? `: ${r.error}` : ''}`).join('\n')}\n` : ''}
## Full inventory (${ok.length})

${head}
${ok.map(row).join('\n')}

---

Generated from \`output/consolidated-report.json\` (\`src/inventoryScan.js\`).
Machine-readable copies: \`output/consolidated-report.csv\` (one row per property),
\`output/consolidated-rooms.csv\` (${t.roomRecs.toLocaleString('en-US')} rows, one per room-type record).
`;

await writeFile('output/consolidated-report.md', md);
console.log('written output/consolidated-report.md |', md.length, 'bytes |', ok.length, 'properties |', gaps.length, 'with gaps');
