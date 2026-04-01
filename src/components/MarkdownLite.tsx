

type MarkdownLiteProps = {
  content: string;
  className?: string;
};

type Block =
{type: 'h1';text: string;} |
{type: 'h2';text: string;} |
{type: 'p';text: string;} |
{type: 'ul';items: string[];} |
{type: 'ol';items: string[];} |
{type: 'code';code: string;};

const slugify = (text: string) => {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const parseMarkdownLite = (input: string): Block[] => {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      // Consume closing fence if present
      if (i < lines.length && lines[i].startsWith('```')) i += 1;
      blocks.push({ type: 'code', code: codeLines.join('\n') });
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2).trim() });
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
      i += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim());
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, '').trim());
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
    i < lines.length &&
    lines[i].trim() !== '' &&
    !lines[i].startsWith('# ') &&
    !lines[i].startsWith('## ') &&
    !lines[i].startsWith('- ') &&
    !/^\d+\.\s+/.test(lines[i]) &&
    !lines[i].startsWith('```'))
    {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'p', text: paragraphLines.join(' ') });
  }

  return blocks;
};

const linkify = (text: string) => {
  const urlRegex = /https?:\/\/[^\s)]+/g;

  const parts: Array<string | {href: string;}> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(urlRegex)) {
    const href = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push({ href });
    lastIndex = start + href.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.map((part, idx) => {
    if (typeof part === 'string') return part;

    return (
      <a key={idx} href={part.href} target="_blank" rel="noreferrer">
        {part.href}
      </a>);

  });
};

export const MarkdownLite = ({ content, className }: MarkdownLiteProps) => {
  const blocks = parseMarkdownLite(content);
  const headingCounts = new Map<string, number>();

  const getHeadingId = (text: string) => {
    const base = slugify(text);
    const count = headingCounts.get(base) ?? 0;
    headingCounts.set(base, count + 1);
    if (count === 0) return base;
    return `${base}-${count + 1}`;
  };

  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        if (block.type === 'h1') {
          const id = getHeadingId(block.text);
          return <h1 key={idx} id={id} className="text-secondary-foreground">{block.text}</h1>;
        }
        if (block.type === 'h2') {
          const id = getHeadingId(block.text);
          return <h2 key={idx} id={id} className="text-secondary-foreground">{block.text}</h2>;
        }
        if (block.type === 'p') return <p key={idx} className="text-secondary-foreground">{linkify(block.text)}</p>;
        if (block.type === 'code') {
          return (
            <pre key={idx}>
              <code>{block.code}</code>
            </pre>);

        }

        if (block.type === 'ol') {
          return (
            <ol key={idx}>
              {block.items.map((item, itemIdx) =>
              <li key={itemIdx} className="text-secondary-foreground">{linkify(item)}</li>
              )}
            </ol>);

        }

        return (
          <ul key={idx}>
            {block.items.map((item, itemIdx) =>
            <li key={itemIdx} className="text-secondary-foreground">{linkify(item)}</li>
            )}
          </ul>);

      })}
    </div>);

};