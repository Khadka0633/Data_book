
import { useState, useEffect, useCallback } from "react";
const EXCHANGE_API_KEY = "4bb84711891658fe0cf10aa7";
let _ratesCache = null;
let _ratesCacheTime = 0;



export default function useExchangeRates() {
  const [rates, setRates] = useState(null);

  useEffect(() => {
    const load = async () => {
      const now = Date.now();
      if (_ratesCache && now - _ratesCacheTime < 3_600_000) {
        setRates(_ratesCache);
        return;
      }
      try {
        const res = await fetch(
          `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/NPR`,
        );
        const data = await res.json();
        if (data.result === "success") {
          _ratesCache = data.conversion_rates;
          _ratesCacheTime = now;
          setRates(data.conversion_rates);
        }
      } catch (err) {
        console.error("Exchange rate fetch failed:", err);
      }
    };
    load();
  }, []);

  const toNPR = useCallback(
    (amount, fromCurrency) => {
      if (!rates || fromCurrency === "NPR") return amount;
      const rate = rates[fromCurrency];
      if (!rate) return amount;
      return amount / rate;
    },
    [rates],
  );

  const format = useCallback((amount, currency = "NPR") => {
    const meta = CURRENCY_MAP[currency];
    const flag = meta?.flag || "";
    return `${flag} ${currency} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  return { rates, toNPR, format };
}

