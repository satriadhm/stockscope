import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060d18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
        color: '#e8f4f8',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 700, marginBottom: 8 }}>
          404
        </h1>
        <p style={{ color: '#a8c8e8', marginBottom: 24, maxWidth: 360, lineHeight: 1.6 }}>
          This page does not exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#2a9d8f',
            color: '#fff',
            borderRadius: 10,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
