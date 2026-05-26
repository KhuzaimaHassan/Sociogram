/**
 * seed-prod.cjs — Production seed for Sociogram
 *
 * This is UPSERT-SAFE: running it multiple times won't create duplicates.
 * It uses createOrIgnore / upsert patterns so it's safe to run on every deploy.
 *
 * Run with: node prisma/seed-prod.cjs
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    username: 'demo.user',
    email: 'demo@sociogram.app',
    password: 'password123',
    displayName: 'Demo User',
    avatar: '😎',
    bio: '👋 Welcome to Sociogram!\n🎭 Expression reactions are on.',
  },
  {
    username: 'alex.wanderer',
    email: 'alex@sociogram.app',
    password: 'password123',
    displayName: 'Alex Wanderer',
    avatar: '🧗',
    bio: '🏔️ Mountain explorer\n📸 Landscape photography',
  },
  {
    username: 'chef.maya',
    email: 'maya@sociogram.app',
    password: 'password123',
    displayName: 'Chef Maya',
    avatar: '👩‍🍳',
    bio: '🍜 Food is love\n🎌 Tokyo-based chef',
  },
  {
    username: 'pixel.artist',
    email: 'pixel@sociogram.app',
    password: 'password123',
    displayName: 'Pixel Artist',
    avatar: '🎨',
    bio: '🖼️ Digital art every day\n✨ AI + human creativity',
  },
  {
    username: 'ocean.diver',
    email: 'ocean@sociogram.app',
    password: 'password123',
    displayName: 'Ocean Diver',
    avatar: '🤿',
    bio: '🌊 Exploring the deep\n🐠 Marine conservation',
  },
];

const DEMO_POSTS = [
  { username: 'alex.wanderer', caption: 'Summit vibes are unmatched. The Karakoram never disappoints 🏔️✨', location: 'K2 Base Camp, Pakistan' },
  { username: 'alex.wanderer', caption: 'Golden hour on the ridge 🌅', location: 'Hunza Valley, Pakistan' },
  { username: 'alex.wanderer', caption: 'Camping at 4,200m — worth every step 🏕️⭐', location: 'Fairy Meadows' },
  { username: 'chef.maya', caption: 'Matcha latte art ☕🍵', location: 'Kyoto, Japan' },
  { username: 'chef.maya', caption: 'Homemade ramen 🍜 — 12 hours of love', location: 'Tokyo, Japan' },
  { username: 'chef.maya', caption: 'Cherry blossom bento 🌸🍱', location: 'Osaka, Japan' },
  { username: 'pixel.artist', caption: 'New digital piece — "Aurora Dreams" 🌌', location: 'Studio' },
  { username: 'pixel.artist', caption: 'AI + human collab 🤖🎨', location: 'Online' },
  { username: 'ocean.diver', caption: 'Manta ray encounter 50m deep 🐟✨', location: 'Maldives' },
  { username: 'ocean.diver', caption: 'Coral restoration project update 🌊💙', location: 'Great Barrier Reef' },
];

async function main() {
  console.log('🌱 Seeding production database...\n');

  // ── 1. Upsert users ───────────────────────────────────────
  const createdUsers = {};
  for (const u of DEMO_USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { displayName: u.displayName, avatar: u.avatar, bio: u.bio },
      create: {
        username: u.username,
        email: u.email,
        password: hashed,
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio,
      },
    });
    createdUsers[u.username] = user;
    console.log(`  ✅  User: ${user.username}`);
  }

  // ── 2. Upsert posts (one per caption, identified by caption+userId) ──
  let postCount = 0;
  const createdPosts = [];
  for (const p of DEMO_POSTS) {
    const user = createdUsers[p.username];
    if (!user) continue;

    // Check if this caption already exists for this user
    const existing = await prisma.post.findFirst({
      where: { userId: user.id, caption: p.caption },
    });

    if (!existing) {
      const post = await prisma.post.create({
        data: {
          caption: p.caption,
          location: p.location,
          mediaUrl: null,
          mediaType: 'image',
          isReel: false,
          userId: user.id,
        },
      });
      createdPosts.push(post);
      postCount++;
    } else {
      createdPosts.push(existing);
    }
  }
  console.log(`\n  ✅  Posts: ${postCount} created (${DEMO_POSTS.length - postCount} already existed)`);

  // ── 3. Upsert follows ─────────────────────────────────────
  const followPairs = [
    ['demo.user', 'alex.wanderer'],
    ['demo.user', 'chef.maya'],
    ['demo.user', 'pixel.artist'],
    ['demo.user', 'ocean.diver'],
    ['alex.wanderer', 'chef.maya'],
    ['chef.maya', 'pixel.artist'],
  ];

  let followCount = 0;
  for (const [follower, following] of followPairs) {
    const f = createdUsers[follower];
    const t = createdUsers[following];
    if (!f || !t) continue;
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: f.id, followingId: t.id } },
      update: {},
      create: { followerId: f.id, followingId: t.id },
    });
    followCount++;
  }
  console.log(`  ✅  Follows: ${followCount}`);

  // ── 4. Sample likes on first 5 posts ─────────────────────
  const demoUser = createdUsers['demo.user'];
  const alexUser = createdUsers['alex.wanderer'];
  let likeCount = 0;
  for (const post of createdPosts.slice(0, 5)) {
    for (const liker of [demoUser, alexUser]) {
      if (!liker || liker.id === post.userId) continue;
      await prisma.like.upsert({
        where: { userId_postId: { userId: liker.id, postId: post.id } },
        update: {},
        create: { userId: liker.id, postId: post.id },
      });
      likeCount++;
    }
  }
  console.log(`  ✅  Likes: ${likeCount}`);

  // ── 5. Sample reactions ───────────────────────────────────
  const reactionData = [
    { username: 'demo.user', postIdx: 0, emoji: '😍' },
    { username: 'demo.user', postIdx: 3, emoji: '🔥' },
    { username: 'alex.wanderer', postIdx: 3, emoji: '😮' },
  ];

  let reactCount = 0;
  for (const r of reactionData) {
    const user = createdUsers[r.username];
    const post = createdPosts[r.postIdx];
    if (!user || !post) continue;
    await prisma.reaction.upsert({
      where: { userId_postId: { userId: user.id, postId: post.id } },
      update: { emoji: r.emoji },
      create: { userId: user.id, postId: post.id, emoji: r.emoji, source: 'manual' },
    });
    reactCount++;
  }
  console.log(`  ✅  Reactions: ${reactCount}`);

  // ── 6. Sample comments ────────────────────────────────────
  const commentData = [
    { username: 'demo.user', postIdx: 0, text: 'Incredible shot! 🏔️❤️' },
    { username: 'chef.maya', postIdx: 0, text: 'That view is unreal 😮' },
    { username: 'demo.user', postIdx: 3, text: 'This looks so good! ☕' },
  ];

  let commentCount = 0;
  for (const c of commentData) {
    const user = createdUsers[c.username];
    const post = createdPosts[c.postIdx];
    if (!user || !post) continue;
    // Check if comment already exists (by text + userId + postId)
    const existing = await prisma.comment.findFirst({
      where: { userId: user.id, postId: post.id, text: c.text },
    });
    if (!existing) {
      await prisma.comment.create({
        data: { userId: user.id, postId: post.id, text: c.text },
      });
      commentCount++;
    }
  }
  console.log(`  ✅  Comments: ${commentCount}`);

  console.log('\n🎉 Production seed complete!\n');
  console.log('📝 Demo login:');
  console.log('   Email:    demo@sociogram.app');
  console.log('   Password: password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
