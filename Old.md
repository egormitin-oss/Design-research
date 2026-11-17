---
name: design-system-conformance-review
description: "Automated Figma design QA for objective Design System conformance. Use before a design is marked Ready for Review."
argument-hint: "Provide the target Figma frame URL, the product area, and any relevant DS component names."
---

<!-- markdownlint-disable MD013 -->

# Design System Conformance Review

Review Figma designs for deterministic conformance with the Unified Components
Design System. This skill checks whether a design uses the correct Design System
components, variants, tokens, layout rules, and implementation-backed patterns
before it is marked Ready for Review.

This is not a UX critique, product critique, accessibility audit, or visual taste
review. Flag only objective Design System violations, likely inconsistencies, and
cases where the expected behavior cannot be established from available sources.

## Known Sources

- Design System Figma file:
  `YXMP5pTnaX5rjW9Z2ZtyRj`, node `3901:10772`.
- Layout reference Figma file:
  `wxBLxgAY0XzRwAPgAVaSBH`, node `3079:66887`.
- Subscribed DS libraries found in Figma:
  Unified Token Library, Unified Icon Library, Template Library, Phoenix 2.0,
  and Unified Components Backoffice (WIP).
- Unified Components codebase:
  `unified-components-main copy/`.
- Component theme configs:
  `unified-components-main copy/packages/unified-components-helios-theme/src/theme/components/`.
- React component exports:
  `unified-components-main copy/packages/unified-components-helios-theme/src/react/components/`.
- Shared component logic:
  `unified-components-main copy/packages/unified-components-logic/src/components/`.
- Implementation guidance:
  `unified-components-main copy/docs/component-patterns.md`,
  `unified-components-main copy/docs/patterns/theme-patterns.md`, and
  `unified-components-main copy/CLAUDE.md`.

## Source-of-Truth Hierarchy

Use this priority order for every finding:

1. Production implementation or Code Connect mapping, when available.
2. Current Design System component, component set, variant, or variable in
   Figma.
3. Documented Design System rule in Unified Components docs.
4. Existing product pattern, only when no authoritative DS rule exists.

Do not infer a rule from visual similarity when a higher-priority source exists.
If sources conflict, use the highest-priority source and report the conflict as
`UNKNOWN` unless the product team has explicitly chosen one source.

## Efficient Review Rules

- Gather independent evidence in one pass: target frame structure, subscribed
  libraries, relevant DS components, variables, Code Connect mappings, and local
  component docs.
- Search exact component names first. Do not run synonym searches unless the
  target uses a non-DS name and no matching DS asset is found.
- Sample one representative instance of a repeated component, then list all
  affected instances under one finding.
- Reuse token and component measurements across identical instances.
- Stop once the requested frame has a conformance verdict and required evidence.

## Review Algorithm

### 1. Establish Scope

1. Parse the target Figma URL into `fileKey` and `nodeId`.
2. Confirm the frame, page, platform, viewport, and product area.
3. Identify components that are in scope for the user journey.
4. Exclude exploratory, archived, hidden, or clearly annotated draft frames
   unless the user explicitly asks to review them.

### 2. Load Authoritative Sources

1. Fetch Figma metadata for the target frame.
2. Fetch subscribed libraries for the target file.
3. Fetch variable definitions for the target frame where available.
4. Fetch Code Connect mappings for relevant DS nodes where available.
5. Search the Design System for each exact component or token needed.
6. Inspect the matching Unified Components source files only when Code Connect or
   Figma metadata does not establish the expected behavior.

### 3. Build the Expected Model

For each DS component or token in scope, record:

- Canonical component or component set name.
- Expected family and main component.
- Required nested component hierarchy.
- Valid variant/property names and values.
- Expected size, state, density, and icon dimensions.
- Tokenized values for spacing, padding, gaps, typography, radius, border width,
  colors, and dimensions.
- Required Auto Layout configuration and alignment.
- Source of truth used for each expected value.

### 4. Inspect the Target Design

For each relevant target node, record:

- Node id, name, type, page/frame path, and visibility.
- Instance status: live instance, detached instance, local component, or custom
  frame.
