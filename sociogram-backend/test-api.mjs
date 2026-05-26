// Quick API test script
const BASE = 'http://localhost:3001';

async function test(label, method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    console.log(`\n[${res.status}] ${label}`);
    console.log(JSON.stringify(data, null, 2).slice(0, 500));
    return { ok: res.ok, data, status: res.status };
  } catch (e) {
    console.log(`\n[ERROR] ${label}: ${e.message}`);
    return { ok: false };
  }
}

async function run() {
  console.log('=== Sociogram API Tests ===\n');

  // 1. Health
  await test('Health', 'GET', '/api/health');

  // 2. Login
  const loginRes = await test('Login', 'POST', '/api/auth/login', {
    email: 'demo@sociogram.app',
    password: 'password123',
  });

  if (!loginRes.ok) {
    console.log('\nLogin failed — stopping further tests');
    return;
  }

  const token = loginRes.data.accessToken;
  console.log('\nAccess token:', token?.slice(0, 40) + '...');

  // 3. Get Me
  await test('Get /me', 'GET', '/api/auth/me', null, token);

  // 4. Get Feed
  await test('Feed', 'GET', '/api/posts/feed', null, token);

  // 5. Get Explore
  await test('Explore', 'GET', '/api/posts/explore', null, token);

  // 6. Search users
  await test('Search users', 'GET', '/api/users/search?q=alex', null, token);

  // 7. Get profile
  await test('Profile: alex.wanderer', 'GET', '/api/users/alex.wanderer', null, token);
}

run();
