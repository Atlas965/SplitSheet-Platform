// pages/notifications.tsx
import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("/api/notifications")
      .then(res => res.json())
      .then(setItems);
  }, []);

  return (
    <div>
      <h1>Notifications</h1>

      {items.map((n, i) => (
        <div key={i} className="card">
          <p>{n.message}</p>
          <span>{new Date(n.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}