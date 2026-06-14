import React from 'react';

type EmptyStateType = 'search' | 'filter' | 'error';

// New API (research-driven redesign)
interface NewEmptyStateProps {
  type: EmptyStateType;
  query?: string;
  onAction: () => void;
}

// Old API (pre-existing components - Dashboard, ScreenerTable)
interface OldEmptyStateProps {
  icon: string;
  message: string;
  subMessage: string;
  handleReset?: () => void;
}

type EmptyStateProps = NewEmptyStateProps | OldEmptyStateProps;

const EMPTY_STATES = {
  search: {
    icon: '🔍',
    title: (q: string) => `No results for "${q}"`,
    body: 'Try a different ticker or company name.',
    action: 'Clear search',
  },
  filter: {
    icon: '📊',
    title: () => 'No stocks match your filters',
    body: 'Try adjusting or resetting your filters to see more results.',
    action: 'Reset filters',
  },
  error: {
    icon: '⚠️',
    title: () => 'Something went wrong',
    body: "We couldn't load the data. Please try again.",
    action: 'Try again',
  },
};

export function EmptyState(props: EmptyStateProps) {
  // Detect which API is being used based on prop presence
  const isNewApi = 'type' in props && !('icon' in props);
  
  if (isNewApi) {
    const { type, query, onAction } = props as NewEmptyStateProps;
    const state = EMPTY_STATES[type];
    return (
      <div className="
        flex flex-col items-center
        justify-center py-16 px-6
        text-center animate-fade-in
      ">
        <span className="text-5xl mb-4" aria-hidden="true">
          {state.icon}
        </span>
        <h3 className="
          text-base font-semibold
          text-text-primary mb-2
        ">
          {state.title(query ?? '')}
        </h3>
        <p className="
          text-sm text-text-secondary
          max-w-xs mb-6
        ">
          {state.body}
        </p>
        <button
          onClick={onAction}
          className="
            px-4 py-2 rounded-lg
            bg-brand-dim text-brand
            text-sm font-medium
            hover:bg-brand hover:text-white
            transition-all duration-150
          ">
          {state.action}
        </button>
      </div>
    );
  } else {
    // Old API support (Dashboard, ScreenerTable)
    const { icon, message, subMessage, handleReset } = props as OldEmptyStateProps;
    return (
      <div className="
        flex flex-col items-center
        justify-center py-16 px-6
        text-center animate-fade-in
      ">
        <div className="material-symbols-outlined text-5xl mb-4 text-text-secondary" aria-hidden="true">
          {icon}
        </div>
        <h3 className="
          text-base font-semibold
          text-text-primary mb-2
        ">
          {message}
        </h3>
        <p className="
          text-sm text-text-secondary
          max-w-xs mb-6
        ">
          {subMessage}
        </p>
        {handleReset && (
          <button
            onClick={handleReset}
            className="
              px-4 py-2 rounded-lg
              bg-brand-dim text-brand
              text-sm font-medium
              hover:bg-brand hover:text-white
              transition-all duration-150
            ">
            Try again
          </button>
        )}
      </div>
    );
  }
}
