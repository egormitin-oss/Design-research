---
name: design-research
description: Research a legacy/current Chronogolf frontend feature for a designer-researcher, collect a hierarchical copy deck of every text on its screens (prod text, redesign column, Transifex key, source, conditions), and build a click-through static mock of the existing UI styled by the application CSS compiled from the repository, with a floating research launcher for states and a comments toggle. Use for screen inventory, state and flow mapping, copy deck, error and validation texts, screen spec, legacy mock, "research the feature", "mock the current screen".
---

# Design Research

Act as a frontend research assistant for a **designer-researcher**, not a developer. The user reads specs and clicks through mocks; they do not write or run code. The goal is refactor/redesign discovery: understand the current legacy flow end to end and show it as it looks today, in every state that matters, before any new design decision is made.

The skill builds one view of the feature: the legacy UI. It does not rebuild the screens with design-system components.

## Hard Rules

- Never modify application code. Write only under `.opencode/features/` (research artifacts, mocks, the shared `_app-css/` build). Never run `npm install` inside `frontend/` or the repo root.
- Never assume the project can be run. No dev server, no API, no live data. Everything is inferred from source: templates, SCSS, TypeScript models/reducers, locale files.
- No emojis anywhere: research files, mock UI copy, comments, launcher labels.
- The mock reproduces **existing** pages, states, and components only. It is styled by the **compiled application CSS** from step 4, not by values transcribed from SCSS. Markup is copied from the feature templates (same tags, classes, `layout`/`flex` attributes, existing copy).
- Compile, do not transcribe. Hand-copied CSS values are allowed only as a fallback when step 4 fails, and then the mock gets a persistent `data-comment-kind="source"` comment "Approximate legacy styles: <reason>".
- If a state is not observed in code, it is a design extrapolation. Mark it in `scenarios.js` (`extrapolated: true`) and with a `data-comment-kind="extrapolation"` comment. Never present it as legacy behavior.
- Classify every claim as one of: **Confirmed by code**, **Confirmed by Jira/Figma/user**, **Assumption**, or **Open question**. Never present an assumption as a fact.
- Scope is frontend only. Backend is read only to explain an error/success/state or a text the frontend already surfaces (endpoint path, serializer field, model validators and their messages).
- Every text the user can see or hear on the researched screens goes into `copy.md`, verbatim. The mock shows no text that is not in `copy.md`, and the research never writes into its Redesign text column.
- Secrets: never print, echo, or write an npm/GitHub token. Check only that one is present.

## Feature Workspace

One folder per feature under `.opencode/features/<feature-name>/` (kebab-case, matching the sidebar/section name). `/.opencode/features/` is git-ignored repo-wide.

```text
.opencode/features/
  README.md                 # index of feature folders; add/refresh this feature's row
  _app-css/                 # compiled application CSS, one subfolder per Angular project (step 4)
    admin/
      admin.css             # global styles of the app, CSS imports inlined, asset urls point into the repo
      components.css        # Angular component styles (:host -> selector) for the components the features use
      README.md             # build date, inlined packages, components, unresolved urls
      node_modules/...
  <feature-name>/
    analysis.md             # evidence and the screen/state matrix - the single structured note the mock is built from
    copy.md                 # copy deck: every text as a tree, with prod text, redesign, key, source, comment
    decisions.md            # scope decisions, assumptions, rejected/deferred ideas
    screen-spec.md          # UX/screen/state specification derived from analysis.md
    HANDOFF.md              # restart context for the next session
    mock/
      index.html
      styles.css            # mock glue only, never restyles app classes
      app.js                # rendering templates only
    mock-runtime/
      scenarios.js          # this feature's scenario groups
      data.js               # fixtures, copy strings, and state-derivation helpers
      research-launcher.js  # copied with `cp` from this skill's assets/ - never read or rewrite it
      mock-behaviors.js     # copied with `cp` from this skill's assets/ - never read or rewrite it
```

Do not create a file that has no content yet. Minimum for any pass: `analysis.md`, `decisions.md`, `HANDOFF.md`. `copy.md` starts with the first confirmed text; `screen-spec.md` and the mock follow once the matrix is filled.

