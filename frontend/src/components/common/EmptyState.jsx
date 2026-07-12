export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty">
      {Icon && <div className="empty-icon"><Icon /></div>}
      <h3>{title}</h3>
      {description && <p style={{ fontSize: 13, marginBottom: 16 }}>{description}</p>}
      {action}
    </div>
  );
}
