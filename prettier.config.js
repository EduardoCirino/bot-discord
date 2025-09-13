/** @type {import("prettier").Config} */
export default {
  // Basic formatting
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  trailingComma: 'es5',

  // Language-specific
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',

  // File types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'preserve',
      },
    },
  ],
};