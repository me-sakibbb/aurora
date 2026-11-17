import { parseInline, parseMarkdown, plainText } from './markdown';

describe('parseMarkdown', () => {
  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    expect(parseMarkdown('Hello there.\nSecond line.\n\nNew paragraph.')).toEqual([
      { type: 'paragraph', spans: [{ text: 'Hello there.\nSecond line.' }] },
      { type: 'paragraph', spans: [{ text: 'New paragraph.' }] },
    ]);
  });

  it('reads bullet and numbered lists, starting where the list starts', () => {
    const blocks = parseMarkdown('Try:\n- dal\n* rice\n• shak\n\n3. one\n4) two');
    expect(blocks).toEqual([
      { type: 'paragraph', spans: [{ text: 'Try:' }] },
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [[{ text: 'dal' }], [{ text: 'rice' }], [{ text: 'shak' }]],
      },
      { type: 'list', ordered: true, start: 3, items: [[{ text: 'one' }], [{ text: 'two' }]] },
    ]);
  });

  it('continues a list item on an indented line', () => {
    const [list] = parseMarkdown('- first part\n  and the rest');
    expect(list).toEqual({
      type: 'list',
      ordered: false,
      start: 1,
      items: [[{ text: 'first part and the rest' }]],
    });
  });

  it('caps heading levels at 3 and reads rules', () => {
    expect(parseMarkdown('# Big\n#### Small\n---')).toEqual([
      { type: 'heading', level: 1, spans: [{ text: 'Big' }] },
      { type: 'heading', level: 3, spans: [{ text: 'Small' }] },
      { type: 'rule' },
    ]);
  });

  it('handles Bengali text and Windows line endings', () => {
    expect(parseMarkdown('**ভাত** ও ডাল\r\n\r\n- শাক')).toEqual([
      { type: 'paragraph', spans: [{ text: 'ভাত', bold: true }, { text: ' ও ডাল' }] },
      { type: 'list', ordered: false, start: 1, items: [[{ text: 'শাক' }]] },
    ]);
  });

  it('returns nothing for empty text', () => {
    expect(parseMarkdown('  \n\n')).toEqual([]);
  });
});

describe('parseInline', () => {
  it('reads bold, italic, code and links', () => {
    expect(parseInline('Eat **more fibre**, *slowly*, `daily` see [WHO](https://who.int)')).toEqual(
      [
        { text: 'Eat ' },
        { text: 'more fibre', bold: true },
        { text: ', ' },
        { text: 'slowly', italic: true },
        { text: ', ' },
        { text: 'daily', code: true },
        { text: ' see WHO (https://who.int)' },
      ],
    );
  });

  it('leaves underscores inside words and stray asterisks alone', () => {
    expect(parseInline('snake_case_name and 2 * 3 = 6')).toEqual([
      { text: 'snake_case_name and 2 * 3 = 6' },
    ]);
  });
});

describe('plainText', () => {
  it('drops the marks but keeps the words and list numbers', () => {
    expect(plainText(parseMarkdown('## Tips\n\n1. **Drink** water\n2. Rest'))).toBe(
      'Tips\n\n1. Drink water\n2. Rest',
    );
  });
});
