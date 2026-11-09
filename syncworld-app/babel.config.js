module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // zustand/middleware (persist/devtools) reads `import.meta.env`, which
          // crashes the web build ("Cannot use 'import.meta' outside a module").
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
