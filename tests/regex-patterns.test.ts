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
  it('exports all 24 required pattern definitions in the catalogue', () => {
    const expectedPatterns: RegexPatternName[] = [
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

    for (const name of expectedPatterns) {
      const def = regexPatterns[name];
      expect(def).toBeDefined();
      expect(def.name).toBe(name);
      expect(typeof def.pattern).toBe('string');
      expect(typeof def.unanchoredPattern).toBe('string');
      expect(typeof def.description).toBe('string');
      expect(typeof def.limitations).toBe('string');
      expect(def.anchored).toBe(true);
      expect(typeof def.createRegExp).toBe('function');
    }
  });

  it('getRegexPattern throws RegexToolkitError for unknown pattern names', () => {
    // @ts-expect-error testing invalid input at runtime
    expect(() => getRegexPattern('nonExistentPattern')).toThrow(RegexToolkitError);
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
  });

  describe('Character patterns', () => {
    it('digits matches ASCII digit strings', () => {
      expect(testRegexPattern('digits', '0')).toBe(true);
      expect(testRegexPattern('digits', '1234567890')).toBe(true);
      expect(testRegexPattern('digits', '')).toBe(false);
      expect(testRegexPattern('digits', '123a')).toBe(false);
      expect(testRegexPattern('digits', ' 123')).toBe(false);
    });

    it('letters matches ASCII letters only', () => {
      expect(testRegexPattern('letters', 'helloWORLD')).toBe(true);
      expect(testRegexPattern('letters', 'hello123')).toBe(false);
      expect(testRegexPattern('letters', 'café')).toBe(false); // non-ASCII
      expect(testRegexPattern('letters', '')).toBe(false);
    });

    it('alphanumeric matches ASCII letters and numbers', () => {
      expect(testRegexPattern('alphanumeric', 'abcXYZ123')).toBe(true);
      expect(testRegexPattern('alphanumeric', 'abc-123')).toBe(false);
      expect(testRegexPattern('alphanumeric', '')).toBe(false);
    });

    it('whitespace matches only ECMAScript whitespace characters', () => {
      expect(testRegexPattern('whitespace', ' \t\r\n')).toBe(true);
      expect(testRegexPattern('whitespace', ' a ')).toBe(false);
      expect(testRegexPattern('whitespace', '')).toBe(false);
    });

    it('nonWhitespace matches characters without whitespace', () => {
      expect(testRegexPattern('nonWhitespace', 'abc-123_!@#')).toBe(true);
      expect(testRegexPattern('nonWhitespace', 'abc 123')).toBe(false);
      expect(testRegexPattern('nonWhitespace', '')).toBe(false);
    });

    it('wordCharacters matches ASCII word characters', () => {
      expect(testRegexPattern('wordCharacters', 'var_name_123')).toBe(true);
      expect(testRegexPattern('wordCharacters', 'hello-world')).toBe(false);
      expect(testRegexPattern('wordCharacters', '')).toBe(false);
    });

    it('lowercase and uppercase match respective casings', () => {
      expect(testRegexPattern('lowercase', 'hello')).toBe(true);
      expect(testRegexPattern('lowercase', 'Hello')).toBe(false);
      expect(testRegexPattern('uppercase', 'HELLO')).toBe(true);
      expect(testRegexPattern('uppercase', 'Hello')).toBe(false);
    });

    it('hexadecimal matches valid hex strings', () => {
      expect(testRegexPattern('hexadecimal', '0123456789abcdefABCDEF')).toBe(true);
      expect(testRegexPattern('hexadecimal', '123g')).toBe(false);
      expect(testRegexPattern('hexadecimal', '')).toBe(false);
    });
  });

  describe('Identifier and formatting patterns', () => {
    it('slug matches lower-case hyphen-separated slugs', () => {
      expect(testRegexPattern('slug', 'my-blog-post')).toBe(true);
      expect(testRegexPattern('slug', 'post-123')).toBe(true);
      expect(testRegexPattern('slug', 'single')).toBe(true);
      expect(testRegexPattern('slug', '-leading')).toBe(false);
      expect(testRegexPattern('slug', 'trailing-')).toBe(false);
      expect(testRegexPattern('slug', 'consecutive--hyphens')).toBe(false);
      expect(testRegexPattern('slug', 'UpperCase-Slug')).toBe(false);
    });

    it('username matches 1-30 char alphanumeric usernames', () => {
      expect(testRegexPattern('username', 'user123')).toBe(true);
      expect(testRegexPattern('username', 'u')).toBe(true);
      expect(testRegexPattern('username', 'john_doe-99')).toBe(true);
      expect(testRegexPattern('username', '_leading')).toBe(false);
      expect(testRegexPattern('username', 'trailing_')).toBe(false);
      expect(testRegexPattern('username', 'a'.repeat(31))).toBe(false);
    });

    it('identifier matches valid JavaScript identifiers', () => {
      expect(testRegexPattern('identifier', 'myVar')).toBe(true);
      expect(testRegexPattern('identifier', '$element')).toBe(true);
      expect(testRegexPattern('identifier', '_privateField')).toBe(true);
      expect(testRegexPattern('identifier', '123var')).toBe(false);
      expect(testRegexPattern('identifier', 'my-var')).toBe(false);
    });

    it('hexColor matches 3, 4, 6, and 8 digit hex color codes', () => {
      expect(testRegexPattern('hexColor', '#fff')).toBe(true);
      expect(testRegexPattern('hexColor', '#ffff')).toBe(true);
      expect(testRegexPattern('hexColor', '#1a2b3c')).toBe(true);
      expect(testRegexPattern('hexColor', '#1a2b3cff')).toBe(true);
      expect(testRegexPattern('hexColor', '#12')).toBe(false);
      expect(testRegexPattern('hexColor', '#12345')).toBe(false);
      expect(testRegexPattern('hexColor', 'fff')).toBe(false); // missing #
    });

    it('semver matches Semantic Versioning 2.0.0 strings', () => {
      expect(testRegexPattern('semver', '1.0.0')).toBe(true);
      expect(testRegexPattern('semver', '0.1.0')).toBe(true);
      expect(testRegexPattern('semver', '10.20.30')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-alpha')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-alpha.1')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-0.3.7')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-x.7.z.92')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0+20130313144700')).toBe(true);
      expect(testRegexPattern('semver', '1.0.0-beta+exp.sha.5114f85')).toBe(true);
      expect(testRegexPattern('semver', '1.0')).toBe(false);
      expect(testRegexPattern('semver', 'v1.0.0')).toBe(false);
      expect(testRegexPattern('semver', '01.0.0')).toBe(false); // leading zeros prohibited
    });
  });

  describe('Common input matching candidates', () => {
    it('integer matches decimal integers without non-zero leading zeros', () => {
      expect(testRegexPattern('integer', '0')).toBe(true);
      expect(testRegexPattern('integer', '42')).toBe(true);
      expect(testRegexPattern('integer', '-17')).toBe(true);
      expect(testRegexPattern('integer', '+99')).toBe(true);
      expect(testRegexPattern('integer', '05')).toBe(false);
      expect(testRegexPattern('integer', '3.14')).toBe(false);
    });

    it('decimal matches decimal strings with fractional components', () => {
      expect(testRegexPattern('decimal', '3.14')).toBe(true);
      expect(testRegexPattern('decimal', '-0.5')).toBe(true);
      expect(testRegexPattern('decimal', '+100.00')).toBe(true);
      expect(testRegexPattern('decimal', '42')).toBe(false); // no fractional part
      expect(testRegexPattern('decimal', '3.')).toBe(false);
    });

    it('signedNumber matches numbers that explicitly have a leading sign', () => {
      expect(testRegexPattern('signedNumber', '+42')).toBe(true);
      expect(testRegexPattern('signedNumber', '-3.14')).toBe(true);
      expect(testRegexPattern('signedNumber', '42')).toBe(false); // unsigned
    });

    it('uuid matches RFC 4122 v1-v5 UUID format', () => {
      expect(testRegexPattern('uuid', '123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(testRegexPattern('uuid', 'c9a646d3-9c61-4cb7-80e4-44a425b89fcf')).toBe(true);
      expect(testRegexPattern('uuid', 'not-a-uuid')).toBe(false);
      expect(testRegexPattern('uuid', '123e4567-e89b-12d3-a456-42661417400')).toBe(false); // short
    });

    it('urlCandidate matches common URL candidate strings', () => {
      expect(testRegexPattern('urlCandidate', 'https://example.com')).toBe(true);
      expect(testRegexPattern('urlCandidate', 'http://localhost:3000/api/users')).toBe(true);
      expect(testRegexPattern('urlCandidate', 'ftp://files.example.com')).toBe(false);
      expect(testRegexPattern('urlCandidate', 'not a url')).toBe(false);
    });

    it('emailCandidate matches coarse email shape', () => {
      expect(testRegexPattern('emailCandidate', 'user@example.com')).toBe(true);
      expect(testRegexPattern('emailCandidate', 'plainaddress')).toBe(false);
      expect(testRegexPattern('emailCandidate', '@missinglocal.com')).toBe(false);
    });

    it('ipv4Candidate matches 4 octet candidate shape', () => {
      expect(testRegexPattern('ipv4Candidate', '192.168.1.1')).toBe(true);
      expect(testRegexPattern('ipv4Candidate', '999.999.999.999')).toBe(true); // shape match only
      expect(testRegexPattern('ipv4Candidate', '192.168.1')).toBe(false);
    });

    it('ipv6Candidate matches IPv6 hex colon shape', () => {
      expect(testRegexPattern('ipv6Candidate', '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(testRegexPattern('ipv6Candidate', '::1')).toBe(true);
      expect(testRegexPattern('ipv6Candidate', 'not-ipv6')).toBe(false);
    });

    it('dateIsoCandidate matches YYYY-MM-DD shape', () => {
      expect(testRegexPattern('dateIsoCandidate', '2026-10-20')).toBe(true);
      expect(testRegexPattern('dateIsoCandidate', '2026-99-99')).toBe(true); // shape match only
      expect(testRegexPattern('dateIsoCandidate', '20-10-2026')).toBe(false);
    });

    it('timeCandidate matches HH:MM[:SS[.sss]] shape', () => {
      expect(testRegexPattern('timeCandidate', '15:30')).toBe(true);
      expect(testRegexPattern('timeCandidate', '15:30:45')).toBe(true);
      expect(testRegexPattern('timeCandidate', '15:30:45.123')).toBe(true);
      expect(testRegexPattern('timeCandidate', '99:99')).toBe(true); // shape match only
      expect(testRegexPattern('timeCandidate', '3pm')).toBe(false);
    });

    it('testRegexPattern returns false for non-string input at runtime', () => {
      // @ts-expect-error testing runtime non-string input
      expect(testRegexPattern('digits', null)).toBe(false);
      // @ts-expect-error testing runtime non-string input
      expect(testRegexPattern('digits', undefined)).toBe(false);
      // @ts-expect-error testing runtime non-string input
      expect(testRegexPattern('digits', 123)).toBe(false);
    });
  });
});