## Working Approach

These rules apply to every step. They exist because each one cost iterations in earlier passes.

1. **Confirm what to build before reading code.** Ask, in one message, only what is not already stated: new folder or extend the existing one; clean re-run (do not read the old folder until done) or continue from its `HANDOFF.md`; full coverage or a named subset of screens/states; for pages that show a record (detail, edit, settings of an entity), the default state: populated record, empty create form, or both. A production snapshot or screenshot from the user sets the default without asking. Record the answers in `decisions.md` -> Scope. If an existing `HANDOFF.md` is in scope, read it and do not re-research what it confirms.
2. **Matrix first, code second.** Before deep reading, draft the screen/state matrix in `analysis.md` (step 2) from the route, template list, and locale keys. Then read code only to fill empty cells. A cell, once filled with evidence, is not revisited without a concrete reason (a contradiction, a user correction).
3. **Read fragments, not files.** Search for the symbol, route, permission, or class first, then read only the matching range: the template block, its action handler, and the API call it makes. Do not print groups of files in full, and do not dump output to temporary files to parse later. Read a whole file only when it is short or when its markup is copied verbatim into the mock.
4. **Write facts down as soon as they are verified.** Every confirmed fact goes straight into the matrix or the evidence table with its file and line; every text goes straight into `copy.md` at its place in the tree. The mock is built from `analysis.md` and `screen-spec.md`, not by re-reading sources. Going back to source during mock building means the note is missing something: add it to the note first.
5. **Check assumptions before writing markup.** Before writing the mock (step 7 preflight): confirm every class and custom element the mock will use exists in the compiled CSS, check component wrapper structure in the templates (extra wrappers such as `div._center`), breakpoints and container widths that change the layout, and how dynamic content is inserted (for example markdown inserted into a `<p>`). Fix the plan, then write.
6. **No helper code without a clear need.** Do not add local post-processors, CSS patch files, or workaround scripts. If the shared build script (`assets/build-app-css.mjs`) produces wrong output, fix the script once in the skill, re-run it, and note the change in `HANDOFF.md`. If a fix is outside the skill's reach, use the documented fallback and record it.
7. **Short, isolated browser checks.** When a browser tool is available, check only the key scenarios: default state, empty/not-connected state, one modal, one error. One fresh page load per scenario. If a check breaks because of navigation or a stale page, reload and run that scenario once more; do not re-run the whole set.

Other rules:

- Recon batches: for a screen, gather sidebar entry, permission gate, route, component/template, store/reducer, API resource, locale keys, and SCSS/component styles in one parallel batch. A second batch is only for cells the first left empty.
- Copying a convention (template shape, class set)? Sample two real examples first, not one.
- Stop researching once every matrix cell the mock needs is filled or explicitly marked Assumption / Open question.
- For domain-heavy features (money, access, ownership, lifecycles), follow `references/domain-model.md` for the domain part of `analysis.md`.
- Load references lazily: `copy-sources.md` at step 3, `npm-access.md` at step 4, `mock-runtime.md` at step 7. Do not read them at session start.
- Never read `assets/*.js` or `assets/*.mjs` into context. Copy or run them; their contracts are in `references/mock-runtime.md` and step 4.

## Workflow

### 1. Confirm scope and locate the feature

- Ask the scope questions from Working Approach 1 if they are not answered.
- Find the sidebar/nav entry and the permission gate that shows or hides it.
- Follow the route (AngularJS UI Router state, downgraded Angular, or React route) to its top-level component.
- Identify the owning framework layer(s): AngularJS, Angular, React. Chronogolf mixes all three inside one feature.
- Note the Angular project that hosts the feature (`admin`, `marketplace`) and every Angular component on the screen that has `styleUrls` (feature components and `cg-*` wrappers). Step 4 needs this list.
- Record every source path in `analysis.md` as evidence.

### 2. Draft the screen/state matrix

