import { RegexToolkitError } from '../errors.js';
import type { CreatePatternOptions, RegexPatternDefinition, RegexPatternName } from './types.js';

interface RawPatternData {
  unanchored: string;
  pattern: string;
  description: string;
  category: 'character' | 'identifier' | 'input-candidate';
  limitations: string;
}

const rawPatterns: Record<RegexPatternName, RawPatternData> = {
  // Characters and text
  digits: {
    unanchored: '\\d+',
    pattern: '^\\d+$',
    description: 'Matches one or more ASCII digits (0-9).',
    category: 'character',
    limitations: 'Matches ASCII digits [0-9]. Does not parse numerical value or check bounds.',
  },
  letters: {
    unanchored: '[a-zA-Z]+',
    pattern: '^[a-zA-Z]+$',
    description: 'Matches one or more ASCII Latin letters (a-z, A-Z).',
    category: 'character',
    limitations: 'Matches ASCII letters only. Does not match accented or non-Latin Unicode characters.',
  },
  alphanumeric: {
    unanchored: '[a-zA-Z0-9]+',
    pattern: '^[a-zA-Z0-9]+$',
    description: 'Matches one or more ASCII alphanumeric characters.',
    category: 'character',
    limitations: 'Matches ASCII letters and digits. Does not match Unicode alphanumeric scripts.',
  },
  whitespace: {
    unanchored: '\\s+',
    pattern: '^\\s+$',
    description: 'Matches one or more whitespace characters (space, tab, form feed, newline).',
    category: 'character',
    limitations: 'Matches standard ECMAScript whitespace characters.',
  },
  nonWhitespace: {
    unanchored: '\\S+',
    pattern: '^\\S+$',
    description: 'Matches one or more non-whitespace characters.',
    category: 'character',
    limitations: 'Matches any characters that are not ECMAScript whitespace characters.',
  },
  wordCharacters: {
    unanchored: '\\w+',
    pattern: '^\\w+$',
    description: 'Matches one or more ASCII word characters (letters, digits, underscore).',
    category: 'character',
    limitations: 'Matches [a-zA-Z0-9_]. Does not include Unicode word characters or symbols.',
  },
  lowercase: {
    unanchored: '[a-z]+',
    pattern: '^[a-z]+$',
    description: 'Matches one or more lowercase ASCII letters.',
    category: 'character',
    limitations: 'Matches lowercase ASCII letters [a-z] only.',
  },
  uppercase: {
    unanchored: '[A-Z]+',
    pattern: '^[A-Z]+$',
    description: 'Matches one or more uppercase ASCII letters.',
    category: 'character',
    limitations: 'Matches uppercase ASCII letters [A-Z] only.',
  },
  hexadecimal: {
    unanchored: '[0-9a-fA-F]+',
    pattern: '^[0-9a-fA-F]+$',
    description: 'Matches one or more hexadecimal characters (0-9, a-f, A-F).',
    category: 'character',
    limitations: 'Matches hex digits only. Does not enforce length, byte alignment, or prefix (e.g. 0x).',
  },

  // Identifiers and formatting
  slug: {
    unanchored: '[a-z0-9]+(?:-[a-z0-9]+)*',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    description: 'Matches a lowercase hyphen-separated URL slug (e.g. "my-first-post").',
    category: 'identifier',
    limitations: 'Requires lowercase alphanumeric segments. Forbids uppercase, underscores, and consecutive or trailing hyphens.',
  },
  username: {
    unanchored: '[a-zA-Z0-9](?:[a-zA-Z0-9_-]{1,28}[a-zA-Z0-9])?',
    pattern: '^[a-zA-Z0-9](?:[a-zA-Z0-9_-]{1,28}[a-zA-Z0-9])?$',
    description: 'Matches an alphanumeric username (1-30 chars) with optional internal hyphens and underscores.',
    category: 'identifier',
    limitations: 'Must start and end with an alphanumeric character. Symbols other than hyphen and underscore are not permitted.',
  },
  identifier: {
    unanchored: '[a-zA-Z_$][a-zA-Z0-9_$]*',
    pattern: '^[a-zA-Z_$][a-zA-Z0-9_$]*$',
    description: 'Matches a standard JavaScript/programming identifier (starts with letter, $, or _).',
    category: 'identifier',
    limitations: 'Syntax match only. Does not check language-specific reserved keywords (e.g. "function", "const").',
  },
  hexColor: {
    unanchored: '#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b',
    pattern: '^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$',
    description: 'Matches standard 3, 4, 6, or 8-digit CSS hexadecimal color strings (#RGB, #RGBA, #RRGGBB, #RRGGBBAA).',
    category: 'identifier',
    limitations: 'Lexical syntax match only. Does not evaluate color spaces or perceptual contrast.',
  },
  semver: {
    unanchored: '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?:[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?',
    pattern: '^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?:[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$',
    description: 'Matches Semantic Versioning 2.0.0 strings (e.g. "1.0.0-rc.1+build.123").',
    category: 'identifier',
    limitations: 'Matches specification syntax. Does not perform version comparison or parse npm range operators (^, ~).',
  },

  // Common input matching candidates
  integer: {
    unanchored: '[+-]?(?:0|[1-9]\\d*)',
    pattern: '^[+-]?(?:0|[1-9]\\d*)$',
    description: 'Matches decimal integer strings with optional leading sign and no non-zero leading zeros.',
    category: 'input-candidate',
    limitations: 'Lexical format check only. Does not check bounds or 32/64-bit integer limits.',
  },
  decimal: {
    unanchored: '[+-]?(?:0|[1-9]\\d*)\\.\\d+',
    pattern: '^[+-]?(?:0|[1-9]\\d*)\\.\\d+$',
    description: 'Matches decimal number strings requiring an explicit fractional portion (e.g. "3.14", "-0.5").',
    category: 'input-candidate',
    limitations: 'Requires decimal point and fraction digits. Does not match scientific/exponent notation (e.g. 1e5).',
  },
  signedNumber: {
    unanchored: '[+-](?:0|[1-9]\\d*)(?:\\.\\d+)?',
    pattern: '^[+-](?:0|[1-9]\\d*)(?:\\.\\d+)?$',
    description: 'Matches numbers that explicitly begin with a plus (+) or minus (-) sign.',
    category: 'input-candidate',
    limitations: 'Requires an explicit leading "+" or "-" sign. Does not match unsigned numbers.',
  },
  uuid: {
    unanchored: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}',
    pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
    description: 'Matches standard RFC 4122 UUID v1-v5 strings.',
    category: 'input-candidate',
    limitations: 'Lexical format check only. Does not check database existence or nil UUID status.',
  },
  urlCandidate: {
    unanchored: 'https?:\\/\\/[^\\s/$.?#].[^\\s]*',
    pattern: '^https?:\\/\\/[^\\s/$.?#].[^\\s]*$',
    description: 'Matches common HTTP and HTTPS URL candidate strings.',
    category: 'input-candidate',
    limitations: 'Lexical candidate check only. Does NOT guarantee DNS resolution, server reachability, or valid WHATWG URL parsing.',
  },
  emailCandidate: {
    unanchored: '[^\\s@]+@[^\\s@]+\\.[^\\s@]+',
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    description: 'Matches coarse email candidate strings containing a local part, "@", and a domain with dot.',
    category: 'input-candidate',
    limitations: 'Lexical candidate check only. Does NOT validate RFC 5321/5322 compliance or mailbox existence. Use validateEmail() for semantic syntax validation.',
  },
  ipv4Candidate: {
    unanchored: '(?:\\d{1,3}\\.){3}\\d{1,3}',
    pattern: '^(?:\\d{1,3}\\.){3}\\d{1,3}$',
    description: 'Matches four dot-separated 1-3 digit sequences shaped like an IPv4 address.',
    category: 'input-candidate',
    limitations: 'Lexical candidate check only. Allows values > 255 and leading zeros (e.g. 999.999.999.999). Use isIPv4() or validateIP() for actual validation.',
  },
  ipv6Candidate: {
    unanchored: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}',
    pattern: '^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$',
    description: 'Matches candidate strings shaped like hexadecimal IPv6 addresses.',
    category: 'input-candidate',
    limitations: 'Lexical candidate check only. Does not evaluate compression rules or IPv4 mapping. Use isIPv6() or validateIP() for actual validation.',
  },
  dateIsoCandidate: {
    unanchored: '\\d{4}-\\d{2}-\\d{2}',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    description: 'Matches candidate strings formatted as YYYY-MM-DD.',
    category: 'input-candidate',
    limitations: 'Lexical shape match only. Does not validate calendar validity (e.g. permits 2023-02-31 or leap-year violations).',
  },
  timeCandidate: {
    unanchored: '\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,9})?)?',
    pattern: '^\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,9})?)?$',
    description: 'Matches candidate strings formatted as HH:MM or HH:MM:SS with optional fraction.',
    category: 'input-candidate',
    limitations: 'Lexical shape match only. Does not check 24-hour time ranges (e.g. permits 99:99:99).',
  },
};

