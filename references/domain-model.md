# Domain Model Research

Research the business model behind the interface before treating screens as independent forms. This is a conceptual model, not a database-schema dump or a proposed redesign. Inspect only the requested domain and its necessary boundaries.

## Evidence discipline

Give claims stable IDs (`DM-001`). For each record classification, source path/line or supplied decision, revision/retrieval date, applicable role/state, and unresolved conflict. Distinguish:

- current source-confirmed behaviour;
- observed runtime behaviour in a named environment;
- approved target behaviour from a product decision;
- assumption or unanswered question.

Use the skill's claim classifications and put runtime evidence details in the source column. A test establishes an expected contract, not proof that the deployed system follows it. A UI label or DTO field name alone does not establish a financial or access rule. Mark unavailable contracts explicitly. Conflicting current and target models are not automatically defects.

## Investigation sequence

1. **Vocabulary and boundaries:** define user-facing concepts and map them to code concepts where verified. Distinguish similarly named objects and operations; mark disputed terminology rather than inventing a new term.
2. **Entities and relationships:** identify identity, containment versus reference, cardinality, optionality, ownership, and lifecycle independence. Is a bundle an indivisible sale item, a group of products, or both in different contexts? Do not infer cardinality from one example record.
3. **Actors and authority:** separate beneficiary, payer, operator, account owner, and organization when applicable. Trace whose payment method, balance, access, and notifications an operation affects.
4. **Invariants:** record rules that must stay true, their scope, enforcing layer, and exceptions. Examples to investigate include duplicate membership eligibility, bundle overlap, totals reconciliation, and valid date ordering; none is a presumed product rule.
5. **Lifecycles:** state -> trigger -> precondition/permission -> next state -> side effects -> reversibility. Distinguish a record status, an operation status, and the user's access status.
6. **Dependencies:** input change -> derived values -> affected controls/records -> preserve/reset/recalculate rule -> user feedback. Trace changes after manual overrides, not just the first calculation.
7. **Time and money:** distinguish access period, billing period, renewal cadence, collection date, debt, charge, cancellation, waiver, and refund where these concepts exist. Establish timezone, inclusive boundaries, rounding, currency, and proration rules only from evidence.
8. **Commitment and recovery:** draft versus saved versus scheduled versus externally completed. Identify atomic/partial operations, retry/idempotency evidence, compensation, and effects after leaving the screen. Never assume undo is available.
9. **Cross-surface consequences:** link relevant changes to other roles, emails, reports, integrations, and existing records. Stop at a named unverified boundary instead of speculating about another system.

## Artifact structure

Use only applicable sections of `domain-model.md`:

### Scope and sources
Requested questions, current/target release, roles, sources/revisions, production correspondence, exclusions.

### Glossary and entities
| Concept | Meaning / identity | Code mapping | Classification / evidence |
| --- | --- | --- | --- |

### Relationships and ownership
| Source entity | Relationship / cardinality | Target entity | Owner / constraints | Claim ID / evidence |
| --- | --- | --- | --- | --- |

### Rules and invariants
| Claim ID | Rule / exceptions | Enforcing source | Current or target | Classification |
| --- | --- | --- | --- | --- |

### Lifecycles
| Entity / state | Trigger / actor | Preconditions | Result / side effects | Reversible? | Evidence |
| --- | --- | --- | --- | --- | --- |

### Dependency and recalculation matrix
| Changed input | Affected values / objects | Preserve / reset / recalculate | Manual overrides | Feedback / commitment | Evidence |
| --- | --- | --- | --- | --- | --- |

### Open decisions and handoff
Question, respondent (product/design/engineering), why it matters, affected claims/screens, and next evidence needed. Unknown values stay unknown. Include a diagram only when it adds clarity; a table is sufficient.

## Calibration

- Customer and payer differ: trace ownership; do not assume the customer's stored card is eligible for the payer.
- Cancellation sends a request: frontend evidence proves the request, not that a debt is waived or access revoked.
- Bundle contains membership and service: establish overlap and editing rules; do not invent a duplicate prohibition.
- Schedule changes after a manual discount: investigate persistence/recalculation and downstream totals.
- Approved target removes a legacy step: record both models; do not require legacy parity without a preservation requirement.
- Reused research has an older revision: check changed dependencies before treating its rules as current.
