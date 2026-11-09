import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';

const target = process.env.TEST_DATABASE_URL;
if (!target) throw new Error('Set TEST_DATABASE_URL to a disposable local PostgreSQL QA database');
const url = new URL(target);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !url.pathname.endsWith('_qa')) {
  throw new Error('Bookmark tests refuse databases outside loopback or without a _qa name');
}
process.env.DATABASE_URL = target;
process.env.JWT_SECRET = `qa-${randomUUID()}`;
const { default: prisma } = await import('../src/utils/prisma.js');
const { default: routes } = await import('../src/routes/postRoutes.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const prefix = `qa_${randomUUID().replaceAll('-', '')}`;
const ids = { alice: `${prefix}_a`, bob: `${prefix}_b`, private: `${prefix}_p` };
let server, base, posts;

async function request(path, { user = 'alice', method = 'GET' } = {}) {
  const headers = user ? { Authorization: `Bearer ${jwt.sign({ userId: ids[user] }, process.env.JWT_SECRET)}` } : {};
  const response = await fetch(`${base}/api/posts${path}`, { method, headers });
  return { status: response.status, data: await response.json() };
}

before(async () => {
  for (const [name, id] of Object.entries(ids)) {
    await prisma.user.create({ data: {
      id, username: `${prefix}_${name}`, email: `${prefix}_${name}@example.invalid`,
      password: 'unused-qa-fixture', isPrivate: name === 'private',
    } });
  }
  posts = [];
  for (let index = 0; index < 3; index += 1) {
    posts.push(await prisma.post.create({ data: { userId: ids.alice, caption: `QA public ${index}` } }));
  }
  const app = express();
  app.use('/api/posts', routes);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  await prisma.bookmark.deleteMany({ where: { userId: { in: Object.values(ids) } } });
  await prisma.follow.deleteMany({ where: { followerId: ids.alice } });
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test('saved collection and save/unsave routes require authentication', async () => {
  for (const [path, method] of [['/saved', 'GET'], [`/${posts[0].id}/save`, 'POST'], [`/${posts[0].id}/save`, 'DELETE']]) {
    assert.equal((await request(path, { method, user: null })).status, 401);
  }
});

test('concurrent saves persist one bookmark and hydrate saved state in post reads', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => request(`/${posts[0].id}/save`, { method: 'POST' })));
  assert.ok(results.every(result => result.status === 200 && result.data.saved === true));
  assert.equal(await prisma.bookmark.count({ where: { userId: ids.alice } }), 1);
  const detail = await request(`/${posts[0].id}`);
  assert.equal(detail.data.saved, true);
  assert.equal('bookmarks' in detail.data, false);
  const feed = await request('/feed');
  assert.equal(feed.data.posts.find(post => post.id === posts[0].id).saved, true);
  const explore = await request('/explore?limit=50');
  assert.equal(explore.data.posts.find(post => post.id === posts[0].id).saved, true);
});

test('a user cannot read or remove another account\'s saved collection', async () => {
  await request(`/${posts[0].id}/save`, { method: 'POST' });
  assert.deepEqual((await request(`/saved?userId=${ids.alice}`, { user: 'bob' })).data.posts, []);
  assert.equal((await request(`/${posts[0].id}`, { user: 'bob' })).data.saved, false);
  assert.equal((await request(`/${posts[0].id}/save`, { user: 'bob', method: 'DELETE' })).data.saved, false);
  assert.equal((await request('/saved')).data.posts.length, 1);
});

test('unsave persists and repeated unsaves are idempotent', async () => {
  await request(`/${posts[0].id}/save`, { method: 'POST' });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    assert.equal((await request(`/${posts[0].id}/save`, { method: 'DELETE' })).data.saved, false);
  }
  assert.deepEqual((await request('/saved')).data.posts, []);
  assert.equal((await request('/feed')).data.posts.find(post => post.id === posts[0].id).saved, false);
});

