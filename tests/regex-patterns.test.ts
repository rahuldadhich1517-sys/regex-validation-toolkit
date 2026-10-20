import { describe, expect, it } from 'vitest';
import {
  createRegexPattern,
  getRegexPattern,
  regexPatterns,
  testRegexPattern,
  type RegexPatternName,
} from '../src/regex-patterns/index.js';
import { RegexToolkitError } from '../src/errors.js';

describe('regex-patterns module', () => {
  const ALL_PATTERNS: RegexPatternName[] = [
    'digits',
    'letters',
    'alphanumeric',
    'whitespace',
    'nonWhitespace',
    'wordCharacters',
    'lowercase',
    'uppercase',
    'hexadecimal',
    'slug',
    'username',
    'identifier',
    'hexColor',
    'semver',
    'integer',
    'decimal',
    'signedNumber',
    'uuid',
    'urlCandidate',
    'emailCandidate',
    'ipv4Candidate',
    'ipv6Candidate',
    'dateIsoCandidate',
    'timeCandidate',
  ];

  it('exports all 24 required pattern definitions in the catalogue', () => {
    expect(Object.keys(regexPatterns)).toHaveLength(24);

    for (const name of ALL_PATTERNS) {
      const def = regexPatterns[name];
      expect(def).toBeDefined();
      expect(def.name).toBe(name);
      expect(typeof def.pattern).toBe('string');
      expect(typeof def.unanchoredPattern).toBe('string');
      expect(typeof def.description).toBe('string');
      expect(typeof def.limitations).toBe('string');
      expect(def.anchored).toBe(true);
      expect(typeof def.createRegExp).toBe('function');
      expect(def.pattern.startsWith('^')).toBe(true);
      expect(def.pattern.endsWith('$')).toBe(true);
    }
  });

  describe('Mutation safety and immutability', () => {
    it('regexPatterns collection is deeply frozen against mutation', () => {
      expect(Object.isFrozen(regexPatterns)).toBe(true);
      expect(Object.isFrozen(regexPatterns.digits)).toBe(true);
      expect(Object.isFrozen(regexPatterns.emailCandidate)).toBe(true);

      expect(() => {
        // @ts-expect-error testing mutation prevention
        regexPatterns.digits = null;
      }).toThrow();

      expect(() => {
        // @ts-expect-error testing property mutation
        regexPatterns.digits.pattern = 'mutated';
      }).toThrow();
    });
  });

  it('getRegexPattern throws RegexToolkitError for unknown pattern names', () => {
    // @ts-expect-error testing invalid input at runtime
    expect(() => getRegexPattern('unknown_pattern')).toThrow(RegexToolkitError);
    // @ts-expect-error testing invalid input at runtime
    expect(() => getRegexPattern(123)).toThrow(RegexToolkitError);
  });

  it('createRegexPattern creates independent instances without shared state', () => {
    const rx1 = createRegexPattern('digits');
    const rx2 = createRegexPattern('digits');
    expect(rx1).not.toBe(rx2);
    expect(rx1.source).toBe(rx2.source);

    // Repeated execution is deterministic
    expect(rx1.test('12345')).toBe(true);
    expect(rx1.test('12345')).toBe(true);
    expect(rx2.test('12345')).toBe(true);
  });

  it('createRegexPattern supports flags and unanchored matching', () => {
    const anchoredRx = createRegexPattern('letters');
    expect(anchoredRx.test('abc')).toBe(true);
    expect(anchoredRx.test('abc 123')).toBe(false);

    const unanchoredRx = createRegexPattern('letters', { anchored: false });
    expect(unanchoredRx.test('abc 123')).toBe(true);
    expect(unanchoredRx.exec('---hello---')?.[0]).toBe('hello');

    const caseInsensitiveRx = createRegexPattern('lowercase', { flags: 'i' });
    expect(caseInsensitiveRx.test('ABC')).toBe(true);

    const multilineRx = createRegexPattern('digits', { flags: 'm', anchored: true });
    expect(multilineRx.test('123\n456')).toBe(true);
  });

  describe('Category 1: Character patterns', () => {
    it('digits matches ASCII digit strings and rejects non-digits', () => {
      expect(testRegexPattern('digits', '0')).toBe(true);
      expect(testRegexPattern('digits', '9')).toBe(true);
      expect(testRegexPattern('digits', '1234567890')).toBe(true);
      expect(testRegexPattern('digits', '')).toBe(false);
      expect(testRegexPattern('digits', '123a')).toBe(false);
      expect(testRegexPattern('digits', 'a123')).toBe(false);
      expect(testRegexPattern('digits', '12 34')).toBe(false);
      expect(testRegexPattern('digits', '-5')).toBe(false);
    });

    it('letters matches ASCII letters only', () => {
      expect(testRegexPattern('letters', 'a')).toBe(true);
      expect(testRegexPattern('letters', 'Z')).toBe(true);
      expect(testRegexPattern('letters', 'helloWORLD')).toBe(true);
      expect(testRegexPattern('letters', 'hello123')).toBe(false);
      expect(testRegexPattern('letters', 'café')).toBe(false); // non-ASCII
      expect(testRegexPattern('letters', 'hello world')).toBe(false);
      expect(testRegexPattern('letters', '')).toBe(false);
    });

    it('alphanumeric matches ASCII letters and numbers', () => {
      expect(testRegexPattern('alphanumeric', 'a')).toBe(true);
      expect(testRegexPattern('alphanumeric', '9')).toBe(true);
      expect(testRegexPattern('alphanumeric', 'abcXYZ123')).toBe(true);
      expect(testRegexPattern('alphanumeric', 'abc-123')).toBe(false);
      expect(testRegexPattern('alphanumeric', 'abc_123')).toBe(false);
      expect(testRegexPattern('alphanumeric', 'abc 123')).toBe(false);
      expect(testRegexPattern('alphanumeric', '')).toBe(false);
    });

    it('whitespace matches ECMAScript whitespace characters', () => {
      expect(testRegexPattern('whitespace', ' ')).toBe(true);
      expect(testRegexPattern('whitespace', '\t')).toBe(true);
      expect(testRegexPattern('whitespace', '\r\n')).toBe(true);
      expect(testRegexPattern('whitespace', ' \t\r\n\f\v')).toBe(true);
      expect(testRegexPattern('whitespace', ' a ')).toBe(false);
      expect(testRegexPattern('whitespace', '')).toBe(false);
    });

    it('nonWhitespace matches strings with no whitespace', () => {
      expect(testRegexPattern('nonWhitespace', 'a')).toBe(true);
      expect(testRegexPattern('nonWhitespace', 'abc-123_!@#$%^&*()')).toBe(true);
      expect(testRegexPattern('nonWhitespace', 'abc 123')).toBe(false);
      expect(testRegexPattern('nonWhitespace', 'abc\t123')).toBe(false);
      expect(testRegexPattern('nonWhitespace', '')).toBe(false);
    });

    it('wordCharacters matches ASCII word characters ([a-zA-Z0-9_])', () => {
      expect(testRegexPattern('wordCharacters', 'var_name_123')).toBe(true);
      expect(testRegexPattern('wordCharacters', '_')).toBe(true);
      expect(testRegexPattern('wordCharacters', 'hello-world')).toBe(false);
      expect(testRegexPattern('wordCharacters', 'hello.world')).toBe(false);
      expect(testRegexPattern('wordCharacters', '')).toBe(false);
    });

    it('lowercase matches lowercase ASCII letters only', () => {
      expect(testRegexPattern('lowercase', 'a')).toBe(true);
      expect(testRegexPattern('lowercase', 'hello')).toBe(true);
      expect(testRegexPattern('lowercase', 'Hello')).toBe(false);
      expect(testRegexPattern('lowercase', 'HELLO')).toBe(false);
      expect(testRegexPattern('lowercase', 'hello123')).toBe(false);
      expect(testRegexPattern('lowercase', 'münchen')).toBe(false);
      expect(testRegexPattern('lowercase', '')).toBe(false);
    });

    it('uppercase matches uppercase ASCII letters only', () => {
      expect(testRegexPattern('uppercase', 'A')).toBe(true);
      expect(testRegexPattern('uppercase', 'HELLO')).toBe(true);
      expect(testRegexPattern('uppercase', 'Hello')).toBe(false);
      expect(testRegexPattern('uppercase', 'hello')).toBe(false);
      expect(testRegexPattern('uppercase', 'HELLO123')).toBe(false);
      expect(testRegexPattern('uppercase', '')).toBe(false);
    });

    it('hexadecimal matches valid hex strings', () => {
      expect(testRegexPattern('hexadecimal', '0')).toBe(true);
      expect(testRegexPattern('hexadecimal', 'f')).toBe(true);
      expect(testRegexPattern('hexadecimal', 'F')).toBe(true);
      expect(testRegexPattern('hexadecimal', '0123456789abcdefABCDEF')).toBe(true);
      expect(testRegexPattern('hexadecimal', '0x123')).toBe(false); // prefix prohibited
      expect(testRegexPattern('hexadecimal', '123g')).toBe(false);
      expect(testRegexPattern('hexadecimal', '')).toBe(false);
    });
  });

  describe('Category 2: Identifier and formatting patterns', () => {
    it('slug matches lowercase hyphen-separated slugs', () => {
      expect(testRegexPattern('slug', 'a')).toBe(true);
      expect(testRegexPattern('slug', 'my-blog-post')).toBe(true);
      expect(testRegexPattern('slug', 'post-123')).toBe(true);
      expect(testRegexPattern('slug', '123-post')).toBe(true);
      expect(testRegexPattern('slug', '-leading')).toBe(false);
      expect(testRegexPattern('slug', 'trailing-')).toBe(false);
      expect(testRegexPattern('slug', 'consecutive--hyphens')).toBe(false);
      expect(testRegexPattern('slug', 'with_underscore')).toBe(false);
      expect(testRegexPattern('slug', 'UpperCase-Slug')).toBe(false);
      expect(testRegexPattern('slug', '')).toBe(false);
    });

    it('username matches 1-30 char alphanumeric usernames with internal symbols', () => {
      expect(testRegexPattern('username', 'u')).toBe(true);
      expect(testRegexPattern('username', '9')).toBe(true);
      expect(testRegexPattern('username', 'john_doe-99')).toBe(true);
      expect(testRegexPattern('username', 'a'.repeat(30))).toBe(true);
      expect(testRegexPattern('username', 'a'.repeat(31))).toBe(false); // too long
      expect(testRegexPattern('username', '_leading')).toBe(false);
      expect(testRegexPattern('username', 'trailing_')).toBe(false);
      expect(testRegexPattern('username', '-leading')).toBe(false);
      expect(testRegexPattern('username', 'trailing-')).toBe(false);
      expect(testRegexPattern('username', 'has space')).toBe(false);
      expect(testRegexPattern('username', '')).toBe(false);
    });

    it('identifier matches valid JavaScript identifiers', () => {
      expect(testRegexPattern('identifier', 'myVar')).toBe(true);
      expect(testRegexPattern('identifier', '$')).toBe(true);
      expect(testRegexPattern('identifier', '_')).toBe(true);
      expect(testRegexPattern('identifier', '$element')).toBe(true);
      expect(testRegexPattern('identifier', '_privateField')).toBe(true);
      expect(testRegexPattern('identifier', 'item123')).toBe(true);
      expect(testRegexPattern('identifier', '123var')).toBe(false); // starts with digit
      expect(testRegexPattern('identifier', 'my-var')).toBe(false); // hyphen
      expect(testRegexPattern('identifier', '')).toBe(false);
    });

    it('hexColor matches 3, 4, 6, and 8 digit hex color codes', () => {
      expect(testRegexPattern('hexColor', '#fff')).toBe(true);
      expect(testRegexPattern('hexColor', '#FFF')).toBe(true);
      expect(testRegexPattern('hexColor', '#ffff')).toBe(true);
      expect(testRegexPattern('hexColor', '#1a2b3c')).toBe(true);
      expect(testRegexPattern('hexColor', '#1a2b3cff')).toBe(true);
      expect(testRegexPattern('hexColor', '#12')).toBe(false); // 2 digits
      expect(testRegexPattern('hexColor', '#12345')).toBe(false); // 5 digits
      expect(testRegexPattern('hexColor', '#1234567')).toBe(false); // 7 digits
      expect(testRegexPattern('hexColor', '#123456789')).toBe(false); // 9 digits
      expect(testRegexPattern('hexColor', 'fff')).toBe(false); // missing #
      expect(testRegexPattern('hexColor', '#ggg')).toBe(false); // non-hex
      expect(testRegexPattern('hexColor', '')).toBe(false);
    });

    it('semver matches Semantic Versioning 2.0.0 strings', () => {
      expect(testRegexPattern('semver', '1.0.0')).toBe(true);
      expect(testRegexPattern('semver', '0.0.0')).toBe(true);
      expect(testRegexPattern('semver', '10.20.30')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-alpha')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-alpha.1')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-0.3.7')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-x.7.z.92')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0+20130313144700')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-beta+exp.sha.5114f85')).toBe(true);
      expect(testRegexPattern('semver', '1.0')).toBe(false); // missing patch
      expect(testRegexPattern('semver', 'v1.0.0')).toBe(false); // leading v prohibited
      expect(testRegexPattern('semver', '01.0.0')).toBe(false); // leading zeros prohibited
      expect(testRegexPattern('semver', '1.02.0')).toBe(false);
      expect(testRegexPattern('semver', '1.0.03')).toBe(false);
      expect(testRegexPattern('semver', '')).toBe(false);
    });
  });

  describe('Category 3: Common input matching candidates', () => {
    it('integer matches signed and unsigned integers without non-zero leading zeros', () => {
      expect(testRegexPattern('integer', '0')).toBe(true);
      expect(testRegexPattern('integer', '+0')).toBe(true);
      expect(testRegexPattern('integer', '-0')).toBe(true);
      expect(testRegexPattern('integer', '42')).toBe(true);
      expect(testRegexPattern('integer', '-17')).toBe(true);
      expect(testRegexPattern('integer', '+99')).toBe(true);
      expect(testRegexPattern('integer', '05')).toBe(false); // leading zero
      expect(testRegexPattern('integer', '-05')).toBe(false);
      expect(testRegexPattern('integer', '3.14')).toBe(false);
      expect(testRegexPattern('integer', 'abc')).toBe(false);
      expect(testRegexPattern('integer', '')).toBe(false);
    });

    it('decimal matches decimal strings with fractional components', () => {
      expect(testRegexPattern('decimal', '3.14')).toBe(true);
      expect(testRegexPattern('decimal', '0.0')).toBe(true);
      expect(testRegexPattern('decimal', '-0.5')).toBe(true);
      expect(testRegexPattern('decimal', '+100.00')).toBe(true);
      expect(testRegexPattern('decimal', '42')).toBe(false); // no fractional part
      expect(testRegexPattern('decimal', '3.')).toBe(false); // missing digits after dot
      expect(testRegexPattern('decimal', '.14')).toBe(false); // missing leading zero
      expect(testRegexPattern('decimal', '1e5')).toBe(false); // exponent not supported
      expect(testRegexPattern('decimal', '')).toBe(false);
    });

    it('signedNumber matches numbers that explicitly have a leading sign', () => {
      expect(testRegexPattern('signedNumber', '+0')).toBe(true);
      expect(testRegexPattern('signedNumber', '-0')).toBe(true);
      expect(testRegexPattern('signedNumber', '+42')).toBe(true);
      expect(testRegexPattern('signedNumber', '-3.14')).toBe(true);
      expect(testRegexPattern('signedNumber', '42')).toBe(false); // unsigned
      expect(testRegexPattern('signedNumber', '3.14')).toBe(false); // unsigned
      expect(testRegexPattern('signedNumber', '')).toBe(false);
    });

    it('uuid matches RFC 4122 v1-v5 UUID format', () => {
      expect(testRegexPattern('uuid', '123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(testRegexPattern('uuid', 'c9a646d3-9c61-4cb7-80e4-44a425b89fcf')).toBe(true);
      expect(testRegexPattern('uuid', 'C9A646D3-9C61-4CB7-80E4-44A425B89FCF')).toBe(true);
      expect(testRegexPattern('uuid', 'not-a-uuid')).toBe(false);
      expect(testRegexPattern('uuid', '123e4567-e89b-12d3-a456-42661417400')).toBe(false); // too short
      expect(testRegexPattern('uuid', '123e4567e89b12d3a456426614174000')).toBe(false); // no hyphens
      expect(testRegexPattern('uuid', '')).toBe(false);
    });

    it('urlCandidate matches common URL candidate strings', () => {
      expect(testRegexPattern('urlCandidate', 'http://example.com')).toBe(true);
      expect(testRegexPattern('urlCandidate', 'https://example.com')).toBe(true);
      expect(testRegexPattern('urlCandidate', 'https://sub.domain.org/path?q=1#hash')).toBe(true);
      expect(testRegexPattern('urlCandidate', 'http://localhost:3000/api/users')).toBe(true);
      expect(testRegexPattern('urlCandidate', 'ftp://files.example.com')).toBe(false);
      expect(testRegexPattern('urlCandidate', 'example.com')).toBe(false);
      expect(testRegexPattern('urlCandidate', 'not a url')).toBe(false);
      expect(testRegexPattern('urlCandidate', '')).toBe(false);
    });

    it('emailCandidate matches coarse email candidate shape', () => {
      expect(testRegexPattern('emailCandidate', 'user@example.com')).toBe(true);
      expect(testRegexPattern('emailCandidate', 'first.last@example.co.uk')).toBe(true);
      expect(testRegexPattern('emailCandidate', 'plainaddress')).toBe(false);
      expect(testRegexPattern('emailCandidate', '@missinglocal.com')).toBe(false);
      expect(testRegexPattern('emailCandidate', 'user@')).toBe(false);
      expect(testRegexPattern('emailCandidate', '')).toBe(false);
    });

    it('ipv4Candidate matches 4 octet candidate shape', () => {
      expect(testRegexPattern('ipv4Candidate', '192.168.1.1')).toBe(true);
      expect(testRegexPattern('ipv4Candidate', '0.0.0.0')).toBe(true);
      expect(testRegexPattern('ipv4Candidate', '999.999.999.999')).toBe(true); // shape match only
      expect(testRegexPattern('ipv4Candidate', '192.168.1')).toBe(false);
      expect(testRegexPattern('ipv4Candidate', '192.168.1.1.1')).toBe(false);
      expect(testRegexPattern('ipv4Candidate', '')).toBe(false);
    });

    it('ipv6Candidate matches candidate strings shaped like hexadecimal IPv6', () => {
      expect(testRegexPattern('ipv6Candidate', '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(testRegexPattern('ipv6Candidate', '::1')).toBe(true);
      expect(testRegexPattern('ipv6Candidate', '2001:db8::1')).toBe(true);
      expect(testRegexPattern('ipv6Candidate', 'not-ipv6')).toBe(false);
      expect(testRegexPattern('ipv6Candidate', '')).toBe(false);
    });

    it('dateIsoCandidate matches YYYY-MM-DD shape', () => {
      expect(testRegexPattern('dateIsoCandidate', '2026-10-20')).toBe(true);
      expect(testRegexPattern('dateIsoCandidate', '1999-01-01')).toBe(true);
      expect(testRegexPattern('dateIsoCandidate', '2026-99-99')).toBe(true); // lexical shape only
      expect(testRegexPattern('dateIsoCandidate', '20-10-2026')).toBe(false);
      expect(testRegexPattern('dateIsoCandidate', '2026/10/20')).toBe(false);
      expect(testRegexPattern('dateIsoCandidate', '')).toBe(false);
    });

    it('timeCandidate matches HH:MM[:SS[.sss]] shape', () => {
      expect(testRegexPattern('timeCandidate', '15:30')).toBe(true);
      expect(testRegexPattern('timeCandidate', '00:00')).toBe(true);
      expect(testRegexPattern('timeCandidate', '15:30:45')).toBe(true);
      expect(testRegexPattern('timeCandidate', '15:30:45.123')).toBe(true);
      expect(testRegexPattern('timeCandidate', '99:99')).toBe(true); // lexical shape only
      expect(testRegexPattern('timeCandidate', '3pm')).toBe(false);
      expect(testRegexPattern('timeCandidate', '12')).toBe(false);
      expect(testRegexPattern('timeCandidate', '')).toBe(false);
    });
  });

  describe('Runtime edge cases', () => {
    it('testRegexPattern returns false for non-string input at runtime', () => {
      // @ts-expect-error testing runtime non-string input
      expect(testRegexPattern('digits', null)).toBe(false);
      // @ts-expect-error testing runtime non-string input
      expect(testRegexPattern('digits', undefined)).toBe(false);
      // @ts-expect-error testing runtime non-string input
      expect(testRegexPattern('digits', 123)).toBe(false);
      // @ts-expect-error testing runtime non-string input
      expect(testRegexPattern('digits', {})).toBe(false);
      // @ts-expect-error testing runtime non-string input
      expect(testRegexPattern('digits', [])).toBe(false);
    });
  });
});
