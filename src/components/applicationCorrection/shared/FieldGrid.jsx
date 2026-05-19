export function FieldGrid({ children, cols = 2 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}
