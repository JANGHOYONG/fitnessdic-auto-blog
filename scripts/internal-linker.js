/**
 * 내부 링크 자동 삽입
 * insertInternalLinks(content, categoryId, currentSlug) → { content, links }
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertInternalLinks(content, categoryId, currentSlug) {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        categoryId,
        slug: { not: currentSlug },
      },
      select: { slug: true, title: true, category: { select: { slug: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });

    if (!posts.length) return { content, links: [] };

    const links = [];
    let result = content;
    let inserted = 0;

    for (const p of posts) {
      if (inserted >= 3) break;
      // 제목의 첫 5글자가 본문에 존재하면 링크 삽입
      const keyword = p.title.slice(0, 10).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${keyword}[^<]{0,20})`, 'i');
      if (regex.test(result) && !result.includes(`href="/${p.category.slug}/${p.slug}"`)) {
        result = result.replace(regex, `<a href="/${p.category.slug}/${p.slug}">$1</a>`);
        links.push({ slug: p.slug, title: p.title });
        inserted++;
      }
    }

    await prisma.$disconnect();
    return { content: result, links };
  } catch (e) {
    console.log(`  [internal-linker] 오류: ${e.message}`);
    await prisma.$disconnect();
    return { content, links: [] };
  }
}

module.exports = { insertInternalLinks };
