import React from "react";

interface EmptyStateProps {
  message: string;
  subMessage?: string;
  icon?: string;
}

export function EmptyState({ message, subMessage, icon = "search_off" }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <span className="material-symbols-outlined text-6xl text-[--text-secondary] opacity-20 mb-4 block">
        {icon}
      </span>
      <p className="font-label text-sm uppercase tracking-widest text-[--text-secondary]">
        {message}
      </p>
      {subMessage && (
        <p className="font-sans text-sm text-[--text-secondary] opacity-60 mt-2">
          {subMessage}
        </p>
      )}
    </div>
  );
}
