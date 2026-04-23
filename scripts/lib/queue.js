/**
 * 상태 전이 관리
 * DRAFT → QUALITY_REJECTED | REVIEW_REQUIRED
 * REVIEW_REQUIRED → APPROVED | DRAFT
 * APPROVED → PUBLISHED
 * PUBLISHED → ARCHIVED
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const VALID_STATUSES = ['DRAFT', 'QUALITY_REJECTED', 'REVIEW_REQUIRED', 'APPROVED', 'PUBLISHED', 'ARCHIVED'];

const TRANSITIONS = {
  DRAFT:             ['REVIEW_REQUIRED', 'QUALITY_REJECTED'],
  QUALITY_REJECTED:  ['DRAFT'],
  REVIEW_REQUIRED:   ['APPROVED', 'DRAFT'],
  APPROVED:          ['PUBLISHED'],
  PUBLISHED:         ['ARCHIVED'],
  ARCHIVED:          [],
};

async function transition(postId, toStatus, notes = null) {
  if (!VALID_STATUSES.includes(toStatus)) {
    throw new Error(`Invalid status: ${toStatus}`);
  }

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { status: true } });
  if (!post) throw new Error(`Post ${postId} not found`);

  const allowed = TRANSITIONS[post.status] || [];
  if (!allowed.includes(toStatus)) {
    throw new Error(`Cannot transition from ${post.status} to ${toStatus}`);
  }

  const updateData = { status: toStatus };
  if (notes) updateData.reviewNotes = notes;
  if (toStatus === 'PUBLISHED') updateData.publishedAt = new Date();

  return prisma.post.update({ where: { id: postId }, data: updateData });
}

module.exports = { transition, VALID_STATUSES, TRANSITIONS };
