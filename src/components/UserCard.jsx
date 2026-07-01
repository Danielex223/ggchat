export default function UserCard({ user, onClick }) {
  return (
    <div className="chat-list-item" onClick={onClick}>
      <div className="avatar-placeholder">
        {user.online && <span className="online-dot" />}
      </div>
      <div className="chat-list-info">
        <p className="chat-list-name">{user.displayName}</p>
        <p className="chat-list-preview">{user.email}</p>
      </div>
    </div>
  );
}