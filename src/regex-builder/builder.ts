import { RegexBuilderError } from '../errors.js';
import { escapeRegex } from './escape.js';
import { fragment, RegexFragment } from './fragment.js';
import type { CharacterClassItem, CharacterClassRange, PatternInput } from './types.js';

const MAX_REPETITION = 65535;

/**
 * Checks whether an expression is enclosed by matching open and close characters.
 */
function isBalancedEnclosed(source: string, openChar: string, closeChar: string): boolean {
  if (!source.startsWith(openChar) || !source.endsWith(closeChar)) {
    return false;
  }
  let depth = 0;
  let inClass = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\\') {
      i++; // skip escaped char
      continue;
    }
    if (openChar === '(') {
      if (ch === '[' && !inClass) {
        inClass = true;
        continue;
      }
      if (ch === ']' && inClass) {
        inClass = false;
        continue;
      }
      if (inClass) {
        continue;
      }
    }
    if (ch === openChar) {
      depth++;
    } else if (ch === closeChar) {
      depth--;
      if (depth === 0 && i < source.length - 1) {
        return false;
      }
    }
  }
  return depth === 0;
}

/**
 * Checks if a regex source string is an atomic token that can be quantified directly.
 */
function isAtomicPattern(source: string): boolean {
  if (source.length === 0) {
    return false;
  }
  // Single literal character (excluding unescaped regex metacharacters)
  if (source.length === 1 && !/[\\^$*+?.()|[\]{}]/.test(source)) {
    return true;
  }
  // Single character escape: e.g. \d, \w, \s, \., \\
  if (/^\\(?:[dDsSwWbB]|\W|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})$/.test(source)) {
    return true;
  }
  // Single balanced group: ( ... )
  if (isBalancedEnclosed(source, '(', ')')) {
    return true;
  }
  // Single balanced character class: [ ... ]
  if (isBalancedEnclosed(source, '[', ']')) {
    return true;
  }
  return false;
}

/**
 * Converts a PatternInput to a string, wrapping in (?:...) if not already atomic for quantifiers.
 */
function toAtomic(part: PatternInput): string {
  const source = resolvePattern(part);
  if (isAtomicPattern(source)) {
    return source;
  }
  return `(?:${source})`;
}

/**
 * Validates a repetition count.
 */
function assertValidCount(count: number, label: string): void {
  if (typeof count !== 'number' || !Number.isInteger(count)) {
    throw new RegexBuilderError(`${label} must be an integer, received ${String(count)}`);
  }
  if (count < 0) {
    throw new RegexBuilderError(`${label} cannot be negative, received ${count}`);
  }
  if (count > MAX_REPETITION) {
    throw new RegexBuilderError(`${label} exceeds maximum safety limit of ${MAX_REPETITION}, received ${count}`);
  }
}

/**
 * Resolves a PatternInput into its pattern string.
 */
export function resolvePattern(input: PatternInput): string {
  if (input instanceof RegexFragment) {
    return input.source;
  }
  if (input instanceof RegExp) {
    return input.source;
  }
  if (typeof input === 'string') {
    return input;
  }
  if (input && typeof input === 'object' && 'source' in input && typeof input.source === 'string') {
    return input.source;
  }
  throw new RegexBuilderError(
    `Expected pattern input to be a string, RegExp, or RegexFragment, received ${typeof input}`,
  );
}

/**
 * Returns a literal regex fragment where all metacharacters are safely escaped.
 */
export function literal(value: string): RegexFragment {
  return fragment(escapeRegex(value));
}

/**
 * Combines multiple pattern parts sequentially in order.
 */
export function sequence(...parts: PatternInput[]): RegexFragment {
  const combined = parts.map(resolvePattern).join('');
  return fragment(combined);
}

/**
 * Creates an alternation matching any of the specified alternatives.
 * Automatically wraps in a non-capturing group (?:a|b) when multiple parts are provided.
 */
export function oneOf(...parts: PatternInput[]): RegexFragment {
  if (parts.length === 0) {
    throw new RegexBuilderError('oneOf requires at least one alternative');
  }
  if (parts.length === 1) {
    return fragment(resolvePattern(parts[0]!));
  }
  const combined = parts.map(resolvePattern).join('|');
  return fragment(`(?:${combined})`);
}

/**
 * Makes the specified pattern part optional (matches zero or one time).
 */
export function optional(part: PatternInput): RegexFragment {
  return fragment(`${toAtomic(part)}?`);
}

/**
 * Matches the specified pattern part zero or more times (*).
 */
export function zeroOrMore(part: PatternInput): RegexFragment {
  return fragment(`${toAtomic(part)}*`);
}

/**
 * Matches the specified pattern part one or more times (+).
 */
export function oneOrMore(part: PatternInput): RegexFragment {
  return fragment(`${toAtomic(part)}+`);
}

/**
 * Matches the specified pattern part exactly `count` times.
 */
export function exactly(part: PatternInput, count: number): RegexFragment {
  assertValidCount(count, 'Repetition count');
  return fragment(`${toAtomic(part)}{${count}}`);
}

/**
 * Matches the specified pattern part between `minimum` and `maximum` times.
 */
export function between(part: PatternInput, minimum: number, maximum: number): RegexFragment {
  assertValidCount(minimum, 'Minimum count');
  assertValidCount(maximum, 'Maximum count');
  if (minimum > maximum) {
    throw new RegexBuilderError(
      `Minimum count (${minimum}) cannot be greater than maximum count (${maximum})`,
    );
  }
  return fragment(`${toAtomic(part)}{${minimum},${maximum}}`);
}

