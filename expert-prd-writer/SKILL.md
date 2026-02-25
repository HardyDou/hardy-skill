---
name: expert-prd-writer
description: Iterative PRD creation and review using Product Strategy, Engineering, and UX expert personas. Use when writing new PRDs, refining requirements, or seeking comprehensive feedback on product specs.
---

# Expert PRD Writer

This skill guides you through an iterative process to write high-quality Product Requirements Documents (PRDs). It employs a "Multi-Expert Review" workflow, simulating feedback from Product Strategy, Engineering, and UX personas to ensure your PRD is valuable, feasible, and user-centric.

## Workflow

### Phase 1: Context & Drafting

1.  **Gather Context**:
    *   Ask the user for the **Core Problem**, **Target Audience**, and **High-Level Goal**.
    *   If a PRD already exists, read it. If not, create a new file (e.g., `docs/PRD.md`).

2.  **Drafting**:
    *   Use `references/prd-template.md` to structure the document.
    *   Fill in known sections: Problem Statement, Solution Summary, User Stories.
    *   Keep it concise but clear.

### Phase 2: Multi-Expert Review (The Core Loop)

Rotate through the following expert personas to review the draft. For each persona, check against their specific criteria in `references/review-criteria.md`.

1.  **Product Strategy Review**:
    *   *Focus*: Value proposition, "Why Now?", Success Metrics.
    *   *Action*: Critique the "Problem" and "Goals" sections. Ensure metrics measure *value*, not just vanity.

2.  **Engineering Review**:
    *   *Focus*: Feasibility, Technical Constraints, Edge Cases.
    *   *Action*: Critique the "Solution" and "Non-Functional Requirements". specific attention to **Offline Mode**, **Data Sync conflicts**, and **Security**.

3.  **UX Design Review**:
    *   *Focus*: User Flow, Clarity, "Jank-free" experience.
    *   *Action*: Critique "User Stories" and "UX/UI" sections. Ensure the onboarding flow is defined.

### Phase 3: Refinement & Approval

1.  **Refine**:
    *   Update the PRD based on the consolidated feedback from all three experts.
    *   Highlight key changes or decisions made during the review.

2.  **Sign-off**:
    *   Once all critical issues are resolved, mark the PRD as `Version 1.0 (Draft Final)`.
    *   Generate a summary of approvals (e.g., "Product Strategy: Approved", "Engineering: Approved with notes on Sync").

## Reference Files

*   `references/prd-template.md`: A comprehensive PRD template (Lenny's style).
*   `references/review-criteria.md`: Checklists for Product, Engineering, and UX reviews.
