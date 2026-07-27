import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable (e.g. non-HTTPS
      // context) -- the value is still visible and selectable by hand,
      // so fail silently rather than surface an error banner for this.
    }
  }

  return (
    <button
      type="button"
      className="copy-button"
      onClick={handleCopy}
      aria-label={`Copy ${value} to clipboard`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