test('pagination does not skip or duplicate bookmarks sharing a timestamp', async () => {
  await prisma.bookmark.createMany({ data: posts.map(post => ({ userId: ids.alice, postId: post.id, createdAt: new Date('2026-01-01T00:00:00Z') })) });
  const first = await request('/saved?limit=2');
  assert.equal(first.status, 200);
  assert.equal(first.data.posts.length, 2);
  assert.ok(first.data.nextCursor);
  const second = await request(`/saved?limit=2&cursor=${first.data.nextCursor}`);
  assert.equal(second.data.posts.length, 1);
  assert.equal(second.data.nextCursor, null);
  assert.deepEqual(new Set([...first.data.posts, ...second.data.posts].map(post => post.id)), new Set(posts.map(post => post.id)));
});

test('invalid page limits and missing or foreign cursors do not expose data', async () => {
  for (const limit of ['0', '51', 'abc', '1.5']) assert.equal((await request(`/saved?limit=${limit}`)).status, 400);
  assert.equal((await request('/saved?cursor=missing')).status, 400);
  await prisma.bookmark.createMany({ data: posts.slice(0, 2).map(post => ({ userId: ids.bob, postId: post.id })) });
  const foreignCursor = (await request('/saved?limit=1', { user: 'bob' })).data.nextCursor;
  assert.ok(foreignCursor);
  assert.equal((await request(`/saved?cursor=${foreignCursor}`)).status, 400);
});

test('pagination continues if the previous page\'s last bookmark is removed', async () => {
  await prisma.bookmark.createMany({ data: posts.map(post => ({ userId: ids.alice, postId: post.id })) });
  const first = (await request('/saved?limit=2')).data;
  await request(`/${first.posts[1].id}/save`, { method: 'DELETE' });
  const second = await request(`/saved?limit=2&cursor=${first.nextCursor}`);
  assert.equal(second.status, 200);
  assert.equal(second.data.posts.length, 1);
  assert.ok(first.posts.every(post => post.id !== second.data.posts[0].id));
});

test('private posts require access to save and disappear after unfollowing', async () => {
  const privatePost = await prisma.post.create({ data: { userId: ids.private, caption: 'QA private post' } });
  assert.equal((await request(`/${privatePost.id}/save`, { method: 'POST' })).status, 404);
  await prisma.follow.create({ data: { followerId: ids.alice, followingId: ids.private } });
  assert.equal((await request(`/${privatePost.id}/save`, { method: 'POST' })).status, 200);
  assert.equal((await request('/saved')).data.posts.length, 1);
  await prisma.follow.deleteMany({ where: { followerId: ids.alice } });
  assert.deepEqual((await request('/saved')).data.posts, []);
  assert.equal(await prisma.bookmark.count({ where: { userId: ids.alice } }), 1);
});

test('missing posts are not saved and deleting a post cascades its bookmarks', async () => {
  assert.equal((await request('/missing-qa-post/save', { method: 'POST' })).status, 404);
  const post = await prisma.post.create({ data: { userId: ids.alice, caption: 'QA cascade post' } });
  await request(`/${post.id}/save`, { method: 'POST' });
  await prisma.post.delete({ where: { id: post.id } });
  assert.equal(await prisma.bookmark.count({ where: { postId: post.id } }), 0);
});

test('deleting a user cascades only that user\'s bookmarks', async () => {
  const user = await prisma.user.create({ data: { id: `${prefix}_delete`, username: `${prefix}_delete`, email: `${prefix}_delete@example.invalid`, password: 'unused-qa-fixture' } });
  await prisma.bookmark.create({ data: { userId: user.id, postId: posts[0].id } });
  await request(`/${posts[0].id}/save`, { method: 'POST' });
  await prisma.user.delete({ where: { id: user.id } });
  assert.equal(await prisma.bookmark.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.bookmark.count({ where: { userId: ids.alice } }), 1);
});
