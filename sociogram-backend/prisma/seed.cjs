const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create demo users
  const password = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alex@demo.com' },
      update: {},
      create: { username: 'alex.wanderer', email: 'alex@demo.com', password, displayName: 'Alex Wanderer', bio: '🏔️ Mountain explorer\n📸 Landscape photography', avatar: '🧗' },
    }),
    prisma.user.upsert({
      where: { email: 'maya@demo.com' },
      update: {},
      create: { username: 'chef.maya', email: 'maya@demo.com', password, displayName: 'Chef Maya', bio: '👩‍🍳 Tokyo-based chef\n🍜 Ramen specialist', avatar: '👩‍🍳' },
    }),
    prisma.user.upsert({
      where: { email: 'neo@demo.com' },
      update: {},
      create: { username: 'neo.coder', email: 'neo@demo.com', password, displayName: 'Neo', bio: '💻 Full-stack dev\n🎮 Indie game maker', avatar: '🤖' },
    }),
    prisma.user.upsert({
      where: { email: 'luna@demo.com' },
      update: {},
      create: { username: 'luna.artist', email: 'luna@demo.com', password, displayName: 'Luna', bio: '🎨 Digital artist\n✨ Creating magic', avatar: '🎨' },
    }),
    prisma.user.upsert({
      where: { email: 'demo@sociogram.app' },
      update: {},
      create: { username: 'demo.user', email: 'demo@sociogram.app', password, displayName: 'Demo User', bio: '👋 Testing Sociogram!\n🎭 Expression reactions are cool', avatar: '😎' },
    }),
  ]);

  console.log(`  ✅ Created ${users.length} users`);

  // Create posts
  const postData = [
    { userId: users[0].id, caption: 'Summit vibes are unmatched. The Karakoram never disappoints 🏔️ ✨', location: 'Karakoram Range, Pakistan', isReel: false },
    { userId: users[1].id, caption: 'Fresh ramen from scratch — 12 hour broth 🍜🔥', location: 'Tokyo, Japan', isReel: false },
    { userId: users[2].id, caption: 'Just shipped v2.0 of my indie game! 🎮 The physics engine is insane now', isReel: false },
    { userId: users[3].id, caption: 'Digital painting session — cyberpunk cityscape 🌃', location: 'Studio', isReel: false },
    { userId: users[0].id, caption: 'Golden hour at 5000m elevation ☀️', location: 'Himalayas', isReel: true },
    { userId: users[1].id, caption: 'The art of knife skills 🔪✨', location: 'Tokyo, Japan', isReel: true },
    { userId: users[2].id, caption: 'Live coding a multiplayer lobby system 💻', isReel: true },
    { userId: users[3].id, caption: 'Watch me paint a galaxy 🌌', isReel: true },
    { userId: users[0].id, caption: 'Base camp life — coffee tastes different at altitude ☕', location: 'K2 Base Camp', isReel: false },
    { userId: users[1].id, caption: 'Matcha latte art ☕🍵', location: 'Kyoto, Japan', isReel: false },
  ];

  const posts = [];
  for (const data of postData) {
    const post = await prisma.post.create({ data });
    posts.push(post);
  }
  console.log(`  ✅ Created ${posts.length} posts`);

  // Create follows (demo user follows everyone)
  const demoUser = users[4];
  for (const user of users.slice(0, 4)) {
    await prisma.follow.create({
      data: { followerId: demoUser.id, followingId: user.id },
    }).catch(() => {}); // Ignore duplicates
  }
  // Some cross-follows
  await prisma.follow.create({ data: { followerId: users[0].id, followingId: users[1].id } }).catch(() => {});
  await prisma.follow.create({ data: { followerId: users[1].id, followingId: users[0].id } }).catch(() => {});
  await prisma.follow.create({ data: { followerId: users[2].id, followingId: users[3].id } }).catch(() => {});

  console.log('  ✅ Created follows');

  // Create some likes and reactions
  for (const post of posts.slice(0, 6)) {
    for (const user of users.slice(0, 3)) {
      await prisma.like.create({
        data: { userId: user.id, postId: post.id },
      }).catch(() => {});
    }
  }
  console.log('  ✅ Created likes');

  // Add some expression reactions
  const emojis = ['😍', '😮', '😢', '😠', '😂', '🔥'];
  for (let i = 0; i < 4; i++) {
    await prisma.reaction.create({
      data: {
        emoji: emojis[i % emojis.length],
        source: i % 2 === 0 ? 'expression' : 'manual',
        userId: users[i].id,
        postId: posts[i].id,
      },
    }).catch(() => {});
  }
  console.log('  ✅ Created reactions');

  // Add some comments
  const comments = [
    { text: 'Incredible shot! 📸', userId: users[1].id, postId: posts[0].id },
    { text: 'I need this recipe! 🤤', userId: users[0].id, postId: posts[1].id },
    { text: 'The physics look amazing!', userId: users[3].id, postId: posts[2].id },
    { text: 'Beautiful colors 🎨', userId: users[2].id, postId: posts[3].id },
  ];
  for (const c of comments) {
    await prisma.comment.create({ data: c });
  }
  console.log('  ✅ Created comments');

  console.log('\n🎉 Seed complete!');
  console.log('\n📝 Demo login credentials:');
  console.log('   Email: demo@sociogram.app');
  console.log('   Password: password123\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