- Main component and component family.
- Component properties, variants, states, nested instances, and overrides.
- Bound variables and raw values for fills, strokes, text, radius, sizing,
  padding, item spacing, and effects.
- Auto Layout mode, sizing behavior, alignment, wrapping, padding, and gaps.
- Absolute width and height when dimensions are controlled by DS rules.

### 5. Compare Actual to Expected

Run conformance checks in this order:

1. Component identity and instance health.
2. Component family, variant, size, state, and properties.
3. Nested component hierarchy and allowed slot composition.
4. Token binding and raw value usage.
5. Auto Layout configuration and internal spacing.
6. Dimensions, icon sizes, radius, borders, typography, and colors.
7. 1 to 2 px deviations from DS specifications.

Only emit a `FAIL` when the expected value is established by the source-of-truth
hierarchy. Use `WARNING` or `UNKNOWN` when evidence is incomplete.

## Component Checks

Automate these checks where Figma metadata or Plugin API data is available:

- Custom UI duplicates an existing DS component.
- Wrong DS component family is used for the intended role.
- Instance is detached or rebuilt as frames/text/shapes.
- Instance points to a deprecated, local, wrong, or unavailable main component.
- Component variant, size, state, or property differs from the DS definition.
- Slot content violates preferred values or allowed nested component hierarchy.
- Overrides change structure, spacing, icons, text styles, colors, radius, or
  dimensions without an allowed component property.
- Nested components are missing, duplicated, reordered, or placed outside their
  expected slot.

Treat purely content overrides, such as label text or placeholder text, as valid
unless the DS component documents a fixed value or text pattern.

## Token Checks

Flag arbitrary raw values when a corresponding DS token exists for the property:

- Spacing, padding, and gaps.
- Typography style, font size, line height, weight, and letter spacing.
- Border radius and border width.
- Surface, text, icon, border, status, and action colors.
- Component dimensions controlled by DS tokens.
- Icon size and stroke/fill color.

Use bound variables as the primary evidence. A raw value is a `FAIL` only when a
matching DS token is known and the component or layout is required to use it.
Otherwise mark it `WARNING` or `UNKNOWN`.

## Layout Checks

Automate these checks where node properties are available:

- Auto Layout mode, direction, wrapping, alignment, and sizing behavior.
- Internal component spacing and slot spacing.
- Padding on each side.
- Component width, height, min/max behavior, and resize mode.
- Incorrect nesting inside or outside allowed slots.
- Unexpected 1 to 2 px deviations from DS specifications.
- Visual alignment deviations when DS docs define exact alignment.

Do not fail a freeform product layout unless a DS layout component, template, or
documented layout rule applies.

## Severity Model

- `FAIL`: objective DS violation with a clear expected value or component.
- `WARNING`: likely inconsistency that requires designer review.
- `INFO`: improvement or cleanup with no conformance impact.
- `UNKNOWN`: expected behavior cannot be established from available sources.

Never upgrade a subjective preference to `FAIL`. Never downgrade a confirmed DS
violation because it is visually subtle.

## Automated Checks

These checks can usually be automated through Figma metadata, Design System
search, variables, Code Connect, and read-only Plugin API probes:

- Instance vs detached/custom node detection.
- Main component, remote/local status, and component set identity.
- Component properties and variant values.
- Slot preferred values and nested instance hierarchy.
- Bound variables vs raw values.
- Auto Layout mode, gaps, padding, alignment, and sizing behavior.
- Width, height, radius, stroke weight, fills, text styles, and effects.
- Icon component family and icon dimensions.
- Repeated identical findings grouped by component or token.

## Human Judgement Checks

These require designer or reviewer judgement and should not be reported as
deterministic `FAIL` without additional evidence:

- Whether a custom composition intentionally represents a new component need.
- Whether an existing DS component is semantically appropriate for a novel use
  case when no documented rule exists.
- Whether a product-specific pattern should override a generic DS pattern.
- Whether content wording, information architecture, or visual priority is right.
- Whether a raw value is acceptable in exploratory work or one-off illustration.

