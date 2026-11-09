# services/firebase/

Firebase Auth and Cloud Firestore adapter layer.

## Responsibility

Provides concrete implementations of the auth and persistence contracts that feature modules depend on. No feature module imports Firebase SDKs directly — they depend on the port types defined in `firebase.contracts.ts` (DIP).

## Architecture

```
firebase.contracts.ts     ← port definitions (auth + firestore)
firebase.auth.adapter.ts  ← Firebase Auth implementation of AuthPort
firebase.firestore.adapter.ts ← Firestore implementation of FirestorePort
firebase.config.ts        ← SDK initialization
```

## Contracts (Ports)

### AuthPort
- `signInAnonymously()` — bootstrap anonymous session
- `onAuthStateChanged(callback)` — subscribe to auth state
- `linkWithProvider(provider)` — upgrade anonymous to permanent
- `signOut()` — clear session
- `getCurrentUser()` — snapshot of current auth state

### FirestorePort
- `getDocument<T>(collection, id)` — read single doc
- `setDocument<T>(collection, id, data)` — write/overwrite doc
- `updateDocument<T>(collection, id, partial)` — partial update
- `deleteDocument(collection, id)` — remove doc
- `queryDocuments<T>(collection, constraints)` — filtered list
- `onSnapshot<T>(collection, id, callback)` — real-time listener

## Substitutability (LSP)

The port types allow swapping Firebase for:
- In-memory stubs during testing
- AsyncStorage-backed offline fallback
- Alternative BaaS providers

## Integration Points

- **features/auth** — uses AuthPort for session management
- **features/rooms** — uses FirestorePort for room CRUD
- **features/voting** — uses FirestorePort for proposals and votes
- **features/alarms** — uses FirestorePort for alarm state persistence
