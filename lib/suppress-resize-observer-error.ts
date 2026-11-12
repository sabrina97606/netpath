// React Flow and the canvas size observer can resize within a single frame, which makes the
// browser emit a benign "ResizeObserver loop" error. Register in the capture phase at import
// time so it is intercepted before overlay/error reporters see it.
if (typeof window !== "undefined") {
  const flag = "__npResizeObserverErrorSuppressed";
  const w = window as unknown as Record<string, boolean>;
  if (!w[flag]) {
    w[flag] = true;
    window.addEventListener(
      "error",
      (event) => {
        if (event.message?.includes("ResizeObserver loop")) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      },
      true,
    );
  }
}

export {};
