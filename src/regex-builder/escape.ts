import { RegexBuilderError } from '../errors.js';

/**
 * Escapes all regular expression metacharacters in a literal string.
 * Characters escaped: \ ^ $ . * + ? ( ) [ ] { } | /
 *
 * @param value - Literal string to escape.
 * @returns Escaped pattern string safe for insertion into a RegExp.
 */
export function escapeRegex(value: string): string {
  if (typeof value !== 'string') {
    throw new RegexBuilderError(`escapeRegex expected string, received ${typeof value}`);
  }
  return value.replace(/[\\^$*+?.()|[\]{}/]/g, '\\$&');
}

/**
 * Escapes characters that have special syntactic meaning inside a character class [...].
 * Characters escaped: \ ] ^ -
 *
 * @param value - Literal characters to escape.
 * @returns Escaped character string safe for use inside [...].
 */
export function escapeCharacterClass(value: string): string {
  if (typeof value !== 'string') {
    throw new RegexBuilderError(`escapeCharacterClass expected string, received ${typeof value}`);
  }
  return value.replace(/[\\\]\^-]/g, '\\$&');
}
