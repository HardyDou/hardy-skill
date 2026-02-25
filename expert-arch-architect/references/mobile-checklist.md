# Mobile Performance Checklist

## 1. Performance
*   **Main Thread Discipline**:
    *   [ ] **Background Crypto**: Are crypto operations (encrypt/decrypt/hash) strictly on background threads/Isolates?
    *   [ ] **Jank-Free**: Is the app guaranteed to render at 60fps (or 120fps)? Are complex layouts or heavy I/O avoided on the main thread?
*   **List Optimization**:
    *   [ ] **Item Height**: Are lists (e.g., `ListView.builder`) using `itemExtent` or `estimatedItemSize` where possible?
    *   [ ] **Rebuilds**: Are stateless widgets used extensively? Are unnecessary rebuilds minimized (e.g., `const` constructors)?

## 2. Data Synchronization & Offline
*   **Conflict Resolution**:
    *   [ ] **Strategy**: Is there a clear conflict resolution strategy (e.g., Last-Write-Wins, Merge, Keep Both)?
    *   [ ] **Detection**: How are conflicts detected (Vector Clock / Timestamp)?
*   **Offline Capability**:
    *   [ ] **Cache First**: Does the app read from local storage first, then sync?
    *   [ ] **Background Sync**: Does sync happen in the background (WorkManager/BGTask)?

## 3. Resilience
*   **Error Handling**:
    *   [ ] **Graceful Failure**: Does the app handle network errors without crashing or showing cryptic messages?
    *   [ ] **Retry Logic**: Are API calls retried with exponential backoff?
*   **Battery Efficiency**:
    *   [ ] **Wake Locks**: Are wake locks used sparingly and released correctly?
    *   [ ] **Sync Frequency**: Is background sync infrequent enough to conserve battery?
