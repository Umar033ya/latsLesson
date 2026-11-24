/** Minimal DOM helpers. Text is always set through textContent, never as HTML. */
type Child = Node | string | null | undefined | false;
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<Record<string, unknown>> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'style') node.setAttribute('style', String(v));
    else if (k in node && k !== 'list' && typeof v !== 'string') (node as unknown as Record<string, unknown>)[k] = v;
    else node.setAttribute(k, String(v === true ? '' : v));
  }
  for (const c of children) if (c) node.append(c);
  return node;
}
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const ui = document.querySelector<HTMLDivElement>('#ui')!;
export const asset = (name: string) => `url(${new URL(`./assets/${name}`, document.baseURI).href})`;

/** Keyboard focus moves with arrows and W/S inside a list of buttons. */
export function arrowNav(root: HTMLElement, selector = 'button:not([disabled])') {
  root.addEventListener('keydown', (e) => {
    const down = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const up = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    if (!down && !up) return;
    const list = [...root.querySelectorAll<HTMLElement>(selector)];
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    list[(i + (down ? 1 : -1) + list.length) % list.length].focus();
  });
}
