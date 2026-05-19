"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("APP CRASHED:", error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', color: 'red', fontFamily: 'monospace', background: 'black', height: '100vh' }}>
      <h2>Something went wrong!</h2>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '1rem', background: '#222', padding: '1rem' }}>
        {error.name}: {error.message}
        {"\n\n"}
        {error.stack}
      </pre>
      <button
        onClick={() => reset()}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  );
}
