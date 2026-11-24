// Comanda overlay: injected by the proxy into every HTML page of the target site. Lives in a shadow root so it does
// not inherit the site's CSS.
(() => {
  if (window.__liveEdit) return;
  window.__liveEdit = true;

  // color per selected item: the @n in the comment and the box use the same color
  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#dc2626', '#65a30d'];
  let colorIdx = Math.floor(Math.random() * COLORS.length);
  const nextColor = () => COLORS[colorIdx++ % COLORS.length];
  const STYLE_KEYS = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily', 'padding', 'margin', 'borderRadius', 'border', 'gap'];
  // ticket header per request status; an unknown status (old queue files) shows the raw value
  const STATUS_LABEL = { pending: '○ QUEUED', working: '◐ COOKING', answered: '◐ COOKING', question: '? QUESTION', undone: '↶ UNDONE', error: '✕ ERROR' };
  const STATUS_SAY = { pending: 'is in the queue', working: 'is in the kitchen', answered: 'is in the kitchen', done: 'is done', error: 'failed', question: 'has a question', undone: 'was undone' };
  const UNDO_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
  const REDUCE = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const svg = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    sel: svg('<path d="M4 4l7 17 2.5-7.5L21 11z"/>'),
    mark: svg('<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/>'),
    draw: svg('<path d="M3 17c3-6 6 3 9-3s5-6 9-2"/><path d="M3 21h18"/>'),
    edit: svg('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
    exit: svg('<path d="M5 12h14"/>'),
    send: svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    reply: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>').replace('stroke-width="2"', 'stroke-width="2.4"'),
    back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>').replace('stroke-width="2"', 'stroke-width="2.4"'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>').replace('stroke-width="2"', 'stroke-width="2.2"'),
    layers: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 4l5-2 5 2-5 2zM2 7l5 2 5-2M2 10l5 2 5-2"/></svg>',
  };
  // Comanda avatar (design/avatar-comanda.html): chef head whose eyes follow the cursor and blink. "sil" is the
  // silhouette used on the agent button of the command bar
  const avatar = (size, cls = '') => `<svg class="av ${cls}" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
<circle class="hat" cx="13.6" cy="10.6" r="5.4"/><circle class="hat" cx="20" cy="8.2" r="5.9"/><circle class="hat" cx="26.4" cy="10.6" r="5.4"/>
<rect class="band" x="11.4" y="11.6" width="17.2" height="4.6" rx="2.3"/><rect class="head" x="9.4" y="15.2" width="21.2" height="20.4" rx="8"/>
<g class="look"><g class="blink"><rect class="eye" x="14.5" y="22.2" width="3.7" height="7.2" rx="1.85"/><rect class="eye" x="21.8" y="22.2" width="3.7" height="7.2" rx="1.85"/></g></g></svg>`;
  // alignment block icons, as drawn in the Desigma inspector
  const bars = (d) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${d}</svg>`;
  const AICON = {
    left: bars('<path d="M3 4v16"/><path d="M7 8h12M7 16h8"/>'),
    hcenter: bars('<path d="M12 3v18"/><path d="M5 8h14M7 16h10"/>'),
    right: bars('<path d="M21 4v16"/><path d="M5 8h12M9 16h8"/>'),
    top: bars('<path d="M4 3h16"/><path d="M8 7v12M16 7v8"/>'),
    vcenter: bars('<path d="M3 12h18"/><path d="M8 5v14M16 7v10"/>'),
    bottom: bars('<path d="M4 21h16"/><path d="M8 5v12M16 9v8"/>'),
    dist: bars('<path d="M3 4v16"/><path d="M21 4v16"/><path d="M9 8h6M9 16h6"/>'),
  };
  // prefix icons of the inspector fields (the prefix is also the handle for dragging the value)
  const IIC = {
    width: bars('<path d="M3 12h18"/><path d="M3 8v8M21 8v8"/>'),
    height: bars('<path d="M12 3v18"/><path d="M8 3h8M8 21h8"/>'),
    opacity: bars('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>'),
    radius: bars('<path d="M4 20v-9a7 7 0 0 1 7-7h9"/>'),
    fill: bars('<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>'),
    stroke: bars('<rect x="4" y="4" width="16" height="16" rx="2"/>'),
    weight: bars('<rect x="3" y="9" width="18" height="6" rx="1" fill="currentColor" stroke="none"/>'),
    font: bars('<path d="M5 19 12 4l7 15"/><path d="M8.2 14h7.6"/>'),
    bold: bars('<path d="M7 4h5.5a4 4 0 0 1 0 8H7zM7 12h6.5a4 4 0 0 1 0 8H7z"/>'),
    leading: bars('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 5v14"/><path d="M1 7l2-2 2 2M1 17l2 2 2-2"/>'),
    tracking: bars('<path d="M4 5v14M20 5v14"/><path d="M8 12h8"/>'),
  };
  // Layers icons (eye and lock, as in the Desigma layers panel)
  const LICON = {
    eye: svg('<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>'),
    eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.8"/><path d="M6.3 6.6A16 16 0 0 0 2 12s3.6 6 10 6a9.7 9.7 0 0 0 3.6-.7"/>'),
    lock: svg('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>'),
    unlock: svg('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.6-1.6"/>'),
  };
  const MONO = 'ui-monospace, Menlo, Consolas, monospace';
  const SERIF = 'ui-serif, Georgia, serif';

  const host = document.createElement('live-edit-root');
  const root = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);
  // A <dialog> opened with showModal() goes to the browser top layer: it sits above any z-index and makes everything
  // outside it inert, including this panel (seen in the TSD modal, 2026-11-19). While a modal is open the panel lives
  // INSIDE the most recent modal (a descendant of the modal is not inert, and position: fixed stays relative to the
  // window); when it closes, the panel goes back to the body. If the site rebuilds the modal content and removes the
  // panel, the next mutation puts it back.
  const modals = [];
  const isModal = (d) => { try { return d.isConnected && d.matches(':modal'); } catch { return false; } };
  const accommodate = () => {
    for (let i = modals.length - 1; i >= 0; i--) if (!isModal(modals[i])) modals.splice(i, 1);
    for (const d of document.querySelectorAll('dialog')) if (isModal(d) && !modals.includes(d)) modals.push(d);
    const parent = modals.length ? modals[modals.length - 1] : document.body;
    if (parent && host.parentNode !== parent) parent.appendChild(host);
  };
  new MutationObserver(accommodate).observe(document.documentElement, { attributes: true, attributeFilter: ['open'], subtree: true, childList: true });
  root.innerHTML = `
<style>
  :host { all: initial; color-scheme: dark; }
  * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: #6a5b44 transparent; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #6a5b44; border-radius: 4px; }
  /* hidden also wins over blocks with their own display (#panel, #editp are flex) */
  [hidden] { display: none !important; }
  #ui, #editp, #bar, #modalbg { font: 13px/1.45 system-ui, sans-serif; color: #f6eedd; }
  button, input, textarea { font: inherit; color: inherit; }
  button { background: transparent; border: 0; padding: 0; cursor: pointer; }
  button:disabled { opacity: .45; cursor: default; }
  a { color: #dcc27a; cursor: pointer; text-decoration: underline; }
  a:hover { color: #f6eedd; }
  .sp { flex: 1; }
  .row { display: flex; gap: 8px; align-items: center; }

  /* open/hide: the panel grows/shrinks from the corner of the chef button */
  @keyframes le-in { from { opacity: 0; transform: translateY(10px) scale(.92); } to { opacity: 1; transform: none; } }
  @keyframes le-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(10px) scale(.92); } }
  @keyframes le-pop { 0% { opacity: 0; transform: scale(.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: none; } }
  /* chat <-> inspector: sequential, out 220ms, in 320ms after 210ms, bar 60ms after the right panel */
  @keyframes le-tin-y { from { opacity: 0; transform: translateY(28px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes le-tout-y { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(28px) scale(.96); } }
  @keyframes le-tin-x { from { opacity: 0; transform: translateX(28px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes le-tout-x { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(28px) scale(.96); } }
  /* popovers and bubbles */
  @keyframes le-pin { from { opacity: 0; transform: translateY(10px) scale(.95); } to { opacity: 1; transform: none; } }
  @keyframes le-pout { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(10px) scale(.95); } }
  @keyframes le-pinx { from { opacity: 0; transform: translateX(10px) scale(.95); } to { opacity: 1; transform: none; } }
  @keyframes le-poutx { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(10px) scale(.95); } }
  @keyframes le-hop { 0%, 100% { transform: none; } 30% { transform: translateY(-5px) rotate(-8deg); } 60% { transform: translateY(0) rotate(6deg); } }
  @keyframes le-reply { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: none; } }
  @keyframes le-acts { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
  @keyframes le-blink { 0%, 95% { transform: scaleY(1); } 97% { transform: scaleY(.08); } 100% { transform: scaleY(1); } }
  #panel { transform-origin: bottom right; }
  #panel.in { animation: le-in .22s cubic-bezier(.16, 1, .3, 1); }
  #panel.out { animation: le-out .16s ease-in forwards; }
  #open.in { animation: le-pop .32s cubic-bezier(.34, 1.4, .64, 1); }
  #panel.tout, #bar.tout { animation: le-tout-y .22s ease both; }
  #editp.tout { animation: le-tout-x .22s ease both; }
  #panel.tin { animation: le-tin-y .32s ease .21s both; }
  #editp.tin { animation: le-tin-x .32s ease .21s both; }
  #bar.tin { animation: le-tin-y .32s ease .27s both; }
  .pop.in { animation: le-pin .18s cubic-bezier(.16, 1, .3, 1); }
  .pop.out { animation: le-pout .13s ease-in forwards; }
  .pop.side.in { animation-name: le-pinx; }
  .pop.side.out { animation-name: le-poutx; }
  .hop { animation: le-hop .6s ease-out; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

  /* avatar: default colors, or silhouette (.sil) on the command bar */
  .av { display: block; overflow: visible; flex: none; }
  .av .hat { fill: #f7f4ec; }
  .av .band { fill: #f2c230; }
  .av .head { fill: #f1ebdc; }
  .av .hat, .av .band, .av .head { stroke: #221c14; stroke-width: 1.6; }
  .av .eye { fill: #221c14; }
  .av.sil .hat, .av.sil .band, .av.sil .head { fill: #141414; stroke: #141414; }
  .av.sil .eye { fill: #dcc27a; }
  .blink { transform-box: fill-box; transform-origin: center; animation: le-blink 6s ease-in-out infinite; }
  .avw { position: relative; flex: none; display: block; }
  .badge { position: absolute; left: 17px; top: -4px; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 999px; color: #141414; font: 700 9px/14px ${MONO}; text-align: center; box-shadow: 0 0 0 1.5px #141414; }

  /* page boxes, snap guides, ink */
  .box { position: fixed; pointer-events: none; z-index: 2147483646; border: 2px solid; }
  .box span { position: absolute; top: -20px; left: -2px; color: #fff; font: 11px ${MONO}; padding: 2px 5px; white-space: nowrap; }
  /* edit icon inside the selected item box (.box takes no pointer; the button does) */
  .bedge { position: absolute; top: -11px; right: -11px; width: 22px; height: 22px; padding: 0; display: grid; place-items: center; border-radius: 999px; background: #141414; border: 1.5px solid currentColor; pointer-events: auto; cursor: pointer; }
  .bedge:hover { background: #2e261b; }
  /* drag cover: keeps the "moving" cursor anywhere on the page while the item is dragged */
  #capa { position: fixed; inset: 0; z-index: 2147483644; cursor: grabbing; }
  /* snap guides of the drag, in the Desigma color, with X at the ends and a measure label */
  #guides div { position: fixed; background: #f24e7b; z-index: 2147483646; pointer-events: none; }
  #guides .guidex { width: 7px; height: 7px; background: none; }
  #guides .guidex::before, #guides .guidex::after { content: ''; position: absolute; left: 3px; top: 0; width: 1px; height: 7px; background: #f24e7b; }
  #guides .guidex::before { transform: rotate(45deg); }
  #guides .guidex::after { transform: rotate(-45deg); }
  #guides .gmeasure { width: auto; height: 14px; padding: 0 3px; border-radius: 2px; color: #fff; font: 600 10px/14px system-ui, sans-serif; transform: translate(-50%, -50%); }
  #ink { position: fixed; inset: 0; z-index: 2147483645; pointer-events: none; cursor: crosshair; touch-action: none; }
  #ink.on { pointer-events: auto; }

  /* round buttons */
  .tool { width: 30px; height: 30px; flex: none; display: grid; place-items: center; border-radius: 999px; color: #bdae93; }
  .tool svg { width: 15px; height: 15px; }
  .tool:hover { background: #2e261b; }
  .tool.on { background: #dcc27a; color: #221c14; }
  .send { width: 30px; height: 30px; flex: none; display: grid; place-items: center; border-radius: 999px; background: #dcc27a; color: #221c14; }
  .send svg { width: 14px; height: 14px; }
  .send:hover { background: #eadfb4; }
  .send.sm { width: 24px; height: 24px; }
  .send.sm svg { width: 12px; height: 12px; }
  .x { width: 22px; height: 22px; flex: none; display: grid; place-items: center; border-radius: 999px; color: #bdae93; }
  .x svg { width: 12px; height: 12px; }
  .x:hover { background: #221c14; }
  .pill { font: 600 12px system-ui, sans-serif; padding: 7px 14px; border: 1.5px solid #4f4433; border-radius: 999px; }
  .pill:hover { background: #2e261b; }
  .pill.go { background: #dcc27a; border-color: #dcc27a; color: #221c14; }
  .pill.go:hover { background: #eadfb4; }
  .pill.danger { background: #f07a63; border-color: #f07a63; color: #221c14; }

  /* chat panel (floating) and collapsed chef button share the same position */
  #ui { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; }
  #open { position: relative; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 999px; border: 1.5px solid #4f4433; background: #dcc27a; box-shadow: 0 10px 28px rgba(20, 10, 0, .45); cursor: move; touch-action: none; }
  #open:hover { background: #eadfb4; }
  #open .badge { left: auto; right: -3px; top: -3px; min-width: 16px; height: 16px; padding: 0 4px; font: 700 10px/16px ${MONO}; }
  #panel { position: relative; width: 350px; max-width: calc(100vw - 16px); background: #141414; border: 1.5px solid #4f4433; border-radius: 12px; box-shadow: 0 16px 40px rgba(20, 10, 0, .5); display: flex; flex-direction: column; }
  #top { display: flex; align-items: center; gap: 4px; padding: 7px 8px; border-bottom: 1px solid #6a5b44; }
  #grip { color: #bdae93; padding: 0 4px; font: 11px ${MONO}; cursor: move; user-select: none; touch-action: none; }
  #tools { display: flex; gap: 4px; }
  #dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
  #list { flex: none; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 8px; padding: 12px; height: 258px; }
  #hint { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 0 12px 8px; font-size: 12px; color: #bdae93; }
  #info { display: contents; }
  .chip { font: 600 11px ${MONO}; color: #fff; border-radius: 4px; padding: 1px 6px; }
  #err { color: #f07a63; }
  #txtwrap { position: relative; margin: 0 12px 10px; background: #17120c; border: 1.5px solid #4f4433; border-radius: 10px; padding: 6px 6px 6px 10px; display: flex; align-items: flex-end; gap: 8px; }
  #txtwrap:focus-within { border-color: #f6eedd; }
  #txtin { position: relative; flex: 1; min-width: 0; display: flex; }
  /* the colored @n comes from a mirror behind the textarea (a textarea cannot color part of its text): the textarea
     text is transparent, caret and placeholder stay visible. Both need the same font, padding and wrapping */
  #hl, #txt { font: 13px/1.4 system-ui, sans-serif; padding: 3px 0; margin: 0; border: 0; white-space: pre-wrap; overflow-wrap: break-word; }
  #hl { position: absolute; inset: 0; overflow: hidden; pointer-events: none; color: #f6eedd; }
  #hl .t { font-weight: 600; }
  #txt { flex: 1; min-width: 0; resize: none; background: transparent; outline: none; color: transparent; caret-color: #f6eedd; }
  #txt::placeholder { color: #bdae93; }
  #mention { position: absolute; left: 0; right: 0; bottom: calc(100% + 4px); z-index: 2; background: #2e261b; border: 1.5px solid #4f4433; border-radius: 10px; padding: 4px; display: flex; flex-direction: column; box-shadow: 0 16px 40px rgba(20, 10, 0, .5); }
  #mention div { padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  #mention div .muted { color: #bdae93; }
  #mention div.on, #mention div:hover { background: #dcc27a; color: #221c14; }
  #mention div.on .muted, #mention div:hover .muted { color: #6b5512; }
  #target { padding: 7px 12px; border-top: 1px solid #6a5b44; font: 10px ${MONO}; color: #bdae93; }
  /* resize corner: CSS resize would clip the @ menu (absolute child of the panel) */
  #rsize { position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: nwse-resize; touch-action: none; border-radius: 0 0 12px 0; background: linear-gradient(135deg, transparent 55%, #6a5b44 55%, #6a5b44 65%, transparent 65%, transparent 75%, #6a5b44 75%, #6a5b44 85%, transparent 85%); }

  /* ticket (one request): paper with a clip, number, status, serif text and a stub */
  .tk { position: relative; flex: none; background: #eadfb4; color: #2a2110; border-radius: 6px; margin-top: 5px; cursor: pointer; }
  .tk.ring { box-shadow: 0 0 0 2px #f6eedd; }
  .clip { position: absolute; left: 50%; top: -5px; width: 22px; height: 10px; margin-left: -11px; background: #8c8372; border: 1px solid #141414; border-radius: 2px; }
  .th { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 9px 10px 0; font: 700 9px ${MONO}; letter-spacing: 1px; color: #6b5512; white-space: nowrap; }
  .th .err { color: #a8200d; }
  .stamp { background: #1f5a2a; color: #eadfb4; letter-spacing: 1.5px; padding: 1px 5px; border-radius: 2px; }
  .tk .of { padding: 3px 10px 0; font: 11px ${MONO}; color: #6b5512; overflow-wrap: anywhere; }
  .tb { padding: 3px 10px 8px; font: 13px/1.4 ${SERIF}; white-space: pre-wrap; overflow-wrap: anywhere; }
  .tf { border-top: 1.5px dashed #6b5512; padding: 6px 10px 7px; font: 11px/1.45 ${MONO}; display: flex; gap: 8px; }
  .stub { flex: 1; min-width: 0; color: #6b5512; overflow-wrap: anywhere; }
  .acts { flex: none; display: flex; gap: 4px; align-self: flex-end; }
  .acts.back { animation: le-acts .2s ease-out; }
  .rb { width: 22px; height: 22px; flex: none; display: grid; place-items: center; border: 1.5px solid #2a2110; border-radius: 999px; color: #2a2110; }
  .rb svg { width: 11px; height: 11px; }
  .rb:hover { background: #2a2110; color: #f6eedd; }
  .rb.undo { border-color: #8f2a17; color: #8f2a17; }
  .rb.undo:hover { background: #8f2a17; color: #f6eedd; }
  .rstrip { padding: 6px 8px; background: #e2d6a6; border-top: 1px solid rgba(107, 85, 18, .35); border-radius: 0 0 6px 6px; overflow: hidden; cursor: default; }
  .rin { display: flex; align-items: center; gap: 6px; }
  .rstrip.anim .rin { animation: le-reply .24s cubic-bezier(.16, 1, .3, 1); }
  .rb.bk { width: 26px; height: 26px; }
  .rb.bk svg { width: 12px; height: 12px; }
  .rb.bk:hover { color: #eadfb4; }
  .rpill { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 2px 2px 2px 11px; background: #f6eedd; border: 1.5px solid #2a2110; border-radius: 999px; }
  .rpill input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; color: #2a2110; font: 12px system-ui, sans-serif; }
  .rpill input::placeholder { color: #6b5512; }
  .rpill button { width: 24px; height: 24px; flex: none; display: grid; place-items: center; border-radius: 999px; background: #2a2110; color: #eadfb4; }
  .rpill button svg { width: 12px; height: 12px; }

  /* chef speech bubble */
  #bub { position: absolute; z-index: 3; max-width: calc(100vw - 16px); background: #2e261b; border: 1.5px solid #4f4433; border-radius: 12px; box-shadow: 0 16px 40px rgba(20, 10, 0, .5); padding: 11px 12px 12px; color: #f6eedd; cursor: default; }
  #bub .tail { position: absolute; width: 11px; height: 11px; background: #2e261b; border: 0 solid #4f4433; }
  #bub.tr .tail { right: -7px; top: 15px; transform: rotate(45deg); border-top-width: 1.5px; border-right-width: 1.5px; }
  #bub.tl .tail { left: -7px; top: 15px; transform: rotate(225deg); border-top-width: 1.5px; border-right-width: 1.5px; }
  #bub.low .tail { top: auto; bottom: 15px; }
  #bub.tb .tail { left: 17px; bottom: -7px; transform: rotate(45deg); border-bottom-width: 1.5px; border-right-width: 1.5px; }
  #bub.tr { transform-origin: top right; }
  #bub.tl { transform-origin: top left; }
  #bub.tb { transform-origin: bottom left; }
  .bh { display: flex; align-items: flex-start; gap: 8px; }
  #bsay { flex: 1; font: italic 600 14px/1.35 ${SERIF}; }
  #bsa.typing { box-shadow: 2px 0 0 #dcc27a; }
  #bsb { color: transparent; }
  #brows { margin-top: 8px; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 10px; font: 11px/1.45 ${MONO}; }
  #brows .k { color: #bdae93; }
  #brows .v { overflow-wrap: anywhere; white-space: pre-wrap; }
  /* rows and options take their space from the start and fade in when the sentence ends */
  #brows, #bask { opacity: 0; pointer-events: none; transition: opacity .25s; }
  #bub.typed #brows, #bub.typed #bask { opacity: 1; pointer-events: auto; }
  #bask:empty { display: none; }
  .opts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .opt { height: 26px; padding: 0 12px; border: 1.5px solid #dcc27a; border-radius: 999px; color: #dcc27a; font: 600 12px system-ui, sans-serif; }
  .opt:hover { background: #dcc27a; color: #141414; }
  .free { margin-top: 8px; display: flex; align-items: center; gap: 6px; padding: 2px 2px 2px 10px; background: #17120c; border: 1.5px solid #4f4433; border-radius: 999px; }
  .free:focus-within { border-color: #f6eedd; }
  .free input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; font-size: 12px; }
  .free input::placeholder { color: #bdae93; }

  /* inspector command bar: floating pill centered on the page area */
  #bar { position: fixed; left: 0; right: 280px; bottom: 16px; z-index: 2147483647; display: flex; justify-content: center; pointer-events: none; }
  #barin { position: relative; pointer-events: auto; width: min(720px, calc(100% - 32px)); display: flex; align-items: center; gap: 4px; padding: 6px 6px 6px 10px; background: #141414; border: 1.5px solid #4f4433; border-radius: 999px; box-shadow: 0 16px 40px rgba(20, 10, 0, .5); font-size: 12px; }
  #agent { position: relative; flex: none; display: flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px 0 5px; border-radius: 999px; background: #eadfb4; color: #141414; font: 700 11px ${MONO}; white-space: nowrap; }
  #agent.on { background: #f6eedd; }
  .vr { flex: none; width: 1px; height: 18px; background: #6a5b44; margin: 0 4px; }
  #layersbtn { flex: none; display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border-radius: 999px; font: 500 12px system-ui, sans-serif; white-space: nowrap; }
  #layersbtn:hover, #layersbtn.on { background: #4f4433; }
  #lcount { font: 10px ${MONO}; color: #bdae93; }
  #btxt { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; font-size: 13px; padding: 0 4px; }
  #btxt::placeholder { color: #bdae93; }
  #layers, #queue { position: absolute; left: 0; bottom: calc(100% + 10px); background: #141414; border: 1.5px solid #4f4433; border-radius: 12px; box-shadow: 0 16px 40px rgba(20, 10, 0, .5); transform-origin: bottom left; }
  #layers { width: 270px; max-width: 100%; max-height: min(320px, calc(100vh - 90px)); overflow: auto; padding: 6px 0; }
  #queue { width: 330px; max-width: 100%; overflow: hidden; }
  #queue #list { height: auto !important; max-height: min(258px, calc(100vh - 90px)); }
  .ptitle { padding: 4px 12px 6px; font: italic 600 13px ${SERIF}; color: #bdae93; }
  /* Layers rows: DOM tree (containers and children) */
  .item { display: flex; align-items: center; gap: 4px; padding: 3px 8px 3px 12px; font-size: 12px; cursor: pointer; white-space: nowrap; }
  .item:hover { background: #2e261b; }
  .item.on { background: #4f4433; }
  .item.locked { opacity: .55; }
  .item .name { overflow: hidden; text-overflow: ellipsis; }
  .item .tag { flex: none; font: 10px ${MONO}; color: #bdae93; }
  .item .iacts { display: flex; margin-left: auto; flex: none; }
  .item button { width: 24px; height: 22px; display: grid; place-items: center; border-radius: 4px; color: #bdae93; }
  .item button svg { width: 14px; height: 14px; }
  .item button:hover { background: #221c14; }
  .item button.off { color: #f07a63; }
  .item button.lon { color: #dcc27a; }

  /* inspector on the right, in the Desigma shape: Position/Layout/Appearance/Fill/Stroke/Typography sections */
  #editp { position: fixed; top: 0; right: 0; bottom: 0; z-index: 2147483647; width: 280px; background: #141414; border-left: 1.5px solid #4f4433; display: flex; flex-direction: column; font-size: 12px; }
  /* width handle on the left edge of the inspector (drag to widen) */
  #esplit { position: absolute; left: -4px; top: 0; bottom: 0; width: 7px; z-index: 1; cursor: col-resize; touch-action: none; }
  #esplit:hover { background: #dcc27a55; }
  #ehdr { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-bottom: 1px solid #6a5b44; }
  #ename { font: 600 12px ${MONO}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #etag { font: 11px ${MONO}; color: #bdae93; }
  #eundo { white-space: nowrap; }
  #eclose { width: 24px; height: 24px; }
  #eclose svg { width: 13px; height: 13px; }
  #eclose:hover { background: #2e261b; }
  #ebody { flex: 1; min-height: 0; overflow: auto; padding: 4px 10px 10px; }
  .sec { padding: 8px 0 4px; }
  .tt { font: italic 600 13px ${SERIF}; color: #bdae93; margin-bottom: 6px; }
  .lbl { font-size: 11px; color: #bdae93; margin: 4px 0 3px; }
  .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .fld { display: flex; align-items: center; gap: 6px; min-width: 0; background: #17120c; border: 1.5px solid #4f4433; border-radius: 6px; padding: 4px 7px; }
  .fld span { flex: none; display: grid; place-items: center; font: 11px ${MONO}; color: #bdae93; }
  .fld input { flex: 1; min-width: 0; background: none; border: 0; outline: none; color: #f6eedd; font: 12px ${MONO}; padding: 1px 0; }
  .fld.ch { border-color: #f29a3a; }
  .fld input[type=color] { flex: none; width: 22px; height: 18px; padding: 0; background: none; border: 0; }
  .align { display: flex; align-items: center; gap: 4px; }
  .align button { flex: none; min-width: 26px; height: 26px; padding: 0 5px; display: grid; place-items: center; background: #17120c; border: 1.5px solid #4f4433; border-radius: 6px; color: #bdae93; font: 11px ${MONO}; }
  .align button:hover { background: #2e261b; color: #f6eedd; }
  .align button.on { background: #dcc27a; border-color: #dcc27a; color: #221c14; }
  /* CSS field of the item, in the shape of the Chrome Styles panel */
  #ecsswrap { position: relative; }
  #ecss { display: block; width: 100%; min-height: 180px; resize: vertical; background: #17120c; border: 1.5px solid #4f4433; border-radius: 6px; outline: none; color: #f6eedd; font: 12px/1.6 ${MONO}; padding: 7px 8px; tab-size: 2; }
  #ecss:focus { border-color: #f6eedd; }
  #ecss::selection { background: #dcc27a55; }
  #ecss::placeholder, #enote::placeholder { color: #8c8372; }
  /* property suggestions, like the DevTools autocomplete */
  #acss { position: absolute; left: 0; right: 0; bottom: 4px; z-index: 3; max-height: 148px; overflow: auto; background: #2e261b; border: 1.5px solid #4f4433; border-radius: 6px; padding: 4px; display: flex; flex-direction: column; box-shadow: 0 -8px 24px rgba(20, 10, 0, .5); }
  #acss div { padding: 3px 8px; border-radius: 4px; cursor: pointer; font: 12px ${MONO}; }
  #acss div.on, #acss div:hover { background: #dcc27a; color: #221c14; }
  #efoot { padding: 10px; border-top: 1px solid #6a5b44; display: flex; flex-direction: column; gap: 8px; }
  #enote { width: 100%; background: #17120c; border: 1.5px solid #4f4433; border-radius: 6px; outline: none; color: #f6eedd; font-size: 12px; padding: 6px 8px; }
  #enote:focus { border-color: #f6eedd; }
  #ecount { font: 11px ${MONO}; color: #bdae93; }
  #eerr { color: #f07a63; font-size: 11px; }

  /* undo modal */
  #modalbg { position: fixed; inset: 0; z-index: 2147483647; background: rgba(20, 10, 0, .55); display: grid; place-items: center; }
  #modal { width: 360px; max-width: calc(100vw - 32px); background: #141414; border: 1.5px solid #f07a63; border-radius: 12px; padding: 16px; box-shadow: 0 16px 40px rgba(20, 10, 0, .5); display: flex; flex-direction: column; gap: 10px; animation: le-pin .18s cubic-bezier(.16, 1, .3, 1); }
  #modal b { font: italic 600 16px ${SERIF}; }
  #mtext, #modal .warn { font-size: 12px; color: #bdae93; overflow-wrap: anywhere; }
  #mfiles { margin: 0; padding: 7px 9px 7px 24px; max-height: 160px; overflow: auto; font: 12px/1.5 ${MONO}; background: #17120c; border-radius: 6px; }
  #merr { color: #f07a63; font-size: 12px; }
</style>
<canvas id="ink"></canvas>
<div id="capa" hidden></div>
<div id="boxes"></div>
<div id="guides"></div>
<div id="ui">
  <button id="open" title="Open Comanda (drag to move)">${avatar(30)}<span class="badge" hidden></span></button>
  <div id="panel" hidden>
    <div id="top">
      <span id="chef" class="avw" title="Comanda">${avatar(26)}<span class="badge" hidden></span></span>
      <span id="grip" title="Drag the panel">::</span>
      <span id="ptools"><span id="tools"><button id="sel" class="tool" title="Select" aria-label="Select">${ICON.sel}</button><button id="mark" class="tool" title="Mark area" aria-label="Mark area">${ICON.mark}</button><button id="draw" class="tool" title="Draw" aria-label="Draw">${ICON.draw}</button><button id="edit" class="tool" title="Edit" aria-label="Edit">${ICON.edit}</button></span></span>
      <span class="sp"></span><span id="dot"></span><button id="exit" class="tool" title="Hide" aria-label="Hide">${ICON.exit}</button>
    </div>
    <div id="list"></div>
    <div id="hint"><span id="info"></span><span id="err"></span></div>
    <div id="txtwrap">
      <div id="txtin">
        <div id="hl" aria-hidden="true"></div>
        <textarea id="txt" rows="2" placeholder="What should change? (Ctrl+Enter sends)"></textarea>
      </div>
      <button id="send" class="send" title="Send request (Ctrl+Enter)" aria-label="Send">${ICON.send}</button>
      <div id="mention" hidden></div>
    </div>
    <div id="target"></div>
    <span id="rsize" title="Resize the panel"></span>
  </div>
</div>
<div id="editp" hidden>
  <span id="esplit" title="Drag to widen the inspector"></span>
  <div id="ehdr"><span id="ename"></span><span id="etag"></span><span class="sp"></span><a id="eundo">undo</a><button id="eclose" class="x" title="Close editing (reverts the preview)" aria-label="Close">${ICON.close}</button></div>
  <div id="ebody">
    <div class="sec">
      <div class="tt">Position</div>
      <div class="lbl">Alignment</div>
      <div class="align">
        <button data-al="Left" title="Align left (to the parent, or to the area of the selected items)" aria-label="Align left">${AICON.left}</button><button data-al="HCenter" title="Center horizontally" aria-label="Center horizontally">${AICON.hcenter}</button><button data-al="Right" title="Align right" aria-label="Align right">${AICON.right}</button>
        <span class="sp"></span>
        <button data-al="Top" title="Align top" aria-label="Align top">${AICON.top}</button><button data-al="VCenter" title="Center vertically" aria-label="Center vertically">${AICON.vcenter}</button><button data-al="Bottom" title="Align bottom" aria-label="Align bottom">${AICON.bottom}</button>
        <span class="sp"></span>
        <button id="edist" title="Distribute spacing (3 items or more)" aria-label="Distribute spacing">${AICON.dist}</button>
      </div>
      <div class="lbl">Position</div>
      <div class="grid2">
        <div class="fld" id="fldx"><span>X</span><input id="ex" inputmode="decimal"></div>
        <div class="fld" id="fldy"><span>Y</span><input id="ey" inputmode="decimal"></div>
      </div>
      <div class="lbl">Rotation</div>
      <div class="grid2">
        <div class="fld" id="fldrot"><span>&#176;</span><input id="erot" inputmode="decimal"></div>
        <div class="align"><button id="er90" title="Rotate 90&#176;">90&#176;</button><button id="efh" title="Flip horizontally">FH</button><button id="efv" title="Flip vertically">FV</button></div>
      </div>
    </div>
    <div id="efields"></div>
    <div class="sec">
      <div class="tt">CSS</div>
      <div id="ecsswrap">
        <textarea id="ecss" spellcheck="false" rows="10" placeholder="property: value;&#10;e.g. padding: 8px;"></textarea>
        <div id="acss" hidden></div>
      </div>
    </div>
  </div>
  <div id="efoot">
    <input id="enote" placeholder="Note for the request (optional)">
    <div class="row"><button id="esend" class="pill go">Send changes</button><span id="ecount"></span><span class="sp"></span><span id="eerr"></span></div>
  </div>
</div>
<div id="bar" hidden>
  <div id="barin">
    <button id="agent" class="avw" data-pop-keep title="Requests">${avatar(26, 'sil')}<span class="badge" hidden></span><span id="agtxt"></span></button>
    <span style="width:4px;flex:none"></span>
    <span id="btools"></span>
    <span class="vr"></span>
    <button id="layersbtn" data-pop-keep title="Layers">${ICON.layers}Layers<span id="lcount"></span></button>
    <span class="vr"></span>
    <input id="btxt" placeholder="What should change?">
    <button id="bsend" class="send" title="Send request (Enter)" aria-label="Send">${ICON.send}</button>
    <div id="layers" class="pop" data-pop hidden><div class="ptitle">Layers</div><div id="ltree"></div></div>
    <div id="queue" class="pop" data-pop hidden></div>
  </div>
</div>
<div id="bub" class="pop" data-pop hidden>
  <span class="tail"></span>
  <div class="bh"><div id="bsay"><span id="bsa"></span><span id="bsb"></span></div><button id="bclose" class="x" title="Close" aria-label="Close">${ICON.close}</button></div>
  <div id="brows"></div>
  <div id="bask"></div>
</div>
<div id="modalbg" hidden>
  <div id="modal">
    <b>Undo the last request?</b>
    <div id="mtext"></div>
    <ul id="mfiles"></ul>
    <div class="warn">Changes made to these files after the request are lost too.</div>
    <div class="row"><span id="merr"></span><span class="sp"></span><button id="mno" class="pill">Cancel</button><button id="myes" class="pill danger">Undo</button></div>
  </div>
</div>`;
  const $ = (id) => root.getElementById(id);

  let editing = false;
  try { editing = localStorage.getItem('liveEdit.on') === '1'; } catch {}
  // null: no active mode, and the open panel does not intercept clicks (the site works as usual); clicking the
  // active mode turns it off
  let mode = null;
  let targets = []; // { el } or { region }, plus info
  let editT = null;  // Edit mode: 1 item at a time, { el, info, orig, changes }
  let inspOpen = false;     // inspector open (with or without a selected item)
  let hoverItem = null;     // item under the mouse in Layers (marks the box on the page)
  const hiddenEls = new WeakMap(); // item -> [value, priority] of the inline visibility before hiding
  const lockedEls = new WeakSet(); // locked item: not selected nor dragged
  let hover = null;
  let drag = null;
  let requests = [];
  let online = false;
  let replyTo = null;        // id of the request with the reply strip open
  let replyAnim = null;      // id whose reply strip just opened (animates once)
  let actsBack = null;       // id whose action buttons just came back (animates once)
  let mention = null;        // @ menu: { at (position of the @ in the text), idx, items }
  let pendingMention = null; // @ picked with "select/mark": position where the @n of the next item goes
  let strokes = [];          // drawing: list of strokes, each [{x, y}]
  let undoId = null;         // request in the undo modal
  let bubble = null;         // chef speech: { id, kind } (kind: sent, working, done, error, question, detail)
  let noteTimer = 0;         // 7s auto-hide of done/error speech
  let typeTimer = 0;         // letter-by-letter typing of the speech
  let unseen = 0;            // speech the user did not see (panel collapsed)
  let pop = null;            // open popover on the command bar: 'layers' | 'queue'
  const doneAt = {};         // id -> time the overlay saw the request become done (kitchen time)

  const isOwn = (el) => el === host || host.contains(el);

  // Click outside closes Layers, the queue and the chef bubble. The buttons that open them and the tickets do not
  // count as outside. Registered before the page handlers, which stop the event on the window
  window.addEventListener('pointerdown', (e) => {
    if (!pop && !bubble) return;
    if (e.composedPath().some((n) => n.dataset && ('pop' in n.dataset || 'popKeep' in n.dataset))) return;
    setPop(null);
    closeBubble();
  }, true);

  function componentChain(el) {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    const names = [];
    for (let f = key ? el[key] : null; f && names.length < 12; f = f.return) {
      const t = f.type;
      const name = typeof t === 'function' ? t.displayName || t.name : t && (t.displayName || (t.render && (t.render.displayName || t.render.name)));
      if (name && names[names.length - 1] !== name) names.push(name);
    }
    return names;
  }

  function describe(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const html = el.cloneNode(false).outerHTML;
    return {
      components: componentChain(el),
      html: html.slice(0, html.indexOf('>') + 1).slice(0, 400),
      text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 200),
      styles: Object.fromEntries(STYLE_KEYS.map((k) => [k, cs[k]])),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  }

  function elementsInRect(rect) {
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (isOwn(el) || out.some((o) => o.contains(el))) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const ix = Math.max(0, Math.min(r.right, rect.x + rect.w) - Math.max(r.left, rect.x));
      const iy = Math.max(0, Math.min(r.bottom, rect.y + rect.h) - Math.max(r.top, rect.y));
      // more than half inside and not much larger than the marked area (drops page containers)
      if (ix * iy > 0.5 * r.width * r.height && r.width * r.height < 1.5 * rect.w * rect.h) out.push(el);
      if (out.length >= 15) break;
    }
    return out;
  }

  const targetName = (t) => (t.region ? 'area' : t.info.components[0] || t.el.tagName.toLowerCase());
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const dragRect = () => ({ x: Math.min(drag.x1, drag.x2), y: Math.min(drag.y1, drag.y2), w: Math.abs(drag.x2 - drag.x1), h: Math.abs(drag.y2 - drag.y1) });

  function boxEl(r, color, label) {
    const d = document.createElement('div');
    d.className = 'box';
    Object.assign(d.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, borderColor: color, background: `${color}1a` });
    if (label) {
      const s = document.createElement('span');
      s.style.background = color;
      s.textContent = label;
      d.appendChild(s);
    }
    return d;
  }

  // edit icon on the item box: opens the properties panel for that item. The @n stays the same
  const PENCIL_SM = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  function editButton(el, color) {
    const b = document.createElement('button');
    b.className = 'bedge';
    b.type = 'button';
    b.title = 'Edit this item (style and position)';
    b.setAttribute('aria-label', 'Edit this item');
    b.style.color = color;
    b.innerHTML = PENCIL_SM;
    b.onclick = () => setEdit(el);
    return b;
  }

  const EDIT_COLOR = '#c93a22';
  let frame = 0;
  let lastShape = '';
  function drawBoxes() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const boxes = $('boxes');
      // box list before drawing: if nothing changed since the last frame, the DOM is not touched (rebuilding the
      // boxes on every pointermove would swap the edit button under the click)
      const specs = [];
      if (editing) {
        if (inspOpen) {
          // in the inspector only the item being edited shows (and the item under the mouse in Layers); the boxes of
          // the request selection come back when it closes
          if (hoverItem && hoverItem.isConnected && hoverItem !== (editT && editT.el)) specs.push({ r: rectOf(hoverItem), color: '#f59e0b', label: itemName(hoverItem) });
          if (editT && editT.el.isConnected) specs.push({ r: rectOf(editT.el), color: EDIT_COLOR, label: `editing: ${editT.info.components[0] || editT.el.tagName.toLowerCase()}` });
        } else {
          if (hover && hover.isConnected) specs.push({ r: rectOf(hover), color: '#f59e0b', label: componentChain(hover)[0] || hover.tagName.toLowerCase() });
          targets.forEach((t, i) => {
            if (t.el && !t.el.isConnected) return;
            specs.push({ r: t.region || rectOf(t.el), color: t.color || '#2563eb', label: `@${i + 1} ${targetName(t)}`, el: t.el });
          });
          // the item being edited already has the selection box; the edit box is drawn only when it is not selected
          if (editT && editT.el.isConnected && !targets.some((t) => t.el === editT.el)) specs.push({ r: rectOf(editT.el), color: EDIT_COLOR, label: `editing: ${editT.info.components[0] || editT.el.tagName.toLowerCase()}` });
        }
        if (drag) specs.push({ r: dragRect(), color: '#16a34a' });
      }
      const shape = JSON.stringify(specs.map(({ r, color, label }) => [Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h), color, label]));
      if (shape === lastShape) return;
      lastShape = shape;
      boxes.replaceChildren(...specs.map((s) => {
        const b = boxEl(s.r, s.color, s.label);
        if (s.el) b.appendChild(editButton(s.el, s.color));
        return b;
      }));
    });
  }
  // the page width animates when the inspector opens/closes: the boxes follow it for a while
  function followBoxes() {
    const end = performance.now() + 700;
    const f = () => { drawBoxes(); if (performance.now() < end) requestAnimationFrame(f); };
    f();
  }

  const node = (tag, cls, text) => { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; };
  const div = (cls, text) => node('div', cls, text);
  const iconBtn = (cls, icon, title, fn) => {
    const b = node('button', cls);
    b.innerHTML = icon;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.onclick = (e) => { e.stopPropagation(); fn(); };
    return b;
  };
  // request number: chronological position in the list (the queue has no sequence number)
  const num = (r) => `No. ${String(requests.findIndex((x) => x.id === r.id) + 1).padStart(4, '0')}`;
  const statusLabel = (s) => STATUS_LABEL[s] || String(s || '?').toUpperCase();

  // cursor: pointer over selectable items (Select active, or inspector without a capture mode). Lives in the page,
  // because the cursor belongs to the site elements; the overlay host is left out
  const pointerCss = document.createElement('style');
  pointerCss.textContent = '*:not(live-edit-root) { cursor: pointer !important; }';

  const HINTS = { select: 'Click items on the page.', mark: 'Drag on the page to mark an area.', draw: 'Scribble on the page; it goes with the request.' };
  function renderPanel() {
    $('sel').classList.toggle('on', inspOpen ? mode === null : mode === 'select');
    $('mark').classList.toggle('on', mode === 'mark');
    $('draw').classList.toggle('on', mode === 'draw');
    $('ink').className = editing && mode === 'draw' ? 'on' : '';
    $('ink').hidden = !editing;
    const wantPointer = editing && (inspOpen ? mode === null : mode === 'select');
    if (wantPointer !== pointerCss.isConnected) {
      if (wantPointer) (document.head || document.documentElement).appendChild(pointerCss); else pointerCss.remove();
    }
    const info = $('info');
    const chips = targets.map((t, i) => { const c = node('span', 'chip', `@${i + 1} ${targetName(t)}`); c.style.background = t.color; return c; });
    if (strokes.length) { const c = node('span', 'chip', 'scribble'); c.style.background = '#ef4444'; chips.push(c); }
    if (chips.length) {
      const a = node('a', '', 'clear');
      a.onclick = () => { clearInk(); setTargets([]); };
      info.replaceChildren(...chips, a);
    } else info.replaceChildren(HINTS[mode] || 'Pick a tool or type your request.');
    $('send').disabled = !online || !$('txt').value.trim();
    $('bsend').disabled = !online || !$('btxt').value.trim();
    $('dot').style.background = online ? '#9ccf6a' : '#f07a63';
    $('dot').title = online ? 'connected to Comanda' : 'Comanda offline';
    const asks = requests.filter((r) => r.status === 'question').length;
    const running = requests.filter((r) => r.status === 'working');
    const pend = requests.filter((r) => ['pending', 'working', 'answered'].includes(r.status)).length;
    // avatar badge, by priority: open question, requests in progress, error/done just told, unseen speech
    const note = bubble && bubble.kind !== 'detail' ? requests.find((r) => r.id === bubble.id) : null;
    const badge = asks ? ['?', '#dcc27a'] : pend ? [String(pend), '#f29a3a'] : note?.status === 'error' ? ['!', '#f07a63']
      : note?.status === 'done' ? ['✓', '#9ccf6a'] : unseen ? [String(unseen), '#9ccf6a'] : null;
    for (const b of root.querySelectorAll('.badge')) {
      b.hidden = !badge;
      if (badge) { b.textContent = badge[0]; b.style.background = badge[1]; }
    }
    $('agtxt').textContent = asks ? `${asks} question${asks > 1 ? 's' : ''}` : pend ? `${pend} queued` : `${requests.length} request${requests.length === 1 ? '' : 's'}`;
    // with the panel hidden the chef button shows what is running in its title
    $('open').title = running.length
      ? `${running[0].now || 'request in progress'}${running.length > 1 ? ` (+${running.length - 1} in progress)` : ''} - drag to move`
      : 'Open Comanda (drag to move)';
    paintHl();
    // focus/caret of the reply field survive the list redraw
    const focused = root.activeElement?.dataset?.reply;
    const caret = focused ? root.activeElement.selectionStart : null;
    const lastId = requests.length ? requests[requests.length - 1].id : null;
    // newest request on top
    $('list').replaceChildren(...requests.slice().reverse().map((r) => {
      const isDetail = bubble?.kind === 'detail' && bubble.id === r.id;
      const d = div(isDetail ? 'tk ring' : 'tk');
      d.dataset.popKeep = '';
      d.title = 'Show request details';
      d.onclick = () => (isDetail ? closeBubble() : openBubble(r, 'detail'));
      const th = div('th');
      th.append(node('span', '', num(r)), r.status === 'done' ? node('span', 'stamp', 'DONE') : node('span', r.status === 'error' ? 'err' : '', statusLabel(r.status)));
      d.append(node('span', 'clip'), th);
      if (r.replyTo) d.append(div('of', `reply to: ${String(r.replyTo.comment || '').slice(0, 80)}`));
      d.append(div('tb', r.comment));
      const tf = div('tf');
      // stub: the agent reply, or the current step (<id>.now), or the default
      const q = r.status === 'question' && r.question ? r.question.text : '';
      const stub = r.status === 'undone' ? `undone: ${(r.restored || []).join(', ')}`
        : r.reply || r.now || q || (r.status === 'answered' && r.userAnswer ? `you: ${r.userAnswer}` : 'waiting for the kitchen');
      tf.append(node('span', 'stub', stub));
      if (['done', 'error', 'undone'].includes(r.status) && replyTo !== r.id) {
        const acts = node('span', actsBack === r.id ? 'acts back' : 'acts');
        // undo: only the last request, already done, with saved files
        if (r.id === lastId && r.status === 'done' && r.files?.length) acts.append(iconBtn('rb undo', UNDO_ICON, 'Undo', () => openUndo(r)));
        acts.append(iconBtn('rb', ICON.reply, 'Reply', () => openReply(r.id)));
        tf.append(acts);
      }
      d.append(tf);
      if (replyTo === r.id) d.append(replyBox(r));
      return d;
    }));
    replyAnim = null;
    actsBack = null;
    if (focused) {
      const el = root.querySelector(`[data-reply="${focused}"]`);
      if (el) { el.focus(); el.setSelectionRange(caret, caret); }
    }
  }

  function openReply(id) {
    replyTo = id;
    replyAnim = id;
    renderPanel();
    root.querySelector(`[data-reply="${id}"]`)?.focus();
  }
  function closeReply() {
    actsBack = replyTo;
    replyTo = null;
    renderPanel();
  }
  // Reply to a finished request: becomes a new request with replyTo (Claude gets the original with it)
  function replyBox(r) {
    const strip = div(replyAnim === r.id ? 'rstrip anim' : 'rstrip');
    strip.onclick = (e) => e.stopPropagation();
    const inner = div('rin');
    const pill = div('rpill');
    const inp = node('input');
    inp.placeholder = 'Reply (Enter sends)';
    inp.dataset.reply = r.id;
    inp.value = drafts[`r:${r.id}`] || '';
    inp.oninput = () => { drafts[`r:${r.id}`] = inp.value; };
    const go = async () => {
      const text = inp.value.trim();
      if (!text) return;
      const res = await fetch('/__le/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: text, route: location.pathname + location.search, targets: [], replyTo: r.id }),
      }).catch(() => null);
      if (!res || !res.ok) { showErr(`send failed${res ? ` (${res.status})` : ''}`); return; }
      delete drafts[`r:${r.id}`];
      replyTo = null;
      showErr('');
      renderPanel();
    };
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); else if (e.key === 'Escape') closeReply(); };
    pill.append(inp, iconBtn('', ICON.send, 'Send reply', go));
    inner.append(iconBtn('rb bk', ICON.back, 'Back', closeReply), pill);
    strip.append(inner);
    return strip;
  }
  const showErr = (msg) => { $('err').textContent = msg; $('eerr').textContent = msg; };

  // Undo the last request: confirmation modal with the files that go back
  function openUndo(r) {
    undoId = r.id;
    $('mtext').textContent = `"${String(r.comment).slice(0, 120)}" - these files go back to what they were before it:`;
    $('mfiles').replaceChildren(...r.files.map((f) => node('li', '', f)));
    $('merr').textContent = '';
    $('myes').disabled = false;
    $('modalbg').hidden = false;
    $('myes').focus();
  }
  const closeUndo = () => { undoId = null; $('modalbg').hidden = true; };
  async function confirmUndo() {
    if (!undoId) return;
    $('myes').disabled = true;
    const res = await fetch('/__le/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: undoId }) }).catch(() => null);
    if (!res || !res.ok) {
      $('merr').textContent = res ? await res.text().catch(() => `error ${res.status}`) : 'Comanda offline';
      $('myes').disabled = false;
      return;
    }
    closeUndo();
  }

  // Old question in a single text: context = everything before the last sentence that ends in "?"
  function splitQuestion(text) {
    const t = String(text || '').trim();
    const m = t.match(/^([\s\S]*[.!:;\n])\s*([^.!:;\n]*\?)\s*$/);
    return m && m[1].trim() ? { context: m[1].trim(), text: m[2].trim() } : { context: '', text: t };
  }
  const questionOf = (r) => (r.question.context ? { context: r.question.context, text: r.question.text || '' } : splitQuestion(r.question.text));

  // Claude's question: option buttons and free answer; the answer goes back into the request JSON
  const drafts = {};
  function askBox(r) {
    const opts = div('opts');
    for (const o of r.question.options || []) {
      const b = node('button', 'opt', o);
      b.onclick = () => answer(r.id, o);
      opts.appendChild(b);
    }
    const free = div('free');
    const inp = node('input');
    inp.placeholder = 'Other answer (Enter sends)';
    inp.value = drafts[r.id] || '';
    inp.oninput = () => { drafts[r.id] = inp.value; };
    inp.onkeydown = (e) => { if (e.key === 'Enter' && inp.value.trim()) answer(r.id, inp.value.trim()); };
    free.append(inp, iconBtn('send sm', ICON.send, 'Answer', () => { if (inp.value.trim()) answer(r.id, inp.value.trim()); }));
    return opts.children.length ? [opts, free] : [free];
  }
  async function answer(id, text) {
    const r = await fetch('/__le/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, answer: text }),
    }).catch(() => null);
    if (!r || !r.ok) { showErr(`answer failed${r ? ` (${r.status})` : ''}`); return; }
    delete drafts[id];
    showErr('');
    if (bubble?.id === id) closeBubble();
  }

  // ---- Chef speech: a bubble that comes out of the avatar. The whole sentence is rendered from the start and the
  // letters are revealed (the unwritten part is transparent), so line breaks do not move
  const ago = (t) => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'just now' : `${m} min ago`; };
  const itemsOf = (r) => (r.targets || []).map((t, i) => `${t.ref || `@${i + 1}`} ${t.markedArea ? 'area' : t.components?.[0] || (String(t.html || '').match(/^<([\w-]+)/) || [])[1] || 'item'}`).join(' ') + (r.drawing ? ' +drawing' : '');
  function openBubble(r, kind) {
    const n = num(r);
    const q = r.question && r.status === 'question' ? questionOf(r) : null;
    let say, rows;
    if (kind === 'detail') {
      const at = Date.parse(r.created);
      say = `Request ${n} ${STATUS_SAY[r.status] || `is ${r.status}`}. You asked at ${new Date(at).toLocaleTimeString('en-GB')} (${ago(at)}).`;
      rows = [['Asked', r.comment], ['Items', itemsOf(r).trim() || 'none'],
        r.status === 'done' ? ['Did', r.reply || ''] : q ? ['Question', q.text] : ['Now', r.now || r.reply || 'waiting for the kitchen'],
        ['Kitchen', doneAt[r.id] ? `${((doneAt[r.id] - at) / 1000).toFixed(1)} s` : ['pending', 'working', 'answered', 'question'].includes(r.status) ? 'in progress' : 'not measured']];
    } else {
      const LINES = {
        sent: [`Got request ${n}. It's in the queue.`, 'Asked', r.comment],
        working: [`Working on request ${n}.`, 'Now', r.now || 'working...'],
        done: [`Done! Request ${n} is out of the kitchen.`, 'Did', r.reply || ''],
        error: [`I couldn't do request ${n}.`, 'Reason', r.reply || ''],
        question: [`I have a question about request ${n}.`, 'Question', q ? q.text : ''],
      };
      say = LINES[kind][0];
      rows = [[LINES[kind][1], LINES[kind][2]]];
    }
    if (q?.context) rows.splice(rows.length - (kind === 'detail' ? 2 : 1), 0, ['Context', q.context]);
    bubble = { id: r.id, kind };
    clearTimeout(noteTimer);
    if (kind === 'done' || kind === 'error') noteTimer = setTimeout(() => { if (bubble?.id === r.id && bubble.kind === kind) closeBubble(); }, 7000);
    $('brows').replaceChildren(...rows.flatMap(([k, v]) => [node('span', 'k', k), node('span', 'v', v)]));
    $('bask').replaceChildren(...(q ? askBox(r) : []));
    placeBubble();
    showPop($('bub'), true);
    typeSay(say);
    hop();
    renderPanel();
  }
  function typeSay(text) {
    clearInterval(typeTimer);
    const b = $('bub'), a = $('bsa'), rest = $('bsb');
    let i = REDUCE ? text.length : 0;
    const paint = () => {
      a.textContent = text.slice(0, i);
      rest.textContent = text.slice(i);
      a.classList.toggle('typing', i < text.length);
      b.classList.toggle('typed', i >= text.length);
    };
    paint();
    if (i < text.length) typeTimer = setInterval(() => { i++; paint(); if (i >= text.length) clearInterval(typeTimer); }, 22);
  }
  function closeBubble() {
    if (!bubble) return;
    bubble = null;
    clearTimeout(noteTimer);
    clearInterval(typeTimer);
    showPop($('bub'), false);
    renderPanel();
  }
  // chat: 250px left of the panel (right if there is no room); inspector: 280px above the bar (right of the open
  // queue); collapsed: 240px beside the chef button
  function placeBubble() {
    if (!bubble) return;
    const b = $('bub'), st = b.style;
    let parent, cls;
    if (inspOpen) {
      parent = $('barin');
      const left = pop === 'queue' ? Math.max(0, Math.min(342, $('barin').offsetWidth - 280)) : 0;
      Object.assign(st, { width: '280px', left: `${left}px`, right: 'auto', top: 'auto', bottom: 'calc(100% + 14px)' });
      cls = ['tb'];
    } else if (editing) {
      parent = $('panel');
      const roomLeft = $('panel').getBoundingClientRect().left >= 264;
      Object.assign(st, { width: '250px', top: '0px', bottom: 'auto', left: roomLeft ? 'auto' : 'calc(100% + 14px)', right: roomLeft ? 'calc(100% + 14px)' : 'auto' });
      cls = ['side', roomLeft ? 'tr' : 'tl'];
    } else {
      parent = ui;
      const r = $('open').getBoundingClientRect();
      const roomLeft = r.left >= 252;
      Object.assign(st, { width: '240px', top: 'auto', bottom: `${Math.min(0, r.bottom - 190)}px`, left: roomLeft ? 'auto' : 'calc(100% + 12px)', right: roomLeft ? 'calc(100% + 12px)' : 'auto' });
      cls = ['side', 'low', roomLeft ? 'tr' : 'tl'];
    }
    if (b.parentNode !== parent) parent.appendChild(b);
    b.classList.remove('tb', 'tr', 'tl', 'low', 'side');
    b.classList.add(...cls);
  }
  $('bclose').onclick = closeBubble;
  // little hop of the avatar on each new speech
  function hop() {
    if (REDUCE) return;
    for (const a of [$('chef'), $('agent')]) { a.classList.remove('hop'); void a.offsetWidth; a.classList.add('hop'); }
  }

  // Popovers of the command bar (Layers, queue)
  function showPop(el, on) {
    if (on && (el.hidden || el.classList.contains('out'))) { el.hidden = false; animate(el, 'in'); }
    else if (!on && !el.hidden && !el.classList.contains('out')) animate(el, 'out', () => { el.hidden = true; });
  }
  function setPop(p) {
    pop = p;
    showPop($('layers'), p === 'layers');
    showPop($('queue'), p === 'queue');
    $('agent').classList.toggle('on', p === 'queue');
    $('layersbtn').classList.toggle('on', p === 'layers');
    if (p === 'layers') buildLayers();
    if (p === 'queue') $('list').scrollTop = 0;
    placeBubble();
  }
  $('agent').onclick = () => setPop(pop === 'queue' ? null : 'queue');
  $('layersbtn').onclick = () => { if (bubble?.kind === 'detail') closeBubble(); setPop(pop === 'layers' ? null : 'layers'); };

  // Hide keeps selection and text; the panel comes back the same through the chef button
  function setEditing(v) {
    if (editing === v) return;
    editing = v;
    try { localStorage.setItem('liveEdit.on', v ? '1' : '0'); } catch {}
    if (!v) { hover = null; drag = null; mode = null; closeMention(); }
    renderPanel();
    renderEdit();
    drawBoxes();
    showUi(true);
  }

  // Animation by class; the hidden attribute goes in only after the exit (hidden is display: none and would cut it)
  function animate(el, cls, done) {
    el.classList.remove('in', 'out', 'tin', 'tout');
    if (el._end) el.removeEventListener('animationend', el._end);
    el._end = null;
    if (REDUCE) { done?.(); return; }
    void el.offsetWidth; // restarts the animation
    el.classList.add(cls);
    el._end = (e) => {
      if (e.target !== el) return;
      el.removeEventListener('animationend', el._end);
      el._end = null;
      el.classList.remove(cls);
      done?.();
    };
    el.addEventListener('animationend', el._end);
  }
  function showUi(anim) {
    const panel = $('panel'), open = $('open');
    if (inspOpen) {
      // the inspector and the command bar take over; renderEdit runs the chat <-> inspector transition
    } else if (editing) {
      open.hidden = true;
      panel.hidden = false;
      unseen = 0;
      if (anim) animate(panel, 'in');
    } else if (anim && !panel.hidden) {
      animate(panel, 'out', () => {
        if (editing) return;
        panel.hidden = true;
        open.hidden = false;
        placeUi();
        placeBubble();
        animate(open, 'in');
      });
    } else {
      panel.hidden = true;
      open.hidden = false;
    }
    placeUi();
    placeBubble();
  }

  // Panel position and size (right, bottom, width, list height) in localStorage; the position also serves the
  // collapsed chef button. They are limited to the window on each placement without changing the stored value
  // (if the window grows, the panel gets its chosen size back)
  const ui = $('ui');
  const box = { r: 16, b: 16, w: 350, h: 258 };
  try { Object.assign(box, JSON.parse(localStorage.getItem('liveEdit.panel') || '{}')); } catch {}
  let placed = { ...box };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const saveBox = () => { try { localStorage.setItem('liveEdit.panel', JSON.stringify(box)); } catch {} };
  function placeUi() {
    const p = $('panel'), list = $('list');
    const w = Math.min(box.w, Math.max(240, innerWidth - 16));
    let h = box.h;
    if (!p.hidden) {
      p.style.width = `${w}px`;
      if (list.parentNode === p) {
        const chrome = p.offsetHeight - list.offsetHeight;
        h = clamp(box.h, 60, Math.max(60, innerHeight - chrome - 16));
        list.style.height = `${h}px`;
      }
    }
    const r = ui.getBoundingClientRect();
    placed = { r: clamp(box.r, 0, Math.max(0, innerWidth - r.width)), b: clamp(box.b, 0, Math.max(0, innerHeight - r.height)), w, h };
    Object.assign(ui.style, { right: `${placed.r}px`, bottom: `${placed.b}px` });
  }
  let movedOpen = false;
  // drag by the panel handle or by the chef button itself (more than 4px of movement is a drag, not a click)
  function draggable(handle) {
    handle.addEventListener('pointerdown', (e) => {
      Object.assign(box, placed);
      const s = { ...box }, sx = e.clientX, sy = e.clientY;
      // pointer capture keeps the end of the drag inside the overlay (it does not become a page selection)
      handle.setPointerCapture(e.pointerId);
      movedOpen = false;
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) movedOpen = true;
        if (!movedOpen) return;
        const r = ui.getBoundingClientRect();
        box.r = clamp(s.r - dx, 0, Math.max(0, innerWidth - r.width));
        box.b = clamp(s.b - dy, 0, Math.max(0, innerHeight - r.height));
        placeUi();
        placeBubble();
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        if (movedOpen) saveBox();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }
  draggable($('grip'));
  draggable($('open'));
  window.addEventListener('resize', () => { placeUi(); placeBubble(); });

  // Size by the corner handle (minimum width 300px, minimum list 90px); the left and top edges stay in place
  $('rsize').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const h = $('rsize');
    Object.assign(box, placed);
    const s = { ...box }, sx = e.clientX, sy = e.clientY;
    h.setPointerCapture(e.pointerId);
    const move = (ev) => {
      box.w = clamp(s.w + ev.clientX - sx, 300, s.w + s.r);
      box.r = s.r - (box.w - s.w);
      box.h = clamp(s.h + ev.clientY - sy, 90, s.h + s.b);
      box.b = s.b - (box.h - s.h);
      placeUi();
      placeBubble();
    };
    const up = () => {
      h.removeEventListener('pointermove', move);
      h.removeEventListener('pointerup', up);
      saveBox();
    };
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', up);
  });

  // In edit mode, clicks on the page select instead of triggering the site
  const block = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
  const opts = { capture: true };
  // Desigma alignment system, ported from canvas/snap.rs + canvas/interact.rs: snaps the item edges and centers to the
  // edges/centers of the other visible elements, draws the guides (with X at the ends) and the measurements
  const SNAP_PX = 5; // theme::SNAP_THRESHOLD_PX
  const GUIDE_COLOR = '#f24e7b'; // theme::GUIDE_COLOR
  const edgesX = (r) => [r.left, r.left + r.width / 2, r.left + r.width];
  const edgesY = (r) => [r.top, r.top + r.height / 2, r.top + r.height];
  // snap_values: smallest |delta| that brings one of my coordinates to one of the target's
  function bestSnap(mine, cands, thr) {
    let best = null;
    for (const m of mine) for (const t of cands) {
      const d = t - m;
      if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best[0]))) best = [d, t];
    }
    return best;
  }
  // measurements: distance to the nearest neighbor on each side that touches the perpendicular axis
  function measurements(r, others) {
    const out = [];
    const cy = r.top + r.height / 2, cx = r.left + r.width / 2;
    let left = null, right = null, up = null, down = null;
    for (const o of others) {
      const touchY = o.top < r.top + r.height && o.top + o.height > r.top;
      const touchX = o.left < r.left + r.width && o.left + o.width > r.left;
      if (touchY) {
        if (o.left + o.width <= r.left) left = left === null ? o.left + o.width : Math.max(left, o.left + o.width);
        else if (o.left >= r.left + r.width) right = right === null ? o.left : Math.min(right, o.left);
      }
      if (touchX) {
        if (o.top + o.height <= r.top) up = up === null ? o.top + o.height : Math.max(up, o.top + o.height);
        else if (o.top >= r.top + r.height) down = down === null ? o.top : Math.min(down, o.top);
      }
    }
    if (left !== null) out.push({ a: [left, cy], b: [r.left, cy], v: r.left - left });
    if (right !== null) out.push({ a: [r.left + r.width, cy], b: [right, cy], v: right - (r.left + r.width) });
    if (up !== null) out.push({ a: [cx, up], b: [cx, r.top], v: r.top - up });
    if (down !== null) out.push({ a: [cx, r.top + r.height], b: [cx, down], v: down - (r.top + r.height) });
    return out;
  }
  function snap(mov, others, thr) {
    const sx = bestSnap(edgesX(mov), others.flatMap(edgesX), thr);
    const sy = bestSnap(edgesY(mov), others.flatMap(edgesY), thr);
    const dx = sx ? sx[0] : 0, dy = sy ? sy[0] : 0;
    const inside = { left: mov.left + dx, top: mov.top + dy, width: mov.width, height: mov.height };
    const guides = [];
    if (sx) {
      let from = inside.top, to = inside.top + inside.height;
      for (const o of others) if (edgesX(o).some((v) => Math.abs(v - sx[1]) < 0.001)) { from = Math.min(from, o.top); to = Math.max(to, o.top + o.height); }
      guides.push({ axis: 'x', pos: sx[1], from, to });
    }
    if (sy) {
      let from = inside.left, to = inside.left + inside.width;
      for (const o of others) if (edgesY(o).some((v) => Math.abs(v - sy[1]) < 0.001)) { from = Math.min(from, o.left); to = Math.max(to, o.left + o.width); }
      guides.push({ axis: 'y', pos: sy[1], from, to });
    }
    // the measurements only show together with a guide, as in Desigma
    const meas = guides.length ? measurements(inside, others) : [];
    return { dx, dy, guides, measurements: meas };
  }
  // snap_targets: every visible element that falls in the (doubled) viewport, except the edited item and its descendants
  function snapCandidates(el) {
    const out = [];
    const lim = { left: -innerWidth, top: -innerHeight, right: innerWidth * 2, bottom: innerHeight * 2 };
    for (const n of document.body.querySelectorAll('*')) {
      if (n === host || host.contains(n) || el === n || el.contains(n)) continue;
      const r = n.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right < lim.left || r.left > lim.right || r.bottom < lim.top || r.top > lim.bottom) continue;
      out.push(r);
      if (out.length >= 400) break;
    }
    return out;
  }
  function guideEl(x, y, w, h) {
    const d = document.createElement('div');
    Object.assign(d.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    return d;
  }
  // Guides with X at the ends and labeled measurements, like canvas/draw.rs in Desigma
  function drawGuides(res) {
    const parts = [];
    for (const g of res.guides || []) {
      if (g.axis === 'x') {
        parts.push(guideEl(g.pos - 0.5, g.from, 1, g.to - g.from));
        for (const y of [g.from, g.to]) { const k = document.createElement('div'); k.className = 'guidex'; Object.assign(k.style, { left: `${g.pos - 3}px`, top: `${y - 3}px` }); parts.push(k); }
      } else {
        parts.push(guideEl(g.from, g.pos - 0.5, g.to - g.from, 1));
        for (const x of [g.from, g.to]) { const k = document.createElement('div'); k.className = 'guidex'; Object.assign(k.style, { left: `${x - 3}px`, top: `${g.pos - 3}px` }); parts.push(k); }
      }
    }
    for (const m of res.measurements || []) {
      const [ax, ay] = m.a, [bx, by] = m.b;
      const horiz = Math.abs(ay - by) < 0.5;
      parts.push(horiz ? guideEl(Math.min(ax, bx), ay - 0.5, Math.abs(bx - ax), 1) : guideEl(ax - 0.5, Math.min(ay, by), 1, Math.abs(by - ay)));
      for (const [x, y] of [m.a, m.b]) parts.push(horiz ? guideEl(x - 0.5, y - 4, 1, 8) : guideEl(x - 4, y - 0.5, 8, 1));
      const lab = document.createElement('div');
      lab.className = 'gmeasure';
      lab.textContent = String(Math.round(m.v));
      Object.assign(lab.style, { left: `${(ax + bx) / 2}px`, top: `${(ay + by) / 2 + (horiz ? -10 : 0)}px` });
      parts.push(lab);
    }
    $('guides').replaceChildren(...parts);
  }
  window.addEventListener('pointermove', (e) => {
    if (!editing) return;
    if (moveT) {
      // same care as the value drag: if the button is already up and the pointerup did not arrive, end the drag
      if (e.buttons === 0) {
        endDrag();
        return;
      }
      const gx = Math.round(e.clientX - moveT.x), gy = Math.round(e.clientY - moveT.y);
      // Alt turns snapping off, like Cmd in Desigma
      const s = e.altKey
        ? { dx: 0, dy: 0, guides: [], measurements: [] }
        : snap({ left: moveT.rect.left + gx, top: moveT.rect.top + gy, width: moveT.rect.width, height: moveT.rect.height }, moveT.cands, SNAP_PX);
      editT.offset = { x: moveT.start.x + gx + s.dx, y: moveT.start.y + gy + s.dy };
      drawGuides(s);
      applyTransform();
      return;
    }
    if (drag) { drag.x2 = e.clientX; drag.y2 = e.clientY; }
    else hover = mode && mode !== 'mark' && mode !== 'draw' && !isOwn(e.target) && !isLocked(e.target) ? e.target : null;
    drawBoxes();
  }, opts);
  // Transform of the edited item: translate from drag/alignment + rotation + flip, always composed from the transform
  // computed in setEdit. Goes as edits.transform (from = original transform, to = the composed one)
  let moveT = null;
  const compose = (base, t) => {
    const parts = [];
    if (t.offset.x || t.offset.y) parts.push(`translate(${t.offset.x}px, ${t.offset.y}px)`);
    if (t.rot) parts.push(`rotate(${t.rot}deg)`);
    if (t.flipH) parts.push('scaleX(-1)');
    if (t.flipV) parts.push('scaleY(-1)');
    const extra = parts.join(' ');
    if (!extra) return base;
    return base === 'none' ? extra : `${base} ${extra}`;
  };
  function applyTransform() {
    const t = editT;
    if (!t) return;
    const to = compose(t.baseTransform, t);
    // back at the starting point: not a change (and the original inline transform stays as it was)
    if (to === t.baseTransform) { if (t.changes.transform) revertProp('transform'); return; }
    if (!('transform' in t.orig)) t.orig.transform = [t.el.style.getPropertyValue('transform'), t.el.style.getPropertyPriority('transform')];
    t.el.style.setProperty('transform', to, 'important');
    t.changes.transform = { from: t.baseTransform, to };
    updateSend();
    drawBoxes();
  }
  window.addEventListener('pointerdown', (e) => {
    if (!editing || !editT || !editT.el.isConnected) return;
    if (lockedEls.has(editT.el)) return; // a locked item does not drag
    if (isOwn(e.target) || !editT.el.contains(e.target)) return;
    block(e);
    // rect and candidates fixed at the start of the drag: the page does not move during it
    moveT = { x: e.clientX, y: e.clientY, start: editT.offset, rect: editT.el.getBoundingClientRect(), cands: snapCandidates(editT.el) };
    $('capa').hidden = false; // "moving" cursor on the whole page, without inheriting the site cursor
  }, opts);
  function endDrag() {
    if (!moveT) return;
    moveT = null;
    $('capa').hidden = true;
    drawGuides({});
    renderEdit();
    drawBoxes();
  }
  window.addEventListener('pointerup', endDrag, opts);
  // with an item being edited, a click inside it does not trigger the site
  for (const type of ['click', 'dblclick', 'contextmenu']) {
    window.addEventListener(type, (e) => {
      if (!editing || !editT || isOwn(e.target) || !editT.el.contains(e.target)) return;
      block(e);
    }, opts);
  }
  for (const type of ['pointerdown', 'mousedown', 'touchstart']) {
    window.addEventListener(type, (e) => {
      if (!editing || isOwn(e.target)) return;
      if (!mode && !inspOpen) return;
      if (inspOpen && editT && editT.el.contains(e.target)) return; // click on the edited item: it is the drag
      block(e);
      if (mode === 'mark' && type === 'pointerdown') drag = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY };
    }, opts);
  }
  for (const type of ['pointerup', 'mouseup', 'touchend', 'click', 'dblclick', 'contextmenu']) {
    window.addEventListener(type, (e) => {
      if (!editing || (isOwn(e.target) && !drag)) return;
      if (!mode && !inspOpen) return;
      // a click inside the edited item is the drag, not a change of item
      if (inspOpen && editT && editT.el.contains(e.target)) return;
      block(e);
      if (type !== 'pointerup') return;
      if (inspOpen) {
        // inspector open: the click inspects the item (it does not build a request)
        if (!lockedEls.has(e.target) && !hiddenEls.has(e.target)) setEdit(e.target);
      } else if (mode === 'select') {
        const el = e.target;
        if (isLocked(el)) return;
        setTargets(targets.some((t) => t.el === el) ? targets.filter((t) => t.el !== el) : [...targets, { el, info: describe(el) }]);
      } else if (drag) {
        const rect = dragRect();
        drag = null;
        if (rect.w > 8 && rect.h > 8) setTargets([...targets, { region: rect, info: { markedArea: rect, elements: elementsInRect(rect).map(describe) } }]);
      }
      renderPanel();
      drawBoxes();
    }, opts);
  }
  window.addEventListener('scroll', drawBoxes, true);
  window.addEventListener('resize', drawBoxes);
  // Keys typed in the panel do not reach the site shortcuts. The capture on the window runs before the site listeners
  // (registered after the overlay, in the app effects), including the capture ones, which the stopPropagation on the
  // host did not catch. Stopping there also keeps the event from reaching the panel fields, so Ctrl+Enter / Enter of
  // the fields are handled here; typing itself (default action) goes on as usual
  for (const type of ['keydown', 'keyup', 'keypress']) {
    window.addEventListener(type, (e) => {
      if (e.target !== host) return;
      e.stopImmediatePropagation();
      if (type !== 'keydown') return;
      const el = e.composedPath()[0];
      if (!$('modalbg').hidden) {
        if (e.key === 'Escape') closeUndo();
        else if (e.key === 'Enter' && el === $('myes')) { e.preventDefault(); confirmUndo(); }
        return;
      }
      if (el === $('txt')) {
        if (mention && mentionKey(e)) return;
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
      } else if (el === $('ecss')) {
        cssKey(e);
      } else if (el && el.tagName === 'INPUT' && el.onkeydown) el.onkeydown(e);
    }, true);
  }
  // Clicks on the panel do not reach the site listeners in bubble phase (e.g. "click outside closes the panel/modal" on
  // the document): they stop at the host, after the overlay's own handlers, which run before (inside the shadow root)
  for (const type of ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'click']) host.addEventListener(type, (e) => e.stopPropagation());
  // The react-native-web Modal pulls focus back inside it (ModalFocusTrap, capture listener on the document); the
  // capture on the window runs first and hides the panel focus from it
  window.addEventListener('focus', (e) => { if (e.target === host) e.stopImmediatePropagation(); }, true);

  function setTargets(list) {
    const added = list.length > targets.length;
    // random color per item: the box and the @n in the comment use the same one
    targets = list.map((t) => t.color ? t : { ...t, color: nextColor() });
    // "@ -> select/mark": the new item goes in as @n at the point of the text where the @ was typed
    if (added && pendingMention != null) {
      insertAt(pendingMention, `@${list.length} `);
      pendingMention = null;
      mode = null;
    }
    renderPanel();
    drawBoxes();
  }

  // @ in the text: menu with the items/areas already selected (@1, @2...) and shortcuts to select or mark a new one.
  // The @n in the text matches targets[n-1] ("ref" field in the request) and the label of the box on screen
  const txt = $('txt');
  // mirror behind the textarea: colors the @n with the item color (a textarea cannot color part of its text)
  const hl = $('hl');
  const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function paintHl() {
    const v = txt.value;
    let out = '', last = 0;
    for (const m of v.matchAll(/@(\d+)/g)) {
      out += escapeHtml(v.slice(last, m.index));
      out += `<span class="t" style="color:${targets[+m[1] - 1]?.color || '#dcc27a'}">${m[0]}</span>`;
      last = m.index + m[0].length;
    }
    hl.innerHTML = out + escapeHtml(v.slice(last)) + '\n';
    hl.scrollTop = txt.scrollTop;
  }
  function insertAt(pos, text, removeLen = 0) {
    const v = txt.value;
    txt.value = v.slice(0, pos) + text + v.slice(pos + removeLen);
    const c = pos + text.length;
    txt.focus();
    txt.setSelectionRange(c, c);
  }
  function closeMention() { mention = null; $('mention').hidden = true; }
  function openMention(at) {
    const items = targets.map((t, i) => ({ label: `@${i + 1}`, hint: targetName(t), pick: () => insertAt(at, `@${i + 1} `, 1) }));
    items.push({ label: 'Select item', hint: 'click the item on the page', pick: () => { insertAt(at, '', 1); pendingMention = at; mode = 'select'; renderPanel(); } });
    items.push({ label: 'Mark area', hint: 'drag on the page', pick: () => { insertAt(at, '', 1); pendingMention = at; mode = 'mark'; renderPanel(); } });
    mention = { at, idx: 0, items };
    renderMention();
  }
  function renderMention() {
    const m = $('mention');
    m.hidden = !mention;
    if (!mention) return;
    m.replaceChildren(...mention.items.map((it, i) => {
      const d = div(i === mention.idx ? 'on' : '');
      d.append(it.label, node('span', 'muted', `  ${it.hint}`));
      d.onpointerdown = (e) => e.preventDefault(); // keeps the focus in the text
      d.onclick = () => { const p = it.pick; closeMention(); p(); renderPanel(); };
      return d;
    }));
  }
  function mentionKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = mention.items.length;
      mention.idx = (mention.idx + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      renderMention();
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const p = mention.items[mention.idx].pick;
      closeMention();
      p();
      renderPanel();
      return true;
    }
    if (e.key === 'Escape') { closeMention(); return true; }
    return false;
  }
  txt.oninput = () => {
    const c = txt.selectionStart;
    const v = txt.value;
    // an @ just typed at the start or after a space opens the menu; any other typing closes it
    if (v[c - 1] === '@' && (c === 1 || /\s/.test(v[c - 2]))) openMention(c - 1);
    else closeMention();
    renderPanel();
  };
  txt.onblur = () => setTimeout(closeMention, 150);
  txt.onscroll = () => { hl.scrollTop = txt.scrollTop; };

  // Drawing: full-window canvas (1x, strokes only), active in Draw mode; the strokes stay on screen until sending or
  // "clear"
  const ink = $('ink');
  const ctx = ink.getContext('2d');
  function sizeInk() {
    ink.width = innerWidth;
    ink.height = innerHeight;
    paintInk();
  }
  function paintInk() {
    ctx.clearRect(0, 0, ink.width, ink.height);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes) {
      ctx.beginPath();
      s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y);
      ctx.stroke();
    }
  }
  function clearInk() { strokes = []; paintInk(); }
  function inkRect() {
    const pts = strokes.flat();
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x = Math.max(0, Math.min(...xs) - 4), y = Math.max(0, Math.min(...ys) - 4);
    return { x: Math.round(x), y: Math.round(y), w: Math.round(Math.max(...xs) + 4 - x), h: Math.round(Math.max(...ys) + 4 - y) };
  }
  ink.addEventListener('pointerdown', (e) => {
    if (mode !== 'draw') return;
    ink.setPointerCapture(e.pointerId);
    strokes.push([{ x: e.clientX, y: e.clientY }]);
    paintInk();
  });
  ink.addEventListener('pointermove', (e) => {
    if (mode !== 'draw' || !ink.hasPointerCapture(e.pointerId)) return;
    strokes[strokes.length - 1].push({ x: e.clientX, y: e.clientY });
    paintInk();
  });
  ink.addEventListener('pointerup', () => { if (mode === 'draw') renderPanel(); });
  window.addEventListener('resize', sizeInk);
  sizeInk();

  // Edit: 1 item at a time, in its own panel. The mapped CSS of the item (the computed value that differs from the
  // default) shows in an editable field, like the Chrome Styles panel; each change becomes an inline !important
  // preview on the element. Send goes as a request with targets[0].edits (prop, from, to) and targets[0].style (the map)
  const MAP_PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
    'align-items', 'align-self', 'justify-content', 'gap', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'margin', 'padding', 'border-width', 'border-style', 'border-color', 'border-radius', 'background-color', 'background-image', 'box-shadow',
    'opacity', 'overflow', 'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'white-space', 'cursor', 'transform', 'transition', 'animation-name', 'backdrop-filter', 'filter', 'object-fit', 'aspect-ratio'];
  // values that count as "default" and leave the map
  const DEFAULTS = new Set(['', 'none', 'normal', 'auto', '0px', '0', '0s', 'rgba(0, 0, 0, 0)', 'static', 'visible', 'nowrap', 'stretch', 'flex-start', 'start', 'row', '1', '0 0 0 0', '0px 0px 0px 0px', 'all 0s ease 0s', 'medium']);
  const styleMap = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of MAP_PROPS) {
      const v = cs.getPropertyValue(p).trim();
      if (!DEFAULTS.has(v) && !(p === 'border-style' && v === 'none')) out[p] = v;
    }
    if (out['border-style'] === undefined) { delete out['border-width']; delete out['border-color']; }
    return out;
  };
  const editCount = () => (editT?.changes ? Object.keys(editT.changes).length : 0);
  // "Send changes" also turns on when there are only items moved together (align/distribute)
  const updateSend = () => {
    const t = editT;
    const has = !!t && (Object.keys(t.changes).length > 0 || t.others.size > 0);
    $('esend').disabled = !online || (!has && !$('enote').value.trim());
    const n = editCount() + (t ? t.others.size : 0);
    $('ecount').textContent = n ? `${n} change${n > 1 ? 's' : ''}` : 'no changes';
  };
  // computed value of the item before any preview; read on demand, for any property
  const initialValue = (t, prop) => {
    if (!(prop in t.computed)) t.computed[prop] = getComputedStyle(t.el).getPropertyValue(prop);
    return t.computed[prop];
  };
  // reference value of the property: the one before the preview (map from setEdit or computed value read now)
  const baseValue = (t, prop) => (prop in t.changes ? t.changes[prop].from : (prop in t.map ? t.map[prop] : initialValue(t, prop)));
  const toHex = (c) => {
    const m = String(c).match(/\d+(\.\d+)?/g);
    return m && m.length >= 3 ? '#' + m.slice(0, 3).map((n) => Math.round(+n).toString(16).padStart(2, '0')).join('') : '#000000';
  };
  function preview(prop, value) {
    const t = editT;
    const from = t.changes[prop]?.from ?? initialValue(t, prop);
    if (!(prop in t.orig)) t.orig[prop] = [t.el.style.getPropertyValue(prop), t.el.style.getPropertyPriority(prop)];
    t.removed.delete(prop);
    t.el.style.setProperty(prop, value, 'important');
    if (!t.el.style.getPropertyValue(prop)) return; // invalid value: the browser dropped it
    t.changes[prop] = { from, to: value };
    drawBoxes();
  }
  // removes from the element the property the user deleted from the CSS field
  function removeProp(prop) {
    revertProp(prop);
    editT.removed.add(prop);
    drawBoxes();
  }
  // puts the property back to the value the item had before the preview (stays in the field, out of edits)
  function revertProp(prop) {
    const t = editT;
    if (!t) return;
    const [v, pr] = t.orig[prop] || [];
    if (v) t.el.style.setProperty(prop, v, pr); else t.el.style.removeProperty(prop);
    delete t.orig[prop];
    delete t.changes[prop];
    drawBoxes();
  }
  // field with the item map plus the changes, in the shape of the Chrome Styles panel
  const cssText = (t) => {
    const map = { ...t.map };
    for (const p of t.removed) delete map[p];
    for (const [p, c] of Object.entries(t.changes)) map[p] = c.to;
    return Object.entries(map).map(([p, v]) => `${p}: ${v};`).join('\n');
  };
  function restore(t) {
    for (const [prop, [v, pr]] of Object.entries(t.orig)) {
      if (v) t.el.style.setProperty(prop, v, pr); else t.el.style.removeProperty(prop);
    }
    // items aligned/distributed together go back to the transform they had
    for (const [el, m] of t.others) {
      if (m.base === 'none') el.style.removeProperty('transform'); else el.style.setProperty('transform', m.base);
    }
    t.others.clear();
    t.orig = {};
    t.changes = {};
    t.removed = new Set();
    t.offset = { x: 0, y: 0 };
    t.rot = 0;
    t.flipH = false;
    t.flipV = false;
  }
  function setEdit(el) {
    if (editT && editT.el === el) return;
    if (editT) restore(editT);
    drawGuides({});
    $('capa').hidden = true;
    activeScrub = null; // closing the edit in the middle of a value drag: nothing stays stuck
    if (el) {
      inspOpen = true;
      // the overlay pointer cursor is not the item style: it leaves the page while the map is read
      const pointerOn = pointerCss.isConnected;
      pointerCss.remove();
      const cs = getComputedStyle(el);
      editT = { el, info: describe(el), orig: {}, changes: {}, removed: new Set(), computed: {}, map: styleMap(el),
        baseTransform: cs.transform, offset: { x: 0, y: 0 }, rot: 0, flipH: false, flipV: false, others: new Map() };
      if (pointerOn) (document.head || document.documentElement).appendChild(pointerCss);
      // with the edit of an item open, the click on the page inspects (the select mode is kept)
      hover = null;
      drag = null;
      pendingMention = null;
      closeMention();
      $('ink').className = '';
      buildFields();
      hist.stack.length = 0;
      hist.redo.length = 0;
      hist.t = 0;
      lastText = cssText(editT);
    } else editT = null;
    renderEdit();
    renderPanel();
    drawBoxes();
    buildLayers();
  }
  // When the inspector opens the page gives up the strip of the panel (margin-right) without stretching or shrinking
  // the content, in 320ms; on close, the site inline value comes back
  let panelW = 280;
  let savedMargin = null, savedTrans = null, transTimer = 0;
  let editVisible = false;
  function applyWidth(w) {
    panelW = Math.max(240, Math.min(Math.round(w), Math.round(innerWidth * 0.5)));
    $('editp').style.width = `${panelW}px`;
    $('bar').style.right = `${panelW}px`;
    if (savedMargin !== null) document.documentElement.style.setProperty('margin-right', `${panelW}px`, 'important');
    placeBubble();
  }
  $('esplit').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const h = $('esplit');
    h.setPointerCapture(e.pointerId);
    const onMove = (ev) => applyWidth(innerWidth - ev.clientX);
    const release = () => {
      h.removeEventListener('pointermove', onMove);
      h.removeEventListener('pointerup', release);
      try { localStorage.setItem('liveEdit.inspW', String(panelW)); } catch {}
    };
    h.addEventListener('pointermove', onMove);
    h.addEventListener('pointerup', release);
  });
  function reserveStrip(on) {
    const h = document.documentElement;
    if (!REDUCE) {
      // the transition lives on the site <html> only during the change; its inline value comes back afterwards
      if (savedTrans === null) savedTrans = [h.style.getPropertyValue('transition'), h.style.getPropertyPriority('transition')];
      h.style.setProperty('transition', 'margin-right 320ms ease', 'important');
      clearTimeout(transTimer);
      transTimer = setTimeout(() => {
        const [v, p] = savedTrans;
        savedTrans = null;
        if (v) h.style.setProperty('transition', v, p); else h.style.removeProperty('transition');
      }, 340);
    }
    if (on) {
      if (savedMargin === null) savedMargin = [h.style.getPropertyValue('margin-right'), h.style.getPropertyPriority('margin-right')];
      h.style.setProperty('margin-right', `${panelW}px`, 'important');
    } else if (savedMargin !== null) {
      const [v, p] = savedMargin;
      savedMargin = null;
      if (v) h.style.setProperty('margin-right', v, p); else h.style.removeProperty('margin-right');
    }
  }
  // ---- Layers (DOM tree, without changing the page) with hide and lock
  function itemName(el) {
    const aria = el.getAttribute('aria-label') || el.getAttribute('data-nome');
    if (aria) return aria;
    const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
    const cls = [...el.classList].slice(0, 2).join('.');
    const comp = componentChain(el)[0];
    // text only when it is short and the item is a leaf/near leaf; otherwise class and component
    if (text && text.length <= 34 && el.children.length <= 2) return text;
    if (cls) return `${comp ? `${comp} ` : ''}.${cls}`;
    return comp || el.tagName.toLowerCase();
  }
  const isLocked = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) if (lockedEls.has(n)) return true;
    return false;
  };
  function toggleHidden(el) {
    if (hiddenEls.has(el)) {
      const [v, pr] = hiddenEls.get(el);
      if (v) el.style.setProperty('visibility', v, pr); else el.style.removeProperty('visibility');
      hiddenEls.delete(el);
    } else {
      hiddenEls.set(el, [el.style.getPropertyValue('visibility'), el.style.getPropertyPriority('visibility')]);
      el.style.setProperty('visibility', 'hidden', 'important');
    }
    buildLayers();
    drawBoxes();
  }
  function toggleLock(el) {
    if (lockedEls.has(el)) lockedEls.delete(el); else lockedEls.add(el);
    buildLayers();
  }
  const isItemNode = (el) => el && el.nodeType === 1 && el !== host && !host.contains(el) &&
    !['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'NOSCRIPT', 'BR', 'TEMPLATE', 'HEAD'].includes(el.tagName);
  function buildLayers() {
    if (!inspOpen) return;
    const rows = [];
    const walk = (el, depth) => {
      if (rows.length > 160 || depth > 5) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      rows.push({ el, depth });
      for (const c of el.children) if (isItemNode(c)) walk(c, depth + 1);
    };
    for (const c of document.body.children) if (isItemNode(c)) walk(c, 0);
    $('lcount').textContent = String(rows.length);
    $('ltree').replaceChildren(...rows.map(({ el, depth }) => {
      const d = div('item' + (editT && editT.el === el ? ' on' : '') + (lockedEls.has(el) ? ' locked' : ''));
      d.style.paddingLeft = `${12 + depth * 14}px`;
      const acts = node('span', 'iacts');
      const eye = document.createElement('button');
      if (hiddenEls.has(el)) { eye.className = 'off'; eye.innerHTML = LICON.eyeOff; eye.title = 'Show'; }
      else { eye.innerHTML = LICON.eye; eye.title = 'Hide'; }
      eye.setAttribute('aria-label', eye.title);
      eye.onclick = (ev) => { ev.stopPropagation(); toggleHidden(el); };
      const lock = document.createElement('button');
      if (lockedEls.has(el)) { lock.className = 'lon'; lock.innerHTML = LICON.lock; lock.title = 'Unlock'; }
      else { lock.innerHTML = LICON.unlock; lock.title = 'Lock (not selected nor dragged)'; }
      lock.setAttribute('aria-label', lock.title);
      lock.onclick = (ev) => { ev.stopPropagation(); toggleLock(el); };
      acts.append(eye, lock);
      d.append(node('span', 'name', itemName(el)), node('span', 'tag', el.tagName.toLowerCase()), acts);
      d.onclick = () => { if (lockedEls.has(el)) return; setEdit(el); };
      // hovering the row marks the item on the page
      d.onpointerenter = () => { hoverItem = el; drawBoxes(); };
      d.onpointerleave = () => { if (hoverItem === el) { hoverItem = null; drawBoxes(); } };
      return d;
    }));
  }
  function openInspector() {
    inspOpen = true;
    mode = null;
    hover = null;
    drag = null;
    if (!editT) buildFields();
    renderEdit();
    renderPanel();
  }
  function closeInspector() {
    inspOpen = false;
    hoverItem = null;
    mode = null;
    if (editT) setEdit(null);
    renderEdit();
    renderPanel();
  }
  function renderEdit() {
    const t = editT;
    const visible = inspOpen;
    $('edit').classList.toggle('on', visible);
    // chat <-> inspector, sequential: the chat panel leaves, then the inspector and the bar come in (and the reverse).
    // The page strip changes between the two and the boxes follow it
    if (visible !== editVisible) {
      editVisible = visible;
      const ep = $('editp'), bar = $('bar'), panel = $('panel');
      setPop(null);
      if (visible) {
        const enter = () => {
          if (!editVisible) return;
          panel.hidden = true;
          $('open').hidden = true;
          $('btools').appendChild($('tools'));
          $('queue').appendChild($('list'));
          ep.hidden = false;
          bar.hidden = false;
          reserveStrip(true);
          animate(ep, 'tin');
          animate(bar, 'tin');
          buildLayers();
          placeBubble();
          followBoxes();
        };
        if (!panel.hidden) animate(panel, 'tout', enter); else enter();
      } else if (!ep.hidden) {
        const leave = () => {
          if (editVisible) return;
          ep.hidden = true;
          bar.hidden = true;
          $('ptools').appendChild($('tools'));
          $('top').after($('list'));
          reserveStrip(false);
          showUi(false);
          if (editing) animate(panel, 'tin');
          followBoxes();
        };
        animate(ep, 'tout', leave);
        animate(bar, 'tout');
      }
    }
    if (!t) {
      // inspector open without an item: everything empty, waiting for a click in Layers or on the page
      closeAc();
      $('ename').textContent = 'No item';
      $('etag').textContent = '';
      $('btxt').placeholder = 'What should change?';
      $('ecss').value = '';
      $('esend').disabled = true;
      $('ecount').textContent = 'no changes';
      $('ex').value = '';
      $('ey').value = '';
      $('erot').value = '';
      $('edist').disabled = true;
      $('efh').classList.remove('on');
      $('efv').classList.remove('on');
      for (const { inp, fld } of fields) { inp.value = ''; fld.classList.remove('ch'); }
      return;
    }
    $('ename').textContent = t.info.components[0] || t.el.tagName.toLowerCase();
    $('etag').textContent = t.el.tagName.toLowerCase();
    $('btxt').placeholder = `What should change in ${itemName(t.el)}?`;
    if (root.activeElement !== $('ecss')) $('ecss').value = cssText(t);
    syncFields();
    syncPos();
    $('edist').disabled = selectedEls().length < 3;
    $('efh').classList.toggle('on', t.flipH);
    $('efv').classList.toggle('on', t.flipV);
    updateSend();
  }

  // Inspector in the Desigma shape (properties.rs): Position in the HTML and the other sections built here
  const SECTIONS = [
    { t: 'Layout', c: [['width', 'W', 'ico', IIC.width], ['height', 'H', 'ico', IIC.height]] },
    { t: 'Appearance', c: [['opacity', 'Opacity', 'pct', IIC.opacity], ['border-radius', 'Radius', 'ico', IIC.radius]] },
    { t: 'Fill', c: [['background-color', 'Fill', 'color', IIC.fill]] },
    { t: 'Stroke', c: [['border-color', 'Color', 'color', IIC.stroke], ['border-width', 'Weight', 'ico', IIC.weight]] },
    { t: 'Typography', c: [['font-size', 'Size', 'ico', IIC.font], ['font-weight', 'Weight', 'ico', IIC.bold], ['line-height', 'Line height', 'ico', IIC.leading], ['letter-spacing', 'Spacing', 'ico', IIC.tracking], ['color', 'Color', 'color', IIC.font]] },
  ];
  let fields = []; // { prop, inp, fld, kind }
  function buildFields() {
    fields = [];
    $('efields').replaceChildren(...SECTIONS.map((s) => {
      const sec = div('sec');
      sec.appendChild(div('tt', s.t));
      const grid = div('grid2');
      for (const [prop, label, kind, ico] of s.c) {
        const fld = div('fld');
        const lab = document.createElement('span');
        if (kind === 'ico' || kind === 'pct') lab.innerHTML = ico; else lab.textContent = label;
        lab.title = label;
        const inp = document.createElement('input');
        inp.spellcheck = false;
        inp.id = `le-${prop.replace(/[^a-z]/g, '')}`;
        inp.setAttribute('aria-label', `${s.t}: ${label}`);
        if (kind === 'color') inp.type = 'color';
        fld.append(lab, inp);
        inp.oninput = () => {
          const t = editT;
          if (!t) return;
          const val = kind === 'pct' ? String((parseFloat(inp.value) || 0) / 100) : inp.value;
          if (val === baseValue(t, prop)) { if (t.changes[prop]) revertProp(prop); }
          else preview(prop, val);
          fld.classList.toggle('ch', !!t.changes[prop]);
          updateSend();
          if (root.activeElement !== $('ecss')) $('ecss').value = cssText(t);
        };
        if (kind !== 'color') scrub(lab, inp);
        grid.appendChild(fld);
        fields.push({ prop, inp, fld, kind });
      }
      sec.appendChild(grid);
      return sec;
    }));
  }
  // Dragging the field prefix changes the value, as in Desigma (field.rs:164): 1 unit per pixel, x10 with Shift.
  // Listens on the window (does not depend on pointer capture) and also releases when the button is already up, so
  // the gesture never gets stuck
  let activeScrub = null;
  function dragGesture({ x, value, onMove, onRelease }) {
    let x0 = x, acc = 0, over = false;
    function release() {
      if (over) return;
      over = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
      activeScrub = null;
      if (onRelease) onRelease();
    }
    function move(ev) {
      if (ev.buttons === 0) return release(); // the button was already released and the pointerup did not arrive
      acc += (ev.clientX - x0) * (ev.shiftKey ? 10 : 1);
      x0 = ev.clientX;
      onMove(value + Math.round(acc), acc);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
  }
  function scrub(handle, inp) {
    handle.style.cursor = 'ew-resize';
    handle.addEventListener('pointerdown', (e) => {
      const m = String(inp.value).trim().match(/^(-?[\d.]+)(.*)$/);
      if (!m) return;
      e.preventDefault();
      activeScrub = inp;
      const unit = m[2] || '';
      let last = parseFloat(m[1]);
      dragGesture({
        x: e.clientX,
        value: last,
        onMove: (v) => {
          if (v === last) return;
          last = v;
          inp.value = `${v}${unit}`;
          inp.dispatchEvent(new Event('input'));
        },
      });
    });
  }
  function syncFields() {
    const t = editT;
    if (!t) return;
    const cs = getComputedStyle(t.el);
    for (const { prop, inp, fld, kind } of fields) {
      if (inp === root.activeElement || inp === activeScrub) continue;
      const v = t.changes[prop]?.to ?? cs.getPropertyValue(prop).trim();
      inp.value = kind === 'pct' ? String(Math.round((parseFloat(v) || 0) * 100)) : kind === 'color' ? toHex(v) : v;
      fld.classList.toggle('ch', !!t.changes[prop]);
    }
  }
  // inspector X/Y: position of the item relative to the parent (as Desigma shows the position in the frame)
  const relPos = (t) => {
    const r = t.el.getBoundingClientRect();
    const p = (t.el.parentElement || document.body).getBoundingClientRect();
    return { x: Math.round(r.left - p.left), y: Math.round(r.top - p.top) };
  };
  function syncPos() {
    const t = editT;
    if (!t) return;
    const p = relPos(t);
    if ($('ex') !== root.activeElement) $('ex').value = String(p.x);
    if ($('ey') !== root.activeElement) $('ey').value = String(p.y);
    if ($('erot') !== root.activeElement) $('erot').value = String(Math.round(t.rot));
  }
  const selectedEls = () => targets.filter((x) => x.el && x.el.isConnected).map((x) => x.el);
  const union = (rs) => rs.reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  // Moves by translate: the edited item goes through the transform composition (with rotation/flip, and "undo"
  // recovers it); the other selected items go inline and enter the request as extra targets
  function moveBy(el, dx, dy) {
    const t = editT;
    if (!t || (!dx && !dy)) return;
    if (el === t.el) {
      t.offset = { x: t.offset.x + dx, y: t.offset.y + dy };
      applyTransform();
    } else {
      const m = t.others.get(el) || { base: getComputedStyle(el).transform, dx: 0, dy: 0 };
      m.dx += dx;
      m.dy += dy;
      t.others.set(el, m);
      const parts = [];
      if (m.dx || m.dy) parts.push(`translate(${m.dx}px, ${m.dy}px)`);
      const to = [m.base === 'none' ? '' : m.base, parts.join(' ')].filter(Boolean).join(' ');
      if (to) el.style.setProperty('transform', to, 'important'); else el.style.removeProperty('transform');
    }
    renderEdit();
  }
  // Desigma alignment (ops.rs:540): 1 item -> parent bounds; several -> union of the selection
  function align(a) {
    const t = editT;
    if (!t) return;
    const items = selectedEls();
    if (!items.includes(t.el)) items.unshift(t.el);
    const ref = items.length === 1
      ? (t.el.parentElement || document.body).getBoundingClientRect()
      : union(items.map((el) => el.getBoundingClientRect()));
    for (const el of items) {
      const r = el.getBoundingClientRect();
      if (a === 'Left') moveBy(el, ref.left - r.left, 0);
      else if (a === 'HCenter') moveBy(el, ref.left + ref.width / 2 - (r.left + r.width / 2), 0);
      else if (a === 'Right') moveBy(el, ref.right - r.right, 0);
      else if (a === 'Top') moveBy(el, 0, ref.top - r.top);
      else if (a === 'VCenter') moveBy(el, 0, ref.top + ref.height / 2 - (r.top + r.height / 2));
      else moveBy(el, 0, ref.bottom - r.bottom);
    }
  }
  // Desigma distribute spacing (ops.rs:75): 3+ items, on the axis of the larger box
  function distribute() {
    const t = editT;
    if (!t) return;
    const items = selectedEls();
    if (items.length < 3) return;
    const rs = items.map((el) => el.getBoundingClientRect());
    const bb = union(rs);
    const horiz = bb.right - bb.left >= bb.bottom - bb.top;
    const order = items.map((_, i) => i).sort((a, b) => (horiz ? rs[a].left - rs[b].left : rs[a].top - rs[b].top));
    const total = rs.reduce((s, r) => s + (horiz ? r.width : r.height), 0);
    const start = horiz ? bb.left : bb.top;
    const end = horiz ? bb.right : bb.bottom;
    const gap = (end - start - total) / (items.length - 1);
    let cursor = start;
    for (const i of order) {
      const r = rs[i];
      const d = cursor - (horiz ? r.left : r.top);
      moveBy(items[i], horiz ? d : 0, horiz ? 0 : d);
      cursor += (horiz ? r.width : r.height) + gap;
    }
  }
  // CSS field: one property per line; applies what changed and reverts what disappeared. A property with an invalid
  // value does not enter edits (the browser dropped it, as in Chrome)
  function applyCss() {
    const t = editT;
    if (!t) return;
    const next = {};
    for (const line of $('ecss').value.split('\n')) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const prop = line.slice(0, i).trim();
      const val = line.slice(i + 1).replace(/;\s*$/, '').trim();
      if (prop && val) next[prop] = val;
    }
    // "from" of each property: the item value before the preview
    for (const [prop, val] of Object.entries(next)) {
      // equal to the original: not a change (the line stays in the field but does not enter edits)
      if (val === baseValue(t, prop)) { if (t.changes[prop]) revertProp(prop); continue; }
      if (t.changes[prop]?.to !== val) preview(prop, val);
    }
    for (const prop of Object.keys(t.changes)) if (!(prop in next)) removeProp(prop);
    updateSend();
    syncFields();
  }
  // Ctrl+Z / Ctrl+Shift+Z in the CSS field: undoes and redoes the text AND the applied style, step by step
  // (continuous typing falls into one step, as in the DevTools editor)
  const hist = { stack: [], redo: [], t: 0 };
  let lastText = '';
  let skipStep = false;
  function setText(text) {
    lastText = text;
    hist.t = 0; // the next typing opens a new step
    $('ecss').value = text;
    closeAc();
    applyCss();
  }
  function pushStep() {
    const now = Date.now();
    if (now - hist.t > 500 || !hist.stack.length) hist.stack.push(lastText);
    hist.t = now;
    hist.redo.length = 0;
    lastText = $('ecss').value;
  }
  function undoCss(redo) {
    if (redo) {
      if (!hist.redo.length) return;
      hist.stack.push(lastText);
      setText(hist.redo.pop());
      return;
    }
    if (!hist.stack.length) return;
    hist.redo.push(lastText);
    setText(hist.stack.pop());
  }
  $('ecss').oninput = () => {
    const t = editT;
    if (!t) return;
    if (!skipStep) pushStep();
    skipStep = false;
    applyCss();
    // during the drag of a number the suggestion list does not open
    if (activeScrub) closeAc(); else suggestCss();
  };

  // Property autocomplete, like DevTools: suggests while the name is typed (before the ":")
  const CSS_PROPS = 'align-content align-items align-self animation aspect-ratio backdrop-filter background background-color background-image background-position background-repeat background-size border border-bottom border-collapse border-color border-left border-radius border-right border-style border-top border-width bottom box-shadow box-sizing caret-color clip-path color column-gap content cursor display fill filter flex flex-basis flex-direction flex-flow flex-grow flex-shrink flex-wrap float font font-family font-size font-style font-weight gap grid grid-area grid-column grid-row grid-template-columns grid-template-rows height inset justify-content justify-items justify-self left letter-spacing line-height list-style margin margin-bottom margin-left margin-right margin-top max-height max-width min-height min-width mix-blend-mode object-fit object-position opacity order outline overflow overflow-x overflow-y padding padding-bottom padding-left padding-right padding-top pointer-events position resize right row-gap text-align text-decoration text-indent text-overflow text-shadow text-transform top transform transform-origin transition user-select vertical-align visibility white-space width word-break z-index'.split(' ');
  let ac = null; // { start, end, items, idx, value }
  // values per property: the list of what can be written, as in DevTools
  const VALUES = {
    display: ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none', 'contents'],
    position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
    'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
    'flex-grow': ['0', '1', '2'],
    'flex-shrink': ['0', '1', '2'],
    'align-items': ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
    'align-self': ['auto', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
    'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
    'text-align': ['left', 'center', 'right', 'justify', 'start', 'end'],
    'font-weight': ['300', '400', '500', '600', '700', '800', 'normal', 'bold'],
    'font-style': ['normal', 'italic', 'oblique'],
    'font-family': ['Switzer, system-ui, -apple-system, sans-serif', 'system-ui', 'serif', 'monospace', 'inherit'],
    overflow: ['visible', 'hidden', 'auto', 'scroll', 'clip'],
    'overflow-x': ['visible', 'hidden', 'auto', 'scroll', 'clip'],
    'overflow-y': ['visible', 'hidden', 'auto', 'scroll', 'clip'],
    'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'],
    'box-sizing': ['border-box', 'content-box'],
    cursor: ['default', 'pointer', 'move', 'grab', 'text', 'not-allowed'],
    'pointer-events': ['auto', 'none'],
    'object-fit': ['fill', 'contain', 'cover', 'none', 'scale-down'],
    'text-transform': ['none', 'uppercase', 'lowercase', 'capitalize'],
    visibility: ['visible', 'hidden'],
    'border-style': ['none', 'solid', 'dashed', 'dotted', 'double'],
    'background-repeat': ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'],
    'background-size': ['cover', 'contain', 'auto'],
    'mix-blend-mode': ['normal', 'multiply', 'screen', 'overlay', 'difference'],
    'user-select': ['auto', 'none', 'text', 'all'],
    'text-decoration': ['none', 'underline', 'line-through'],
  };
  // sizes accept auto/0/100%; any property accepts the general CSS keywords
  const DIMENSIONS = new Set(['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'margin', 'padding', 'top', 'right', 'bottom', 'left', 'inset', 'gap', 'row-gap', 'column-gap', 'font-size', 'line-height', 'letter-spacing', 'border-radius']);
  const CSS_GLOBAL = ['inherit', 'initial', 'unset', 'revert'];
  function closeAc() { ac = null; $('acss').hidden = true; }
  function suggestCss() {
    if (noSuggest) { noSuggest = false; return closeAc(); }
    const t = $('ecss');
    const pos = t.selectionStart;
    const lineStart = t.value.lastIndexOf('\n', pos - 1) + 1;
    const line = t.value.slice(lineStart, pos);
    const parts = line.split(':');
    if (parts.length > 1) {
      // after the ":": values of that property
      const prop = parts[0].trim();
      const partial = parts.slice(1).join(':').replace(/^\s+/, '');
      const vals = VALUES[prop] || (DIMENSIONS.has(prop) ? ['auto', '0', '100%', ...CSS_GLOBAL] : CSS_GLOBAL);
      const items = vals.filter((v) => v.startsWith(partial) && v !== partial).slice(0, 8);
      if (!items.length) return closeAc();
      ac = { start: pos - partial.length, end: pos, items, idx: 0, value: true };
    } else {
      const word = (line.match(/[a-zA-Z-]+$/) || [''])[0];
      const items = CSS_PROPS.filter((p) => p.startsWith(word) && p !== word).slice(0, 8);
      if (!items.length) return closeAc();
      ac = { start: pos - word.length, end: pos, items, idx: 0, value: false };
    }
    $('acss').replaceChildren(...ac.items.map((p, i) => {
      const d = div(i === 0 ? 'on' : '', p);
      d.onpointerdown = (e) => e.preventDefault(); // keeps the focus in the field
      d.onclick = () => acceptCss(p);
      return d;
    }));
    $('acss').hidden = false;
  }
  function acceptCss(text) {
    if (!ac) return;
    const t = $('ecss');
    const { start, end, value } = ac;
    closeAc();
    hist.stack.push(lastText);
    hist.t = 0;
    hist.redo.length = 0;
    t.value = t.value.slice(0, start) + (value ? text : `${text}: `) + t.value.slice(end);
    lastText = t.value;
    skipStep = true; // the history step was already recorded here
    t.focus();
    // the accepted part stays selected, like selected text
    t.setSelectionRange(start, start + text.length);
    noSuggest = true; // accepting does not reopen the list
    t.dispatchEvent(new Event('input')); // reapplies the CSS with the new property/value
  }
  let noSuggest = false;
  function cssKey(e) {
    // Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redo (in the CSS field itself)
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); undoCss(e.shiftKey); return; }
      if (k === 'y') { e.preventDefault(); undoCss(true); return; }
    }
    if (!ac) return;
    const n = ac.items.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      ac.idx = (ac.idx + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      [...$('acss').children].forEach((d, i) => { d.className = i === ac.idx ? 'on' : ''; });
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      acceptCss(ac.items[ac.idx]);
    } else if (e.key === 'Escape' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      closeAc();
    }
  }
  $('ecss').onblur = () => setTimeout(closeAc, 150);

  // Dragging a number in the CSS field itself changes the value (1 per pixel, x10 with Shift), like the Desigma drag.
  // The field uses a monospace font, so the column comes from the width of one character measured on a canvas
  const measurer = document.createElement('canvas').getContext('2d');
  function numberToken(x, y) {
    const t = $('ecss');
    const r = t.getBoundingClientRect();
    const cs = getComputedStyle(t);
    measurer.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const cw = measurer.measureText('0').width || 7;
    const lh = parseFloat(cs.lineHeight) || 17;
    const padL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    const padT = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
    const lines = t.value.split('\n');
    const li = Math.floor((y - r.top - padT + t.scrollTop) / lh);
    if (!lines[li]) return null;
    const col = Math.round((x - r.left - padL) / cw);
    const base = lines.slice(0, li).reduce((n, l) => n + l.length + 1, 0);
    for (const m of lines[li].matchAll(/-?\d+(?:\.\d+)?/g)) {
      const start = m.index, end = start + m[0].length;
      if (col >= start && col <= end) {
        const dec = (m[0].split('.')[1] || '').length;
        return { start: base + start, end: base + end, value: parseFloat(m[0]), dec, offset: base + Math.min(Math.max(col, start), end) };
      }
    }
    return null;
  }
  $('ecss').addEventListener('pointermove', (e) => {
    if (activeScrub) return;
    $('ecss').style.cursor = numberToken(e.clientX, e.clientY) ? 'ew-resize' : '';
  });
  $('ecss').addEventListener('pointerdown', (e) => {
    const tok = numberToken(e.clientX, e.clientY);
    if (!tok) return;
    e.preventDefault();
    const t = $('ecss');
    t.focus();
    hist.stack.push(lastText);
    hist.t = 0;
    hist.redo.length = 0;
    activeScrub = t; // keeps the field drag and the sync from touching the field
    let moved = false;
    dragGesture({
      x: e.clientX,
      value: tok.value,
      onMove: (v, acc) => {
        if (!moved) {
          if (Math.abs(acc) < 2) return; // a click/tremble does not change the value
          moved = true;
        }
        const text = v.toFixed(tok.dec);
        t.value = t.value.slice(0, tok.start) + text + t.value.slice(tok.end);
        tok.end = tok.start + text.length;
        t.setSelectionRange(tok.start, tok.end);
        lastText = t.value;
        skipStep = true;
        t.dispatchEvent(new Event('input'));
      },
      onRelease: () => {
        closeAc();
        // click without drag: puts the caret where it was clicked; drag: leaves the number selected
        if (moved) t.setSelectionRange(tok.start, tok.end); else t.setSelectionRange(tok.offset, tok.offset);
      },
    });
  });
  async function sendEdit(noteArg, drawing) {
    const t = editT;
    if (!t) return false;
    const note = noteArg ?? $('enote').value.trim();
    const edits = Object.entries(t.changes).map(([prop, c]) => ({ prop, from: c.from, to: c.to }));
    // items that moved together (align/distribute) enter as extra targets, each with its own transform
    const extras = [...t.others.entries()].map(([el, m]) => {
      const i = targets.findIndex((x) => x.el === el);
      return { ...(i >= 0 ? { ref: `@${i + 1}` } : {}), ...describe(el), edits: [{ prop: 'transform', from: m.base, to: el.style.transform }] };
    });
    if (!edits.length && !note && !extras.length) return false;
    const comment = note || 'Apply the properties changed in Edit (edits) to the code.';
    const r = await fetch('/__le/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, route: location.pathname + location.search, targets: [{ ...t.info, edits, style: t.map }, ...extras], drawing }),
    }).catch(() => null);
    if (!r || !r.ok) { $('eerr').textContent = `send failed${r ? ` (${r.status})` : ''}`; return false; }
    $('eerr').textContent = '';
    $('enote').value = '';
    setEdit(null);
    setPop('queue');
    return true;
  }

  // Send a request. Chat: the panel text with the selected items/areas. Inspector: the command bar line, about the
  // item being edited (or the selection when there is none). The drawing goes with it in both
  async function send() {
    const field = inspOpen ? $('btxt') : $('txt');
    const comment = field.value.trim();
    if (!comment) return;
    let drawing;
    if (strokes.length) {
      const rect = inkRect();
      drawing = { png: ink.toDataURL('image/png'), viewport: { w: innerWidth, h: innerHeight }, rect, elements: elementsInRect(rect).map(describe) };
    }
    // Inspector open on an item: the bar text goes with the pending edits; sendEdit is the only path that carries them.
    if (inspOpen && editT) {
      if (await sendEdit(comment, drawing)) { field.value = ''; clearInk(); }
      return;
    }
    const list = targets.map((t, i) => ({ ref: `@${i + 1}`, ...t.info }));
    const r = await fetch('/__le/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, route: location.pathname + location.search, targets: list, drawing }),
    }).catch(() => null);
    if (!r || !r.ok) { showErr(`send failed${r ? ` (${r.status})` : ''}`); return; }
    showErr('');
    field.value = '';
    closeMention();
    pendingMention = null;
    clearInk();
    // sent: closes selection, area and drawing (the active mode leaves too)
    mode = null;
    hover = null;
    drag = null;
    if (inspOpen) setPop('queue');
    setTargets([]);
  }

  // Avatar eyes follow the cursor (the blink is CSS). No movement with reduced motion
  if (!REDUCE) {
    const avatars = [...root.querySelectorAll('svg.av')];
    window.addEventListener('pointermove', (e) => {
      for (const a of avatars) {
        const r = a.getBoundingClientRect();
        if (!r.width) continue;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1.7, (d / 60) * 1.7);
        a.querySelector('.look').setAttribute('transform', `translate(${((dx / d) * k).toFixed(2)} ${((dy / d) * k).toFixed(2)})`);
      }
    });
  }

  $('open').onclick = () => { if (!movedOpen) setEditing(true); };
  $('exit').onclick = () => setEditing(false);
  // in the inspector Select means "no capture mode" (clicking the page inspects the item)
  const toggleMode = (m) => { mode = m === 'select' && inspOpen ? null : mode === m ? null : m; hover = null; drag = null; pendingMention = null; renderPanel(); drawBoxes(); };
  $('sel').onclick = () => toggleMode('select');
  $('mark').onclick = () => toggleMode('mark');
  $('draw').onclick = () => toggleMode('draw');
  $('mno').onclick = closeUndo;
  $('myes').onclick = confirmUndo;
  $('modalbg').onclick = (e) => { if (e.target === $('modalbg')) closeUndo(); };
  $('edit').onclick = () => { if (inspOpen) closeInspector(); else openInspector(); };
  $('eclose').onclick = () => closeInspector();
  $('eundo').onclick = () => { if (editT) { restore(editT); renderEdit(); } };
  for (const b of root.querySelectorAll('.align [data-al]')) b.onclick = () => align(b.dataset.al);
  $('edist').onclick = distribute;
  $('er90').onclick = () => { if (editT) { editT.rot += 90; applyTransform(); renderEdit(); } };
  $('efh').onclick = () => { if (editT) { editT.flipH = !editT.flipH; applyTransform(); renderEdit(); } };
  $('efv').onclick = () => { if (editT) { editT.flipV = !editT.flipV; applyTransform(); renderEdit(); } };
  $('ex').oninput = () => {
    const t = editT;
    if (!t) return;
    const to = parseFloat($('ex').value);
    if (!Number.isNaN(to)) moveBy(t.el, to - relPos(t).x, 0);
  };
  $('ey').oninput = () => {
    const t = editT;
    if (!t) return;
    const to = parseFloat($('ey').value);
    if (!Number.isNaN(to)) moveBy(t.el, 0, to - relPos(t).y);
  };
  $('erot').oninput = () => {
    const t = editT;
    if (!t) return;
    const v = parseFloat($('erot').value);
    if (Number.isNaN(v)) return;
    t.rot = v;
    applyTransform();
  };
  // X, Y and rotation also change by dragging the field prefix
  scrub($('fldx').querySelector('span'), $('ex'));
  scrub($('fldy').querySelector('span'), $('ey'));
  scrub($('fldrot').querySelector('span'), $('erot'));
  $('esend').onclick = () => sendEdit();
  $('enote').oninput = () => { updateSend(); };
  $('enote').onkeydown = (e) => { if (e.key === 'Enter') sendEdit(); };
  $('send').onclick = send;
  $('bsend').onclick = send;
  $('btxt').oninput = renderPanel;
  $('btxt').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } };

  // Footer: repo, and for a target with a command (supervised app) the app state and "restart"
  let leTarget = null, leApp = null;
  function renderTarget() {
    const t = $('target');
    t.textContent = leTarget ? `${leTarget.repo}  -  ` : '';
    if (leTarget?.cmd) {
      t.append(`app: ${leApp?.status || '?'}  -  `);
      const r = node('a', '', 'restart');
      r.title = leTarget.cmd;
      r.onclick = () => fetch('/__le/restart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      t.append(r, '  -  ');
    }
    const a = node('a', '', 'change target');
    a.href = '/__le/';
    t.appendChild(a);
  }
  try {
    const draft = sessionStorage.getItem('liveEdit.draft');
    if (draft) { $('txt').value = draft; sessionStorage.removeItem('liveEdit.draft'); }
  } catch {}

  const es = new EventSource('/__le/events');
  es.onopen = () => { online = true; renderPanel(); };
  es.onerror = () => { online = false; renderPanel(); };
  es.onmessage = (m) => {
    const ev = JSON.parse(m.data);
    if (ev.kind === 'reload') {
      // supervised app (target with a command) restarted with the new code: reload keeping the draft
      try { sessionStorage.setItem('liveEdit.draft', $('txt').value); } catch {}
      location.reload();
      return;
    }
    if (ev.kind === 'hello') {
      requests = ev.requests;
      leTarget = ev.target;
      leApp = ev.app;
      renderTarget();
    } else if (ev.kind === 'app') {
      leApp = ev;
      renderTarget();
    } else if (ev.kind === 'request') {
      const r = ev.request;
      const i = requests.findIndex((x) => x.id === r.id);
      const prev = i >= 0 ? requests[i] : null;
      if (i >= 0) requests[i] = r;
      else requests.push(r);
      if (r.status === 'done' && prev?.status !== 'done') doneAt[r.id] = Date.now();
      // the chef speaks: new request, each change of the current step, and done/error/question
      if (!prev) {
        $('list').scrollTop = 0;
        if (r.status === 'pending') openBubble(r, 'sent');
      } else if (r.status === 'working' && (prev.status !== 'working' || prev.now !== r.now)) openBubble(r, 'working');
      else if (r.status !== prev.status && ['done', 'error', 'question'].includes(r.status)) {
        if (!editing && r.status !== 'question') unseen++;
        openBubble(r, r.status);
      }
      if (prev && bubble?.id === r.id && bubble.kind === 'question' && r.status !== 'question') closeBubble();
      // new question from Claude: shows the panel (the chef button with the badge stays if the user hides it again)
      if (r.status === 'question' && prev?.status !== 'question' && !editing) setEditing(true);
    }
    renderPanel();
  };

  try {
    const iw = Number(localStorage.getItem('liveEdit.inspW'));
    applyWidth(iw || panelW);
  } catch {}
  renderPanel();
  showUi(false);
})();
