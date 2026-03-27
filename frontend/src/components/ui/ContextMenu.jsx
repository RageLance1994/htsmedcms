import { useEffect, useRef, useState } from "react";

export default function ContextMenu({ open, x = 0, y = 0, className = "", children }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);
      hideTimerRef.current = setTimeout(() => {
        setMounted(false);
      }, 300);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [open, x, y]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed origin-top-left transform-gpu transition-transform transition-opacity duration-300 ease-out will-change-transform ${
        visible ? "scale-100 opacity-100 pointer-events-auto" : "scale-0 opacity-0 pointer-events-none"
      } ${className}`}
      style={{ left: x, top: y }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}
