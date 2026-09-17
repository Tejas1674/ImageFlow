import { useCallback, useRef, useState } from 'react';
import { useImageUpload } from '../hooks/useImageUpload.js';
import ImagePreviewCard from './ImagePreviewCard.jsx';

export default function ImageUploader() {
  const { items, accepted, rejected, inProgress, addFiles, removeItem } = useImageUpload();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (fileList) => {
      if (fileList && fileList.length > 0) addFiles(fileList);
    },
    [addFiles]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Photo upload</h1>
      <p style={{ color: '#666', marginTop: 0, marginBottom: 20 }}>
        JPEG, PNG, or HEIC. Photos are automatically checked for resolution, sharpness,
        duplicates, and a single clearly visible face.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#2255cc' : '#c9c9c9'}`,
          borderRadius: 14,
          padding: 40,
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#f0f5ff' : '#fafafa',
          transition: 'all 0.15s ease',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Drag & drop photos here, or click to browse</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
          {inProgress.length > 0 ? `${inProgress.length} in progress…` : 'You can select multiple files'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
      </div>

      {items.length === 0 ? null : (
        <>
          <Section title={`Accepted (${accepted.length})`}>
            {accepted.map((item) => (
              <ImagePreviewCard key={item.localId} item={item} onRemove={removeItem} />
            ))}
          </Section>

          <Section title={`Rejected (${rejected.length})`}>
            {rejected.map((item) => (
              <ImagePreviewCard key={item.localId} item={item} onRemove={removeItem} />
            ))}
          </Section>

          {inProgress.length > 0 && (
            <Section title={`In progress (${inProgress.length})`}>
              {inProgress.map((item) => (
                <ImagePreviewCard key={item.localId} item={item} onRemove={removeItem} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hasChildren) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{title}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 14,
        }}
      >
        {children}
      </div>
    </div>
  );
}
