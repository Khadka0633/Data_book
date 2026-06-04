



export default function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.92)} }`}</style>
      <span
        style={{
          fontSize: 40,
          color: "var(--accent)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      >
        ⬡
      </span>
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
    </div>
  );
}