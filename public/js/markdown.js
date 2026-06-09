/**
 * MedRef Markdown Renderer
 * Lightweight parser for clinical text formatting.
 * Handles: headers, bold, italic, tables, lists, code, horizontal rules, emojis.
 */

export function renderMarkdown(text) {
  if (!text) return "";

  let html = escapeHtml(text);

  // Preserve the disclaimer footer with special styling
  html = html.replace(
    /⚕️ \*For licensed medical professional reference only\. Not a substitute for clinical examination, diagnostic testing, or professional judgment\.\*/g,
    `<div class="disclaimer-footer">⚕️ <em>For licensed medical professional reference only. Not a substitute for clinical examination, diagnostic testing, or professional judgment.</em></div>`
  );

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr style='border-color:var(--border);margin:12px 0;' />");

  // Bold + Italic combined
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic (single asterisk or underscore, not already replaced)
  html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Color severity tiers
  html = html.replace(/🟢 (FIRST[- ]LINE[^\n]*)/gi, '<span class="tier-green">🟢 $1</span>');
  html = html.replace(/🟡 (MODERATE[^\n]*)/gi, '<span class="tier-yellow">🟡 $1</span>');
  html = html.replace(/🔴 (SEVERE[^\n]*)/gi, '<span class="tier-red">🔴 $1</span>');

  // Tables — parse markdown table syntax
  html = parseMarkdownTables(html);

  // Unordered lists
  html = html.replace(/^(\s*)[•\-\*] (.+)$/gm, "$1<li>$2</li>");
  html = wrapListItems(html, "ul");

  // Ordered lists
  html = html.replace(/^(\s*)\d+\. (.+)$/gm, "$1<li>$2</li>");
  html = wrapListItems(html, "ol");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote style='border-left:3px solid var(--teal-dim);padding-left:12px;color:var(--text-secondary);margin:6px 0;'>$1</blockquote>");

  // Paragraphs — wrap consecutive non-tag lines
  html = wrapParagraphs(html);

  return html;
}

// ── Helpers ───────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseMarkdownTables(html) {
  // Match: header row | separator row | data rows
  const tableRegex = /^(\|.+\|)\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/gm;

  return html.replace(tableRegex, (match, headerRow, bodyRows) => {
    const headers = headerRow
      .split("|")
      .map((h) => h.trim())
      .filter(Boolean);

    const rows = bodyRows.trim().split("\n").map((row) =>
      row.split("|").map((c) => c.trim()).filter(Boolean)
    );

    const thHtml = headers.map((h) => `<th>${h}</th>`).join("");
    const tbodyHtml = rows
      .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("");

    return `<table><thead><tr>${thHtml}</tr></thead><tbody>${tbodyHtml}</tbody></table>`;
  });
}

function wrapListItems(html, tag) {
  // Find consecutive <li> blocks and wrap them
  return html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<${tag}>${match}</${tag}>`);
}

function wrapParagraphs(html) {
  const lines = html.split("\n");
  const result = [];
  let inParagraph = false;

  for (let line of lines) {
    const trimmed = line.trim();
    const isBlock = /^<(h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|blockquote|hr|pre|div)/.test(trimmed);

    if (!trimmed) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      continue;
    }

    if (isBlock) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push("<p>");
        inParagraph = true;
      } else {
        result.push(" ");
      }
      result.push(trimmed);
    }
  }

  if (inParagraph) result.push("</p>");

  return result.join("");
}
