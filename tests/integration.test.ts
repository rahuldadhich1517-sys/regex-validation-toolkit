import { describe, expect, it } from 'vitest';
import {
  // Errors
  RegexToolkitError,
  RegexBuilderError,
  RegexCompilationError,
  InvalidOptionError,
  // Module 1: regex-patterns
  regexPatterns,
  getRegexPattern,
  createRegexPattern,
  testRegexPattern,
  // Module 2: regex-builder
  literal,
  sequence,
  oneOf,
  optional,
  zeroOrMore,
  oneOrMore,
  exactly,
  between,
  atLeast,
  capture,
  nonCapture,
  lookahead,
  negativeLookahead,
  characterClass,
  negatedCharacterClass,
  range,
  startOfLine,
  endOfLine,
  digit,
  whitespace,
  wordCharacter,
  buildRegex,
  compileRegex,
  escapeRegex,
  escapeCharacterClass,
  RegexFragment,
  // Module 3: email-validator
  isValidEmail,
  validateEmail,
  // Module 4: ip-validator
  isIPv4,
  isIPv6,
  isIP,
  validateIP,
} from '../src/index.js';

describe('Integration & Root API Verification', () => {
  it('exports all expected top-level functions and error classes', () => {
    // Errors
    expect(RegexToolkitError).toBeDefined();
    expect(RegexBuilderError).toBeDefined();
    expect(RegexCompilationError).toBeDefined();
    expect(InvalidOptionError).toBeDefined();

    const optErr = new InvalidOptionError('invalid option provided');
    expect(optErr instanceof RegexToolkitError).toBe(true);
    expect(optErr.name).toBe('InvalidOptionError');
    expect(optErr.message).toBe('invalid option provided');

    // Regex patterns
    expect(regexPatterns).toBeDefined();
    expect(getRegexPattern).toBeDefined();
    expect(createRegexPattern).toBeDefined();
    expect(testRegexPattern).toBeDefined();

    // Regex builder
    expect(literal).toBeDefined();
    expect(sequence).toBeDefined();
    expect(oneOf).toBeDefined();
    expect(optional).toBeDefined();
    expect(zeroOrMore).toBeDefined();
    expect(oneOrMore).toBeDefined();
    expect(exactly).toBeDefined();
    expect(between).toBeDefined();
    expect(atLeast).toBeDefined();
    expect(capture).toBeDefined();
    expect(nonCapture).toBeDefined();
    expect(lookahead).toBeDefined();
    expect(negativeLookahead).toBeDefined();
    expect(characterClass).toBeDefined();
    expect(negatedCharacterClass).toBeDefined();
    expect(range).toBeDefined();
    expect(startOfLine).toBeDefined();
    expect(endOfLine).toBeDefined();
    expect(digit).toBeDefined();
    expect(whitespace).toBeDefined();
    expect(wordCharacter).toBeDefined();
    expect(buildRegex).toBeDefined();
    expect(compileRegex).toBeDefined();
    expect(escapeRegex).toBeDefined();
    expect(escapeCharacterClass).toBeDefined();
    expect(RegexFragment).toBeDefined();

    // Email validator
    expect(isValidEmail).toBeDefined();
    expect(validateEmail).toBeDefined();

    // IP validator
    expect(isIPv4).toBeDefined();
    expect(isIPv6).toBeDefined();
    expect(isIP).toBeDefined();
    expect(validateIP).toBeDefined();
  });

  describe('Phase 8 — Seven Cross-Utility Scenarios', () => {
    it('Scenario 1: Lexical shape candidate extraction refined by semantic validation', () => {
      const candidateIp = '999.999.999.999';
      // Lexical shape matches candidate:
      expect(testRegexPattern('ipv4Candidate', candidateIp)).toBe(true);
      // Semantic validator catches that it is out of IPv4 range:
      expect(isIPv4(candidateIp)).toBe(false);
      const res = validateIP(candidateIp, { version: 4 });
      expect(res.valid).toBe(false);
      expect(res.errors[0]?.code).toBe('INVALID_IPV4_OCTET_VALUE');

      const candidateEmail = 'user..name@example..com';
      // Lexical shape matches candidate:
      expect(testRegexPattern('emailCandidate', candidateEmail)).toBe(true);
      // Semantic validator catches consecutive dots:
      expect(isValidEmail(candidateEmail)).toBe(false);
      const emailRes = validateEmail(candidateEmail);
      expect(emailRes.valid).toBe(false);
      expect(emailRes.errors.some((e) => e.code === 'LOCAL_PART_CONSECUTIVE_DOTS')).toBe(true);
    });

    it('Scenario 2: Extracting multiple IP candidates from unstructured text and filtering semantically', () => {
      const logText =
        'Server access log: client 192.168.1.50 connected, upstream 10.0.0.1 responded, bad gateway candidate 999.1.2.3 was blocked.';
      const unanchoredIpv4 = createRegexPattern('ipv4Candidate', { anchored: false });
      const matches = Array.from(logText.matchAll(new RegExp(unanchoredIpv4.source, 'g'))).map((m) => m[0]);

      expect(matches).toContain('192.168.1.50');
      expect(matches).toContain('10.0.0.1');
      expect(matches).toContain('999.1.2.3');

      const validIps = matches.filter((ip) => isIPv4(ip));
      expect(validIps).toEqual(['192.168.1.50', '10.0.0.1']);
      expect(validIps).not.toContain('999.1.2.3');
    });

    it('Scenario 3: Extracting email candidates from text and running full email validation', () => {
      const contactText =
        'Please send support queries to support@company.com or sales.dept@company.co.uk. Do not write to invalid..email@.';
      const unanchoredEmail = createRegexPattern('emailCandidate', { anchored: false });
      const candidateMatches = Array.from(contactText.matchAll(new RegExp(unanchoredEmail.source, 'g'))).map((m) => m[0]);

      // Strip trailing sentence punctuation commonly attached to URLs/emails in plain text
      const validatedEmails = candidateMatches
        .map((candidate) => candidate.replace(/[.,;:]+$/, ''))
        .map((candidate) => validateEmail(candidate))
        .filter((res) => res.valid)
        .map((res) => res.normalized);

      expect(validatedEmails).toContain('support@company.com');
      expect(validatedEmails).toContain('sales.dept@company.co.uk');
      expect(validatedEmails).not.toContain('invalid..email@.');
    });

    it('Scenario 4: Using escapeRegex in builder pipeline to safely match user query in structured markup', () => {
      const userSearchQuery = 'C++ [Advanced] (2026)?';
      const escaped = escapeRegex(userSearchQuery);

      // Construct a pattern searching for query wrapped inside a tag <query>...</query>
      const tagPattern = sequence('<query>', escaped, '</query>');
      const rx = compileRegex(tagPattern);

      const html = '<div>Found course: <query>C++ [Advanced] (2026)?</query> in catalog</div>';
      expect(rx.test(html)).toBe(true);
      expect(rx.test('<div>Found course: <query>C++ [Basic] (2026)?</query></div>')).toBe(false);
    });

    it('Scenario 5: Combining character classes, ranges, and patterns to match structured slugs', () => {
      // E.g. prefix: "v1" or "v2", followed by a slash, followed by a valid slug
      const versionPrefix = sequence('v', characterClass(range('1', '9')));
      const slugBody = getRegexPattern('slug').pattern.slice(1, -1); // unanchored inner
      const versionedSlug = sequence(startOfLine(), versionPrefix, '/', slugBody, endOfLine());
      const rx = compileRegex(versionedSlug);

      expect(rx.test('v1/user-profile-settings')).toBe(true);
      expect(rx.test('v2/order-12345')).toBe(true);
      expect(rx.test('v0/invalid')).toBe(false);
      expect(rx.test('v1/INVALID_SLUG!')).toBe(false);
    });

    it('Scenario 6: Validating URI host components (IPv4, IPv6, or domain name)', () => {
      function validateUriHost(host: string): { type: 'ipv4' | 'ipv6' | 'domain'; valid: boolean } {
        if (host.startsWith('[') && host.endsWith(']')) {
          const v6 = validateIP(host, { allowBrackets: true });
          return { type: 'ipv6', valid: v6.valid };
        }
        if (isIPv4(host)) {
          return { type: 'ipv4', valid: true };
        }
        if (isIPv6(host)) {
          return { type: 'ipv6', valid: true };
        }
        // Validate as domain name using email validator domain rules
        const domainCheck = validateEmail(`test@${host}`);
        return { type: 'domain', valid: domainCheck.valid };
      }

      expect(validateUriHost('192.168.1.1')).toEqual({ type: 'ipv4', valid: true });
      expect(validateUriHost('[::1]')).toEqual({ type: 'ipv6', valid: true });
      expect(validateUriHost('2001:db8::1')).toEqual({ type: 'ipv6', valid: true });
      expect(validateUriHost('api.example.com')).toEqual({ type: 'domain', valid: true });
      expect(validateUriHost('invalid..domain')).toEqual({ type: 'domain', valid: false });
    });

    it('Scenario 7: Building email and IP tokens with builder and validating with semantic validators', () => {
      // Build a pattern for a config line: "BIND = <ip>:<port>" or "ALERT_TO = <email>"
      const ipConfigRx = compileRegex(
        sequence(
          startOfLine(),
          'BIND = ',
          capture(oneOrMore(characterClass(range('0', '9'), '.')), 'ip'),
          ':',
          capture(oneOrMore(digit()), 'port'),
          endOfLine(),
        ),
      );

      const emailConfigRx = compileRegex(
        sequence(
          startOfLine(),
          'ALERT_TO = ',
          capture(oneOrMore(negatedCharacterClass(whitespace())), 'email'),
          endOfLine(),
        ),
      );

      const line1 = 'BIND = 127.0.0.1:8080';
      const m1 = ipConfigRx.exec(line1);
      expect(m1).not.toBeNull();
      const ip = m1?.groups?.['ip'];
      expect(isIPv4(ip)).toBe(true);

      const line2 = 'BIND = 999.0.0.1:8080';
      const m2 = ipConfigRx.exec(line2);
      expect(m2).not.toBeNull();
      expect(isIPv4(m2?.groups?.['ip'])).toBe(false);

      const line3 = 'ALERT_TO = devops@infra.company.com';
      const m3 = emailConfigRx.exec(line3);
      expect(m3).not.toBeNull();
      expect(isValidEmail(m3?.groups?.['email'])).toBe(true);
    });
  });
});