/**
 * Matches the specified pattern part at least `minimum` times.
 */
export function atLeast(part: PatternInput, minimum: number): RegexFragment {
  assertValidCount(minimum, 'Minimum count');
  return fragment(`${toAtomic(part)}{${minimum},}`);
}

/**
 * Wraps the pattern part in a capturing group.
 * If a name is provided, creates a named capture group (?<name>...).
 */
export function capture(part: PatternInput, name?: string): RegexFragment {
  const inner = resolvePattern(part);
  if (name !== undefined) {
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      throw new RegexBuilderError(
        `Invalid capture group name: "${name}". Group names must be valid JavaScript identifiers.`,
      );
    }
    return fragment(`(?<${name}>${inner})`);
  }
  return fragment(`(${inner})`);
}

/**
 * Wraps the pattern part in a non-capturing group (?:...).
 */
export function nonCapture(part: PatternInput): RegexFragment {
  const inner = resolvePattern(part);
  return fragment(`(?:${inner})`);
}

/**
 * Creates a positive lookahead assertion (?=...).
 */
export function lookahead(part: PatternInput): RegexFragment {
  const inner = resolvePattern(part);
  return fragment(`(?=${inner})`);
}

/**
 * Creates a negative lookahead assertion (?!...).
 */
export function negativeLookahead(part: PatternInput): RegexFragment {
  const inner = resolvePattern(part);
  return fragment(`(?!${inner})`);
}

/**
 * Creates a character class range descriptor for use in characterClass.
 */
export function range(from: string, to: string): CharacterClassRange {
  if (typeof from !== 'string' || typeof to !== 'string') {
    throw new RegexBuilderError('Range bounds must be strings');
  }
  if (from.length !== 1 || to.length !== 1) {
    throw new RegexBuilderError(`Range bounds must be single characters, received "${from}" and "${to}"`);
  }
  const cpFrom = from.codePointAt(0)!;
  const cpTo = to.codePointAt(0)!;
  if (cpFrom > cpTo) {
    throw new RegexBuilderError(`Character class range out of order: "${from}" to "${to}"`);
  }
  return { from, to };
}

function escapeCharClassChar(ch: string): string {
  if (ch === ']' || ch === '\\' || ch === '-' || ch === '^') {
    return `\\${ch}`;
  }
  return ch;
}

/**
 * Formats a character class element string.
 */
function processClassItem(item: CharacterClassItem): string {
  if (item instanceof RegexFragment) {
    return item.source;
  }
  if (typeof item === 'object' && item !== null && 'from' in item && 'to' in item) {
    const rangeObj = item as CharacterClassRange;
    const cpFrom = rangeObj.from.codePointAt(0)!;
    const cpTo = rangeObj.to.codePointAt(0)!;
    if (cpFrom > cpTo) {
      throw new RegexBuilderError(
        `Character class range out of order: "${rangeObj.from}" to "${rangeObj.to}"`,
      );
    }
    return `${escapeCharClassChar(rangeObj.from)}-${escapeCharClassChar(rangeObj.to)}`;
  }
  if (typeof item === 'string') {
    let result = '';
    for (let i = 0; i < item.length; i++) {
      // Check if this is a range: c1 - c2
      if (item[i + 1] === '-' && i + 2 < item.length) {
        const c1 = item[i]!;
        const c2 = item[i + 2]!;
        const cp1 = c1.codePointAt(0)!;
        const cp2 = c2.codePointAt(0)!;
        if (cp1 > cp2) {
          throw new RegexBuilderError(`Character class range out of order: "${c1}-${c2}"`);
        }
        result += `${escapeCharClassChar(c1)}-${escapeCharClassChar(c2)}`;
        i += 2;
      } else {
        result += escapeCharClassChar(item[i]!);
      }
    }
    return result;
  }
  throw new RegexBuilderError(`Invalid character class item: ${typeof item}`);
}

/**
 * Creates a positive character class [...].
 */
export function characterClass(...items: CharacterClassItem[]): RegexFragment {
  if (items.length === 0) {
    throw new RegexBuilderError('characterClass requires at least one character or range');
  }
  const inner = items.map(processClassItem).join('');
  return fragment(`[${inner}]`);
}

/**
 * Creates a negated character class [^...].
 */
export function negatedCharacterClass(...items: CharacterClassItem[]): RegexFragment {
  if (items.length === 0) {
    throw new RegexBuilderError('negatedCharacterClass requires at least one character or range');
  }
  const inner = items.map(processClassItem).join('');
  return fragment(`[^${inner}]`);
}

/**
 * Matches the beginning of the input / line (^).
 */
export function startOfLine(): RegexFragment {
  return fragment('^');
}

/**
 * Matches the end of the input / line ($).
 */
export function endOfLine(): RegexFragment {
  return fragment('$');
}

/**
 * Matches an ASCII digit (\d).
 */
export function digit(): RegexFragment {
  return fragment('\\d');
}

/**
 * Matches a whitespace character (\s).
 */
export function whitespace(): RegexFragment {
  return fragment('\\s');
}

/**
 * Matches an ASCII word character (\w).
 */
export function wordCharacter(): RegexFragment {
  return fragment('\\w');
}

/**
 * Compiles a pattern into a native RegExp instance, validating flags.
 */
export function compileRegex(pattern: PatternInput, flags?: string): RegExp {
  const source = resolvePattern(pattern);
  return fragment(source).compile(flags);
}

/**
 * Alias for compileRegex to construct a native RegExp instance.
 */
export function buildRegex(source: PatternInput, flags?: string): RegExp {
  return compileRegex(source, flags);
}
