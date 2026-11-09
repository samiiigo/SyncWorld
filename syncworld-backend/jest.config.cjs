// Root Jest entry point. Each workspace owns its Jest config (package.json "jest"
// key) and tsconfig, so running `npx jest` here behaves exactly like
// `npm test --workspaces` (strict TypeScript included).
// Firestore rules tests need the emulator and live in firestore/jest.config.cjs
// (run them with `npm run test:rules`).
module.exports = {
  projects: ['<rootDir>/functions', '<rootDir>/realtime-server'],
};
