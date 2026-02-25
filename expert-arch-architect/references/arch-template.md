# Architecture Design Template (Clean Architecture)

**System Name**: [System Name]
**Status**: [Draft / In Review / Approved]
**Date**: [YYYY-MM-DD]

## 1. System Overview
*   **Goal**: High-level technical goal.
*   **Constraints**: Key technical constraints (e.g., "Must run on low-end Android", "No server").

## 2. High-Level Architecture
*   **Pattern**: [MVVM / Clean Architecture / Redux / etc.]
*   **Diagram**: (Mermaid or description of layers)

## 3. Layer Detail

### 3.1 Domain Layer (Core Business Logic)
*   **Entities**: Core data structures (e.g., `VaultItem`, `User`).
*   **Use Cases**: Business actions (e.g., `UnlockVault`, `SyncData`).
*   **Interfaces**: Repository definitions (abstract).

### 3.2 Data Layer (Infrastructure)
*   **Repositories**: Implementations of Domain interfaces.
*   **Data Sources**:
    *   **Local**: Database (SQLite, Realm, File).
    *   **Remote**: API clients, Cloud services.
*   **Mappers**: Data transfer objects (DTO) <-> Domain Entities.

### 3.3 Presentation Layer (UI)
*   **State Management**: [Bloc / Riverpod / Redux].
*   **View Logic**: ViewModels / Presenters.
*   **UI Components**: Key widgets/screens.

## 4. Cross-Cutting Concerns
*   **Error Handling**: Global strategy.
*   **Logging/Analytics**: Privacy-aware logging.
*   **Dependency Injection**: Strategy/Framework.

## 5. Key Technical Decisions (ADR Summary)
*   **Decision 1**: [Why we chose X over Y]
*   **Decision 2**: [Why we chose A over B]
