export type PatternCategory = 'character' | 'identifier' | 'input-candidate';

export type RegexPatternName =
  // Characters and text
  | 'digits'
  | 'letters'
  | 'alphanumeric'
  | 'whitespace'
  | 'nonWhitespace'
  | 'wordCharacters'
  | 'lowercase'
  | 'uppercase'
  | 'hexadecimal'
  // Identifiers and formatting
  | 'slug'
  | 'username'
  | 'identifier'
  | 'hexColor'
  | 'semver'
  // Common input matching candidates
  | 'integer'
  | 'decimal'
  | 'signedNumber'
  | 'uuid'
  | 'urlCandidate'
  | 'emailCandidate'
  | 'ipv4Candidate'
  | 'ipv6Candidate'
  | 'dateIsoCandidate'
  | 'timeCandidate';

export interface RegexPatternDefinition {
  /** The unique identifier name of the pattern. */
  readonly name: RegexPatternName;
  /** The full regular expression pattern string (anchored by default). */
  readonly pattern: string;
  /** The unanchored version of the pattern string for substring matching. */
  readonly unanchoredPattern: string;
  /** Clear human-readable description of what this pattern matches. */
  readonly description: string;
  /** The functional category of the pattern. */
  readonly category: PatternCategory;
  /** Whether the default pattern string is anchored to the full input (^ ... $). */
  readonly anchored: boolean;
  /** Documented limitations and explicit reminder that lexical matching is not semantic validation. */
  readonly limitations: string;
  /** Factory method to instantiate a fresh RegExp object with optional flags. */
  readonly createRegExp: (flags?: string) => RegExp;
}

export interface CreatePatternOptions {
  /**
   * Optional RegExp flags (e.g. 'i', 'm').
   * Warning: 'g' and 'y' maintain mutable state on the RegExp instance.
   */
  readonly flags?: string;
  /**
   * Whether to anchor the pattern to the beginning (^) and end ($) of the input.
   * Defaults to true for all standard patterns.
   */
  readonly anchored?: boolean;
}
