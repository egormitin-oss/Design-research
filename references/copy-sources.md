# Copy Deck: Collecting Every Text of a Screen

Output: `<feature>/copy.md`. It lists every text the user can see or hear on the researched screens, in every state, as a tree that follows the screen structure. The designer uses it as the copy deck for the redesign; the mock takes its strings from it.

Load this file at step 3 of the skill, before tracing mutations.

## Translation keys in this repository

- Tool: Transifex, project `chronogolf-web`, resource `en-us-yml` (`.tx/config`, `docs/transifex.md`).
- Source file: `config/locales/en.yml`. Other locales: `config/locales/<locale>.yml` (en-CA, en-IE, fr, fr-CA, es, de, it, nl).
- Key = YAML path without the locale root: `en: admin: add_ons: index: integrations: title` -> `admin.add_ons.index.integrations.title`. Frontend calls use the same path (`'admin.add_ons...' | translate`, `$translate('...')`).
- Rails validation texts use the same file: default messages under `errors.messages.*` (for example `errors.messages.blank`), model-specific ones under `activerecord.errors.models.<model>.attributes.<attr>.<error>`, attribute names under `activerecord.attributes.<model>.<attr>`.
- Admin falls back to the fallback locale when a key is missing in the user's locale (`legacy/apps/admin/config/i18n.config.ts`).
- Marketplace (Angular) also loads `frontend/marketplace/assets/i18n/*.json`; for marketplace features check there too.

## Where texts come from

Go through every source for each screen and each mutation in the screen/state matrix. Read fragments: the template block, its handler, the API call, the server code that answers it.

| # | Source | What it yields | How to find it |
|---|---|---|---|
| 1 | Feature templates | static text, `translate` keys, `placeholder`, `title`, `aria-label`, `alt`, tooltips, empty states, markdown content | read the template block; grep `translate`, `placeholder=`, `title=`, `aria-label=`, `alt=`, `tooltip` |
| 2 | Feature TS | `$translate` / `instant` / `translate.get` calls, hardcoded strings passed to modals, notifications, alerts | grep `\$translate\|instant(\|translate.get` and string literals in the handler |
| 3 | Dynamic keys | `'prefix.' + status`, maps from enum to key | grep the prefix, then list the whole subtree of that prefix in `en.yml`; one row per value the screen can reach |
| 4 | Shared services the handler calls | modal titles and buttons (`ModalService` defaults: Cancel, Confirm, Delete), `ErrorHelper` generic texts (`shared.errors.server_error.*`, `shared.errors.rate_limit`), notification wrappers, placeholders of shared components | open the service method the handler calls, only that method |
| 5 | Global HTTP layer | session expired (401), forbidden (403), not found (404), server error (500), offline | grep `interceptor`, `status === 401` in the app config; include only texts that can appear on this screen |
| 6 | Frontend validation | `ng-messages`, Angular `Validators` error maps, form directives, custom validators | the form template and the directives it uses |
| 7 | Browser native validation | `required`, `type=email`, `min`, `max` without a custom message: the browser shows its own text | input attributes; Prod text = "(browser message)" |
| 8 | Server: model validations | `validates ... presence / format / length / uniqueness / numericality`, custom `validate` methods with `errors.add` | route -> controller -> use case / interactor -> model; read `validates` and `errors.add` lines |
| 9 | Server: Rails message templates | default texts (`can't be blank`, `is invalid`, `is the wrong length (should be %{count} characters)`, `has already been taken`) and model overrides | `config/locales/en.yml` `errors.messages`, `activerecord.errors.models.<model>`; if absent there, the rails-i18n default applies (record as Assumption with the default text) |
| 10 | Server: error rendering | how errors are serialized (full messages with attribute name or not, array or object) | the controller's render helper (`render_api_error`, `template_error_json` in `app/controllers/concerns/error_handler.rb`) |
| 11 | Frontend error extraction | which part of the response is shown and how several messages are joined | `ErrorHelper.extractMessage` / the handler's `catch` |
| 12 | Server: custom errors | `raise SomeError, "..."`, `I18n.t` in use cases, interactors, services, `fail_and_rollback(e.message)` | grep in the use case/interactor of the mutation |
| 13 | External services | OAuth errors, partner API messages passed through unchanged | `rescue ... e.message` on the call path; Prod text = "(external message)" with an example if known |
| 14 | Tests | exact texts and edge cases already covered | grep the model, key, or message in `spec/**`, `cypress/**`, `frontend/**/*.spec.ts` |
| 15 | App shell | page title, breadcrumb, sidebar label of the screen | sidebar template and route config |

Out of scope: texts of other screens reachable by a link (record only the link text), emails, PDFs, backend logs.

## Edge cases to check for every row

- Interpolation: list the variables (`{{ label }}`, `%{count}`); note the longest and empty values and where they come from.
- Pluralization: `one` / `other` (and `zero` if defined); note which forms exist.
- Several messages at once: the separator used when errors are joined, and the order.
- Error after success: the mutation succeeded but the follow-up refetch or redirect failed.
- Missing translation: the fallback locale text appears; record missing locales only when checked.
- Length limits: `maxlength` in the field versus the database column or validator; truncation or wrapping.
- Formats: dates, money, numbers per locale.
- Hidden text: `aria-label`, `alt`, `title`: present only for screen readers or on hover.