In `analysis.md` -> "Screen Inventory", one row per screen, block, or modal; columns are the states that apply: default/data, loading, empty or not-connected, connected/success, validation, error (per error source), pending/saving, permission-hidden, feature-flag-hidden. Fill what the route and templates already show; leave the rest as `?`. This table drives the rest of the research and becomes the scenario matrix.

### 3. Fill the matrix from code

Read `references/copy-sources.md` first.

For each `?` cell: find the condition in the template (`ng-if`, `*ngIf`, class binding), its handler, and the API call. Record the result in the cell and the evidence table at once (Working Approach 3 and 4). Record defects as you meet them.

Collect texts in the same pass, into `copy.md`, following the tree and columns from the reference:

- Static texts of each screen block from its template (including `placeholder`, `title`, `aria-label`, `alt`).
- For each mutation in the matrix, trace the whole chain once and record the texts of every link: frontend validation -> request -> controller -> use case / interactor -> model validators and `errors.add` -> error rendering -> frontend extraction -> where it is shown. Success feedback (notification, alert, status change) and "no feedback" are recorded too.
- Shared and global texts that can appear on this screen: modal defaults, generic server error, rate limit, session expired.
- Each server error case that produces a distinct text becomes its own row and, later, its own outcome option in `scenarios.js`.

Build the **Validation inventory** in `analysis.md` in the same pass: one row per form field and rule, columns: field -> rule -> layer (client attribute, client code, server validator) -> text or `no message` -> where it is shown. Rules that exist but show nothing (`maxlength` only, a message written to an unbound property, a submit that skips form validity, a server error the frontend drops) stay in the table marked `silent`, with file/line. Nothing found in code is dropped because it has no text.

### 4. Build the application CSS

The mock uses the same CSS the app ships, compiled from the repository. Run from the repository root (never read the script into context; its contract is below):

```sh
node .opencode/skills/design-research/assets/build-app-css.mjs --app admin \
  --component <path to each Angular component .ts the feature renders, incl. lib/ui/design-system wrappers>
```

- `--app`: Angular project from `frontend/angular.json` that hosts the feature.
- `--component`: every Angular component whose `styleUrls` affect the screen. AngularJS components have no component styles; skip them.
- What it does: reads `angular.json` (styles, includePaths, assets), installs only the packages the styles import into `.opencode/features/_app-css/<app>/` at exact lockfile versions (frontend lock, then root lock), compiles the SCSS entry, inlines plain `.css` imports (design-system CSS, `angular-material.layouts` for `layout`/`flex` attributes), drops `@tailwind` (Helios 2.0, scoped to `.uc-base`), rewrites `url(/frontend/<app>/assets/...)` to repository files, and compiles component styles with `:host` replaced by the component selector.
- Success: the report shows `checks .fl-button:ok [layout=row]:ok .alert-success:ok` and `unresolved: 0`. Already built? Re-run only with new `--component` entries, or if the lockfile changed.
- Access: needs GitHub Packages for `@lightspeed/design-system-css`. Token rules and failure handling: `references/npm-access.md`. Private `@shopkeep/*` packages are not needed.
- Failure: report the error to the user, use the fallback from Hard Rules, and record it in `decisions.md`.
- Record in `analysis.md` -> "App CSS": path, components compiled, anything unresolved.

### 5. Complete `analysis.md`

Include:

- **Feature Summary** - current legacy behavior only.
- **Evidence table** - statement, classification, file/line evidence.
- **Screen Inventory** - the matrix from steps 2-3, no `?` left (unknown cells become Assumption or Open question).
- **Validation inventory** - from step 3, including `silent` rules.
- **Internal Flow** - mermaid flowchart of the confirmed flow, including refresh/event triggers.
- **Copy** - one line pointing to `copy.md`; no second copy inventory here.
- **Error / Success / Validation notes** - what the frontend can and cannot determine from the API. Do not invent a CTA that assumes information the frontend lacks. Check every mutation for: a follow-up step (refetch, redirect) failing after the mutation succeeded; server-side model constraints per input field (backend validators), not only client rules; cancellation of external auth popups / OAuth versus provider failure; boundary values of input transforms (empty, trailing separator, query string).
- **Legacy defects** - one ID per defect (D1, D2, ...). When a fact contradicts another statement in the same research, re-read the code and keep only the verified one.
- **App CSS** - result of step 4.
- **Refactor Considerations** - what must be preserved versus open design questions.

