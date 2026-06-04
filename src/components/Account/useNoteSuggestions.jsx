import { useEffect, useState } from "react";


export default function useNoteSuggestions(entries, form) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  useEffect(() => {
    const query = form.note.trim().toLowerCase();
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const seen = new Set();
    const matches = entries
      .filter(
        (e) =>
          e.type === form.type &&
          (!form.category || e.category === form.category) &&
          e.note &&
          e.note.toLowerCase().includes(query) &&
          !seen.has(e.note) &&
          seen.add(e.note),
      )
      .slice(0, 5)
      .map((e) => e.note);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [form.note, form.type, form.category, entries]);
  return { suggestions, showSuggestions, setShowSuggestions };
}
