#!/usr/bin/env node
/**
 * Generates printable HTML manual test packs from docs/mobile-app-test-pack.md.
 * Run: npm run docs:test-pack
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'docs');
const SOURCE = join(DOCS, 'mobile-app-test-pack.md');
const CSS_PATH = join(DOCS, 'mobile-app-test-pack.css');
const OUTPUTS = [
  join(DOCS, 'Coach360-Manual-Test-Pack.html'),
  join(DOCS, 'mobile-app-test-pack.html'),
];

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

function isTableRow(line) {
  return line.trimStart().startsWith('|');
}

function isTableSeparator(line) {
  return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line.trim());
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(lines) {
  if (lines.length < 2 || !isTableSeparator(lines[1])) {
    return lines.map((line) => `<p>${inlineMarkdown(line)}</p>`).join('\n');
  }

  const header = parseTableRow(lines[0]);
  const bodyRows = lines.slice(2).map(parseTableRow);
  const thead = `<thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${bodyRows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`,
    )
    .join('')}</tbody>`;
  return `<table>\n${thead}\n${tbody}\n</table>`;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const parts = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === '---') {
      parts.push('<hr />');
      index += 1;
      continue;
    }

    if (/^#{1,4}\s/.test(trimmed)) {
      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.replace(/^#+\s*/, '');
      parts.push(`<h${level}>${inlineMarkdown(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      parts.push(`<blockquote><p>${inlineMarkdown(quoteLines.join(' '))}</p></blockquote>`);
      continue;
    }

    if (isTableRow(trimmed)) {
      const tableLines = [];
      while (index < lines.length && isTableRow(lines[index].trim())) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      parts.push(renderTable(tableLines));
      continue;
    }

    if (trimmed.startsWith('- ')) {
      const items = [];
      while (index < lines.length) {
        const current = lines[index];
        const currentTrimmed = current.trim();
        if (currentTrimmed.startsWith('- ')) {
          items.push(currentTrimmed.replace(/^-+\s*/, ''));
          index += 1;
          continue;
        }
        if (items.length > 0 && /^\s{2,}\S/.test(current)) {
          items[items.length - 1] += ` ${currentTrimmed}`;
          index += 1;
          continue;
        }
        break;
      }
      parts.push(
        `<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`,
      );
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      lines[index].trim() !== '---' &&
      !/^#{1,4}\s/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith('> ') &&
      !lines[index].trim().startsWith('- ') &&
      !isTableRow(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    parts.push(`<p>${inlineMarkdown(paragraphLines.join(' '))}</p>`);
  }

  return parts.join('\n\n');
}

function renderCoverBlock(inner) {
  const lines = inner.trim().split('\n');
  const html = ['<div class="cover-block">'];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('# ')) {
      html.push(`<h1>${inlineMarkdown(t.slice(2))}</h1>`);
    } else if (t.startsWith('**') && t.endsWith('**')) {
      html.push(`<p><strong>${escapeHtml(t.slice(2, -2))}</strong></p>`);
    } else {
      html.push(`<p class="cover-meta">${inlineMarkdown(t)}</p>`);
    }
  }
  html.push('</div>');
  return html.join('\n');
}

function convertDocument(markdown) {
  const segments = [];
  let rest = markdown.replace(/\r\n/g, '\n');

  const coverMatch = rest.match(/^<div class="cover-block">([\s\S]*?)<\/div>\s*/);
  if (coverMatch) {
    segments.push(renderCoverBlock(coverMatch[1]));
    rest = rest.slice(coverMatch[0].length);
  }

  const pageBreak = '<div class="page-break"></div>';
  const chunks = rest.split(pageBreak);
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i].trim();
    if (chunk) {
      segments.push(markdownToHtml(chunk));
    }
    if (i < chunks.length - 1) {
      segments.push(pageBreak);
    }
  }

  return segments.join('\n\n');
}

async function buildHtmlDocument(body) {
  const css = await readFile(CSS_PATH, 'utf8');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Coach360 Manual Test Pack</title>
  <style>
${css}
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

const markdown = await readFile(SOURCE, 'utf8');
const body = convertDocument(markdown);
const html = await buildHtmlDocument(body);

for (const output of OUTPUTS) {
  await writeFile(output, html, 'utf8');
  console.log(`Wrote ${output.replace(`${ROOT}/`, '')}`);
}
