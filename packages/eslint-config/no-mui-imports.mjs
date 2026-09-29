/**
 * ESLint rule: block MUI imports outside packages/ui.
 * Import in consumer package eslint.config.mjs.
 */
export const noMuiImportsRule = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: '@mui/material',
          message: 'Import UI from @em-slices/ui instead. See packages/ui/UI_STACK.md.',
        },
        {
          name: '@mui/icons-material',
          message: 'Icons belong inside @em-slices/ui. See packages/ui/UI_STACK.md.',
        },
        {
          name: '@mui/system',
          message: 'Import UI from @em-slices/ui instead.',
        },
      ],
      patterns: [
        {
          group: ['@mui/*'],
          message: 'MUI is internal to packages/ui when adopted. See packages/ui/UI_STACK.md.',
        },
      ],
    },
  ],
};

export const noEmotionImportsRule = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: '@emotion/react',
          message:
            'Emotion SSR belongs in apps/web-app only when using the MUI path. See packages/ui/UI_STACK.md.',
        },
        {
          name: '@emotion/styled',
          message: 'Use @em-slices/ui components instead.',
        },
        {
          name: '@emotion/cache',
          message:
            'Emotion cache belongs in apps/web-app emotion-registry when using MUI. See UI_STACK.md.',
        },
      ],
    },
  ],
};

/** Combined MUI + Emotion restrictions for consumer packages (not packages/ui). */
export const consumerUiImportRules = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        ...(noMuiImportsRule['no-restricted-imports'][1].paths ?? []),
        ...(noEmotionImportsRule['no-restricted-imports'][1].paths ?? []),
      ],
      patterns: noMuiImportsRule['no-restricted-imports'][1].patterns,
    },
  ],
};
