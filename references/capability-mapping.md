# Figma-to-Code Capability Mapping

Assess only capabilities required by the reviewed journey. Versioned evidence
must establish more than visual similarity or component identity.

## Matrix

| Required behaviour / state | Figma component / variant | Code API / slot / composition | Figma and package versions | Contract evidence | Support | Acceptance scenario / owner |
| --- | --- | --- | --- | --- | --- | --- |

Inspect needed public props, supported child composition, controlled state/events,
loading/errors/disabled handling, responsive behaviour, and context/naming hooks.
Do not invent APIs or assume a Figma property has a same-named code prop. A slot
may support composition without a new variant; preferred values are not necessarily
exclusive allowed values. Accessibility review owns adequacy of the resulting
name/context/keyboard behaviour, not DS review alone.

## Support states

- `supported`: applicable public API/composition and versioned contract establish
  the capability. State whether evidence is documentation/source or runtime.
- `extension-needed`: a verified capability gap needs additional supported work.
  Name the gap and accountable owner without automatically rejecting the design.
- `contradicted`: an established target constraint conflicts with the required
  behaviour; cite both. Refer task/release consequences to readiness.
- `unknown`: package, version, contract, or capability evidence is insufficient.
  An unsuccessful search or missing Code Connect mapping does not prove no support.

An extension may be feasible for a future release. A conformance violation needs
an independently applicable DS rule; support status alone is not a conformance
FAIL. Conversely DS PASS does not imply that the proposed behaviour is implemented.

## Evidence and verification

Locate the actual target package/version from supplied release context and relevant
project dependency evidence. `unified-components-main copy/` and installed MCP docs
are discovery aids until their version correspondence is verified. If a source is
unavailable or stale, record the limit rather than silently using latest.

Code Connect establishes its explicit mapping, not runtime support or every prop's
semantics. Figma libraries establish design contracts; source inspection establishes
code support within its tested/read scope. Runtime evidence needs environment,
revision, setup, action, expected result, actual observation, and untested states.
Review does not authorize executing target scripts or live state-changing tests.

Reuse capability IDs/references in readiness handoff. Keep frontend/API feasibility
research separate from component-library support and prevent duplicate findings.

## Diagnosis examples

### Confirmed rule violation, low impact

Fixture: exact node padding is 17 px; verified mandatory component rule at the
agreed version requires 16 px and documents no tolerance or exception.

- Result: FAIL. Impact: LOW for established local spacing deviation, without an
  invented task-completion consequence. Priority: unassigned until triaged.
- Required outcome: the padding satisfies the applicable component rule or an
  accountable scoped exception establishes a different expectation.
- No replacement-layout proposal in diagnosis.

### Pattern evidence without a mandatory rule

Fixture: a custom card group uses 18 px spacing; comparable groups use a token,
but no authoritative rule establishes that the custom group must follow it.

- Advisory inconsistency: WARNING, impact unknown unless evidenced.
- If token use is a material mandatory check whose applicability is unresolved,
  keep that check UNKNOWN rather than treating a warning as a pass.
- Required decision: whether the documented card-layout rule applies.

### Component mapped, behaviour not established

Fixture: Code Connect identifies a picker. The design requires persistent multi-
selection across searches; neither mapping nor available docs establishes it.

- Support: unknown, pending relevant versioned API/composition evidence.
- Conformance: retain results of actual component/token checks independently.
- Acceptance task: selected items and scope remain correctly represented across
  the specified search transitions. Runtime verification: not-tested.

### Additional calibration

| Case | Expected handling |
| --- | --- |
| Required behaviour uses a documented public slot | Supported composition; no new variant required merely for absence in Figma variants. |
| Target release adds a capability absent from production | Verify approved target source; do not require parity with old production. |
| Verified extension needed, owner/release plan known | Handoff feasibility evidence; no automatic DS FAIL or readiness block. |
| DS-correct table input has unclear runtime identity | Accessibility owner; conformance pass does not close the identity finding. |
| Mandatory token violated but appearance matches | FAIL still applies; impact/priority assessed separately. |
| Local snapshot lacks revision/deployment evidence | Unknown correspondence, not definitive target support. |
