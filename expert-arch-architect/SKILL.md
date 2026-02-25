---
name: expert-arch-architect
description: Iterative system architecture design and review using System Architect, Mobile, and iOS expert personas. Use when designing new systems, planning mobile apps, or ensuring robust technical architecture.
---

# Expert Architecture Architect

This skill guides you through designing robust, scalable, and secure system architectures. It uses a "Multi-Expert Review" workflow to validate your design against System Architecture principles, Mobile performance standards, and Platform-specific best practices.

## Workflow

### Phase 1: Requirements & Drafting

1.  **Analyze Requirements**:
    *   Review the PRD or technical specs.
    *   Create a new file (e.g., `docs/ARCHITECTURE.md`).

2.  **Drafting**:
    *   Use `references/arch-template.md` to outline the system.
    *   Define Layers: **Domain** (Entities), **Data** (Repos), **Presentation** (UI).
    *   Define Boundaries: APIs, FFI (Foreign Function Interface), Data Flow.

### Phase 2: Multi-Expert Review (The Core Loop)

Rotate through the following expert personas to review the draft. For each persona, check against their specific criteria in the reference files.

1.  **System Architect Review**:
    *   *Focus*: **Clean Architecture**, Separation of Concerns, **Single Source of Truth**.
    *   *Action*: Ensure business logic is decoupled from UI. Verify data flow (Unidirectional?).
    *   *Checklist*: `references/arch-template.md` principles.

2.  **Mobile Performance Review**:
    *   *Focus*: **Jank-Free** rendering (60fps), Main Thread discipline, **Offline-First**.
    *   *Action*: Check if heavy tasks (crypto, I/O) are moved to background threads/Isolates. Verify list rendering strategies.
    *   *Checklist*: `references/mobile-checklist.md`.

3.  **Security & Platform Review**:
    *   *Focus*: **Zeroize** (Data wiping), **Secure Enclave**, Platform specifics (SAF, Keyring).
    *   *Action*: Verify memory safety for secrets. Check platform integration details (iOS Extension, Android Service).
    *   *Checklist*: `references/security-checklist.md`.

### Phase 3: Refinement & ADRs

1.  **Refine**:
    *   Update the Architecture Document based on expert feedback.
    *   Ensure all critical security and performance constraints are explicitly stated.

2.  **Decision Records (ADRs)**:
    *   For major trade-offs (e.g., "Rust vs. C++", "SQL vs. NoSQL"), document the decision using the **ADR** format within the doc or as separate files.

## Reference Files

*   `references/arch-template.md`: Template based on Clean Architecture & MVVM.
*   `references/mobile-checklist.md`: Performance & Offline standards for mobile.
*   `references/security-checklist.md`: Security & Platform integration standards.
