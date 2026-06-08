/** Trailing debounce: gộp các lần gọi sát nhau thành 1; có cancel(). */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wrapped = ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; fn(...args); }, ms);
  }) as T & { cancel: () => void };
  wrapped.cancel = () => {
    if (timer) { clearTimeout(timer); timer = undefined; }
  };
  return wrapped;
}
