import { api } from './apiClient';

export function getProfile(username) {
  return api.get(`/api/users/${encodeURIComponent(username)}`);
}

export function updateProfile({ displayName, bio, avatar }) {
  return api.put('/api/users/me', { displayName, bio, avatar });
}

export function followUser(userId) {
  return api.post(`/api/users/${userId}/follow`);
}

export function unfollowUser(userId) {
  return api.delete(`/api/users/${userId}/follow`);
}

export function searchUsers(query) {
  if (!query || query.length < 2) return Promise.resolve([]);
  return api.get(`/api/users/search?q=${encodeURIComponent(query)}`);
}

export function getFollowers(userId) {
  return api.get(`/api/users/${userId}/followers`);
}

export function getFollowing(userId) {
  return api.get(`/api/users/${userId}/following`);
}

export function getSuggested() {
  return api.get('/api/users/suggested');
}
