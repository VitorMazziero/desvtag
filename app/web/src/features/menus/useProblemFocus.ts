import { useEffect, useRef } from "react";
/** Bring a newly reported engine error into view, including inside a scrolling dialog. */
export function useProblemFocus(messages: readonly string[]) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!messages.length) return;
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages]);
  return ref;
}