## Format of `copy.md`

```markdown
# <Feature> - copy deck

Keys: Transifex `chronogolf-web` / `config/locales/en.yml`. Paths are relative to the repository root.
Redesign column is for the designer; the research never fills it.

## 1 Integrations page (`/add-ons`)

| Element | Prod text | Redesign text | Key | Source | Comment |
|---|---|---|---|---|---|
| **1.1 Page header** | | | | `frontend/legacy/apps/admin/components/integrations/index.html:3-6` | |
| &emsp;1.1.1 Title | Integrations | | `admin.add_ons.index.integrations.title` | `...index.html:4` | Also the breadcrumb |
| **1.4 Section: Licenses** | | | | | France or Golf Canada clubs only |
| &emsp;**1.4.3 Card: FFG** | | | | | |
| &emsp;&emsp;1.4.3.4 Field: License Key, placeholder | License Key | | - | `...provider-with-input.html:26` | Hardcoded, not in Transifex. No visible label |
| &emsp;&emsp;**1.4.3.5 Save errors** | | | | `frontend/legacy/apps/shared/services/helpers/error.helper.ts:59-75` | Danger alert above the field. Server 422 body `error.message` = all messages joined by `to_sentence` (`app/controllers/concerns/error_handler.rb:113-116`) |
| &emsp;&emsp;&emsp;1.4.3.5.1 Empty key | Ckey can't be blank, Ckey is invalid, and Ckey is the wrong length (should be 32 characters) | | `errors.messages.blank`, `errors.messages.invalid`, `errors.messages.wrong_length` | `app/models/integration/license/ffg.rb:11-12` | Three validators fail at once. Attribute shown as "Ckey": no `activerecord.attributes` override |
| &emsp;&emsp;&emsp;1.4.3.5.2 Wrong length | Ckey is the wrong length (should be 32 characters) | | `errors.messages.wrong_length` | `app/models/integration/license/ffg.rb:12` | Alphanumeric key not 32 characters long. `%{count}` = 32 |
```

(Rows above are an illustration of the format; verify each text against the code of the feature you research.)

Rules:

- **Tree.** `##` heading per screen (or per standalone modal flow). Inside, rows follow the visual order top to bottom: region or section -> component (card, form, modal, notification) -> element (title, description, label, placeholder, help, button, alert) -> variant (state, error case). Group rows have a bold name and no text. The number shows the path (`1.4.3.5.1`); indent with one `&emsp;` per level below the first.
- **Where things nest.** A modal, notification, or confirm dialog is a child of the element that opens it. A validation or server error is a child of the field or block where it is shown. State-specific texts are variants of the same element: `Status alert [connected]`, `Status alert [coming soon]`.
- **Element** names say what the text is: `Title`, `Description`, `Button: Save`, `Button: Save [saving]`, `Field: URL, label`, `Field: URL, placeholder`, `Error: empty key`, `aria-label: Close`.
- **Prod text**: the exact English text as rendered. Keep variables as written in the source (`{{ label }}`, `%{count}`); add an example value in Comment. Markdown links as `[text](url)`; bold/italic kept as `**`/`*`. Composed server messages are written as finally shown (attribute name + message). Unknown runtime text: `(browser message)`, `(external message)`, `(server message)` with what is known in Comment. If the exact composition is not verified, write the best reading and mark `Assumption` in Comment.
- **Redesign text**: always empty in research output.
- **Key**: the Transifex key; for Rails defaults the `errors.messages.*` key; for dynamic keys the resolved key of that row (the parent group row may show the template `prefix.{status}`). `-` for hardcoded, browser, and external texts.
- **Source**: `path:line` of the code that decides that this text is shown (template, handler, validator). Add the locale file line only when it matters (override, missing locale).
- **Comment**: when the text appears if not by default (condition, role, flag, country, state), what it depends on (which error, which validation, follow-up of which action), interpolation values and limits, hidden-only text, legacy defect IDs (`D4`), `Assumption` / `Open question` markers. Empty when the text is default and unconditional.
- One row per distinct text. A text reused in several places gets a row in each place; the second row may say `Same as 1.2.1` in Comment.
- Escape `|` inside cells as `\|`.

## Completeness check (before the mock is written)

1. Extract every key the feature files reference and compare with `copy.md`. Each key not in `copy.md` must be listed under `## Excluded keys` at the end of `copy.md` with the reason (for example "component not rendered on this screen").

   ```sh
   T=<feature dir>
   grep -rhoE "['\"][a-z_]+(\.[a-z0-9_]+){2,}['\"]" <feature template and ts dirs> \
     | tr -d "'\"" | grep -vE '\.(html|ts|scss|svg|png|js)$' | sort -u > "$T/.keys"
   while read k; do grep -qF "\`$k\`" "$T/copy.md" || echo "$k"; done < "$T/.keys"
   rm "$T/.keys"
   ```

   Pass directories as separate arguments (zsh does not split a quoted variable). The list is a starting point: values that only look like keys (`vm.provider.unlink`) are ignored; keys built at runtime are found through source 3.
2. Every mutation in the screen/state matrix has at least one success row (or "no feedback" in Comment) and its error rows: frontend validation, each server validator, generic server error, rate limit if `ErrorHelper` is used.
3. No `?` and no paraphrase in Prod text: either the exact text or a marked runtime placeholder.
