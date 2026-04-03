// components/EditOwnershipModal.tsx
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function EditOwnershipModal({ asset, onClose, onUpdated }) {
  const [splits, setSplits] = useState(asset.ownership);

  const total = splits.reduce((sum, s) => sum + Number(s.percent), 0);

  const handleChange = (index, value) => {
    const updated = [...splits];
    updated[index].percent = Number(value);
    setSplits(updated);
  };

  const handleSave = async () => {
    if (total !== 100) {
      toast.error("Total ownership must equal 100%");
      return;
    }

    await fetch(`/api/assets/${asset.id}/ownership`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splits }),
    });

    toast.success("Ownership updated (new version created)");
    onUpdated();
    onClose();
  };

  return (
    <div className="modal">
      <h2>Edit Ownership</h2>

      {splits.map((s, i) => (
        <div key={i} className="flex gap-2">
          <span>{s.userName}</span>
          <input
            type=" number."
            value={s.percent}
            onChange={(e) => handleChange(i, e.target.value)}
          />
        </div>
      ))}

      <p>Total: {total}%</p>

      <button onClick={handleSave}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}