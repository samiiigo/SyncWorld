import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
} from 'firebase/firestore';

describe('Firestore security rules', () => {
  const projectId = 'syncworld-test';
  const rulesPath = path.join(__dirname, 'firestore.rules');
  let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: fs.readFileSync(rulesPath, 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test('denies reading another user profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice'), {
        uid: 'alice',
        displayName: 'Alice',
        isAnonymous: false,
        timezone: 'America/Chicago',
      });
    });

    const bob = testEnv.authenticatedContext('bob');
    await assertFails(getDoc(doc(bob.firestore(), 'users/alice')));
  });

  test('denies direct room status writes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'rooms/room-1'), {
        status: 'OPEN',
      });
    });

    const alice = testEnv.authenticatedContext('alice');
    await assertFails(setDoc(doc(alice.firestore(), 'rooms/room-1'), { status: 'LOCKED' }));
  });

  test('denies casting a vote under another user uid', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'rooms/room-1'), { status: 'VOTING' });
      await setDoc(doc(context.firestore(), 'rooms/room-1/members/alice'), { uid: 'alice' });
    });

    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      setDoc(doc(bob.firestore(), 'rooms/room-1/proposals/proposal-1/votes/alice'), {
        userId: 'alice',
        choice: 'accept',
      }),
    );
  });

  test('denies listing room codes', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(getDocs(query(collection(alice.firestore(), 'room_codes'))));
  });

  test('allows a member to read their own room', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'rooms/room-1'), {
        status: 'OPEN',
      });
      await setDoc(doc(context.firestore(), 'rooms/room-1/members/alice'), {
        uid: 'alice',
        displayName: 'Alice',
      });
    });

    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(getDoc(doc(alice.firestore(), 'rooms/room-1')));
  });

  test('denies writing push tokens as another user', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      setDoc(doc(bob.firestore(), 'rooms/room-1/push_tokens/alice'), {
        userId: 'alice',
        expoPushToken: 'ExponentPushToken[abc]',
        platform: 'ios',
      }),
    );
  });

  test('denies reading push tokens as a client', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'rooms/room-1/push_tokens/alice'), {
        userId: 'alice',
        expoPushToken: 'ExponentPushToken[abc]',
        platform: 'ios',
      });
    });

    const alice = testEnv.authenticatedContext('alice');
    await assertFails(getDoc(doc(alice.firestore(), 'rooms/room-1/push_tokens/alice')));
  });
});
