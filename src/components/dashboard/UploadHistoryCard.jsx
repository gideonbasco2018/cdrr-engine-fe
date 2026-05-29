import { useState, useEffect, useCallback } from "react";
import { getDashboardUploadHistory } from "../../api/dashboard";
import { Card, CardHeader } from "./CardPrimitives";
import { FB } from "./constants";
import {
    getImpersonatedUserId,
    isImpersonating,
} from "../../api/auth";

const PAGE_SIZE = 10;

function StatusBadge({ count }) {
    return (
        <span
            style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 99,
                background: `${FB}18`,
                color: FB,
                whiteSpace: "nowrap",
            }}
        >
            {count.toLocaleString()} records
        </span>
    );
}

export default function UploadHistoryCard({ ui }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const fetchPage = useCallback(async (pageNum) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                limit: PAGE_SIZE,
                offset: (pageNum - 1) * PAGE_SIZE,
            };
            if (isImpersonating()) {
                params.impersonated_user_id = getImpersonatedUserId();
            }
            const res = await getDashboardUploadHistory(params);
            console.log("Upload history response:", res);
            setRows(res.data);
            // Support both `res.total` and `res.count` depending on your API
            setTotal(res.total ?? res.count ?? res.data.length);
        } catch (e) {
            setError(e?.response?.data?.detail || e.message || "Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(page);
    }, [fetchPage, page]);

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setPage(newPage);
    };

    const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

    return (
        <Card ui={ui}>
            <div style={{ borderBottom: `1px solid ${ui.divider}` }}>
                <CardHeader
                    title="Upload History"
                    sub="Batches you've uploaded via Excel import."
                    ui={ui}
                />
            </div>

            {/* ── Loading skeletons ── */}
            {loading &&
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "11px 16px",
                            borderBottom: i < PAGE_SIZE - 1 ? `1px solid ${ui.divider}` : "none",
                        }}
                    >
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: ui.progressBg, animation: "cdrrPulse 1.2s ease-in-out infinite", flexShrink: 0 }} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ width: 160, height: 10, borderRadius: 4, background: ui.progressBg, animation: "cdrrPulse 1.2s ease-in-out infinite" }} />
                            <div style={{ width: 100, height: 8, borderRadius: 4, background: ui.progressBg, animation: "cdrrPulse 1.2s ease-in-out infinite" }} />
                        </div>
                        <div style={{ width: 80, height: 20, borderRadius: 99, background: ui.progressBg, animation: "cdrrPulse 1.2s ease-in-out infinite", flexShrink: 0 }} />
                    </div>
                ))}

            {/* ── Error ── */}
            {!loading && error && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#e02020", fontSize: "0.82rem" }}>
                    ⚠️ {error}{" "}
                    <button
                        onClick={() => fetchPage(page)}
                        style={{ background: "none", border: "none", color: FB, cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, fontFamily: font }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── Empty ── */}
            {!loading && !error && rows.length === 0 && (
                <div style={{ padding: "2rem", textAlign: "center", color: ui.textMuted, fontSize: "0.82rem" }}>
                    No upload history found.
                </div>
            )}

            {/* ── Rows ── */}
            {!loading && !error && rows.map((row, i, arr) => {
                const dt = row.upload_date ? new Date(row.upload_date) : null;
                const dateStr = dt
                    ? dt.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                    : "—";
                const timeStr = dt
                    ? dt.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
                    : "";

                return (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "11px 16px",
                            borderBottom: i < arr.length - 1 ? `1px solid ${ui.divider}` : "none",
                            cursor: "default",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = ui.hoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                                style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: `${FB}18`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "1rem", flexShrink: 0,
                                }}
                            >
                                📤
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: "0.86rem", fontWeight: 600, color: ui.textPrimary }}>
                                    {dateStr}
                                    {timeStr && (
                                        <span style={{ marginLeft: 6, fontSize: "0.72rem", color: ui.textMuted, fontWeight: 400 }}>
                                            {timeStr}
                                        </span>
                                    )}
                                </p>
                                <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textSub }}>
                                    by {row.uploader}
                                </p>
                            </div>
                        </div>
                        <StatusBadge count={row.record_count} />
                    </div>
                );
            })}

            {/* ── Pagination ── */}
            {!loading && !error && totalPages > 1 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        borderTop: `1px solid ${ui.divider}`,
                        gap: 8,
                    }}
                >
                    <span style={{ fontSize: "0.74rem", color: ui.textMuted, fontFamily: font }}>
                        Page {page} of {totalPages}
                        {total > 0 && (
                            <span style={{ marginLeft: 6 }}>
                                · {total.toLocaleString()} total
                            </span>
                        )}
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {/* Prev */}
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: `1px solid ${page === 1 ? ui.cardBorder : ui.metricBorder}`,
                                background: "transparent",
                                color: page === 1 ? ui.textMuted : ui.textPrimary,
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                cursor: page === 1 ? "not-allowed" : "pointer",
                                opacity: page === 1 ? 0.4 : 1,
                                fontFamily: font,
                            }}
                        >
                            ‹ Prev
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: totalPages }, (_, pi) => {
                            const pageNum = pi + 1;
                            const show =
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                Math.abs(pageNum - page) <= 1;
                            const showEllipsisBefore = pageNum === page - 2 && pageNum > 1;
                            const showEllipsisAfter = pageNum === page + 2 && pageNum < totalPages;

                            if (!show && !showEllipsisBefore && !showEllipsisAfter) return null;
                            if (showEllipsisBefore || showEllipsisAfter)
                                return (
                                    <span key={pi} style={{ fontSize: "0.74rem", color: ui.textMuted, padding: "0 2px" }}>
                                        …
                                    </span>
                                );

                            const isActive = pageNum === page;
                            return (
                                <button
                                    key={pi}
                                    onClick={() => handlePageChange(pageNum)}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 6,
                                        border: `1px solid ${isActive ? FB : ui.cardBorder}`,
                                        background: isActive ? FB : "transparent",
                                        color: isActive ? "#fff" : ui.textPrimary,
                                        fontSize: "0.76rem",
                                        fontWeight: isActive ? 700 : 500,
                                        cursor: "pointer",
                                        fontFamily: font,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        {/* Next */}
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: `1px solid ${page === totalPages ? ui.cardBorder : ui.metricBorder}`,
                                background: "transparent",
                                color: page === totalPages ? ui.textMuted : ui.textPrimary,
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                cursor: page === totalPages ? "not-allowed" : "pointer",
                                opacity: page === totalPages ? 0.4 : 1,
                                fontFamily: font,
                            }}
                        >
                            Next ›
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
}