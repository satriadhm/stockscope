export default function Loading(): React.ReactElement {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid #1e3a52",
          borderTopColor: "var(--color-primary)",
          borderRadius: "50%",
          animation: "rti-spin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes rti-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
