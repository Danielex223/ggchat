export default function Avatar({ user, size = "medium", showOnlineDot = false }) {
  const sizeClass = size === "large" ? "large" : size === "small" ? "small" : "";

  return (
    <div className={`avatar-placeholder ${sizeClass}`}>
      {user?.photoURL ? (
        <img src={user.photoURL} alt={user.displayName || "avatar"} className="avatar-img" />
      ) : null}
      {showOnlineDot && user?.online && <span className="online-dot" />}
    </div>
  );
}