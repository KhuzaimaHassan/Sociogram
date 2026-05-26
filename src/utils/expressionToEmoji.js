const expressionMap = {
  happy: '😍',
  surprised: '😮',
  sad: '😢',
  angry: '😠',
  fearful: '😨',
  disgusted: '🤢',
};

export const allReactionEmojis = ['😍', '😮', '😢', '😠', '😨', '🤢', '❤️', '🔥'];

export function expressionToEmoji(expression) {
  if (!expression || expression === 'neutral') return null;
  return expressionMap[expression] || null;
}

export function emojiToLabel(emoji) {
  const reverseMap = {
    '😍': 'Love',
    '😮': 'Wow',
    '😢': 'Sad',
    '😠': 'Angry',
    '😨': 'Scared',
    '🤢': 'Yuck',
    '❤️': 'Heart',
    '🔥': 'Fire',
  };
  return reverseMap[emoji] || 'React';
}

export default expressionToEmoji;
