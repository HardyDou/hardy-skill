# Security & Platform Checklist

## 1. Data Privacy & Security
*   **Data Wiping (Zeroize)**:
    *   [ ] **Secrets in RAM**: Are sensitive data structures (passwords, keys) implemented using `Zeroize` or `secrecy` crates (Rust)?
    *   [ ] **Drop Semantics**: Is data wiped immediately after use (Drop trait)?
*   **Storage Encryption**:
    *   [ ] **Database**: Is the local database encrypted (SQLCipher, Encrypted CoreData)?
    *   [ ] **Key Derivation**: Is Argon2id or PBKDF2 used for key derivation?
*   **Authentication**:
    *   [ ] **Secure Storage**: Are Auth Tokens stored in Keychain (iOS) / Keystore (Android) / SecretService (Linux)?
    *   [ ] **Biometrics**: Is BiometricPrompt/LocalAuthentication used? Is `kLAPolicyDeviceOwnerAuthenticationWithBiometrics` (Secure Enclave) enforced?

## 2. Platform Integration (iOS/Android)
*   **iOS Specifics**:
    *   [ ] **AutoFill Extension**: Is there an architecture for sharing code with the AutoFill Credential Provider Extension?
    *   [ ] **App Groups**: Is an App Group used for shared data between App and Extension?
    *   [ ] **Background Fetch**: Is `BackgroundTasks` framework used correctly?
*   **Android Specifics**:
    *   [ ] **Autofill Service**: Is the `AutofillService` implemented?
    *   [ ] **SAF Performance**: Are URIs cached to avoid slow SAF directory traversals?
    *   [ ] **Backup**: Is `android:allowBackup` correctly configured (usually `false` for sensitive apps, or custom rules)?