/**
 * Catalogue of all registered regex pattern definitions.
 */
export const regexPatterns: Readonly<Record<RegexPatternName, RegexPatternDefinition>> = (
  Object.keys(rawPatterns) as RegexPatternName[]
).reduce<Record<RegexPatternName, RegexPatternDefinition>>((acc, name) => {
  const raw = rawPatterns[name];
  acc[name] = {
    name,
    pattern: raw.pattern,
    unanchoredPattern: raw.unanchored,
    description: raw.description,
    category: raw.category,
    anchored: true,
    limitations: raw.limitations,
    createRegExp: (flags?: string): RegExp => new RegExp(raw.pattern, flags),
  };
  return acc;
}, {} as Record<RegexPatternName, RegexPatternDefinition>);

/**
 * Retrieves a regex pattern definition by name.
 * Throws a RegexToolkitError if the pattern name is unknown.
 */
export function getRegexPattern(name: RegexPatternName): RegexPatternDefinition {
  const def = regexPatterns[name];
  if (!def) {
    throw new RegexToolkitError(`Unknown regex pattern name: "${String(name)}"`);
  }
  return def;
}

/**
 * Creates a new RegExp instance for a specified pattern name.
 * Each call returns a fresh RegExp instance, avoiding shared mutable state.
 */
export function createRegexPattern(name: RegexPatternName, options?: CreatePatternOptions): RegExp {
  const def = getRegexPattern(name);
  const pattern = options?.anchored === false ? def.unanchoredPattern : def.pattern;
  return new RegExp(pattern, options?.flags);
}

/**
 * Tests an input string against a named pattern using its anchored full-match expression.
 */
export function testRegexPattern(name: RegexPatternName, input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  return createRegexPattern(name).test(input);
}