"Possible future" sections only as clearly labeled hypotheses.

### 6. Write `decisions.md` and `screen-spec.md`

`decisions.md`: accepted scope (answers from step 1); assumptions made to build the mock and why; CSS fallback if any; rejected or deferred ideas; open decisions that need a product/design call.

`screen-spec.md`:

- Entry conditions (permissions, feature flags, org/club state).
- Navigation table: route, what the user sees, primary action.
- Per-screen state tables (trigger -> visual -> copy/action), matching code.
- CTA/placement recommendations only when justified by what the frontend can detect.
- Figma audit subsection when a Figma frame is provided: covered vs missing legacy states, priority P0/P1/P2 per gap.
- **Scenario matrix**: launcher groups and options (this becomes `mock-runtime/scenarios.js`), each option marked observed or extrapolated, and the scope of each group and chip: section, page (including the flows that lead from it), or a dependency on another group (`references/mock-runtime.md` -> Context). Outcome groups list one option per distinct server/validation text from `copy.md` (for example `emptyKey`, `wrongLength`), not a single generic `error`.
- **Default state** per page, one row each: what is open (tab, modal), what data is shown, and the source: observed in code, production snapshot, user answer (step 1), or invented. Defaults are the most common observed state; a user snapshot wins. A record page with no observed data defaults to a populated record with invented data; the empty variant is a separate option, not a replacement.
- Data and behavior are classified separately. Invented fixture data (names, IDs, values) is marked `fixture: 'invented'` and does not make a state an extrapolation; `extrapolated` is only for UI states or reactions not found in code.
- Every Validation inventory row is an option: rows with text show the text; `silent` rows get an option labeled "<rule>: no message shown" and a `not-implemented` comment.
- Reachability: each option is one launcher pick away from the page default. Groups for tabs, modals, and forms are scoped to the page, and options that need a tab or modal carry `opens` (`references/mock-runtime.md` -> Context).

### 7. Build the mock

Preflight (Working Approach 5), before any mock file:

- List the classes and custom elements the mock will use and `grep -c` each in `_app-css/<app>/admin.css` and `components.css`. A zero count means a missing `--component`, a wrong template reading, or a class set at runtime: resolve it first.
- Confirm wrapper structure and dynamically inserted content from the templates already cited in `analysis.md`.
- Read `references/mock-runtime.md`.

Then:

- Pure HTML/CSS/JS, no build step, open directly from disk (`file://`).
- Copy the runtime first: `cp <skill>/assets/research-launcher.js <skill>/assets/mock-behaviors.js <feature>/mock-runtime/`.
- Load, in this order, at the end of `<body>`: `../mock-runtime/scenarios.js`, `../mock-runtime/data.js`, `../mock-runtime/mock-behaviors.js`, `../mock-runtime/research-launcher.js`, then `app.js`.
- Link `../../_app-css/<app>/<app>.css`, then `../../_app-css/<app>/components.css` if built, then `styles.css`.
- Copy markup from the feature templates: keep custom element tags (`cg-panel`, `cg-section`, `cga-integration-card`), classes, and `layout`/`flex`/`layout-align` attributes; replace Angular inputs that set classes with those classes (for example `layout="flex"` on `cg-panel-row` -> `class="isLayoutFlex"`). Include the app shell when the screen lives inside it.
- Use real images from the repository (`../../../../frontend/lib/ui/assets/images/...`), never placeholders.
- `styles.css` holds only glue the app runtime would provide and the mock lacks (for example modal pointer-events), never restyles app classes.
- Put fixtures, copy strings, and every "state -> what to show" decision in `mock-runtime/data.js`. `app.js` contains only rendering templates. Copy strings are taken verbatim from the Prod text column of `copy.md`; next to each string in `data.js` put its `copy.md` number as a short comment (`// 1.4.3.5.2`).
- Navigation inside the mock (sidebar, tabs that switch pages, links to sub-screens) uses `data-nav`, so the launcher follows the open page.
- **No scenario controls on the page.** No top bar, side panel, or toolbar of research switches. Every state switch lives in `scenarios.js` and is reached through the floating launcher (bottom-right pill). The page renders from `Research.state` and re-renders on `research:change`.
- **Comments are hidden by default.** Every research annotation (extrapolation, not implemented today, legacy defect, source reference, open question) is markup with `data-comment` and `data-comment-kind`, shown only when the launcher's Comments toggle is on.
- **Page behavior is real, not just static frames**: screen transitions, back navigation, modals and confirm dialogs, tabs, dropdowns, validation, loading states, success and error notifications or banners, server error and slow-network outcomes. Use the declarative `data-*` attributes from `mock-behaviors.js`; write custom JS in `app.js` only for feature-specific rendering. Outcomes come from scenario groups, never from random chance.
- Simulate the real flow with local JS state, not network calls.

