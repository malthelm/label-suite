"use client";

import { useState } from "react";
import { ArtistForm } from "./ArtistForm";

export function ArtistCreateDialog() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
      >
        + New Artist
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">New Artist</h2>
        <ArtistForm onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}
