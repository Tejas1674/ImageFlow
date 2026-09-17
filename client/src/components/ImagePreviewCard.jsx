import StatusBadge from './StatusBadge.jsx';
import { describeReason } from './reasonLabels.js';

export default function ImagePreviewCard({ item, onRemove }) {
  const { file, previewUrl, status, reasons, progress } = item;

  return (
    <div
      style={{
        border: '1px solid #e2e2e2',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#f5f5f5' }}>
        <img
          src={previewUrl}
          alt={file.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {(status === 'UPLOADING' || status === 'PENDING' || status === 'PROCESSING') && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
              {status === 'UPLOADING' ? `${progress}%` : 'Validating…'}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span
            title={file.name}
            style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {file.name}
          </span>
          <StatusBadge status={status} />
        </div>

        {reasons?.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#c0392b' }}>
            {reasons.map((r) => (
              <li key={r}>{describeReason(r)}</li>
            ))}
          </ul>
        )}

        <button
          onClick={() => onRemove(item.localId)}
          style={{
            marginTop: 4,
            fontSize: 12,
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
