// src/components/monitoring/evaluatorMonitoring/SortLabel.jsx
// Column title with a sort indicator:
//   not sorted  -> faint up/down arrows
//   sorted      -> a chevron (up = A-Z / low to high, down = reverse) and an ×
//                  that clears the sort
// It uses the colour of the text around it, so it stays neutral.
// align="right" puts the arrow before the text, so a right-aligned column title
// ends exactly where its numbers end.

export default function SortLabel({ text, active, dir, onClear, align = "left" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: align === "right" ? "row-reverse" : "row",
        alignItems: "center",
        gap: 6,
        color: active ? "var(--sort-ink, inherit)" : "inherit",
      }}
    >
      {text}
      {active ? (
        <>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            aria-label={dir === "asc" ? "Sorted ascending" : "Sorted descending"}
            style={{ transform: dir === "asc" ? "none" : "rotate(180deg)" }}
          >
            <polyline
              points="1.5,7 5,3 8.5,7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            role="button"
            tabIndex={0}
            title="Clear sort"
            aria-label="Clear sort"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onClear();
              }
            }}
            style={{
              cursor: "pointer",
              fontSize: "0.85rem",
              lineHeight: 1,
              opacity: 0.6,
            }}
          >
            ×
          </span>
        </>
      ) : (
        <svg
          width="10"
          height="11"
          viewBox="0 0 11 12"
          aria-hidden="true"
          style={{ opacity: 0.4 }}
        >
          <path
            d="M3 10V2M3 2L1 4M3 2L5 4M8 2V10M8 10L6 8M8 10L10 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
