"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>שגיאה</h1>
        <pre style={{ whiteSpace: "pre-wrap", color: "red", fontSize: 14 }}>
          {error.message}
        </pre>
        <pre style={{ whiteSpace: "pre-wrap", color: "#666", fontSize: 12 }}>
          {error.stack}
        </pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: "10px 20px" }}>
          נסה שוב
        </button>
      </body>
    </html>
  );
}
