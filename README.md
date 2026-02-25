# NotePassword Expert Skills

This repository contains expert-level skills for building NotePassword (or any high-quality mobile app). These skills encapsulate the "Multi-Expert Review" workflow, ensuring that every document (PRD, Architecture) passes through rigorous checks from Product, Engineering, UX, and Platform perspectives.

## Skills Included

### 1. `expert-prd-writer`
Iterative PRD creation and review using Product Strategy, Engineering, and UX expert personas.
*   **Use when:** Writing new PRDs, refining requirements, or seeking comprehensive feedback on product specs.
*   **Workflow:**
    1.  Draft PRD using a Lenny-style template.
    2.  Review by **Product Strategy** (Value, Metrics).
    3.  Review by **Engineering** (Feasibility, Sync, Offline).
    4.  Review by **UX Design** (Flow, Onboarding).
    5.  Refine until approved.

### 2. `expert-arch-architect`
Iterative system architecture design and review using System Architect, Mobile, and iOS expert personas.
*   **Use when:** Designing new systems, planning mobile apps, or ensuring robust technical architecture.
*   **Workflow:**
    1.  Draft Architecture using Clean Architecture principles.
    2.  Review by **System Architect** (Decoupling, Single Source of Truth).
    3.  Review by **Mobile Performance** (Jank-free, Background Threads).
    4.  Review by **Security & Platform** (Zeroize, Secure Enclave, SAF).
    5.  Refine until approved.

## Installation

To install these skills into your agent environment (e.g., Claude Code, OpenCode):

```bash
# Install PRD Writer
npx skills add <your-username>/opencode-expert-skills@expert-prd-writer

# Install Architecture Architect
npx skills add <your-username>/opencode-expert-skills@expert-arch-architect
```

*(Replace `<your-username>` with your GitHub username once pushed)*

## Development

These skills are located in `src/skills/`. To modify them:
1.  Edit `SKILL.md` or files in `references/`.
2.  Commit changes.
3.  Push to GitHub.
4.  Re-run `npx skills update`.
