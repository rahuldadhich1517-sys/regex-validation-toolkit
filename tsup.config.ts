import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'regex-patterns/index': 'src/regex-patterns/index.ts',
    'regex-builder/index': 'src/regex-builder/index.ts',
    'email-validator/index': 'src/email-validator/index.ts',
    'ip-validator/index': 'src/ip-validator/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  minify: false,
  splitting: false,
});
