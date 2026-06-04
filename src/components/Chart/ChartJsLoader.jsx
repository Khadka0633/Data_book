
import { useEffect } from "react";

export default function ChartJsLoader() {
  useEffect(() => {
    if (window.Chart) return;
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);
  return null;
}
