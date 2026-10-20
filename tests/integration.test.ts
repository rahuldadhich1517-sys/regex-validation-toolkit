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

  it('composes a custom form validator using regex-builder and combines with email/ip validation', () => {
    // Build a pattern matching an API host that can be a hostname, IPv4, or IPv6
    const portPattern = sequence(':', between(digit(), 1, 5));
    const hostWithOptionalPort = sequence(
      startOfLine(),
      capture(oneOf(
        getRegexPattern('slug').pattern.slice(1, -1),
        getRegexPattern('ipv4Candidate').pattern.slice(1, -1),
      ), 'host'),
      optional(portPattern),
      endOfLine(),
    );

    const rx = compileRegex(hostWithOptionalPort);
    expect(rx.test('my-server:8080')).toBe(true);
    expect(rx.test('192.168.1.1:3000')).toBe(true);
    expect(rx.test('invalid host name!')).toBe(false);

    // Perform semantic validation on the matched host
    const match = rx.exec('192.168.1.1:3000');
    expect(match?.groups?.['host']).toBe('192.168.1.1');
    expect(isIPv4(match?.groups?.['host'])).toBe(true);
  });

  it('distinguishes lexical shape matching from semantic validation', () => {
    const candidateIp = '999.999.999.999';
    // Pattern matches candidate shape:
    expect(testRegexPattern('ipv4Candidate', candidateIp)).toBe(true);
    // But semantic validator strictly rejects invalid octets:
    expect(isIPv4(candidateIp)).toBe(false);

    const candidateEmail = 'invalid..dots@domain..com';
    // Shape candidate may match coarse [^\s@]+@[^\s@]+\.[^\s@]+:
    expect(testRegexPattern('emailCandidate', candidateEmail)).toBe(true);
    // But semantic validator strictly rejects consecutive dots:
    expect(isValidEmail(candidateEmail)).toBe(false);
  });
});
