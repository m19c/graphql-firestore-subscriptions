module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:react/jsx-runtime'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      rules: {
        '@typescript-eslint/strict-boolean-expressions': [
          'error',
          { allowNullableBoolean: true, allowNullableObject: false, allowNumber: false, allowString: false },
        ],
      },
    },
  ],
  rules: {
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          '{}': false,
        },
        extendDefaults: true,
      },
    ],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['error'] }],
    'no-extra-boolean-cast': ['error', { enforceForLogicalOperands: true }],
    'no-implicit-coercion': ['error', {}],
    'no-restricted-syntax': [
      'error',
      { selector: 'SwitchCase > *.consequent[type!="BlockStatement"]', message: 'Switch cases without blocks are disallowed.' },
    ],
    'object-shorthand': 'warn',
  },
};
