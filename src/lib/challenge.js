/**
 * The reading challenge: content and layout.
 *
 * Deliberately free of Three.js and the DOM. The page texture is painted from
 * these constants and the 3D hit-zones are derived from the same ones, so a
 * click always lands on the line the reader is looking at — and the whole thing
 * can be verified without a browser.
 *
 * To rewrite the challenge, edit this file only: mark exactly one line
 * `correct`, and give every other line a `note` saying why it is not the idea
 * the passage is built around.
 */

export const CHALLENGE_LINES = [
  {
    text: 'Reading is not a race to the last page.',
    correct: false,
    note: 'A nice opening line — but it sets the mood, it does not carry the argument.',
  },
  {
    text: 'Most readers forget the majority of a book within a few weeks.',
    correct: false,
    note: 'That is evidence for the argument, not the argument itself.',
  },
  {
    text: 'What you keep depends on what you mark and return to — not how fast you read.',
    correct: true,
    note: 'Exactly. Every other line exists to support this one.',
  },
  {
    text: 'Some people read at dawn; others only after midnight.',
    correct: false,
    note: 'A detail. Interesting, but nothing else in the passage depends on it.',
  },
  {
    text: 'A page number records where you stopped, and nothing more.',
    correct: false,
    note: 'Close — this sharpens the problem, but it is still setup.',
  },
  {
    text: 'Highlighters and margin notes rarely survive the shelf.',
    correct: false,
    note: 'An example of the problem, not the idea the passage is built around.',
  },
];

/** Shared by the texture painter and the 3D hit-zones. Pixels, texture space. */
export const CHALLENGE_LAYOUT = {
  width: 1024,
  height: 1280,
  top: 300,
  lineHeight: 150,
  wrapLead: 46,
  fontSize: 36,
  marginX: 96,
  /** Height of a clickable band, centred on its block. */
  bandHeight: 132,
  /** Offset from the first baseline to the visual centre of a block. */
  bandOffset: 12,
};

/** Index of the answer — derived, never hand-maintained. */
export const CORRECT_INDEX = CHALLENGE_LINES.findIndex((l) => l.correct);

/**
 * Vertical placement of line `i`'s clickable band, in texture pixels.
 * `centre` is the middle of the band; `top`/`bottom` are its edges.
 */
export function bandBounds(i) {
  const { top, lineHeight, bandHeight, bandOffset } = CHALLENGE_LAYOUT;
  const centre = top + i * lineHeight + bandOffset;
  return { centre, top: centre - bandHeight / 2, bottom: centre + bandHeight / 2 };
}
