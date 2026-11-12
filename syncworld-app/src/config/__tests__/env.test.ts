import { parseEnvConfig } from '../env';

describe('parseEnvConfig demo-mode default', () => {
  it('runs the demo when nothing is configured', () => {
    const env = parseEnvConfig({});
    expect(env.demoMode).toBe(true);
  });

  it('goes live against the emulators when explicitly asked', () => {
    const env = parseEnvConfig({ useEmulators: 'true' });
    expect(env.demoMode).toBe(false);
    expect(env.useEmulators).toBe(true);
  });

  it('goes live when a real Firebase app is configured', () => {
    const env = parseEnvConfig({ firebaseApiKey: 'k', firebaseAppId: 'a', environment: 'production' });
    expect(env.demoMode).toBe(false);
    expect(env.useEmulators).toBe(false);
  });

  it('DEMO_MODE=false in development uses the emulators', () => {
    const env = parseEnvConfig({ demoMode: 'false' });
    expect(env.demoMode).toBe(false);
    expect(env.useEmulators).toBe(true);
  });

  it('an explicit DEMO_MODE=true always wins', () => {
    const env = parseEnvConfig({ demoMode: 'true', firebaseApiKey: 'k', firebaseAppId: 'a' });
    expect(env.demoMode).toBe(true);
  });
});
