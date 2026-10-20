import { describe, expect, it, vi } from 'vitest';
import { regexPatterns, testRegexPattern } from '../src/regex-patterns/index.js';
import {
  capture,
  characterClass,
  compileRegex,
  escapeRegex,
  oneOf,
  oneOrMore,
  sequence,
} from '../src/regex-builder/index.js';
import { isValidEmail, validateEmail } from '../src/email-validator/index.js';
import { isIP, validateIP } from '../src/ip-validator/index.js';

describe('Security & Performance Assurance', () => {
  describe('ReDoS resilience & input length limits', () => {
    it('all catalogue patterns process long adversary strings in under 50ms', () => {
      const adversaryString = 'a'.repeat(5000) + '!';
      const numericAdversary = '9'.repeat(5000) + 'X';

      for (const [name, def] of Object.entries(regexPatterns)) {
        const rx = def.createRegExp();
        const start = performance.now();

        rx.test(adversaryString);
        rx.test(numericAdversary);

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(50);
      }
    });

    it('email validator processes long inputs efficiently and rejects oversized addresses', () => {
      const longInput = 'user+' + 'a'.repeat(10000) + '@example.com';
      const start = performance.now();
      const res = validateEmail(longInput);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'TOTAL_LENGTH_EXCEEDED')).toBe(true);
    });

    it('IP validator processes long inputs quickly without backtracking', () => {
      const longAdversary = '1.'.repeat(1000) + '1';
      const start = performance.now();
      const valid = isIP(longAdversary);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      expect(valid).toBe(0);
    });

    it('handles 100,000 character strings safely without stack overflow or crash', () => {
      const giantString = 'x'.repeat(100000);
      expect(validateEmail(giantString).valid).toBe(false);
      expect(validateIP(giantString).valid).toBe(false);
      expect(testRegexPattern('slug', giantString)).toBe(true); // slug allows letters
      expect(testRegexPattern('ipv4Candidate', giantString)).toBe(false);
    });
  });

  describe('Zero network access', () => {
    it('does not invoke fetch or network APIs during validation', () => {
      const originalFetch = globalThis.fetch;
      const fetchSpy = vi.fn();
      // @ts-expect-error mocking global fetch
      globalThis.fetch = fetchSpy;

      try {
        validateEmail('user@nonexistent-domain-404-check.com');
        validateEmail('user@münchen.de');
        validateIP('8.8.8.8');
        validateIP('2001:4860:4860::8888');

        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Prototype pollution resistance', () => {
    it('does not pollute Object prototype when handling __proto__ and constructor strings', () => {
      const emailRes = validateEmail('__proto__@example.com');
      expect(emailRes.valid).toBe(true);
      expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);

      const cap = capture('abc', '__proto__');
      expect(cap.source).toBe('(?<__proto__>abc)');
      expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);

      // Testing object constructor as input
      // @ts-expect-error testing Object.prototype
      expect(validateEmail(Object.prototype).valid).toBe(false);
      // @ts-expect-error testing Object.prototype
      expect(validateIP(Object.prototype).valid).toBe(false);
    });
  });

  describe('Error privacy and safety', () => {
    it('error messages do not leak secrets or unhandled process environment details', () => {
      const secretToken = 'SECRET_API_KEY_987654321';
      const result = validateEmail(`invalid-email-with-${secretToken}`);

      expect(result.valid).toBe(false);
      for (const err of result.errors) {
        // Message explains the syntax issue without echoing sensitive system paths or env
        expect(err.message).not.toContain(process.cwd());
        expect(err.message).not.toContain('TOKEN');
      }
    });

    it('sanitizes and truncates overly long user input in error messages where appropriate', () => {
      const longInput = 'invalid@' + 'a'.repeat(500);
      const res = validateEmail(longInput);
      expect(res.valid).toBe(false);
      for (const err of res.errors) {
        // Error messages should be succinct human-readable diagnostics, not dumps of 500 characters
        expect(err.message.length).toBeLessThan(200);
      }
    });
  });

  describe('Statelessness and immutability', () => {
    it('does not leak state across repeated executions', () => {
      for (let i = 0; i < 50; i++) {
        expect(testRegexPattern('digits', '12345')).toBe(true);
        expect(testRegexPattern('digits', '12345')).toBe(true);
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isIP('192.168.1.1')).toBe(4);
      }
    });

    it('escapeRegex safely neutralizes all syntax injection characters', () => {
      const attackPayload = '.*+?^${}()|[]/\\';
      const escaped = escapeRegex(attackPayload);
      const rx = compileRegex(sequence('^', escaped, '$'));

      expect(rx.test(attackPayload)).toBe(true);
      expect(rx.test('any other string')).toBe(false);
    });
  });
});
