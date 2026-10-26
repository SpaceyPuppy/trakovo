import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  { rules: {
    'react/no-unescaped-entities': 'off',
    // React Compiler is not enabled. Keep the established Hooks checks without
    // requiring a refactor of existing portal effects/memos for compiler adoption.
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
  } },
  globalIgnores(['.next/**', 'out/**', '.verification/**', 'next-env.d.ts']),
])
