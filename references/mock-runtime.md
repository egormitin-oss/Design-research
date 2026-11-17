# Mock Runtime Contract

The feature mock (`mock/`) uses a runtime in `<feature>/mock-runtime/`:

| File | Origin | Edit? |
|---|---|---|
| `scenarios.js` | Written per feature from the scenario matrix in `screen-spec.md` | Yes |
| `data.js` | Written per feature: `window.MOCK_DATA` with fixtures, copy strings, and pure helpers that derive view-model from `Research.state` | Yes |
| `mock-behaviors.js` | `cp` of this skill's `assets/mock-behaviors.js` | No. If a behavior is missing, implement it in `app.js` |
| `research-launcher.js` | `cp` of this skill's `assets/research-launcher.js` | No |

Script order at the end of `<body>`:

```html
<script>window.RESEARCH_DS = { preset: 'plain', overrides: { /* legacy classes, see below */ } };</script>
<script src="../mock-runtime/scenarios.js"></script>
<script src="../mock-runtime/data.js"></script>
<script src="../mock-runtime/mock-behaviors.js"></script>
<script src="../mock-runtime/research-launcher.js"></script>
<script src="app.js"></script>
```

`RESEARCH_DS` is optional (defaults to the `plain` preset). Do not set `RESEARCH_VIEW`.

## `scenarios.js`

```js
window.RESEARCH_SCENARIOS = {
  feature: 'settings-player-types',          // used for localStorage keys
  title: 'Player Types',                     // shown on the launcher pill
  groups: [
    // Level 1 (optional): sections. `screen` = entry page of the section.
    {
      id: 'section', label: 'Section', default: 'types',
      options: [
        { value: 'types', label: 'Player types' },
        { value: 'rates', label: 'Rates', screen: 'ratesList' }
      ]
    },
    // Level 2: pages and the flows that lead from them (sub-screens, wizards). `section` ties a page to a section.
    {
      id: 'screen', label: 'Page',
      options: [
        { value: 'list', label: 'List', section: 'types' },
        { value: 'form', label: 'Create / edit form', section: 'types' },
        { value: 'ratesList', label: 'Rates list', section: 'rates' }
      ]
    },
    // States. No scope = shown everywhere.
    { id: 'role', label: 'Employee rights', default: 'manager',
      options: [{ value: 'manager', label: 'Manager' }, { value: 'admin', label: 'Admin' }] },
    // Shown only in a section.
    { id: 'listData', label: 'Data', sections: ['types'],
      options: [{ value: 'some', label: 'Some rows' }, { value: 'empty', label: 'Empty' }] },
    // Shown only on a page; one chip depends on another group.
    {
      id: 'saveResult', label: 'Save result', screens: ['form'], default: 'ok',
      options: [
        { value: 'ok', label: 'Success' },
        { value: 'slow', label: 'Slow network' },
        { value: 'error', label: 'Server error' },
        { value: 'conflict', label: 'Name already taken', when: { role: 'admin' }, extrapolated: true,
          note: 'API returns 422 but the UI ignores it today' }
      ]
    }
  ]
};
```

Rules:

- One group per independent dimension from `screen-spec.md` (screen, data volume, context/role, permission, each async outcome, legacy defects visibility if useful).
- `default` follows the "Default state" row of the page in `screen-spec.md` (most common observed state, a production snapshot, or the user's answer). A record page without observed data defaults to a populated record with `fixture: 'invented'`; the empty variant is a separate option.
- `extrapolated: true` for any option not observed in code. The launcher marks it in the menu and on the pill. The page must also carry a `data-comment-kind="extrapolation"` comment wherever that option changes the UI.
- Outcome groups (results of submit/action) are referenced from markup with `data-outcome="<groupId>"`.

### Context: sections, pages, scoped states

The launcher shows only what belongs to the open page. Hierarchy: section (`id: 'section'`, optional) -> page (`id: 'screen'`) -> state groups and chips.

| Field | On | Meaning |
|---|---|---|
| `section` | `screen` option | the section the page belongs to; a page without it belongs to every section |
| `screen` | `section` option | entry page opened when the section is picked (default: the `screen` group default if it is in the section, else its first page) |
| `sections: [...]` | group or option | shown only in these sections |
| `screens: [...]` | group or option | shown only on these pages (use it for the flows that lead from a page: list the page and its sub-screens) |
| `when: { groupId: value or [values] }` | group or option | shown only when another group has one of the values; reference only groups declared earlier |
| `opens: { tab?, modal? }` | option of a state group | when this option is picked, `mock-behaviors.js` activates `[data-tab="<tab>"]` and opens `[data-modal="<modal>"]`; switching the group to another option closes the modal it opened. Runs after `app.js` rendering |
| `fixture: 'invented'` | option | the data shown is invented (no production sample), but the behavior is observed in code. Not the same as `extrapolated` |

Reachability rule: every state lives one launcher pick away from the page default. Scope state groups of tabs, modals, and forms to the **page** (`screens: ['detail']`), never to a tab or modal that is closed by default, and give each option that needs a tab or modal an `opens`. Example:

```js
{ id: 'employeeErrors', label: 'Employee form validation', screens: ['organization'], default: 'none',
  options: [
    { value: 'none', label: 'No errors' },
    { value: 'emailTaken', label: 'Email already taken', opens: { tab: 'employees', modal: 'employeeForm' } },
    { value: 'signatureMax', label: 'Signature over 50 chars: no message shown', opens: { tab: 'mobileApp' } }
  ] }
```

`app.js` renders the error for the chosen option; `opens` only brings the context on screen.

Behavior (implemented in `research-launcher.js`, nothing to write in `app.js`):

- The menu shows a Context block (sections, then the pages of the current section) and, below it, "States for <page>" with only the groups and chips in scope. The pill shows the current page.
- Picking a section keeps the current page if it belongs to that section, otherwise opens the section's entry page.
- Picking a page, or navigating in the mock (`data-nav`, `data-back`, `data-research-set="screen:..."`, `Research.set('screen', ...)`), moves the section to the page's section. Main navigation in the mock therefore updates the launcher by itself, as long as it uses `data-nav`.
- After every change: a group out of scope is reset to its default and hidden; a group whose current chip is out of scope falls back to its default chip (or the first chip in scope); every choice still in scope is kept.
- The URL hash stores only in-scope values that differ from defaults. A hash with a page from another section opens that page and its section.
- A group in scope with no chips in scope is hidden.

Use scoping in every mock with more than one page or with groups that matter only in some state; a menu with groups that do not change the open page is a defect of the mock.

## `window.Research` API (from `research-launcher.js`)

| Member | Meaning |
|---|---|
| `Research.state` | Current values, `{ groupId: value }` |
| `Research.get(id)` / `Research.set(id, value)` / `Research.setMany(obj)` | Read / change state; `set` re-renders through the change event. The result is normalized to the context (see above); a value out of scope is not applied and logs a warning |
| `Research.isActive(id)` / `Research.available(id)` | Whether a group is in scope now / chip values in scope now |
| `Research.onChange(fn)` | `fn(state, changedIds)`; also called once immediately with the initial state |
| `Research.comments` | Boolean, Comments toggle |
| `Research.reset()` | Back to defaults |
| `Research.refreshComments()` | Re-place comment pins after a manual DOM change (the launcher also observes DOM mutations) |

State lives in the URL hash (`#s=screen:form,saveResult:slow&c=1`), so a state can be shared as a link. The launcher also emits `research:change` on `document` with `detail: { state, changed }`.

## Rendering pattern in `app.js`

```js
Research.onChange(function (state) {
  MockBehaviors.showScreen(state.screen);                  // toggles [data-screen]
  document.querySelector('[data-region=list]').innerHTML = renderList(state);
});
```

Render from state; do not keep a second copy of scenario state in `app.js`. Local interaction state (typed text, opened row menu) may live in `app.js`.

## Declarative behaviors (`mock-behaviors.js`)

All behaviors toggle the `hidden` attribute and ARIA attributes; visual classes come from the preset. Write the visible markup in the legacy structure copied from templates; the behavior only shows, hides, and fills it.

| Behavior | Markup |
|---|---|
| Screens | `<section data-screen="list">`; links/buttons `data-nav="form"`; `data-back` returns to the previous screen |
| Modal / dialog | `<div data-modal="edit" hidden>...</div>`; open `data-open-modal="edit"`; close `data-close-modal` (inside) or `data-close-modal="edit"`; optional backdrop element `data-modal-overlay` inside the modal root. Esc closes the top modal, focus is trapped and returned to the opener |
| Tabs | `<div data-tabs>` with `[data-tab="color"]` triggers and `[data-tab-panel="color"]` panels |
| Dropdown / menu | `data-dropdown-toggle="rowMenu1"` and `<div data-dropdown="rowMenu1" hidden>`; closes on outside click and Esc |
| Validation | `<form data-validate>` with native `required`, `pattern`, `minlength`, `maxlength`, `min`, `max`, `type=email`; custom message `data-error-required="..."`, `data-error-pattern="..."`; error slot `<div data-error-for="name" hidden>` written in legacy error markup with a `[data-error-text]` child (or itself receives the text). Validates on blur after first interaction and on submit |
| Submit / action | `<form data-submit="save" data-outcome="saveResult">` or `<button data-action="delete" data-outcome="deleteResult">`. Valid submit puts the trigger into loading, waits (`ok` 600 ms, `slow` 3000 ms, others 600 ms), then resolves by the outcome group value |
| On success | Attributes on the form/button: `data-success-toast="Saved"`, `data-success-close` (closes the containing modal), `data-success-nav="list"` |
| On failure | `data-error-toast="Something went wrong"`; or `data-error-banner="saveError"` to unhide `<div data-banner="saveError" hidden>`; outcome-specific text `data-error-toast-conflict="..."` (suffix = outcome value) |
| Confirm before destructive action | A modal whose confirm button carries `data-action`; open it with `data-open-modal` from the row/menu |
| Custom outcomes | Listen to `mock:result` on `document`: `detail: { name, outcome, trigger }`. Call `e.preventDefault()` to skip default success/failure handling |
| Toast | `MockBehaviors.toast('success' | 'error', text)`. Uses `<template data-toast-template="success">` from the page if present (legacy notification markup with `[data-toast-text]`), otherwise the preset's built-in markup |

Outcome value convention: `ok` and `success` are success; `slow` is success after a long delay; `slow-error` is failure after a long delay; anything else is failure.

## Preset (`RESEARCH_DS`)

Set `window.RESEARCH_DS = { preset: 'plain', overrides: { ... } }` before loading `mock-behaviors.js`. Keys:

| Key | `plain` default | Typical legacy override |
|---|---|---|
| `fieldErrorClass` | `has-error` | keep (Flame forms use `has-error`) |
| `tabActiveClass` / `tabActiveTarget` | `is-active` / the `[data-tab]` element | class from the feature template |
| `overlayVisibleClass` | `is-visible` | as in the template |
| `loadingClass` | `is-loading` | `''` when the template disables the button and shows a spinner instead |
| `spinnerHtml` | small inline CSS spinner | the template spinner, for example `<span class="fl-mr-1 icon-spinner rotating"></span>` |
| `toastRegionClass` / `toastVisibleClass` / `toastHtml(kind, text)` | built-in region and markup | prefer a `<template data-toast-template>` with the app notification markup |

Take every override from the feature templates and check it exists in the compiled app CSS. Do not style these classes in `mock/styles.css`. `mock-behaviors.js` also contains a `helios-classic` preset; this skill does not use it.

## Comments

Any element can carry a research annotation:

```html
<button class="fl-button fl-button-primary"
        data-comment="Save is hidden until the form is dirty (D5)."
        data-comment-kind="defect">Save</button>
```

| `data-comment-kind` | Use for |
|---|---|
| `extrapolation` | UI shown for an option with `extrapolated: true`, or any state not observed in code |
| `not-implemented` | Element that exists in markup/locale but is not wired today |
| `defect` | Legacy defect, reference its ID from `analysis.md` |
| `source` | File/line pointer for a non-obvious element |
| `question` | Open question from `decisions.md` |

For an annotation that is not attached to a visible element (for example an unreachable loading state), use an empty marker `<span data-comment="..." data-comment-kind="not-implemented"></span>` placed where the note belongs.

Comments are off by default. When the launcher's Comments toggle is on, the launcher draws numbered pins next to visible annotated elements and lists all comments of the current screen in the menu. Nothing about comments is visible in the page itself when the toggle is off: do not write explanatory text into page content, and do not style `[data-comment]` in page CSS.

## Launcher (what the designer sees)

- A pill at the bottom-right corner with the feature title and a marker when an extrapolated option is active. Hovering reveals the menu button; clicking the pill opens the menu above it. The pill can be collapsed to a small dot; the state is remembered per feature.
- Menu sections: Comments toggle with count and the comments list for the current screen, Context (section, page), States for the current page (only groups and chips in scope; extrapolated options marked "extrapolated"), Reset, Copy link.
- Keyboard: `Alt+Shift+R` toggles the menu, `Esc` closes it, focus returns to the pill.
- The launcher lives in a Shadow DOM and is not affected by the app CSS.
- The Legacy / Design system view switch exists in the runtime but stays hidden unless `scenarios.js` sets `views` with both `legacy` and `ds`. This skill never sets it.
