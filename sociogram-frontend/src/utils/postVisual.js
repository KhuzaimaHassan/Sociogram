/**
 * postVisual.js
 *
 * Generates a deterministic gradient background + emoji for any post that
 * doesn't have a real mediaUrl. Uses the post's ID (or caption) as a seed so
 * the same post always gets the same visual — no random flickering.
 *
 * Zero dependency — pure JS string hashing.
 */

/** Fast 32-bit hash of any string → unsigned integer */
function hashStr(str = '') {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0; // keep 32-bit unsigned
  }
  return h;
}

// Curated gradient palette — 16 options that look great on dark backgrounds
const GRADIENTS = [
  'linear-gradient(135deg, #1a472a 0%, #2d5a3f 30%, #87CEEB 70%, #e0f0f0 100%)',   // mountain green/sky
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #e94560 60%, #f5a623 100%)',    // tokyo night
  'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',                  // purple dream
  'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 30%, #4a0080 60%, #8b00ff 100%)',   // deep space
  'linear-gradient(135deg, #006994 0%, #00a8cc 30%, #00d4aa 60%, #7fcdcd 100%)',    // ocean
  'linear-gradient(135deg, #1a1a1a 0%, #333333 30%, #ff4444 60%, #ff8800 100%)',    // fire
  'linear-gradient(135deg, #0d0d2b 0%, #1a0533 20%, #2d1b69 40%, #1dd1a1 60%, #0abde3 80%, #0d0d2b 100%)', // aurora
  'linear-gradient(135deg, #2d5016 0%, #4a7c23 30%, #7cb342 50%, #c5e1a5 100%)',   // forest
  'linear-gradient(135deg, #1a3a5c 0%, #4a90d9 30%, #ffffff 50%, #f5deb3 100%)',    // santorini
  'linear-gradient(135deg, #000011 0%, #0a0a2e 20%, #1a0533 40%, #2d1b69 60%, #000011 100%)', // galaxy
  'linear-gradient(135deg, #1a1a2e 0%, #e94560 30%, #ff6b6b 50%, #ffd93d 100%)',   // sunset
  'linear-gradient(135deg, #0d1117 0%, #161b22 30%, #238636 50%, #3fb950 100%)',   // code green
  'linear-gradient(135deg, #2c0a37 0%, #6b1d6b 40%, #cc44aa 70%, #ff88cc 100%)',   // neon pink
  'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',                 // deep teal
  'linear-gradient(135deg, #1a0000 0%, #3d0000 30%, #8b0000 60%, #ff4500 100%)',   // ember
  'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 30%, #00b4d8 60%, #90e0ef 100%)',  // neon blue
];

// Curated emojis — visually large and distinctive
const EMOJIS = [
  '🏔️', '🍣', '🎨', '🚀', '🐠', '🏋️', '🌌', '🌿',
  '🎸', '🌠', '🏛️', '⌨️', '🔭', '🎵', '🌊', '🦋',
  '🌸', '🔥', '⚡', '🎭', '🌙', '🏄', '🎬', '🦁',
];

/**
 * Returns { gradient, emoji } for a post based on its id (deterministic).
 * @param {object} post - must have at least { id, caption? }
 */
export function getPostVisual(post) {
  const seed = post?.id || post?.caption || 'default';
  const hash = hashStr(seed);
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const emoji = EMOJIS[(hash >> 4) % EMOJIS.length]; // use different bits for emoji
  return { gradient, emoji };
}

export default getPostVisual;
