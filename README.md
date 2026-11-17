# Design-research
A skill that researches an existing feature and turns it into material a designer can work with before a redesign: a code-verified description of every screen and state, a complete copy deck, and a click-through mock of the current UI. The mock uses the real application CSS compiled from the repository.

## What it is for

- **Who uses it:** designers and researchers preparing a redesign or refactor of a legacy feature.
- **What it does:**
  - Reads the feature's source code.
  - Maps every screen, state, flow and legacy defect.
  - Collects every user-facing text, including validation and server errors.
  - Builds a static mock of the current UI with a floating widget for switching states.
- **What it does not do:**
  - It does not change application code.
  - It does not run the app, call APIs or use live data.
  - It does not propose a redesign.
  - It does not rebuild screens with design-system components.

## What you get

Each researched feature gets its own folder:

```text
.opencode/features/
  _app-css/<app>/              # compiled application CSS, shared by all features of that app
  <feature>/
    analysis.md                # facts with code evidence, screen/state matrix, flow, legacy defects
    copy.md                    # copy deck: every text on the screens, as a tree
    screen-spec.md             # entry conditions, navigation, state tables, scenario matrix
    decisions.md               # scope, assumptions, open product/design decisions
    HANDOFF.md                 # everything a new session needs to continue
    mock/index.html            # click-through mock of the current UI
    mock-runtime/              # mock data, scenarios and the shared runtime
```

Every claim is labeled **Confirmed by code**, **Confirmed by Jira/Figma/user**, **Assumption** or **Open question**.

## Requirements

### To run the skill

| Requirement | Notes |
|---|---|
| [OpenCode](https://opencode.ai) | Any recent version |
| A clone of the product repository | The skill must run inside it (`chronogolf-master`) |
| Node.js and npm | Tested with Node 16.13.0 |
| GitHub Packages token | Classic token with `read:packages`, SSO authorized for the `lightspeed` org. It is needed to install `@lightspeed/design-system-css`, which the app styles import |

You do **not** need:
- `npm ci` of the product repository;
- `NPM_TOKEN_SHOPKEEP`;
- a dev server, backend, database or production access.

### To view a finished mock

- A browser. The mock opens from disk; no server is needed.
- The feature folder and `.opencode/features/_app-css/` placed inside a clone of the product repository. Logos and icon fonts are loaded from the repository by relative path.
- Internet access for web fonts. Offline, the browser falls back to system fonts.

## Installation

1. Put the skill where OpenCode can find it, either in the product repository:

   ```sh
   cd <product-repo>
   git clone <repo-url> .opencode/skills/design-research
   ```

   or globally for all projects:

   ```sh
   git clone <repo-url> ~/.config/opencode/skills/design-research
   ```

2. Make sure only one skill named `design-research` is visible to OpenCode. If an older copy exists in another skills folder, move it out or rename its `name:` field. Two skills with the same name conflict.

3. Configure GitHub Packages once:

   ```sh
   npm config set @lightspeed:registry https://npm.pkg.github.com
   npm config set //npm.pkg.github.com/:_authToken <your-token>
   ```

   Never paste the token into a chat with the agent. The skill only checks that a token exists and reads it from `~/.npmrc`.

4. Check that OpenCode sees the skill. Start OpenCode in the product repository and ask: "Which skills are available?"

### Updating

```sh
cd <path-to-skill> && git pull
```

After an update that changes `assets/research-launcher.js` or `assets/mock-behaviors.js`, copy them into an existing feature's `mock-runtime/` if you want the new behavior there. Existing mocks keep working with the copy they have.

## Quick start

Start OpenCode in the product repository and describe the task, for example:

> Use design-research. Research Settings / Integrations into a new folder `integrations`, full coverage. A production snapshot for comparison is at `~/Downloads/Integrations _ Lightspeed Golf.mhtml`.

The agent first asks about anything the request leaves open: new folder or extend an existing one, clean re-run or continue, full coverage or a subset of screens. Then it works on its own and stops only when it needs you, for example on an npm access error.

When it finishes, open `.opencode/features/<feature>/mock/index.html`.

## How the skill works

1. **Confirm scope.** Folder, clean re-run or continuation, coverage.
2. **Locate the feature.** Sidebar entry, permission gate, route, components, store, API.
3. **Draft the screen/state matrix.** One row per screen, block or modal; one column per state.
4. **Fill the matrix from code and collect copy.** Templates, handlers and every mutation are traced from the frontend through the controller and model validators to how the error is shown. Every text goes into `copy.md` as soon as it is verified.
5. **Compile the application CSS.** `assets/build-app-css.mjs` builds the global styles and the Angular component styles from `frontend/angular.json`, using the exact package versions in the lockfile.
6. **Write the documents.** `analysis.md`, `decisions.md`, `screen-spec.md`.
7. **Build the mock.** Markup is copied from the templates, images come from the repository, and texts come from `copy.md`.
8. **Verify.** Syntax, links, no restyled app classes, `copy.md` completeness, scenario coverage. A short browser check runs if a browser tool is available.
9. **Write `HANDOFF.md`** and update `.opencode/features/README.md`.

## Using the mock

- **Widget:** the pill at the bottom right, or `Alt+Shift+R`.
  - **Context:** pick a section, then a page. Only the state groups and options relevant to that page are shown. Options that no longer apply are reset; the rest are kept.
  - **Navigation:** using the mock's own navigation updates the widget to match the open page.
  - **Comments:** shows research notes as numbered pins on the page.
  - **Copy link:** the URL keeps the current state, so it can be shared.
  - **Reset to defaults:** returns to the default state. The default is the most common observed state, or the production snapshot state if one was provided.
- **Comment types:**

  | Type | Meaning |
  |---|---|
  | Legacy defect | Existing bug or inconsistency, with an ID from `analysis.md` (D1, D2, ...) |
  | Extrapolation | State not found in code, shown for design discussion only |
  | Not implemented | Exists in markup or locale files but is not wired |
  | Source | Pointer to the code behind a non-obvious element |
  | Open question | Needs a product or design decision |

- Options marked **extrapolated** in the widget are not current behavior.

## Using `copy.md`

Each screen is a tree in vis
