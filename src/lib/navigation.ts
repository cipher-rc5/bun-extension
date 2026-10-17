/** Detect main-world URL changes from an isolated content script without patching page APIs. */
export function observeNavigation(win: Window, changed: () => void): () => void {
  let url = win.location.href;
  let notified = url;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  let disposed = false;
  let active = true;
  const check = () => {
    if (disposed || !active || win.document.hidden || win.location.href === url) return;
    url = win.location.href;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      notified = url;
      changed();
    }, 250);
  };
  const start = () => {
    if (disposed || !active || win.document.hidden) return;
    if (interval === undefined) interval = setInterval(check, 500);
    check();
  };
  const pause = () => {
    if (interval !== undefined) clearInterval(interval);
    if (timer !== undefined) clearTimeout(timer);
    interval = undefined;
    timer = undefined;
    url = notified;
  };
  const hide = () => {
    active = false;
    pause();
  };
  const show = () => {
    active = true;
    start();
  };
  const visibility = () => {
    if (win.document.hidden) pause();
    else start();
  };
  const dispose = () => {
    disposed = true;
    pause();
    win.removeEventListener('popstate', check);
    win.removeEventListener('hashchange', check);
    win.removeEventListener('pagehide', hide);
    win.removeEventListener('pageshow', show);
    win.document.removeEventListener('visibilitychange', visibility);
  };
  win.addEventListener('popstate', check);
  win.addEventListener('hashchange', check);
  win.addEventListener('pagehide', hide);
  win.addEventListener('pageshow', show);
  win.document.addEventListener('visibilitychange', visibility);
  // pushState has no event across isolated worlds; poll href only while visible.
  start();
  return dispose;
}
