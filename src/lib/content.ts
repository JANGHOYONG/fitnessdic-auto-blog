// HTML 콘텐츠에서 h2 태그에 id 부여 + 목차 추출

export interface Heading { id: string; text: string; }

export function processContent(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const usedIds = new Set<string>();

  const processed = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    let id = text
      .replace(/[^가-힣a-z0-9\s]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 40)
      || `section-${headings.length + 1}`;

    // 중복 id 방지
    if (usedIds.has(id)) id = `${id}-${headings.length}`;
    usedIds.add(id);
    headings.push({ id, text });

    return `<h2 id="${id}">${inner}</h2>`;
  });

  return { html: processed, headings };
}