Use `WARNING` or `UNKNOWN` for these cases and ask for a design decision only
when it blocks the Ready for Review verdict.

## Output Schema

Return this structure:

```json
{
  "verdict": "PASS | PASS_WITH_WARNINGS | FAIL | UNKNOWN",
  "scope": {
    "figmaFile": "string",
    "nodeId": "string",
    "frameName": "string",
    "reviewedSources": ["string"]
  },
  "summary": {
    "fail": 0,
    "warning": 0,
    "info": 0,
    "unknown": 0
  },
  "findings": [
    {
      "severity": "FAIL | WARNING | INFO | UNKNOWN",
      "category": "component | token | layout | source-of-truth",
      "affectedFigmaNode": {
        "id": "string",
        "name": "string",
        "path": "string"
      },
      "actual": "string",
      "expected": "string",
      "sourceOfTruth": {
        "priority": 1,
        "type": "production | code-connect | figma-ds | docs | product-pattern",
        "reference": "string"
      },
      "explanation": "string",
      "suggestedCorrection": "string"
    }
  ],
  "automatedChecksRun": ["string"],
  "requiresHumanJudgement": ["string"],
  "limitations": ["string"]
}
```

For chat output, lead with the verdict and counts, then list findings ordered by
severity. Keep findings concise but include all required fields.

## Examples

### PASS

```json
{
  "severity": "INFO",
  "category": "component",
  "affectedFigmaNode": {
    "id": "3948:6341",
    "name": "In Page Navigation Elements / Vertical Tabs",
    "path": "Page Navigation / Main Component"
  },
  "actual": "Live instance uses the expected component family and tokenized spacing",
  "expected": "Unified Components Backoffice Page Navigation composition",
  "sourceOfTruth": {
    "priority": 2,
    "type": "figma-ds",
    "reference": "Unified Components Backoffice component set"
  },
  "explanation": "No conformance issue found for this checked component.",
  "suggestedCorrection": "No change required."
}
```

### FAIL

```json
{
  "severity": "FAIL",
  "category": "component",
  "affectedFigmaNode": {
    "id": "123:456",
    "name": "Primary CTA",
    "path": "Ready for Review / Header / Primary CTA"
  },
  "actual": "Custom frame with text and rectangle styled like a button",
  "expected": "Live instance of uc: Button with appearance=primary and size matching the layout",
  "sourceOfTruth": {
    "priority": 2,
    "type": "figma-ds",
    "reference": "Unified Components Backoffice / uc: Button"
  },
  "explanation": "The design duplicates an existing DS component instead of using the component instance.",
  "suggestedCorrection": "Replace the custom frame with the uc: Button instance and set the documented variant properties."
}
```

### WARNING

```json
{
  "severity": "WARNING",
  "category": "token",
  "affectedFigmaNode": {
    "id": "234:567",
    "name": "Card group",
    "path": "Ready for Review / Content / Card group"
  },
  "actual": "Gap is 18px and is not bound to a spacing variable",
  "expected": "A spacing token, if this group follows a DS card layout",
  "sourceOfTruth": {
    "priority": 4,
    "type": "product-pattern",
    "reference": "Nearby card groups use tokenized spacing"
  },
  "explanation": "No authoritative DS rule was found for this product layout, but the raw value is inconsistent with the surrounding pattern.",
  "suggestedCorrection": "Confirm the intended layout, then bind the gap to the closest approved spacing token if applicable."
}
```

## Limitations and False-Positive Safeguards

- Do not fail hidden, archived, or exploratory frames unless they are explicitly
  in review scope.
- Do not fail a raw value unless a corresponding DS token or documented rule is
  established.
- Do not fail an override that is exposed as an intended component property.
- Do not fail text/content changes unless the DS source fixes the copy pattern.
- Do not fail a product-specific layout based only on visual similarity to a DS
  template.
- Do not assume Code Connect coverage exists. If mapping is absent, fall back to
  Figma DS definition, docs, then product patterns.
- Report stale, missing, or conflicting sources as `UNKNOWN` with the exact
  source that could not be verified.
- Prefer one grouped finding over many repeated findings for the same component,
  token, or layout rule.
