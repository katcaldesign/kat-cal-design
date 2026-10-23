"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import LockIcon from "./LockIcon";

/*
  PinModal: asks for a six character code before a locked case opens.

  ── What this protects, honestly ──────────────────────────────────────────
  This site is static files on GitHub Pages: there is no server to check a
  password against, so the check happens in the visitor's browser. That makes
  it a closed door, not a locked one. It stops someone browsing the WORK page
  from opening the case, which is the job. It does not stop someone who opens
  the browser's developer tools and reads the page's code, because the case
  itself ships with the page.

  The code is stored as a SHA-256 hash rather than as the word itself, so it
  isn't sitting in plain text for anyone who views the source. To change it,
  hash the new code (in Terminal: printf newcode | shasum -a 256) and paste
  the result into PIN_HASH.

  ── Six boxes ───────────────────────────────────────────────────────────────
  Same behaviour as the Ffern sign-in passcode: typing advances, backspace
  steps back, arrows move, and pasting fills every box. The code checks itself
  as soon as the sixth character is in, so there is no submit button to find.
  Letters are compared lower case, so caps lock doesn't count as wrong.

  A native <dialog> opened with showModal(): the browser supplies the
  backdrop, keeps focus inside, makes the page behind inert to screen readers,
  and closes on Escape, none of which has to be rebuilt here.
*/

const LENGTH = 6;
const PIN_HASH = "f201fbdf4826bc4cad644420b2969a53d9646c558a955c44bebce2766c382996";

async function sha256(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PinModal({
  open,
  title,
  onUnlock,
  onClose,
}: {
  open: boolean;
  title: string;
  onUnlock: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const [chars, setCharsState] = useState<string[]>(Array(LENGTH).fill(""));
  /*
    A live copy of the boxes, read by every handler instead of `chars`.
    Typing fast fires the next key before React has re-rendered, so a handler
    reading `chars` saw the code as it was one keystroke ago and dropped
    letters. The ref is updated the moment a box changes, so it never lags.
  */
  const live = useRef<string[]>(chars);
  function setChars(next: string[]) {
    live.current = next;
    setCharsState(next);
  }
  const [wrong, setWrong] = useState(false);

  // Open and close the native dialog from the `open` prop, starting fresh
  // each time so a half-typed code from last time isn't waiting.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setChars(Array(LENGTH).fill(""));
      setWrong(false);
      d.showModal();
      boxes.current[0]?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  async function check(next: string[]) {
    if (next.some((c) => !c)) return;
    if ((await sha256(next.join("").toLowerCase())) === PIN_HASH) {
      onUnlock();
      return;
    }
    // Wrong: say so, clear the boxes and go back to the first, ready to retry.
    setWrong(true);
    setChars(Array(LENGTH).fill(""));
    boxes.current[0]?.focus();
  }

  function fill(from: number, text: string) {
    const next = [...live.current];
    const letters = [...text.replace(/\s/g, "")].slice(0, LENGTH - from);
    letters.forEach((ch, i) => (next[from + i] = ch));
    setChars(next);
    setWrong(false);
    boxes.current[Math.min(from + letters.length, LENGTH - 1)]?.focus();
    check(next);
  }

  /*
    No maxLength on the boxes, on purpose. Password managers, phone autofill
    and fast typing can all land several letters in one box in one go, and a
    one character limit silently threw away everything after the first. So a
    box takes whatever arrives and fill() spreads it across the boxes.

    The one case to unpick: a box that already held a letter, with the cursor
    after it, receives "old + new". Keep just the new one.
  */
  function onType(i: number, value: string) {
    const old = live.current[i];
    const text = old && value.length === 2 && value.startsWith(old) ? value.slice(1) : value;
    if (!text) {
      const next = [...live.current];
      next[i] = "";
      setChars(next);
      return;
    }
    fill(i, text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === "Backspace" && !live.current[i] && i > 0) {
      e.preventDefault();
      const next = [...live.current];
      next[i - 1] = "";
      setChars(next);
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < LENGTH - 1) {
      e.preventDefault();
      boxes.current[i + 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>, i: number) {
    e.preventDefault();
    fill(i, e.clipboardData.getData("text"));
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // A click that lands on the dialog element itself, not its contents,
      // is a click on the backdrop: treat it as "never mind".
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-labelledby="pin-title"
      className="m-auto w-[min(360px,calc(100vw-32px))] rounded-card border border-border bg-bg p-0 text-ink shadow-2xl backdrop:bg-ink/20 backdrop:backdrop-blur-sm"
    >
      <form
        method="dialog"
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col items-center px-6 pb-7 pt-8 text-center"
      >
        <LockIcon className="h-4 w-4 text-ink-light" />
        <h2 id="pin-title" className="kat-body-lg mt-4 font-medium text-balance">
          {title}
        </h2>
        <p className="kat-body-md mt-2 text-ink-mid">Enter the six letter code to view this case.</p>

        <div className="mt-6 flex gap-2" role="group" aria-label="Six letter code">
          {chars.map((ch, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={ch}
              onChange={(e) => onType(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onPaste={(e) => onPaste(e, i)}
              onFocus={(e) => e.target.select()}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label={`Character ${i + 1} of ${LENGTH}`}
              aria-invalid={wrong || undefined}
              className={`kat-body-lg h-12 w-10 rounded-[6px] border bg-surface text-center outline-none transition-colors focus:border-ink ${
                wrong ? "border-red-600" : "border-border-dark"
              }`}
            />
          ))}
        </div>

        {/* Always rendered, so the message appearing doesn't push the
            layout down. aria-live so a screen reader hears it too. */}
        <p
          aria-live="polite"
          className={`kat-mono-xs mt-4 h-3 uppercase tracking-wider text-red-600 ${wrong ? "" : "invisible"}`}
        >
          Incorrect code
        </p>

        <button
          type="button"
          onClick={onClose}
          className="kat-mono-xs mt-5 uppercase tracking-wider text-ink-mid underline-offset-4 hover:text-ink hover:underline"
        >
          Cancel
        </button>
      </form>
    </dialog>
  );
}
