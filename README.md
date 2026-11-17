# Design research
is a skill for researching an existing feature before a redesign. It reads the product code and produces documentation, a copy deck and a clickable mock of the current interface.
The mock uses the application’s CSS compiled from the repository.

## What the skill does

For a selected feature, the skill:

- maps its screens, states and flows;
- documents existing bugs and inconsistencies;
- collects user-facing copy, including validation and server errors;
- builds a static mock with a widget for switching between states.

The skill doesn’t change the application code, run the app, call APIs or use live data. It also doesn’t propose a redesign or rebuild screens with design-system components.

## Output

Each researched feature has its own folder:

```text
.opencode/features/
  _app-css/<app>/              # compiled application CSS, shared by all features of that app
  <feature>/
    analysis.md                # code evidence, screen/state matrix, flows and legacy defects
    copy.md                    # copy deck organised as a tree
    screen-spec.md             # entry conditions, navigation, states and scenarios
    decisions.md               # scope, assumptions and open product/design decisions
    HANDOFF.md                 # context needed to continue in a new session
    mock/index.html            # clickable mock of the current UI
    mock-runtime/              # mock data, scenarios and shared runtime
```

Claims are marked as **Confirmed by code**, **Confirmed by Jira/Figma/user**, **Assumption** or **Open question**.

## Requirements

To run the skill, you need:

| Requirement | Details |
|---|---|
| [OpenCode](https://opencode.ai) | Any recent version |
| A clone of the product repository | Run the skill inside `chronogolf-master` |
| Node.js and npm | Tested with Node 16.13.0 |
| GitHub Packages token | A classic token with `read:packages`, authorised for SSO in the `lightspeed` org. It’s needed to install `@lightspeed/design-system-css`, which the application styles import |

You don’t need to run `npm ci` in the product repository or have `NPM_TOKEN_SHOPKEEP`, a dev server, backend, database or production access.

To view a finished mock, you need:

- A browser. You can open the mock directly from disk.
- The feature folder and `.opencode/features/_app-css/` inside a clone of the product repository. Logos and icon fonts are loaded from the repository using relative paths.
- An internet connection for web fonts. Without one, the browser uses system fonts.

## Installation

1. Clone the skill into the product repository:

   ```sh
   cd <product-repo>
   git clone <repo-url> .opencode/skills/design-research
   ```

   Or install it globally for all projects:

   ```sh
   git clone <repo-url> ~/.config/opencode/skills/design-research
   ```

2. Make sure OpenCode can see only one skill named `design-research`. If there’s an older copy in another skills folder, move it out or change its `name:` field. Skills with the same name conflict.

3. Configure GitHub Packages:

   ```sh
   npm config set @lightspeed:registry https://npm.pkg.github.com
   npm config set //npm.pkg.github.com/:_authToken <your-token>
   ```

   Don’t paste the token into a chat with the agent. The skill checks that a token exists and reads it from `~/.npmrc`.

4. Start OpenCode in the product repository and ask: “Which skills are available?”

### Updating

```sh
cd <path-to-skill> && git pull
```

If an update changes `assets/research-launcher.js` or `assets/mock-behaviors.js`, copy the updated files into an existing feature’s `mock-runtime/` to use the new behaviour there. Existing mocks continue to work with their current copies.

## Quick start

Start OpenCode in the product repository and describe the feature you want to research. For example:

> Use design-research. Research Settings / Integrations into a new folder `integrations`, full coverage. A production snapshot for comparison is at `~/Downloads/Integrations _ Lightspeed Golf.mhtml`.

If the scope isn’t clear, the agent will ask whether to use a new or existing folder, start a clean re-run or continue previous work, and cover the full feature or selected screens. It then works independently and stops when it needs your input, for example if npm access fails.

When it’s finished, open:

```text
.opencode/features/<feature>/mock/index.html
```

## How it works

1. **Confirm the scope:** folder, clean re-run or continuation, and coverage.
2. **Find the feature:** sidebar entry, permission gate, route, components, store and API.
3. **Draft the screen/state matrix:** one row per screen, block or modal, and one column per state.
4. **Trace the implementation and collect copy:** follow templates, handlers and mutations from the frontend through controllers and model validators to the displayed errors. Verified text is added to `copy.md`.
5. **Compile the application CSS:** `assets/build-app-css.mjs` builds global and Angular component styles from `frontend/angular.json`, using the package versions in the lockfile.
6. **Write the research documents:** `analysis.md`, `decisions.md` and `screen-spec.md`.
7. **Build the mock:** use markup from the templates, images from the repository and text from `copy.md`.
8. **Verify the result:** check syntax, links, app classes, copy completeness and scenario coverage. If a browser tool is available, run a short browser check.
9. **Prepare the handoff:** write `HANDOFF.md` and update `.opencode/features/README.md`.

## Using the mock

Open the widget using the pill in the bottom-right corner or `Alt+Shift+R`.

- **Context:** select a section and page. The widget shows only the state groups and options relevant to that page. Options that no longer apply are reset; the others stay selected.
- **Navigation:** using the mock’s navigation updates the widget to match the current page.
- **Comments:** show research notes as numbered pins.
- **Copy link:** copies a URL containing the current state.
- **Reset to defaults:** returns to the most common observed state, or to the production snapshot state if one was provided.

Comments have the following types:

| Type | Meaning |
|---|---|
| Legacy defect | An existing bug or inconsistency, with an ID from `analysis.md` such as D1 or D2 |
| Extrapolation | A state not found in code, included for design discussion |
| Not implemented | An element that exists in markup or locale files but isn’t wired |
| Source | A pointer to the code behind a non-obvious element |
| Open question | A product or design decision that still needs to be made |

Options marked **extrapolated** don’t represent confirmed current behaviour.

## Using `copy.md`

Each screen is organised as a tree in visual order: section → component → element → variant, such as a state or error case.

| Column | Content |
|---|---|
| Element | Numbered path in the tree, for example `1.4.3.5.2 Wrong length` |
| Prod text | Exact English text currently rendered |
| Redesign text | Empty column for the designer to fill in |
| Key | Transifex key (`chronogolf-web`, source `config/locales/en.yml`), or `-` for hardcoded, browser or external text |
| Source | File and line that determine when the text appears |
| Comment | Display conditions, dependencies, variable values and defect IDs |

The **Prod text** column uses placeholders where the text isn’t available in the source:

- `(server message)` — comes from the server at runtime;
- `(browser message)` — native browser validation text;
- `(external message)` — comes from a third-party service.

Keys referenced by the feature but not shown on the researched screens are listed under **Excluded keys**, with a reason for each.

## Continuing or repeating research

- **Continue existing work:** ask the agent to continue the feature. It reads `HANDOFF.md` and doesn’t re-research confirmed facts.
- **Run the research again:** ask for a new folder and a clean re-run. The agent reads the old folder only after the new pass is complete.
- **Rebuild the CSS:** ask the agent to re-run `build-app-css.mjs` when the lockfile changes or the screen uses new Angular components.

## Sharing results

`.opencode/features/` is git-ignored in the product repository. To share a feature:

1. Archive `.opencode/features/<feature>/` and `.opencode/features/_app-css/<app>/`.
2. Ask the recipient to extract both into `.opencode/features/` in their own clone of the product repository.

The `node_modules` folder inside `_app-css/` isn’t needed to view the mock and can be left out of the archive.

## Limitations

The research focuses on the frontend. Backend code is read only to explain errors, validation and text shown by the frontend.

The mock is static and uses fictional data. Requests are simulated, and outcomes such as success, slow responses and errors are selected in the widget.

Visual verification requires a browser tool. In some corporate environments, system Chrome headless may be blocked; use Playwright’s headless shell or check the mock manually.

A saved production page (`.mhtml`) isn’t a reliable pixel reference:

- it doesn’t include web or icon fonts;
- it may have been captured while loading, making buttons look disabled;
- re-parsing moves nested paragraphs.

Use it to compare structure and computed styles, rather than relying on screenshots alone.
