module.exports = {
  extends: ['next', 'next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'prefer-const': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
