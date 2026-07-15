// FILE: src/components/TawkChat.jsx
import { useEffect } from "react";

function TawkChat() {
  useEffect(() => {
    if (window.Tawk_API) {
      window.Tawk_API.showWidget?.();
      return;
    }

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    var s1 = document.createElement("script");
    var s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = "https://embed.tawk.to/6a56db44d45ecd1d4e159963/1jthkh0tm";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode.insertBefore(s1, s0);

    // ── Cleanup: itago ang widget kapag umalis sa page na ito ──
    return () => {
      window.Tawk_API?.hideWidget?.();
    };
  }, []);

  return null;
}

export default TawkChat;
