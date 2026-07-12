export default function Badge({ value, className }) {
  if (!value) return null;
  const slug = String(value).toLowerCase().replace(/\s+/g, '_');
  const label = String(value).replace(/_/g, ' ');
  return (
    <span className={`badge badge-${slug} ${className || ''}`}>
      {label}
    </span>
  );
}
