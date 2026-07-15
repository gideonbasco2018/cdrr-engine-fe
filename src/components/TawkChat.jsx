// FILE: src/components/TawkChat.jsx
import { useEffect } from "react";

function TawkChat() {
  useEffect(() => {
    // Iwasan ma-duplicate yung script kung mag-re-render/mag-navigate
    if (window.Tawk_API) return;

    var Tawk_API = window.Tawk_API || {};
    var Tawk_LoadStart = new Date();

    var s1 = document.createElement("script");
    var s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = "https://embed.tawk.to/6a56db44d45ecd1d4e159963/1jthkh0tm";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode.insertBefore(s1, s0);
  }, []);

  return null;
}

export default TawkChat;
