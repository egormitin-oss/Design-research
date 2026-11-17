/*
 * mock-behaviors.js - design-research shared runtime.
 * Declarative page behaviors for static research mocks: screens and back navigation,
 * modals, tabs, dropdowns, field validation, submit/action outcomes, loading, toasts, banners.
 * DS-agnostic: shows/hides author-written markup; visual state classes come from a preset.
 * Copy verbatim into <feature>/mock-runtime/. Contract: references/mock-runtime.md
 */
(function () {
  'use strict';

  var PRESETS = {
    plain: {
      fieldErrorClass: 'has-error',
      wrapperErrorClass: 'has-error',
      tabActiveClass: 'is-active',
      tabActiveTarget: 'self',
      overlayVisibleClass: 'is-visible',
      loadingClass: 'is-loading',
      spinnerHtml: '<span class="mb-spinner" aria-hidden="true"></span>',
      toastRegionClass: 'mb-toast-region',
      toastVisibleClass: 'is-visible',
      toastHtml: function (kind, text) {
        return '<div class="mb-toast mb-toast--' + kind + '" role="status"><span data-toast-text></span>' +
          '<button type="button" class="mb-toast-dismiss" data-toast-dismiss aria-label="Dismiss">x</button></div>';
      }
    },
    'helios-classic': {
      fieldErrorClass: 'vd-error',
      wrapperErrorClass: '',
      tabActiveClass: 'vd-tab--active',
      tabActiveTarget: '.vd-tab',
      overlayVisibleClass: 'vd-overlay--visible',
      loadingClass: '',
      spinnerHtml: '<span class="vd-loader vd-loader--small" aria-hidden="true" style="margin-right:8px"></span>',
      toastRegionClass: 'vd-toast-notification-container',
      toastVisibleClass: 'vd-visible',
      toastHtml: function (kind, text) {
        var mod = kind === 'error' ? 'negative' : 'success';
        return '<div class="vd-toast-notification vd-toast-notification--' + mod + '" role="status">' +
          '<span data-toast-text></span>' +
          '<span class="vd-toast-notification-dismiss" data-toast-dismiss role="button" tabindex="0" aria-label="Dismiss">x</span></div>';
      }
    }
  };

  var dsCfg = window.RESEARCH_DS || {};
  var preset = Object.assign({}, PRESETS[dsCfg.preset] || PRESETS.plain, dsCfg.overrides || {});

  var DELAY = { ok: 600, slow: 3000, 'slow-error': 3000 };
  var TOAST_MS = 4000;
  var SUCCESS = { ok: true, success: true, slow: true };

  var BASE_CSS =
    '.mb-spinner{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:mb-spin .7s linear infinite}' +
    '@keyframes mb-spin{to{transform:rotate(360deg)}}' +
    '.mb-toast-region{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147482000;display:flex;flex-direction:column;gap:8px;pointer-events:none}' +
    '.mb-toast{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:4px;color:#fff;background:#2e7d32;box-shadow:0 2px 8px rgba(0,0,0,.2);font:14px/1.3 sans-serif}' +
    '.mb-toast--error{background:#c62828}' +
    '.mb-toast-dismiss{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit}' +
    '[data-screen][hidden],[data-modal][hidden],[data-tab-panel][hidden],[data-dropdown][hidden],[data-error-for][hidden],[data-banner][hidden]{display:none !important}';

  function injectBase() {
    if (document.getElementById('mb-base-css')) return;
    var s = document.createElement('style');
    s.id = 'mb-base-css';
    s.textContent = BASE_CSS;
    document.head.insertBefore(s, document.head.firstChild);
  }

  function R() { return window.Research || null; }
  function hasGroup(id) {
    var c = window.RESEARCH_SCENARIOS;
    return !!(c && c.groups && c.groups.some(function (g) { return g.id === id; }));
  }
  function addCls(el, cls) { if (el && cls) cls.split(/\s+/).forEach(function (c) { if (c) el.classList.add(c); }); }
  function rmCls(el, cls) { if (el && cls) cls.split(/\s+/).forEach(function (c) { if (c) el.classList.remove(c); }); }
  function attrEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  /* ---------- screens ---------- */

  var currentScreen = null;
  var history = [];

  function showScreen(id, opts) {
    if (!id) return;
    var screens = document.querySelectorAll('[data-screen]');
    if (!screens.length) return;
    var found = false;
    for (var i = 0; i < screens.length; i++) {
      var on = screens[i].getAttribute('data-screen') === id;
      screens[i].hidden = !on;
      if (on) found = true;
    }
    if (!found) { console.warn('[mock] no [data-screen="' + id + '"]'); return; }
    if (currentScreen && currentScreen !== id && !(opts && opts.fromBack)) history.push(currentScreen);
    currentScreen = id;
    closeAllModals(false);
    closeAllDropdowns();
  }

  function navigate(id) {
    var r = R();
    if (r && hasGroup('screen')) r.set('screen', id);
    else showScreen(id);
  }

  function back() {
    var prev = history.pop();
    if (!prev) return;
    var r = R();
    if (r && hasGroup('screen')) { backPending = true; r.set('screen', prev); }
    else showScreen(prev, { fromBack: true });
  }
  var backPending = false;

  /* ---------- modals ---------- */

  var modalStack = [];
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function modalEl(id) { return document.querySelector('[data-modal="' + attrEsc(id) + '"]'); }

  function openModal(id, opener) {
    var el = modalEl(id);
    if (!el) { console.warn('[mock] no [data-modal="' + id + '"]'); return; }
    el.hidden = false;
    addCls(el.querySelector('[data-modal-overlay]') || (el.hasAttribute('data-modal-overlay') ? el : null), preset.overlayVisibleClass);
    if (!el.hasAttribute('role') && !el.querySelector('[role=dialog]')) el.setAttribute('role', 'dialog');
    modalStack.push({ id: id, el: el, opener: opener || document.activeElement });
    var f = el.querySelector('[autofocus]') || el.querySelector(FOCUSABLE);
    if (f) setTimeout(function () { f.focus(); }, 0);
    el.dispatchEvent(new CustomEvent('mock:modal-open', { bubbles: true, detail: { id: id } }));
  }

  function closeModal(id, restoreFocus) {
    var idx = -1;
    for (var i = modalStack.length - 1; i >= 0; i--) if (!id || modalStack[i].id === id) { idx = i; break; }
    var entry = idx >= 0 ? modalStack.splice(idx, 1)[0] : null;
    var el = entry ? entry.el : (id ? modalEl(id) : null);
    if (!el) return;
    el.hidden = true;
    rmCls(el.querySelector('[data-modal-overlay]') || (el.hasAttribute('data-modal-overlay') ? el : null), preset.overlayVisibleClass);
    el.querySelectorAll('form[data-validate]').forEach(function (f) { clearForm(f); });
    if (restoreFocus !== false && entry && entry.opener && entry.opener.focus) entry.opener.focus();
    el.dispatchEvent(new CustomEvent('mock:modal-close', { bubbles: true, detail: { id: entry ? entry.id : id } }));
  }

  function closeAllModals(restoreFocus) {
    while (modalStack.length) closeModal(modalStack[modalStack.length - 1].id, restoreFocus);
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || !modalStack.length) return;
    var el = modalStack[modalStack.length - 1].el;
    var items = Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function (n) { return n.getClientRects().length; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  /* ---------- tabs ---------- */

  function tabTarget(tab) {
    var t = preset.tabActiveTarget;
    if (!t || t === 'self') return tab;
    return tab.closest(t) || tab;
  }

  function activateTab(tab) {
    var box = tab.closest('[data-tabs]');
    if (!box) return;
    var id = tab.getAttribute('data-tab');
    box.querySelectorAll('[data-tab]').forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      if (!t.hasAttribute('role')) t.setAttribute('role', 'tab');
      (on ? addCls : rmCls)(tabTarget(t), preset.tabActiveClass);
    });
    box.querySelectorAll('[data-tab-panel]').forEach(function (p) {
      if (p.closest('[data-tabs]') !== box) return;
      p.hidden = p.getAttribute('data-tab-panel') !== id;
    });
  }

  function initTabs(scope) {
    (scope || document).querySelectorAll('[data-tabs]').forEach(function (box) {
      var tabs = box.querySelectorAll('[data-tab]');
      if (!tabs.length) return;
      var active = box.querySelector('[data-tab][aria-selected="true"]') || tabs[0];
      activateTab(active);
    });
  }

  /* ---------- dropdowns ---------- */

  function closeAllDropdowns(except) {
    document.querySelectorAll('[data-dropdown]').forEach(function (d) {
      if (d === except) return;
      d.hidden = true;
      var t = document.querySelector('[data-dropdown-toggle="' + attrEsc(d.getAttribute('data-dropdown')) + '"]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  function toggleDropdown(toggle) {
    var id = toggle.getAttribute('data-dropdown-toggle');
    var d = document.querySelector('[data-dropdown="' + attrEsc(id) + '"]');
    if (!d) return;
    var open = d.hidden;
    closeAllDropdowns(d);
    d.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  /* ---------- validation ---------- */

  var validators = {};

  function fieldMessage(f) {
    var v = f.value == null ? '' : String(f.value);
    var trimmed = v.trim();
    if (f.disabled || f.type === 'hidden' || f.type === 'submit' || f.type === 'button') return null;
    if (f.hasAttribute('required')) {
      var missing = f.type === 'checkbox' ? !f.checked :
        f.type === 'radio' ? !(f.form && f.form.querySelector('input[type=radio][name="' + attrEsc(f.name) + '"]:checked')) :
        trimmed === '';
      if (missing) return f.getAttribute('data-error-required') || 'This field is required.';
    }
    if (trimmed === '') return null;
    var ml = f.getAttribute('minlength');
    if (ml && trimmed.length < +ml) return f.getAttribute('data-error-minlength') || ('Must be at least ' + ml + ' characters.');
    var xl = f.getAttribute('maxlength');
    if (xl && v.length > +xl) return f.getAttribute('data-error-maxlength') || ('Must be at most ' + xl + ' characters.');
    var p = f.getAttribute('pattern');
    if (p) {
      var re;
      try { re = new RegExp('^(?:' + p + ')$'); } catch (e) { re = null; }
      if (re && !re.test(v)) return f.getAttribute('data-error-pattern') || 'Invalid format.';
    }
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return f.getAttribute('data-error-type') || 'Enter a valid email address.';
    if (f.type === 'number' || f.hasAttribute('min') || f.hasAttribute('max')) {
      var n = Number(trimmed);
      if (f.type === 'number' && isNaN(n)) return f.getAttribute('data-error-type') || 'Enter a number.';
      if (f.hasAttribute('min') && n < Number(f.getAttribute('min'))) return f.getAttribute('data-error-min') || ('Must be ' + f.getAttribute('min') + ' or more.');
      if (f.hasAttribute('max') && n > Number(f.getAttribute('max'))) return f.getAttribute('data-error-max') || ('Must be ' + f.getAttribute('max') + ' or less.');
    }
    var vn = f.getAttribute('data-validator');
    if (vn && validators[vn]) return validators[vn](v, f) || null;
    return null;
  }

  function errorSlot(form, f) {
    var name = f.name || f.id;
    if (!name) return null;
    return (form || document).querySelector('[data-error-for="' + attrEsc(name) + '"]');
  }

  var slotSeq = 0;
  function setFieldError(form, f, msg) {
    var slot = errorSlot(form, f);
    var wrap = f.closest('[data-field]');
    if (msg) {
      addCls(f, preset.fieldErrorClass);
      addCls(wrap, preset.wrapperErrorClass);
      f.setAttribute('aria-invalid', 'true');
      if (slot) {
        var t = slot.querySelector('[data-error-text]') || slot;
        t.textContent = msg;
        slot.hidden = false;
        if (!slot.id) slot.id = 'mb-err-' + (++slotSeq);
        f.setAttribute('aria-describedby', slot.id);
      }
    } else {
      rmCls(f, preset.fieldErrorClass);
      rmCls(wrap, preset.wrapperErrorClass);
      f.removeAttribute('aria-invalid');
      if (slot) slot.hidden = true;
    }
  }

  function validateField(form, f) {
    var msg = fieldMessage(f);
    setFieldError(form, f, msg);
    return !msg;
  }

  function fieldsOf(form) {
    return Array.prototype.filter.call(form.elements, function (f) {
      return (f.name || f.id) && f.getClientRects().length;
    });
  }

  function validateForm(form) {
    var ok = true, firstBad = null;
    fieldsOf(form).forEach(function (f) {
      f.setAttribute('data-mb-touched', '');
      if (!validateField(form, f)) { ok = false; if (!firstBad) firstBad = f; }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  function clearForm(form) {
    Array.prototype.forEach.call(form.elements, function (f) {
      f.removeAttribute('data-mb-touched');
      setFieldError(form, f, null);
    });
    hideBanner(form);
  }

  /* ---------- toasts and banners ---------- */

  var region = null;
  function toastRegion() {
    if (region && document.body.contains(region)) return region;
    region = document.createElement('div');
    addCls(region, preset.toastRegionClass);
    region.setAttribute('data-mb-toast-region', '');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
    return region;
  }

  function toast(kind, text) {
    kind = kind === 'error' ? 'error' : 'success';
    var reg = toastRegion();
    var tpl = document.querySelector('template[data-toast-template="' + kind + '"]');
    var holder = document.createElement('div');
    if (tpl) holder.appendChild(tpl.content.cloneNode(true));
    else holder.innerHTML = preset.toastHtml(kind, text);
    var node = holder.firstElementChild;
    if (!node) return;
    var t = node.querySelector('[data-toast-text]') || node;
    t.textContent = text;
    reg.appendChild(node);
    // force reflow so the visible class animates
    void reg.offsetWidth;
    addCls(reg, preset.toastVisibleClass);
    var done = false;
    function remove() {
      if (done) return;
      done = true;
      node.remove();
      if (!reg.children.length) rmCls(reg, preset.toastVisibleClass);
    }
    node.addEventListener('click', function (e) { if (e.target.closest('[data-toast-dismiss]')) remove(); });
    setTimeout(remove, TOAST_MS);
  }

  function bannerFor(trigger) {
    var id = trigger.getAttribute('data-error-banner');
    return id ? document.querySelector('[data-banner="' + attrEsc(id) + '"]') : null;
  }
  function hideBanner(trigger) { var b = bannerFor(trigger); if (b) b.hidden = true; }

  /* ---------- submit / action ---------- */

  function submitButton(form) {
    return form.querySelector('[type=submit]') ||
      (form.id ? document.querySelector('[type=submit][form="' + attrEsc(form.id) + '"]') : null);
  }

  function setLoading(btn, on) {
    if (!btn) return;
    if (on) {
      btn.setAttribute('data-mb-html', btn.innerHTML);
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      addCls(btn, preset.loadingClass);
      btn.innerHTML = preset.spinnerHtml + btn.innerHTML;
    } else {
      if (btn.hasAttribute('data-mb-html')) btn.innerHTML = btn.getAttribute('data-mb-html');
      btn.removeAttribute('data-mb-html');
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      rmCls(btn, preset.loadingClass);
    }
  }

  function run(trigger, form) {
    var src = form || trigger;
    if (src.getAttribute('data-mb-busy')) return;
    var name = src.getAttribute('data-submit') || src.getAttribute('data-action') || 'action';
    var group = src.getAttribute('data-outcome');
    var r = R();
    var outcome = group && r ? (r.get(group) || 'ok') : 'ok';
    var btn = form ? (submitButton(form) || trigger) : trigger;
    src.setAttribute('data-mb-busy', '1');
    hideBanner(src);
    setLoading(btn, true);
    document.dispatchEvent(new CustomEvent('mock:pending', { detail: { name: name, outcome: outcome, trigger: src } }));
    setTimeout(function () {
      setLoading(btn, false);
      src.removeAttribute('data-mb-busy');
      var ev = new CustomEvent('mock:result', { cancelable: true, detail: { name: name, outcome: outcome, trigger: src, ok: !!SUCCESS[outcome] } });
      var proceed = document.dispatchEvent(ev);
      if (!proceed) return;
      if (SUCCESS[outcome]) onSuccess(src); else onFailure(src, outcome);
    }, DELAY[outcome] != null ? DELAY[outcome] : DELAY.ok);
  }

  function onSuccess(src) {
    var msg = src.getAttribute('data-success-toast');
    if (src.hasAttribute('data-success-close')) {
      var m = src.closest('[data-modal]');
      if (m) closeModal(m.getAttribute('data-modal'));
    }
    var nav = src.getAttribute('data-success-nav');
    if (nav) navigate(nav);
    if (msg) toast('success', msg);
  }

  function onFailure(src, outcome) {
    var msg = src.getAttribute('data-error-toast-' + outcome) || src.getAttribute('data-error-toast');
    var b = bannerFor(src);
    if (b) {
      var bt = src.getAttribute('data-error-banner-text-' + outcome);
      if (bt) (b.querySelector('[data-banner-text]') || b).textContent = bt;
      b.hidden = false;
      if (!msg) return;
    }
    toast('error', msg || 'Something went wrong. Please try again.');
  }

  /* ---------- event wiring ---------- */

  function setFromAttr(spec) {
    var r = R();
    if (!r || !spec) return;
    var o = {};
    spec.split(',').forEach(function (pair) {
      var i = pair.indexOf(':');
      if (i > 0) o[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    });
    r.setMany(o);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest || t.closest('[data-research-ui]')) return;

    var dd = t.closest('[data-dropdown-toggle]');
    if (dd) { e.preventDefault(); toggleDropdown(dd); return; }
    if (!t.closest('[data-dropdown]')) closeAllDropdowns();

    var el;
    if ((el = t.closest('[data-research-set]'))) { e.preventDefault(); setFromAttr(el.getAttribute('data-research-set')); }
    if ((el = t.closest('[data-nav]'))) { e.preventDefault(); navigate(el.getAttribute('data-nav')); return; }
    if ((el = t.closest('[data-back]'))) { e.preventDefault(); back(); return; }
    if ((el = t.closest('[data-open-modal]'))) { e.preventDefault(); closeAllDropdowns(); openModal(el.getAttribute('data-open-modal'), el); return; }
    if ((el = t.closest('[data-close-modal]'))) {
      e.preventDefault();
      var id = el.getAttribute('data-close-modal');
      if (!id) { var m = el.closest('[data-modal]'); id = m ? m.getAttribute('data-modal') : null; }
      closeModal(id);
      return;
    }
    if (t.hasAttribute('data-modal-overlay') && !t.closest('[data-modal-static]')) {
      var mm = t.closest('[data-modal]');
      if (mm) { closeModal(mm.getAttribute('data-modal')); return; }
    }
    if ((el = t.closest('[data-tab]'))) { e.preventDefault(); activateTab(el); return; }
    if ((el = t.closest('[data-action]'))) { e.preventDefault(); run(el, null); }
  });

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches('form[data-submit], form[data-validate]')) return;
    e.preventDefault();
    if (form.hasAttribute('data-validate') && !validateForm(form)) return;
    if (form.hasAttribute('data-submit')) run(e.submitter || submitButton(form), form);
  });

  document.addEventListener('focusout', function (e) {
    var f = e.target;
    var form = f && f.form;
    if (!form || !form.hasAttribute('data-validate') || !f.hasAttribute('data-mb-touched')) return;
    validateField(form, f);
  });

  document.addEventListener('input', function (e) {
    var f = e.target;
    var form = f && f.form;
    if (!form || !form.hasAttribute('data-validate')) return;
    if (!f.hasAttribute('data-mb-touched')) { f.setAttribute('data-mb-touched', ''); return; }
    if (f.getAttribute('aria-invalid') === 'true') validateField(form, f);
  });

  document.addEventListener('change', function (e) {
    var f = e.target;
    var form = f && f.form;
    if (!form || !form.hasAttribute('data-validate')) return;
    f.setAttribute('data-mb-touched', '');
    if (f.getAttribute('aria-invalid') === 'true' || f.type === 'checkbox' || f.type === 'radio' || f.tagName === 'SELECT') validateField(form, f);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelector('[data-dropdown]:not([hidden])');
      if (open) { closeAllDropdowns(); return; }
      if (modalStack.length && !modalStack[modalStack.length - 1].el.hasAttribute('data-modal-static')) {
        closeModal(modalStack[modalStack.length - 1].id);
      }
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-toast-dismiss]')) {
      e.preventDefault();
      e.target.click();
    }
    trapFocus(e);
  });

  /* ---------- Research sync ---------- */

  /* Option field `opens: { tab, modal }` opens the context a state needs
     (a tab or a form modal) when the option is picked in the launcher.
     Runs after app.js rendering so freshly rendered markup is used. */
  var autoOpened = {};

  function scenarioOption(groupId, value) {
    var sc = window.RESEARCH_SCENARIOS;
    if (!sc || !sc.groups) return null;
    for (var i = 0; i < sc.groups.length; i++) {
      var g = sc.groups[i];
      if (g.id !== groupId) continue;
      for (var j = 0; j < (g.options || []).length; j++) if (g.options[j].value === value) return g.options[j];
    }
    return null;
  }

  function applyOpens(state, changed) {
    var ids = changed && changed.length ? changed : Object.keys(state);
    ids.forEach(function (id) {
      if (id === 'screen' || id === 'section') return;
      var prev = autoOpened[id];
      if (prev && prev.modal) closeModal(prev.modal, false);
      delete autoOpened[id];
      var opt = scenarioOption(id, state[id]);
      var o = opt && opt.opens;
      if (!o) return;
      if (o.tab) {
        var tab = document.querySelector('[data-tab="' + attrEsc(o.tab) + '"]');
        if (tab) activateTab(tab); else console.warn('[mock] opens: no [data-tab="' + o.tab + '"]');
      }
      if (o.modal) {
        var open = modalStack.some(function (m) { return m.id === o.modal; });
        if (!open) openModal(o.modal);
      }
      autoOpened[id] = o;
    });
  }

  function bindResearch() {
    var r = R();
    if (!r || bindResearch.done) return;
    bindResearch.done = true;
    r.onChange(function (state, changed) {
      if (state.screen && (!changed || changed.indexOf('screen') >= 0 || currentScreen == null)) {
        showScreen(state.screen, { fromBack: backPending });
        backPending = false;
        autoOpened = {};
      }
      setTimeout(function () { applyOpens(state, changed); }, 0);
    });
  }

  function init() {
    injectBase();
    document.querySelectorAll('form[data-validate]').forEach(function (f) { f.noValidate = true; });
    document.querySelectorAll('[data-modal]').forEach(function (m) { if (!m.hasAttribute('data-modal-open')) m.hidden = true; });
    document.querySelectorAll('[data-dropdown]').forEach(function (d) { d.hidden = true; });
    initTabs();
    if (R()) bindResearch();
    else document.addEventListener('research:ready', bindResearch);
    if (!hasGroup('screen')) {
      var first = document.querySelector('[data-screen]');
      if (first) showScreen(first.getAttribute('data-screen'));
    }
  }

  window.MockBehaviors = {
    preset: preset,
    presets: PRESETS,
    validators: validators,
    showScreen: function (id) { if (id !== currentScreen) showScreen(id); },
    navigate: navigate,
    back: back,
    openModal: openModal,
    closeModal: closeModal,
    activateTab: activateTab,
    initTabs: initTabs,
    validateForm: validateForm,
    clearForm: clearForm,
    setFieldError: function (field, msg) { setFieldError(field.form, field, msg); },
    toast: toast,
    run: run,
    setLoading: setLoading
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
