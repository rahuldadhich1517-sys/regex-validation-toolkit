import { RegexCompilationError } from '../errors.js';
import type { RegexFragmentLike } from './types.js';

const VALID_FLAGS = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);

/**
 * Validates regular expression flags:
 * - Checks each flag character against supported ECMAScript flags.
 * - Forbids duplicate flags (e.g. 'gg').
 * - Forbids mutually exclusive 'u' and 'v' flags together.
 */
export function validateFlags(flags?: string): void {
  if (flags === undefined || flags === '') {
    return;
  }
  const seen = new Set<string>();
  let hasU = false;
  let hasV = false;

  for (const char of flags) {
    if (!VALID_FLAGS.has(char)) {
      throw new RegexCompilationError(`Invalid RegExp flag: "${char}"`);
    }
    if (seen.has(char)) {
      throw new RegexCompilationError(`Duplicate RegExp flag: "${char}"`);
    }
    seen.add(char);
    if (char === 'u') hasU = true;
    if (char === 'v') hasV = true;
  }

  if (hasU && hasV) {
    throw new RegexCompilationError('RegExp flags "u" and "v" are mutually exclusive.');
  }
}

/**
 * A lightweight immutable wrapper around a regex pattern fragment string.
 * Supports string coercion, template strings, and direct compilation.
 */
export class RegexFragment implements RegexFragmentLike {
  public readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  public toString(): string {
    return this.source;
  }

  public [Symbol.toPrimitive](): string {
    return this.source;
  }

  /**
   * Compiles this fragment into a native RegExp instance.
   */
  public compile(flags?: string): RegExp {
    validateFlags(flags);
    try {
      return new RegExp(this.source, flags);
    } catch (error) {
      throw new RegexCompilationError(
        `Failed to compile regular expression /${this.source}/${flags ?? ''}: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * Tests an input string against this fragment.
   */
  public test(input: string): boolean {
    return this.compile().test(input);
  }
}

/**
 * Creates a new RegexFragment instance.
 */
export function fragment(source: string): RegexFragment {
  return new RegexFragment(source);
}
