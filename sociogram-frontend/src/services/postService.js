import { api } from './apiClient';

export function getFeed({ cursor, limit = 10 } = {}) {
  const qs = new URLSearchParams();
  if (cursor) qs.set('cursor', cursor);
  if (limit) qs.set('limit', String(limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  return api.get(`/api/posts/feed${suffix}`);
}

export function getExplore({ cursor, limit = 30 } = {}) {
  const qs = new URLSearchParams();
  if (cursor) qs.set('cursor', cursor);
  if (limit) qs.set('limit', String(limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  return api.get(`/api/posts/explore${suffix}`);
}

export function getPost(id) {
  return api.get(`/api/posts/${id}`);
}

export function deletePost(id) {
  return api.delete(`/api/posts/${id}`);
}

export function createPost({ caption, location, isReel, mediaFile }, onUploadProgress) {
  const fd = new FormData();
  if (caption) fd.append('caption', caption);
  if (location) fd.append('location', location);
  if (isReel) fd.append('isReel', String(isReel));
  if (mediaFile) fd.append('media', mediaFile);
  
  // Assuming api wrapper supports passing config as 3rd arg. 
  // If it's pure axios, it does.
  return api.post('/api/posts', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
}

export function likePost(id) {
  return api.post(`/api/posts/${id}/like`);
}
export function unlikePost(id) {
  return api.delete(`/api/posts/${id}/like`);
}

export function reactToPost(id, { emoji, source = 'manual' }) {
  return api.post(`/api/posts/${id}/react`, { emoji, source });
}
export function clearReaction(id) {
  return api.delete(`/api/posts/${id}/react`);
}

export function getComments(id, { cursor, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  if (cursor) qs.set('cursor', cursor);
  if (limit) qs.set('limit', String(limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  return api.get(`/api/posts/${id}/comments${suffix}`);
}

export function addComment(id, text) {
  return api.post(`/api/posts/${id}/comments`, { text });
}

export function deleteComment(id) {
  return api.delete(`/api/comments/${id}`);
}
