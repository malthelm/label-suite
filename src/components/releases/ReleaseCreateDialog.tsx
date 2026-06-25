"use client";

import { useState } from "react";
import { ReleaseForm } from "./ReleaseForm";

export function ReleaseCreateDialog({ artists }: { artists: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
      >
        + New Release
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold mb-4">New Release</h2>
        <ReleaseForm artists={artists} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}
