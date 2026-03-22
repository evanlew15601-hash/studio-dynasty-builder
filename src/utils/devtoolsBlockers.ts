export function applyProductionDevtoolsBlockers(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined') return;

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  window.addEventListener(
    'keydown',
    (e) => {
      const key = e.key.toLowerCase();
      const isMac = navigator.platform.toLowerCase().includes('mac');

      const shouldBlock =
        key === 'f12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) ||
        (isMac && e.metaKey && e.altKey && ['i', 'j', 'c', 'k'].includes(key));

      if (!shouldBlock) return;

      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true }
  );
}
