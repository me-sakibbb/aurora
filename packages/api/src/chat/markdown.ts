// A small Markdown reader for chat replies. The model writes light Markdown (bold, lists, the odd
// heading); this turns it into blocks the app can lay out natively on both platforms without a
// rendering library. Unknown syntax falls through as plain text, so nothing is ever dropped.

export type InlineSpan = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { type: 'paragraph'; spans: InlineSpan[] }
  | { type: 'list'; ordered: boolean; start: number; items: InlineSpan[][] }
  | { type: 'rule' };

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length)
      blocks.push({ type: 'paragraph', spans: parseInline(paragraph.join('\n')) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) {
      blocks.push({
        type: 'list',
        ordered: list.ordered,
        start: list.start,
        items: list.items.map(parseInline),
      });
    }
    list = null;
  };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    if (RULE.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'rule' });
      continue;
    }
    const heading = HEADING.exec(line.trim());
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1]?.length ?? 1, 3) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, spans: parseInline(heading[2] ?? '') });
      continue;
    }
    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      const text = (bullet ? bullet[1] : ordered?.[2]) ?? '';
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, start: ordered ? Number(ordered[1]) : 1, items: [] };
      }
      list.items.push(text);
      continue;
    }
    // An indented line right after a list item continues that item.
    if (list && /^\s{2,}/.test(raw) && list.items.length) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

const INLINE = /(\*\*|__)(.+?)\1|(\*|_)(?!\s)(.+?)(?<!\s)\3|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Bold, italic, inline code and links (kept as their text plus the address). */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    // `snake_case_words` shouldn't turn italic: an underscore inside a word isn't emphasis.
    if (match[3] === '_' && /\w/.test(text[index - 1] ?? '')) continue;
    if (index > last) spans.push({ text: text.slice(last, index) });
    if (match[2] !== undefined) {
      for (const inner of parseInline(match[2])) spans.push({ ...inner, bold: true });
    } else if (match[4] !== undefined) {
      for (const inner of parseInline(match[4])) spans.push({ ...inner, italic: true });
    } else if (match[5] !== undefined) {
      spans.push({ text: match[5], code: true });
    } else if (match[6] !== undefined) {
      spans.push({ text: `${match[6]} (${match[7]})` });
    }
    last = index + match[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return merge(spans);
}

/** Joins neighbouring spans with the same style, so fewer Text nodes are drawn. */
function merge(spans: InlineSpan[]): InlineSpan[] {
  const out: InlineSpan[] = [];
  for (const span of spans) {
    const prev = out[out.length - 1];
    if (
      prev &&
      Boolean(prev.bold) === Boolean(span.bold) &&
      Boolean(prev.italic) === Boolean(span.italic) &&
      Boolean(prev.code) === Boolean(span.code)
    ) {
      prev.text += span.text;
    } else {
      out.push({ ...span });
    }
  }
  return out;
}

/** The text with Markdown marks removed, e.g. for copying or screen readers. */
export function plainText(blocks: MarkdownBlock[]): string {
  const line = (spans: InlineSpan[]) => spans.map((s) => s.text).join('');
  return blocks
    .map((block) => {
      if (block.type === 'rule') return '';
      if (block.type === 'list') {
        return block.items
          .map((item, i) => `${block.ordered ? `${block.start + i}.` : '•'} ${line(item)}`)
          .join('\n');
      }
      return line(block.spans);
    })
    .join('\n\n')
    .trim();
}
