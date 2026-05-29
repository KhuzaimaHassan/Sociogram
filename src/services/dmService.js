import { api } from './apiClient';

export async function getConversations() {
  const { data } = await api.get('/conversations');
  return data;
}

export async function getOrCreateConversation(userId) {
  const { data } = await api.post('/conversations', { userId });
  return data;
}

export async function getMessages(convId, cursor) {
  const params = cursor ? { cursor } : {};
  const { data } = await api.get(`/conversations/${convId}/messages`, { params });
  return data;
}

export async function sendMessage(convId, text) {
  const { data } = await api.post(`/conversations/${convId}/messages`, { text });
  return data;
}

export async function getUnreadCount() {
  const { data } = await api.get('/conversations/unread');
  return data.unread;
}
