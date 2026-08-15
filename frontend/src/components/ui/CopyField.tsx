import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { CheckIcon, CopyIcon } from './icons';

export interface CopyFieldProps {
  value: string;
  label?: string;
  className?: string;
}

/**
 * Read-only value with a copy button — the league access code, which people
 * need to hand to someone else and previously had to select by hand.
 *
 * Falls back to a hidden textarea + execCommand when the Clipboard API is
 * unavailable: it needs a secure context, so it is missing on plain-HTTP LAN
 * addresses, which is exactly how someone would open this on their phone.
 */
export const CopyField: React.FC<CopyFieldProps> = ({ value, label, className }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-label uppercase text-text-subtle">{label}</span>}

      <div className="flex items-stretch overflow-hidden rounded border border-border bg-surface-sunken">
        <code className="min-w-0 flex-1 truncate px-3 py-2 font-mono text-sm text-text">
          {value}
        </code>

        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-xs font-medium text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
        >
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5 text-success" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Announces the result without moving focus off the button. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  );
};

export default CopyField;
