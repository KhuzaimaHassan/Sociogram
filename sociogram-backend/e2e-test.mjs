/**
 * e2e-test.mjs — Full Sociogram API + flow test
 * Tests every user-facing flow end-to-end via real HTTP calls.
 */

const BASE = 'http://localhost:3001';
const FRONTEND = 'http://localhost:5173';

let passed = 0;
let failed = 0;
const errors = [];

function ok(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}
function fail(label, reason) {
  console.log(`  ❌  ${label}: ${reason}`);
  failed++;
  errors.push({ label, reason });
}

async function req(method, path, body, token, form = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !form) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body
      ? form
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  let data;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('\n══════════════════════════════════════════');
  console.log('   SOCIOGRAM — Full E2E Test Suite');
  console.log('══════════════════════════════════════════\n');

  // ── 1. Health ────────────────────────────────────────────
  console.log('▶ 1. Health check');
  const health = await req('GET', '/api/health');
  health.ok && health.data.status === 'ok'
    ? ok('GET /api/health → 200 ok')
    : fail('Health', JSON.stringify(health.data));

  // ── 2. Frontend serving ──────────────────────────────────
  console.log('\n▶ 2. Frontend');
  try {
    const fe = await fetch(FRONTEND);
    fe.ok
      ? ok(`Frontend at ${FRONTEND} → ${fe.status}`)
      : fail('Frontend', `Status ${fe.status}`);
  } catch (e) {
    fail('Frontend reachable', e.message);
  }

  // ── 3. Register new user ─────────────────────────────────
  console.log('\n▶ 3. Register');
  const ts = Date.now();
  const newUser = {
    username: `testuser${ts % 100000}`,
    email: `test${ts}@sociogram.test`,
    password: 'password123',
    displayName: 'Test User',
  };
  const reg = await req('POST', '/api/auth/register', newUser);
  if (reg.ok && reg.data.accessToken) {
    ok(`Register → 201, got accessToken`);
  } else if (reg.status === 409) {
    ok(`Register → 409 conflict (user already exists — OK for repeated runs)`);
  } else {
    fail('Register', JSON.stringify(reg.data));
  }

  // ── 4. Login with seed user ──────────────────────────────
  console.log('\n▶ 4. Login');
  const loginRes = await req('POST', '/api/auth/login', {
    email: 'demo@sociogram.app',
    password: 'password123',
  });
  if (!loginRes.ok || !loginRes.data.accessToken) {
    fail('Login', JSON.stringify(loginRes.data));
    console.log('\n❌ Cannot continue without a token. Stopping.\n');
    return;
  }
  ok(`Login → 200, user: ${loginRes.data.user.username}`);
  const token = loginRes.data.accessToken;
  const refreshToken = loginRes.data.refreshToken;
  const userId = loginRes.data.user.id;

  // ── 5. Get /me ───────────────────────────────────────────
  console.log('\n▶ 5. Auth /me');
  const me = await req('GET', '/api/auth/me', null, token);
  me.ok && me.data.username
    ? ok(`/me → username: ${me.data.username}, posts: ${me.data._count?.posts}`)
    : fail('/me', JSON.stringify(me.data));

  // ── 6. Refresh token ─────────────────────────────────────
  console.log('\n▶ 6. Token refresh');
  const refresh = await req('POST', '/api/auth/refresh', { refreshToken });
  refresh.ok && refresh.data.accessToken
    ? ok(`Token refresh → got new accessToken`)
    : fail('Token refresh', JSON.stringify(refresh.data));
  const freshToken = refresh.data.accessToken || token;

  // ── 7. Feed ──────────────────────────────────────────────
  console.log('\n▶ 7. Feed');
  const feed = await req('GET', '/api/posts/feed?limit=10', null, freshToken);
  if (feed.ok && Array.isArray(feed.data.posts)) {
    ok(`Feed → ${feed.data.posts.length} posts, nextCursor: ${feed.data.nextCursor}`);
    if (feed.data.posts.length > 0) {
      const p = feed.data.posts[0];
      const hasFields = 'likes' in p && 'comments' in p && 'reactions' in p && 'liked' in p;
      hasFields
        ? ok(`Feed post shape: id, likes, comments, reactions, liked ✓`)
        : fail('Feed post shape', `Missing fields. Got: ${Object.keys(p).join(', ')}`);
    }
  } else {
    fail('Feed', JSON.stringify(feed.data));
  }

  // ── 8. Explore ───────────────────────────────────────────
  console.log('\n▶ 8. Explore');
  const explore = await req('GET', '/api/posts/explore?limit=10', null, freshToken);
  explore.ok && Array.isArray(explore.data.posts)
    ? ok(`Explore → ${explore.data.posts.length} posts`)
    : fail('Explore', JSON.stringify(explore.data));

  // ── 9. Create post ───────────────────────────────────────
  console.log('\n▶ 9. Create post');
  const createRes = await req('POST', '/api/posts', {
    caption: '🔥 E2E test post — automated',
    location: 'Test City',
    isReel: false,
  }, freshToken);
  let newPostId = null;
  if (createRes.ok && createRes.data.id) {
    ok(`Create post → id: ${createRes.data.id}`);
    newPostId = createRes.data.id;
  } else if (createRes.status === 415) {
    // multipart required — try form
    const fd = new FormData();
    fd.append('caption', '🔥 E2E test post — form');
    const createForm = await req('POST', '/api/posts', fd, freshToken, true);
    createForm.ok && createForm.data.id
      ? (ok(`Create post (form) → id: ${createForm.data.id}`), newPostId = createForm.data.id)
      : fail('Create post', JSON.stringify(createForm.data));
  } else {
    fail('Create post', `${createRes.status}: ${JSON.stringify(createRes.data)}`);
  }

  // ── 10. Like a post ──────────────────────────────────────
  console.log('\n▶ 10. Like / Unlike');
  const postToLike = feed.data?.posts?.[0]?.id || newPostId;
  if (postToLike) {
    const likeRes = await req('POST', `/api/posts/${postToLike}/like`, null, freshToken);
    if (likeRes.ok) {
      ok(`Like post → liked: ${likeRes.data.liked}, count: ${likeRes.data.likes}`);
    } else if (likeRes.status === 409) {
      ok(`Like → already liked (idempotent OK)`);
    } else {
      fail('Like post', JSON.stringify(likeRes.data));
    }
    const unlikeRes = await req('DELETE', `/api/posts/${postToLike}/like`, null, freshToken);
    unlikeRes.ok
      ? ok(`Unlike post → liked: ${unlikeRes.data.liked}, count: ${unlikeRes.data.likes}`)
      : fail('Unlike post', JSON.stringify(unlikeRes.data));
  } else {
    fail('Like/Unlike', 'No post available to like');
  }

  // ── 11. Reactions ────────────────────────────────────────
  console.log('\n▶ 11. Reactions');
  const postToReact = feed.data?.posts?.[0]?.id || newPostId;
  if (postToReact) {
    const reactRes = await req('POST', `/api/posts/${postToReact}/react`, { emoji: '😍', source: 'manual' }, freshToken);
    reactRes.ok
      ? ok(`React → myReaction: ${reactRes.data.myReaction}, reactions: ${JSON.stringify(reactRes.data.reactions)}`)
      : fail('React to post', JSON.stringify(reactRes.data));

    const clearRes = await req('DELETE', `/api/posts/${postToReact}/react`, null, freshToken);
    clearRes.ok
      ? ok(`Clear reaction → myReaction: ${clearRes.data.myReaction}`)
      : fail('Clear reaction', JSON.stringify(clearRes.data));
  } else {
    fail('Reactions', 'No post available');
  }

  // ── 12. Comments ─────────────────────────────────────────
  console.log('\n▶ 12. Comments');
  const postToComment = feed.data?.posts?.[0]?.id || newPostId;
  if (postToComment) {
    const addComment = await req('POST', `/api/posts/${postToComment}/comments`, { text: 'Amazing! 🔥 automated test' }, freshToken);
    if (addComment.ok && addComment.data.id) {
      ok(`Add comment → id: ${addComment.data.id}, text: "${addComment.data.text}"`);
      const commentId = addComment.data.id;

      const getComments = await req('GET', `/api/posts/${postToComment}/comments`, null, freshToken);
      getComments.ok && Array.isArray(getComments.data.comments)
        ? ok(`Get comments → ${getComments.data.comments.length} comments`)
        : fail('Get comments', JSON.stringify(getComments.data));

      const delComment = await req('DELETE', `/api/comments/${commentId}`, null, freshToken);
      delComment.ok
        ? ok(`Delete comment → ${delComment.data.message}`)
        : fail('Delete comment', JSON.stringify(delComment.data));
    } else {
      fail('Add comment', JSON.stringify(addComment.data));
    }
  }

  // ── 13. User search ──────────────────────────────────────
  console.log('\n▶ 13. User search');
  const search = await req('GET', '/api/users/search?q=alex', null, freshToken);
  if (search.ok && Array.isArray(search.data)) {
    ok(`Search "alex" → ${search.data.length} users: ${search.data.map(u => u.username).join(', ')}`);
  } else {
    fail('User search', JSON.stringify(search.data));
  }

  // ── 14. Get profile ──────────────────────────────────────
  console.log('\n▶ 14. Profile');
  const profile = await req('GET', '/api/users/alex.wanderer', null, freshToken);
  if (profile.ok && profile.data.username) {
    ok(`Profile alex.wanderer → ${profile.data._count?.posts} posts, ${profile.data._count?.followers} followers`);
    const hasPosts = Array.isArray(profile.data.posts);
    hasPosts
      ? ok(`Profile posts grid → ${profile.data.posts.length} posts`)
      : fail('Profile posts', 'posts array missing');
  } else {
    fail('Get profile', JSON.stringify(profile.data));
  }

  // ── 15. Update profile ───────────────────────────────────
  console.log('\n▶ 15. Update profile');
  const updProfile = await req('PUT', '/api/users/me', {
    displayName: 'Demo User ✨',
    bio: '👋 Testing Sociogram!\n🎭 Expression reactions are cool',
    avatar: '😎',
  }, freshToken);
  updProfile.ok && updProfile.data.username
    ? ok(`Update profile → displayName: "${updProfile.data.displayName}"`)
    : fail('Update profile', JSON.stringify(updProfile.data));

  // ── 16. Follow / Unfollow ────────────────────────────────
  console.log('\n▶ 16. Follow / Unfollow');
  const targetProfile = await req('GET', '/api/users/chef.maya', null, freshToken);
  if (targetProfile.ok) {
    const targetId = targetProfile.data.id;
    const followRes = await req('POST', `/api/users/${targetId}/follow`, null, freshToken);
    if (followRes.ok || followRes.status === 409) {
      ok(`Follow chef.maya → ${followRes.status === 409 ? 'already following' : 'now following'}`);
    } else {
      fail('Follow user', JSON.stringify(followRes.data));
    }
    const unfollowRes = await req('DELETE', `/api/users/${targetId}/follow`, null, freshToken);
    unfollowRes.ok
      ? ok(`Unfollow chef.maya → following: ${unfollowRes.data.following}`)
      : fail('Unfollow user', JSON.stringify(unfollowRes.data));
  } else {
    fail('Follow/Unfollow', 'Could not get chef.maya profile');
  }

  // ── 17. Delete test post ─────────────────────────────────
  if (newPostId) {
    console.log('\n▶ 17. Delete test post');
    const delPost = await req('DELETE', `/api/posts/${newPostId}`, null, freshToken);
    delPost.ok
      ? ok(`Delete post → ${delPost.data.message}`)
      : fail('Delete post', JSON.stringify(delPost.data));
  }

  // ── Summary ──────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(`   Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════');
  if (errors.length > 0) {
    console.log('\nFailed tests:');
    errors.forEach((e) => console.log(`  ✗ ${e.label}: ${e.reason}`));
  } else {
    console.log('\n🎉 All tests passed!');
  }
  console.log();
}

run().catch(console.error);
