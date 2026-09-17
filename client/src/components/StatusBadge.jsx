const STYLES = {
  ACCEPTED: { background: '#e6f4ea', color: '#1e7e34', label: 'Accepted' },
  REJECTED: { background: '#fdecea', color: '#c0392b', label: 'Rejected' },
  PENDING: { background: '#fff8e1', color: '#a66a00', label: 'Queued' },
  PROCESSING: { background: '#fff8e1', color: '#a66a00', label: 'Processing…' },
  UPLOADING: { background: '#e8eefc', color: '#2255cc', label: 'Uploading…' },
  ERROR: { background: '#fdecea', color: '#c0392b', label: 'Error' },
  TIMED_OUT: { background: '#f1f1f1', color: '#666', label: 'Taking longer than expected' },
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.PENDING;
  return (
    <span
      style={{
        background: style.background,
        color: style.color,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}
