// Jest setup: native modules that have no JS implementation in tests.
/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated 4.2+ loads react-native-worklets, whose native part isn't there in Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
