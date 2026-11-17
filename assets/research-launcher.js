/*
 * research-launcher.js - design-research shared runtime.
 * Floating launcher (Grammarly-style pill) with scenario menu, optional view switch (hidden unless
 * RESEARCH_SCENARIOS.views lists two views),
 * comments toggle and comment pins. Context-aware: optional `section` group (level 1), `screen` group (pages,
 * each option may carry `section`), and state groups/options scoped with `sections`, `screens`, `when`.
 * Only groups and chips of the current context are shown; inapplicable choices fall back to defaults.
 * Copy verbatim into <feature>/mock-runtime/.
 * Contract: .opencode/skills/design-research/references/mock-runtime.md
 */
(function () {
  'use strict';

  var cfg = window.RESEARCH_SCENARIOS || {};
  var groups = Array.isArray(cfg.groups) ? cfg.groups : [];
  var feature = cfg.feature || 'mock';
  var view = window.RESEARCH_VIEW === 'ds' ? 'ds' : 'legacy';
  var views = cfg.views || {};
  var multiView = !!(views.legacy && views.ds);
  var storeKey = 'research-launcher:' + feature;

  var KIND_LABELS = {
    extrapolation: 'Extrapolation',
    'not-implemented': 'Not implemented',
    defect: 'Legacy defect',
    'ds-gap': 'DS gap',
    source: 'Source',
    question: 'Open question'
  };

  /* ---------- state ---------- */

  function findGroup(id) {
    for (var i = 0; i < groups.length; i++) if (groups[i].id === id) return groups[i];
    return null;
  }

  function findOption(group, value) {
    if (!group || !group.options) return null;
    for (var i = 0; i < group.options.length; i++) {
      if (String(group.options[i].value) === String(value)) return group.options[i];
    }
    return null;
  }

  /* ---------- context: section -> screen -> state groups ---------- */

  var SECTION = 'section';
  var SCREEN = 'screen';

  function matches(list, value) {
    if (list == null) return true;
    var arr = Array.isArray(list) ? list : [list];
    for (var i = 0; i < arr.length; i++) if (String(arr[i]) === String(value)) return true;
    return false;
  }

  function sectionOf(s) {
    if (findGroup(SECTION)) return s[SECTION];
    var o = findOption(findGroup(SCREEN), s[SCREEN]);
    return o && o.section != null ? String(o.section) : undefined;
  }

  /* Scope of a group or option: `sections`, `screens`, `when: { groupId: value | [values] }`. */
  function inScope(item, s) {
    if (!item) return true;
    if (item.sections != null && !matches(item.sections, sectionOf(s))) return false;
    if (item.screens != null && !matches(item.screens, s[SCREEN])) return false;
    if (item.when) {
      for (var k in item.when) {
        if (Object.prototype.hasOwnProperty.call(item.when, k) && !matches(item.when[k], s[k])) return false;
      }
    }
    return true;
  }

  function screenInSection(o, sec) {
    return !!o && (o.section == null || sec == null || String(o.section) === String(sec));
  }

  function entryScreen(sec) {
    var pg = findGroup(SCREEN);
    if (!pg || !pg.options || !pg.options.length) return undefined;
    var so = findOption(findGroup(SECTION), sec);
    if (so && so.screen != null && screenInSection(findOption(pg, so.screen), sec)) return String(so.screen);
    if (pg.default != null && screenInSection(findOption(pg, pg.default), sec)) return String(pg.default);
    for (var i = 0; i < pg.options.length; i++) {
      if (screenInSection(pg.options[i], sec)) return String(pg.options[i].value);
    }
    return String(pg.options[0].value);
  }

  function baseDefault(g) {
    var first = g.options && g.options[0] ? g.options[0].value : '';
    return g.default != null ? String(g.default) : String(first);
  }

  function rawDefaults() {
    var s = {};
    groups.forEach(function (g) { s[g.id] = baseDefault(g); });
    var pg = findGroup(SCREEN);
    if (findGroup(SECTION) && pg && pg.default == null) s[SCREEN] = entryScreen(s[SECTION]);
    return s;
  }

  /*
   * Bring a state in line with its context. `pinned` lists the groups the user just set:
   * a pinned screen moves the section to the screen's section; a pinned section moves the screen
   * to the section's entry screen unless the current screen belongs to it. Every other group is
   * evaluated in declaration order: out of scope -> reset to its default; current chip no longer
   * available -> group default if available, else the first available chip; otherwise kept.
   */
  function analyze(input, pinned) {
    var s = Object.assign({}, input);
    pinned = pinned || [];
    var sg = findGroup(SECTION);
    var pg = findGroup(SCREEN);
    var active = {};
    var avail = {};

    if (sg && pg) {
      var so = findOption(pg, s[SCREEN]);
      var sectionLeads = pinned.indexOf(SECTION) >= 0 && pinned.indexOf(SCREEN) < 0;
      if (!sectionLeads && so && so.section != null && findOption(sg, so.section)) s[SECTION] = String(so.section);
      if (!screenInSection(findOption(pg, s[SCREEN]), s[SECTION])) s[SCREEN] = entryScreen(s[SECTION]);
    }
    if (sg) { active[SECTION] = true; avail[SECTION] = sg.options || []; }
    if (pg) {
      active[SCREEN] = true;
      avail[SCREEN] = (pg.options || []).filter(function (o) { return !sg || screenInSection(o, s[SECTION]); });
    }

    groups.forEach(function (g) {
      if (g.id === SECTION || g.id === SCREEN) return;
      var list = (g.options || []).filter(function (o) { return inScope(o, s); });
      var on = inScope(g, s) && list.length > 0;
      active[g.id] = on;
      avail[g.id] = on ? list : [];
      if (!on) { s[g.id] = baseDefault(g); return; }
      var ok = list.some(function (o) { return String(o.value) === s[g.id]; });
      if (!ok) {
        var d = baseDefault(g);
        s[g.id] = list.some(function (o) { return String(o.value) === d; }) ? d : String(list[0].value);
      }
    });
    return { state: s, active: active, avail: avail };
  }

  function defaults() { return analyze(rawDefaults(), []).state; }

  function parseHash() {
    var out = { state: {}, comments: null };
    var raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return out;
    raw.split('&').forEach(function (part) {
      var eq = part.indexOf('=');
      if (eq < 0) return;
      var key = part.slice(0, eq);
      var val = part.slice(eq + 1);
      if (key === 'c') out.comments = val === '1';
      if (key === 's' && val) {
        val.split(',').forEach(function (pair) {
          var c = pair.indexOf(':');
          if (c < 0) return;
          try {
            out.state[decodeURIComponent(pair.slice(0, c))] = decodeURIComponent(pair.slice(c + 1));
          } catch (e) { /* ignore malformed pair */ }
        });
      }
    });
    return out;
  }

  function sanitize(s) {
    var base = rawDefaults();
    var pinned = [];
    Object.keys(s).forEach(function (id) {
      var g = findGroup(id);
      if (g && findOption(g, s[id])) {
        base[id] = String(s[id]);
        if (id === SECTION || id === SCREEN) pinned.push(id);
      }
    });
    return analyze(base, pinned).state;
  }

  function hashString() {
    var d = defaults();
    var act = analyze(state, []).active;
    var pairs = [];
    Object.keys(state).forEach(function (id) {
      if (act[id] && state[id] !== d[id]) pairs.push(encodeURIComponent(id) + ':' + encodeURIComponent(state[id]));
    });
    var parts = [];
    if (pairs.length) parts.push('s=' + pairs.join(','));
    if (comments) parts.push('c=1');
    return parts.join('&');
  }

  function writeHash() {
    var h = hashString();
    var url = location.pathname + location.search + (h ? '#' + h : '');
    try { history.replaceState(null, '', url); } catch (e) { location.hash = h; }
  }

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(storeKey) || '{}') || {}; } catch (e) { return {}; }
  }

  function savePrefs(p) {
    try { localStorage.setItem(storeKey, JSON.stringify(p)); } catch (e) { /* file:// may block storage */ }
  }

  var initial = parseHash();
  var prefs = loadPrefs();
  var state = sanitize(initial.state);
  var comments = initial.comments != null ? initial.comments : false;
  var listeners = [];

  function emit(changed) {
    writeHash();
    listeners.slice().forEach(function (fn) {
      try { fn(Research.state, changed); } catch (e) { console.error('[research] onChange handler failed', e); }
    });
    document.dispatchEvent(new CustomEvent('research:change', { detail: { state: state, changed: changed } }));
    ui.render();
    pins.schedule();
  }

  var Research = {
    get state() { return Object.assign({}, state); },
    get comments() { return comments; },
    get view() { return view; },
    get: function (id) { return state[id]; },
    set: function (id, value) {
      var o = {}; o[id] = value; Research.setMany(o);
    },
    setMany: function (obj) {
      var next = Object.assign({}, state);
      var pinned = [];
      Object.keys(obj || {}).forEach(function (id) {
        var g = findGroup(id);
        if (!g) { console.warn('[research] unknown scenario group: ' + id); return; }
        if (!findOption(g, obj[id])) { console.warn('[research] unknown option ' + obj[id] + ' for ' + id); return; }
        next[id] = String(obj[id]);
        pinned.push(id);
      });
      if (!pinned.length) return;
      next = analyze(next, pinned).state;
      pinned.forEach(function (id) {
        if (next[id] !== String(obj[id])) console.warn('[research] ' + id + ':' + obj[id] + ' is not available in the current context');
      });
      applyState(next);
    },
    isActive: function (id) { return !!analyze(state, []).active[id]; },
    available: function (id) {
      return (analyze(state, []).avail[id] || []).map(function (o) { return String(o.value); });
    },
    onChange: function (fn) {
      listeners.push(fn);
      try { fn(Research.state, Object.keys(state)); } catch (e) { console.error('[research] onChange handler failed', e); }
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    },
    setComments: function (on) {
      comments = !!on;
      writeHash();
      document.documentElement.classList.toggle('research-comments-on', comments);
      document.dispatchEvent(new CustomEvent('research:comments', { detail: { on: comments } }));
      ui.render();
      pins.schedule();
    },
    reset: function () {
      if (!applyState(defaults())) ui.render();
    },
    refreshComments: function () { pins.schedule(); },
    isExtrapolated: function () {
      var act = analyze(state, []).active;
      return groups.some(function (g) { var o = findOption(g, state[g.id]); return !!(act[g.id] && o && o.extrapolated); });
    }
  };

  function applyState(next) {
    var changed = Object.keys(next).filter(function (id) { return next[id] !== state[id]; });
    state = next;
    if (changed.length) emit(changed);
    return changed.length > 0;
  }

  window.Research = Research;

  window.addEventListener('hashchange', function () {
    var p = parseHash();
    var next = sanitize(p.state);
    if (p.comments != null && p.comments !== comments) Research.setComments(p.comments);
    applyState(next);
  });

  /* ---------- UI ---------- */

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    '.root{position:fixed;right:16px;bottom:16px;z-index:2147483000;font:13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1e1e21}',
    'button{font:inherit;color:inherit;cursor:pointer}',
    'button:focus-visible{outline:2px solid #3a1afe;outline-offset:2px}',
    '.pill{position:relative;display:flex;align-items:center;min-width:184px;max-width:280px;height:24px;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18),0 4px 14px rgba(0,0,0,.12);overflow:hidden}',
    '.pill-main{flex:1;display:flex;align-items:center;gap:6px;min-width:0;height:100%;padding:0 10px 0 8px;border:0;background:transparent;text-align:left}',
    '.dot{flex:none;width:8px;height:8px;border-radius:50%;background:#3a1afe}',
    '.title{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:600}',
    '.tag{flex:none;padding:0 6px;border-radius:8px;font-size:11px;line-height:16px;background:#eef0f6;color:#48484c}',
    '.tag-x{background:#fff1d6;color:#7a4b00}',
    '.pill-tools{display:flex;align-items:center;height:100%;max-width:0;overflow:hidden;transition:max-width .15s ease}',
    '.pill:hover .pill-tools,.pill:focus-within .pill-tools,.root.open .pill-tools{max-width:60px}',
    '.icon-btn{display:grid;place-items:center;width:26px;height:24px;border:0;background:transparent;color:#5c5c63}',
    '.icon-btn:hover{background:#f1f2f7;color:#1e1e21}',
    '.mini{display:grid;place-items:center;width:24px;height:24px;border-radius:12px;border:0;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18),0 4px 14px rgba(0,0,0,.12)}',
    '.mini .dot{width:10px;height:10px}',
    '.mini.x .dot{background:#d98a00}',
    '.menu{position:absolute;right:0;bottom:32px;width:340px;max-height:min(72vh,640px);overflow:auto;border-radius:20px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.14),0 12px 36px rgba(0,0,0,.18);padding:14px 14px 10px}',
    '.menu[hidden],.pill[hidden],.mini[hidden]{display:none}',
    '.head{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px}',
    '.head-text{flex:1;min-width:0}',
    '.head-title{font-weight:700;font-size:14px}',
    '.head-sub{color:#6b6b73;font-size:12px}',
    '.sec{padding:10px 0;border-top:1px solid #ececf1}',
    '.sec-label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#6b6b73}',
    '.seg{display:flex;padding:2px;border-radius:10px;background:#f1f2f7}',
    '.seg button{flex:1;padding:4px 8px;border:0;border-radius:8px;background:transparent;color:#48484c}',
    '.seg button[aria-pressed="true"]{background:#fff;color:#1e1e21;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}',
    '.seg button:disabled{opacity:.45;cursor:not-allowed}',
    '.opts{display:flex;flex-wrap:wrap;gap:4px}',
    '.opt{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border:1px solid #dcdde3;border-radius:12px;background:#fff;color:#2f2f32}',
    '.opt:hover{border-color:#b9b9c3}',
    '.opt[aria-checked="true"]{border-color:#3a1afe;background:#efedff;color:#2b13c7;font-weight:600}',
    '.opt .xmark{font-size:10px;padding:0 4px;border-radius:6px;background:#fff1d6;color:#7a4b00;font-weight:600}',
    '.ctx{display:flex;flex-direction:column;gap:10px;background:#fafafc;margin:0 -14px;padding:10px 14px}',
    '.states-head{padding:10px 0 0;border-top:1px solid #ececf1;font-weight:700;font-size:12px;color:#1e1e21}',
    '.states-head + .sec{border-top:0}',
    '.empty{padding:6px 0 10px}',
    '.tag-ctx{max-width:110px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.note{margin-top:6px;padding:6px 8px;border-radius:8px;background:#fff8e8;color:#5c3d00;font-size:12px}',
    '.switch{position:relative;width:34px;height:20px;border:0;border-radius:10px;background:#c9cad2;transition:background .15s}',
    '.switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .15s}',
    '.switch[aria-checked="true"]{background:#3a1afe}',
    '.switch[aria-checked="true"]::after{transform:translateX(14px)}',
    '.row{display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.muted{color:#6b6b73;font-size:12px}',
    '.clist{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}',
    '.clist button{display:flex;gap:8px;width:100%;padding:6px 8px;border:0;border-radius:10px;background:#f7f7fa;text-align:left}',
    '.clist button:hover{background:#efedff}',
    '.num{flex:none;display:grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border-radius:9px;color:#fff;font-size:11px;font-weight:700}',
    '.k-extrapolation{background:#d98a00}.k-not-implemented{background:#6b6b73}.k-defect{background:#c4122f}.k-ds-gap{background:#0b7a75}.k-source{background:#3a1afe}.k-question{background:#7b2cbf}',
    '.foot{display:flex;gap:6px;padding-top:10px;border-top:1px solid #ececf1}',
    '.btn{padding:5px 10px;border:1px solid #dcdde3;border-radius:12px;background:#fff}',
    '.btn:hover{background:#f1f2f7}',
    '.pins{position:fixed;inset:0;pointer-events:none;z-index:2147482999}',
    '.pin{position:fixed;pointer-events:auto;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer}',
    '.pin.flash{animation:flash .9s ease 2}',
    '@keyframes flash{50%{transform:scale(1.5)}}',
    '.bubble{position:fixed;pointer-events:auto;max-width:300px;padding:8px 10px;border-radius:12px;background:#1e1e21;color:#fff;font-size:12px;box-shadow:0 6px 20px rgba(0,0,0,.25)}',
    '.bubble b{display:block;margin-bottom:2px;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:#c9cad2}',
    '.outline{position:fixed;pointer-events:none;border:2px dashed #3a1afe;border-radius:4px}'
  ].join('\n');

  var ICON_MENU = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="3" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="13" cy="8" r="1.5" fill="currentColor"/></svg>';
  var ICON_MIN = '<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_CLOSE = '<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var host, shadow, root, menu, pillMain, pinsLayer, bubble, outline;
  var menuOpen = false;
  var collapsed = !!prefs.collapsed;

  var ui = {
    mounted: false,
    mount: function () {
      host = document.createElement('div');
      host.id = 'research-launcher-host';
      host.setAttribute('data-research-ui', '');
      shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML =
        '<style>' + CSS + '</style>' +
        '<div class="pins" part="pins"></div>' +
        '<div class="root">' +
        '  <div class="menu" id="rl-menu" role="dialog" aria-label="Research controls" hidden></div>' +
        '  <div class="pill">' +
        '    <button class="pill-main" type="button" aria-haspopup="dialog" aria-controls="rl-menu" aria-expanded="false"></button>' +
        '    <span class="pill-tools">' +
        '      <button class="icon-btn" type="button" data-act="menu" aria-label="Open research menu" title="Research menu (Alt+Shift+R)">' + ICON_MENU + '</button>' +
        '      <button class="icon-btn" type="button" data-act="collapse" aria-label="Collapse launcher" title="Collapse">' + ICON_MIN + '</button>' +
        '    </span>' +
        '  </div>' +
        '  <button class="mini" type="button" data-act="expand" aria-label="Show research launcher" title="Research launcher"><span class="dot"></span></button>' +
        '</div>';
      root = shadow.querySelector('.root');
      menu = shadow.querySelector('.menu');
      pillMain = shadow.querySelector('.pill-main');
      pinsLayer = shadow.querySelector('.pins');

      shadow.addEventListener('click', onShadowClick);
      document.addEventListener('click', function (e) {
        if (!menuOpen && !bubble) return;
        var path = e.composedPath ? e.composedPath() : [];
        if (path.indexOf(host) === -1) { ui.close(false); hideBubble(); }
      }, true);
      document.addEventListener('keydown', function (e) {
        if (e.altKey && e.shiftKey && (e.code === 'KeyR' || e.key === 'R' || e.key === 'r')) {
          e.preventDefault();
          if (collapsed) setCollapsed(false);
          menuOpen ? ui.close(true) : ui.open();
        } else if (e.key === 'Escape') {
          if (bubble) { hideBubble(); e.stopPropagation(); }
          else if (menuOpen) { ui.close(true); e.stopPropagation(); }
        }
      }, true);

      document.body.appendChild(host);
      document.documentElement.classList.toggle('research-comments-on', comments);
      ui.mounted = true;
      ui.render();
      pins.start();
    },
    open: function () {
      menuOpen = true;
      ui.render();
      var first = menu.querySelector('button:not(:disabled)');
      if (first) first.focus();
    },
    close: function (returnFocus) {
      if (!menuOpen) return;
      menuOpen = false;
      ui.render();
      if (returnFocus && pillMain) pillMain.focus();
    },
    render: function () {
      if (!ui.mounted) return;
      var x = Research.isExtrapolated();
      root.classList.toggle('open', menuOpen);
      shadow.querySelector('.pill').hidden = collapsed;
      var mini = shadow.querySelector('.mini');
      mini.hidden = !collapsed;
      mini.classList.toggle('x', x);
      pillMain.setAttribute('aria-expanded', String(menuOpen));
      pillMain.innerHTML =
        '<span class="dot"></span>' +
        '<span class="title">' + esc(cfg.title || feature) + '</span>' +
        (pageLabel() ? '<span class="tag tag-ctx" title="' + esc(pageLabel()) + '">' + esc(pageLabel()) + '</span>' : '') +
        (multiView ? '<span class="tag">' + (view === 'ds' ? 'DS' : 'Legacy') + '</span>' : '') +
        (comments ? '<span class="tag">' + pins.count() + '</span>' : '') +
        (x ? '<span class="tag tag-x" title="An extrapolated scenario is active">Extrap.</span>' : '');
      menu.hidden = !menuOpen;
      if (menuOpen) {
        var key = focusKey(shadow.activeElement);
        var top = menu.scrollTop;
        menu.innerHTML = menuHtml();
        menu.scrollTop = top;
        if (key) focusAfterRender(key);
      }
    }
  };

  function pageLabel() {
    var o = findOption(findGroup(SCREEN), state[SCREEN]) || findOption(findGroup(SECTION), state[SECTION]);
    return o ? String(o.label || o.value) : '';
  }

  function focusKey(el) {
    if (!el || !menu.contains(el)) return null;
    var attrs = ['data-act', 'data-view', 'data-goto'];
    for (var i = 0; i < attrs.length; i++) {
      if (el.hasAttribute(attrs[i])) return '[' + attrs[i] + '="' + cssEsc(el.getAttribute(attrs[i])) + '"]';
    }
    if (el.hasAttribute('data-group')) {
      return '[data-group="' + cssEsc(el.getAttribute('data-group')) + '"][data-value="' + cssEsc(el.getAttribute('data-value')) + '"]';
    }
    return null;
  }

  function menuHtml() {
    var h = '';
    h += '<div class="head"><div class="head-text"><div class="head-title">' + esc(cfg.title || feature) + '</div>' +
      '<div class="head-sub">Research mock' + (multiView && cfg.dsLabel ? ' - DS: ' + esc(cfg.dsLabel) : '') + '</div></div>' +
      '<button class="icon-btn" type="button" data-act="close" aria-label="Close menu">' + ICON_CLOSE + '</button></div>';

    if (multiView) {
      h += '<div class="sec"><div class="sec-label">View</div><div class="seg" role="group" aria-label="View">' +
        '<button type="button" data-view="legacy" aria-pressed="' + (view === 'legacy') + '">Legacy</button>' +
        '<button type="button" data-view="ds" aria-pressed="' + (view === 'ds') + '">Design system</button>' +
        '</div></div>';
    }

    h += '<div class="sec"><div class="row"><div><div style="font-weight:600">Comments</div>' +
      '<div class="muted">' + (comments ? pins.count() + ' on this screen' : 'Research notes are hidden') + '</div></div>' +
      '<button class="switch" type="button" role="switch" data-act="comments" aria-checked="' + comments + '" aria-label="Show comments"></button></div>';
    if (comments) {
      var list = pins.items();
      if (list.length) {
        h += '<ol class="clist">';
        list.forEach(function (it, i) {
          h += '<li><button type="button" data-goto="' + i + '"><span class="num k-' + esc(it.kind) + '">' + (i + 1) + '</span>' +
            '<span><b style="font-size:11px">' + esc(KIND_LABELS[it.kind] || it.kind) + '</b><br>' + esc(it.text) + '</span></button></li>';
        });
        h += '</ol>';
      }
    }
    h += '</div>';

    var ctx = analyze(state, []);
    var ctxGroups = groups.filter(function (g) { return g.id === SECTION || g.id === SCREEN; });
    var stateGroups = groups.filter(function (g) { return g.id !== SECTION && g.id !== SCREEN && ctx.active[g.id]; });

    if (ctxGroups.length) {
      h += '<div class="sec ctx">';
      ctxGroups.forEach(function (g) { h += groupHtml(g, ctx.avail[g.id] || []); });
      h += '</div>';
    }
    if (ctxGroups.length) {
      var page = findOption(findGroup(SCREEN), state[SCREEN]) || findOption(findGroup(SECTION), state[SECTION]);
      h += '<div class="states-head">States' + (page ? ' for ' + esc(page.label || page.value) : '') + '</div>';
      if (!stateGroups.length) h += '<div class="muted empty">No state options for this page.</div>';
    }
    stateGroups.forEach(function (g) {
      h += '<div class="sec">' + groupHtml(g, ctx.avail[g.id]) + '</div>';
    });

    h += '<div class="foot"><button class="btn" type="button" data-act="reset">Reset to defaults</button>' +
      '<button class="btn" type="button" data-act="copy">Copy link</button></div>';
    return h;
  }

  function groupHtml(g, list) {
    var h = '';
    var cur = findOption(g, state[g.id]);
    h += '<div class="grp"><div class="sec-label" id="rl-g-' + esc(g.id) + '">' + esc(g.label || g.id) + '</div>' +
      '<div class="opts" role="radiogroup" aria-labelledby="rl-g-' + esc(g.id) + '">';
    list.forEach(function (o) {
      var on = String(o.value) === state[g.id];
      h += '<button type="button" class="opt" role="radio" aria-checked="' + on + '" data-group="' + esc(g.id) +
        '" data-value="' + esc(o.value) + '"' + (o.note ? ' title="' + esc(o.note) + '"' : '') + '>' + esc(o.label || o.value) +
        (o.extrapolated ? '<span class="xmark">extrapolated</span>' : '') + '</button>';
    });
    h += '</div>';
    if (cur && (cur.extrapolated || cur.note)) {
      h += '<div class="note">' + (cur.extrapolated ? 'Design extrapolation, not observed in code. ' : '') + esc(cur.note || '') + '</div>';
    }
    h += '</div>';
    return h;
  }

  function setCollapsed(v) {
    collapsed = v;
    prefs.collapsed = v;
    savePrefs(prefs);
    if (v) menuOpen = false;
    ui.render();
  }

  function onShadowClick(e) {
    var t = e.target.closest ? e.target.closest('button') : null;
    if (!t) return;
    if (t.classList.contains('pill-main')) { menuOpen ? ui.close(true) : ui.open(); return; }
    if (t.classList.contains('pin')) { showBubble(+t.getAttribute('data-i'), t); return; }
    var act = t.getAttribute('data-act');
    if (act === 'menu') { menuOpen ? ui.close(true) : ui.open(); return; }
    if (act === 'collapse') { setCollapsed(true); shadow.querySelector('.mini').focus(); return; }
    if (act === 'expand') { setCollapsed(false); ui.open(); return; }
    if (act === 'close') { ui.close(true); return; }
    if (act === 'comments') { Research.setComments(!comments); focusAfterRender('[data-act="comments"]'); return; }
    if (act === 'reset') { Research.reset(); focusAfterRender('[data-act="reset"]'); return; }
    if (act === 'copy') {
      var url = location.href;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { t.textContent = 'Copied'; }, function () { t.textContent = 'Copy failed'; });
      return;
    }
    var v = t.getAttribute('data-view');
    if (v) {
      if (multiView && v !== view && views[v]) {
        var h = hashString();
        location.href = views[v] + (h ? '#' + h : '');
      }
      return;
    }
    var g = t.getAttribute('data-group');
    if (g) {
      Research.set(g, t.getAttribute('data-value'));
      focusAfterRender('[data-group="' + cssEsc(g) + '"][data-value="' + cssEsc(t.getAttribute('data-value')) + '"]');
      return;
    }
    var gi = t.getAttribute('data-goto');
    if (gi != null) { pins.goTo(+gi); }
  }

  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  function focusAfterRender(sel) {
    var el = menu.querySelector(sel);
    if (el) el.focus();
  }

  /* ---------- comment pins ---------- */

  function hideBubble() {
    if (bubble) { bubble.remove(); bubble = null; }
    if (outline) { outline.remove(); outline = null; }
  }

  function showBubble(i, pinEl) {
    hideBubble();
    var it = pins.items()[i];
    if (!it) return;
    var r = it.el.getBoundingClientRect();
    outline = document.createElement('div');
    outline.className = 'outline';
    outline.style.cssText = 'left:' + (r.left - 3) + 'px;top:' + (r.top - 3) + 'px;width:' + (r.width + 6) + 'px;height:' + (Math.max(r.height, 4) + 6) + 'px';
    pinsLayer.appendChild(outline);
    bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.setAttribute('role', 'note');
    bubble.innerHTML = '<b>' + (i + 1) + '. ' + esc(KIND_LABELS[it.kind] || it.kind) + '</b>' + esc(it.text);
    pinsLayer.appendChild(bubble);
    var p = pinEl.getBoundingClientRect();
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var left = Math.min(Math.max(8, p.left), window.innerWidth - bw - 8);
    var top = p.bottom + 6;
    if (top + bh > window.innerHeight - 8) top = Math.max(8, p.top - bh - 6);
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }

  var pins = {
    list: [],
    queued: false,
    isVisible: function (el) {
      if (el.closest('[data-research-ui]')) return false;
      if (!el.getClientRects().length) return false;
      var cs = getComputedStyle(el);
      return cs.visibility !== 'hidden';
    },
    collect: function () {
      var all = document.querySelectorAll('[data-comment]');
      var out = [];
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (!pins.isVisible(el)) continue;
        out.push({ el: el, text: el.getAttribute('data-comment'), kind: el.getAttribute('data-comment-kind') || 'source' });
      }
      pins.list = out;
      return out;
    },
    items: function () { return pins.list; },
    count: function () { return pins.list.length; },
    draw: function () {
      pins.queued = false;
      if (!ui.mounted) return;
      var before = pins.signature();
      pins.collect();
      var changedList = before !== pins.signature();
      Array.prototype.slice.call(pinsLayer.querySelectorAll('.pin')).forEach(function (n) { n.remove(); });
      if (!comments) { hideBubble(); if (changedList) ui.render(); return; }
      pins.list.forEach(function (it, i) {
        var r = it.el.getBoundingClientRect();
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pin num k-' + it.kind;
        b.setAttribute('data-i', String(i));
        b.setAttribute('aria-label', 'Comment ' + (i + 1) + ': ' + (KIND_LABELS[it.kind] || it.kind));
        b.textContent = String(i + 1);
        var x = Math.min(Math.max(2, r.right - 10), window.innerWidth - 24);
        var y = Math.min(Math.max(2, r.top - 10), window.innerHeight - 24);
        b.style.left = x + 'px';
        b.style.top = y + 'px';
        pinsLayer.appendChild(b);
      });
      if (changedList) ui.render();
    },
    signature: function () {
      return pins.list.map(function (it) { return it.kind + '|' + it.text; }).join('\n');
    },
    schedule: function () {
      if (pins.queued) return;
      pins.queued = true;
      (window.requestAnimationFrame || setTimeout)(pins.draw);
    },
    goTo: function (i) {
      var it = pins.list[i];
      if (!it) return;
      it.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(function () {
        pins.draw();
        var pin = pinsLayer.querySelector('.pin[data-i="' + i + '"]');
        if (pin) { pin.classList.add('flash'); showBubble(i, pin); }
      }, 350);
    },
    start: function () {
      window.addEventListener('scroll', function () { hideBubble(); pins.schedule(); }, true);
      window.addEventListener('resize', pins.schedule);
      if (window.MutationObserver) {
        new MutationObserver(function (records) {
          for (var i = 0; i < records.length; i++) {
            if (records[i].target !== host) { pins.schedule(); return; }
          }
        }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'open', 'data-comment'] });
      }
      pins.schedule();
    }
  };

  function boot() {
    if (!groups.length) console.warn('[research] window.RESEARCH_SCENARIOS has no groups; load scenarios.js before research-launcher.js');
    ui.mount();
    writeHash();
    document.dispatchEvent(new CustomEvent('research:ready', { detail: { state: Research.state } }));
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
