// FILE: src/components/TawkChat.jsx
import { useEffect, useState, useRef } from "react";

function TawkChat() {
  const [closed, setClosed] = useState(false);
  const [ready, setReady] = useState(false); // fully loaded na ang Tawk_API
  const pollRef = useRef(null);

  useEffect(() => {
    if (closed) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // ── Opisyal na Tawk callback — sisiguraduhing fully loaded na
    //    ang widget (at gumagana na ang hideWidget/showWidget) ──────
    const prevOnLoad = window.Tawk_API.onLoad;
    window.Tawk_API.onLoad = function () {
      if (typeof prevOnLoad === "function") prevOnLoad();
      setReady(true);
    };

    // Kung na-load na dati (galing sa ibang page navigation), agad
    // na ipakita ulit at markahan bilang ready.
    if (window.Tawk_API.hideWidget && window.Tawk_API.showWidget) {
      setReady(true);
      window.Tawk_API.showWidget();
    } else {
      const s1 = document.createElement("script");
      const s0 = document.getElementsByTagName("script")[0];
      s1.async = true;
      s1.src = "https://embed.tawk.to/6a56db44d45ecd1d4e159963/1jthkh0tm";
      s1.charset = "UTF-8";
      s1.setAttribute("crossorigin", "*");
      s0.parentNode.insertBefore(s1, s0);

      // Fallback: kung sakaling hindi tumawag ang onLoad (rare, pero
      // safety net), i-poll natin kada 300ms hanggang lumabas ang
      // hideWidget function sa Tawk_API.
      pollRef.current = setInterval(() => {
        if (window.Tawk_API?.hideWidget) {
          setReady(true);
          clearInterval(pollRef.current);
        }
      }, 300);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      // Itago (huwag burahin) ang widget kapag umalis sa page —
      // ligtas ito tawagin dahil ready na ito nung tumakbo cleanup.
      window.Tawk_API?.hideWidget?.();
    };
  }, [closed]);

  const handleClose = () => {
    window.Tawk_API?.hideWidget?.();
    setClosed(true);
  };

  if (closed || !ready) return null;

  return (
    <button
      onClick={handleClose}
      title="Close chat widget"
      style={{
        position: "fixed",
        bottom: 88,
        right: 22,
        zIndex: 100000,
        width: 26,
        height: 26,
        borderRadius: "50%",
        border: "none",
        background: "#e02020",
        color: "#fff",
        fontSize: "14px",
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        lineHeight: 1,
      }}
    >
      ✕
    </button>
  );
}

export default TawkChat;
