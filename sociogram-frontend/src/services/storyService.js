import { api, API_BASE_URL, tokenStore } from './apiClient';

export async function getStories() {
  const { data } = await api.get('/stories');
  return data;
}

export async function viewStory(storyId) {
  const { data } = await api.post(`/stories/${storyId}/view`);
  return data;
}

export async function deleteStory(storyId) {
  const { data } = await api.delete(`/stories/${storyId}`);
  return data;
}

/** Upload a story with progress tracking (XHR-based). */
export function createStory(file, caption, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('media', file);
    if (caption?.trim()) formData.append('caption', caption.trim());

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 95));
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { resolve({}); }
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed')); }
        catch { reject(new Error(`Upload failed (${xhr.status})`)); }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('POST', `${API_BASE_URL}/api/stories`);
    const token = tokenStore.getAccess();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
