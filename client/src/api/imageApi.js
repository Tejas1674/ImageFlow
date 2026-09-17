const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

/**
 * Uploads one or more files in a single multipart request.
 * Returns the array of { id, originalFileName, status, reasons? } from the server —
 * files rejected synchronously (bad format/size) come back REJECTED immediately;
 * everything else comes back PENDING and needs to be polled.
 */
export async function uploadImages(files, { onProgress } = {}) {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  // Using XHR instead of fetch here purely to get upload progress events.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/images`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body.results);
        } else {
          reject(new Error(body.message || `Upload failed (${xhr.status})`));
        }
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export async function getImage(id) {
  const res = await fetch(`${API_BASE}/images/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch image ${id}`);
  return res.json();
}

export async function listImages({ status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit, ...(status ? { status } : {}) });
  const res = await fetch(`${API_BASE}/images?${params}`);
  if (!res.ok) throw new Error('Failed to list images');
  return res.json();
}

export async function deleteImage(id) {
  const res = await fetch(`${API_BASE}/images/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete image');
}