### 8. Verify the mock

- `node --check` `app.js` and every `mock-runtime/*.js`.
- Every relative `href`/`src` in `index.html` and every image path in `app.js` resolves to an existing file (`ls`).
- `mock/styles.css` does not redefine app classes (`fl-*`, `alert*`, `form-row*`, `app-card*`, `cg-*`, feature classes): grep it; any match must be removed or justified in a comment.
- Run the `copy.md` completeness check (`references/copy-sources.md`). Every string in `data.js` exists verbatim in `copy.md` (grep each), and every `copy.md` row of a mocked state is reachable through the launcher.
- Scoping: every group that changes only some pages or states has `sections` / `screens` / `when`; open each page in the launcher and confirm it lists only groups that change that page.
- Every option in `scenarios.js` is rendered (search `app.js`/`data.js` for each value); every `extrapolated: true` option has a matching `data-comment-kind="extrapolation"` comment.
- Reachability: for each page, list the options in scope at its default state. Every option of a group that changes a tab, modal, or form of that page is in the list; an option whose context is closed by default has `opens`. No state needs manual navigation to appear in the launcher.
- Every Validation inventory row (including `silent`) maps to an option in `scenarios.js`.
- `grep` for leftover research controls in page markup and for always-visible annotation text outside `data-comment`.
- Browser check per Working Approach 7 if a browser tool is available; otherwise tell the user which file to open and that visual verification is theirs.

### 9. Write/refresh `HANDOFF.md`

Include: task and scope; working folder and what each file contains (including `copy.md` row count and excluded keys); current understanding in confirmed/assumption framing; key frontend entrypoints; app CSS path and components compiled, fallback if any; screens/states covered by the mock and how to reach them (launcher groups); design notes and constraints a future session must not re-derive; open questions; next best action. Update the row in `.opencode/features/README.md`.

Update `HANDOFF.md` at the end of every session, even if research is not finished.

In the final reply to the user, list the decisions they did not make themselves: the default of each page and its source, options marked `extrapolated`, data marked `fixture: 'invented'`, and `silent` validation rules. Ask about a default only if it was not settled in step 1.

## Self-Check Before Ending A Session

- Every fact in `analysis.md`/`screen-spec.md` is classified; the matrix has no `?` cells.
- `copy.md` passes the completeness check from `references/copy-sources.md`; Redesign text column is empty.
- No emojis anywhere.
- The mock reflects only existing screens/components, styled by the compiled app CSS (or a commented fallback).
- Extrapolated states are flagged in `scenarios.js` and commented.
- Every page has a Default state row in `screen-spec.md` with its source; invented data is marked `fixture: 'invented'`, not `extrapolated`.
- Every Validation inventory row, including `silent`, is an option; every option is reachable in one launcher pick from its page default.
- No research controls or annotations are visible in page content with the launcher closed and Comments off.
- No helper scripts or CSS patches were added outside the skill's assets.
- No application code changed, nothing installed outside `.opencode/features/_app-css/`, no token printed.
- `HANDOFF.md` alone is enough for a new session to continue.
