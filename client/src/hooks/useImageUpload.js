import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadImages, getImage } from '../api/imageApi';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
// Browsers frequently report an empty or wrong mimetype for .heic files, so we
// also allow-list by extension as a fallback for the client-side check.
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

function hasAllowedExtension(fileName) {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Client-side format validation (Rule 2, first line of defense). This is a UX
 * convenience only — the server re-validates from magic bytes, since a client
 * check can always be bypassed.
 */
export function isSupportedImageFile(file) {
  return ALLOWED_MIME_TYPES.includes(file.type) || hasAllowedExtension(file.name);
}

/**
 * Drives the whole upload UX:
 *  - holds one entry per selected file, each with a local id/preview/status
 *  - rejects unsupported formats immediately, client-side
 *  - uploads the rest, then polls each PENDING/PROCESSING image until it
 *    resolves to ACCEPTED/REJECTED (real-time-ish feedback without a socket)
 */
export function useImageUpload() {
  const [items, setItems] = useState([]); // { localId, file, previewUrl, serverId, status, reasons, progress }
  const pollTimers = useRef({});

  useEffect(() => {
    return () => {
      // stop any in-flight polls and free object URLs on unmount
      Object.values(pollTimers.current).forEach(clearTimeout);
      items.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateItem = useCallback((localId, patch) => {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  }, []);

  const pollUntilResolved = useCallback(
    (localId, serverId, startedAt = Date.now()) => {
      pollTimers.current[localId] = setTimeout(async () => {
        try {
          const image = await getImage(serverId);
          if (image.status === 'ACCEPTED' || image.status === 'REJECTED') {
            updateItem(localId, { status: image.status, reasons: image.rejectionReasons || [] });
            return;
          }
          if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
            updateItem(localId, { status: 'TIMED_OUT', reasons: [] });
            return;
          }
          pollUntilResolved(localId, serverId, startedAt);
        } catch (err) {
          updateItem(localId, { status: 'ERROR', reasons: [err.message] });
        }
      }, POLL_INTERVAL_MS);
    },
    [updateItem]
  );

  const addFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList);
      const newItems = files.map((file) => ({
        localId: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        serverId: null,
        status: isSupportedImageFile(file) ? 'UPLOADING' : 'REJECTED',
        reasons: isSupportedImageFile(file) ? [] : ['INVALID_FORMAT'],
        progress: 0,
      }));

      setItems((prev) => [...newItems, ...prev]);

      const uploadable = newItems.filter((it) => it.status === 'UPLOADING');
      if (uploadable.length === 0) return;

      try {
        const results = await uploadImages(
          uploadable.map((it) => it.file),
          { onProgress: (pct) => uploadable.forEach((it) => updateItem(it.localId, { progress: pct })) }
        );

        results.forEach((result, idx) => {
          const localItem = uploadable[idx];
          if (result.status === 'REJECTED') {
            updateItem(localItem.localId, { status: 'REJECTED', reasons: result.reasons || [], serverId: result.id });
          } else {
            updateItem(localItem.localId, { status: 'PENDING', serverId: result.id, progress: 100 });
            pollUntilResolved(localItem.localId, result.id);
          }
        });
      } catch (err) {
        uploadable.forEach((it) => updateItem(it.localId, { status: 'ERROR', reasons: [err.message] }));
      }
    },
    [pollUntilResolved, updateItem]
  );

  const removeItem = useCallback((localId) => {
    clearTimeout(pollTimers.current[localId]);
    setItems((prev) => {
      const target = prev.find((it) => it.localId === localId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.localId !== localId);
    });
  }, []);

  const accepted = items.filter((it) => it.status === 'ACCEPTED');
  const rejected = items.filter((it) => it.status === 'REJECTED');
  const inProgress = items.filter((it) => !['ACCEPTED', 'REJECTED'].includes(it.status));

  return { items, accepted, rejected, inProgress, addFiles, removeItem };
}
