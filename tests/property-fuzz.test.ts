import { describe, expect, it } from 'vitest';
import { escapeRegex } from '../src/regex-builder/index.js';
import {
  formatCanonicalIPv6,
  isIP,
  isIPv4,
  isIPv6,
  parseIPv4,
  parseIPv6,
  validateIP,
} from '../src/ip-validator/index.js';
import { isValidEmail, validateEmail } from '../src/email-validator/index.js';

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Ensures tests are reproducible and fast with zero dependencies.
 */
function createPrng(seed: number) {
  let state = seed;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Property-Based & Fuzz Testing (Phase 11)', () => {
  const prng = createPrng(0xdeadbeef);

  function randomInt(min: number, max: number): number {
    return Math.floor(prng() * (max - min + 1)) + min;
  }

  describe('Property: escapeRegex invariant', () => {
    it('always produces an exact literal match for arbitrary strings', () => {
      const charPool =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
        '\\^$.*+?()[]{}|/-,:;!@#%&=_~`\'"<> \t\r\n\0\x1f\u00A9\u2764\uFE0F\uD83D\uDE00';

      for (let i = 0; i < 300; i++) {
        const len = randomInt(1, 40);
        let str = '';
        for (let j = 0; j < len; j++) {
          const idx = randomInt(0, charPool.length - 1);
          str += charPool[idx];
        }

        const escaped = escapeRegex(str);
        // Build regex and test matching
        const rx = new RegExp('^' + escaped + '$', 'u');

        // Must match original string
        expect(rx.test(str)).toBe(true);

        // Must not match perturbed string (if non-empty)
        if (str.length > 0) {
          expect(rx.test(str + 'extra')).toBe(false);
          expect(rx.test('extra' + str)).toBe(false);
        }
      }
    });
  });

  describe('Property: IPv4 generation & roundtrip', () => {
    it('all synthetically generated IPv4 addresses are recognized and roundtripped', () => {
      for (let i = 0; i < 200; i++) {
        const o0 = randomInt(0, 255);
        const o1 = randomInt(0, 255);
        const o2 = randomInt(0, 255);
        const o3 = randomInt(0, 255);
        const ip = `${o0}.${o1}.${o2}.${o3}`;

        expect(isIPv4(ip)).toBe(true);
        expect(isIP(ip)).toBe(4);

        const { parsed, errors } = parseIPv4(ip);
        expect(errors).toHaveLength(0);
        expect(parsed).toBeDefined();
        expect(parsed?.octets).toEqual([o0, o1, o2, o3]);
        expect(parsed?.normalized).toBe(ip);

        const val = validateIP(ip);
        expect(val.valid).toBe(true);
        expect(val.version).toBe(4);
        expect(val.normalized).toBe(ip);
      }
    });

    it('all single-byte mutations of IPv4 out of bounds are strictly rejected', () => {
      for (let i = 0; i < 100; i++) {
        const octets = [randomInt(0, 255), randomInt(0, 255), randomInt(0, 255), randomInt(0, 255)];
        const badIdx = randomInt(0, 3);
        const badVal = randomInt(256, 9999);
        octets[badIdx] = badVal;

        const badIp = octets.join('.');
        expect(isIPv4(badIp)).toBe(false);
        expect(isIP(badIp)).toBe(0);
        expect(validateIP(badIp, { version: 4 }).valid).toBe(false);
      }
    });
  });

  describe('Property: IPv6 canonical normalization idempotence', () => {
    it('formatCanonicalIPv6 is idempotent: canonical(canonical(ip)) === canonical(ip)', () => {
      for (let i = 0; i < 200; i++) {
        // Generate 8 16-bit words, occasionally putting 0 runs to test compression
        const words: [number, number, number, number, number, number, number, number] = [
          prng() > 0.4 ? randomInt(0, 0xffff) : 0,
          prng() > 0.4 ? randomInt(0, 0xffff) : 0,
          prng() > 0.4 ? randomInt(0, 0xffff) : 0,
          prng() > 0.4 ? randomInt(0, 0xffff) : 0,
          prng() > 0.4 ? randomInt(0, 0xffff) : 0,
          prng() > 0.4 ? randomInt(0, 0xffff) : 0,
          prng() > 0.4 ? randomInt(0, 0xffff) : 0,
          prng() > 0.4 ? randomInt(0, 0xffff) : 0,
        ];

        const canonical1 = formatCanonicalIPv6(words);
        expect(isIPv6(canonical1)).toBe(true);
        expect(isIP(canonical1)).toBe(6);

        // Parse canonical1 back
        const { parsed, errors } = parseIPv6(canonical1);
        expect(errors).toHaveLength(0);
        expect(parsed).toBeDefined();
        expect(parsed?.words).toEqual(words);

        const canonical2 = formatCanonicalIPv6(parsed!.words);
        // Idempotent: formatting the parsed words produces the exact same canonical string
        expect(canonical2).toBe(canonical1);
      }
    });
  });

  describe('Property: Email syntax invariants', () => {
    it('validates randomly synthesized well-formed emails', () => {
      const localChars = 'abcdefghijklmnopqrstuvwxyz0123456789_+-';
      const domainLabels = ['com', 'org', 'net', 'io', 'dev', 'example', 'test', 'sub', 'corp'];

      for (let i = 0; i < 150; i++) {
        const localLen = randomInt(1, 20);
        let local = '';
        for (let j = 0; j < localLen; j++) {
          local += localChars[randomInt(0, localChars.length - 1)];
        }

        const l1 = domainLabels[randomInt(0, domainLabels.length - 1)];
        const l2 = domainLabels[randomInt(0, domainLabels.length - 1)];
        const email = `${local}@${l1}.${l2}`;

        const res = validateEmail(email);
        expect(res.valid).toBe(true);
        expect(res.details?.localPart).toBe(local);
        expect(res.details?.domain).toBe(`${l1}.${l2}`);
        expect(isValidEmail(email)).toBe(true);
      }
    });

    it('rejects synthesized emails with injected illegal characters', () => {
      const illegalChars = [' ', '\t', '\n', '@', '"', '(', ')', '[', ']', ';', ':', ','];

      for (let i = 0; i < 100; i++) {
        const badChar = illegalChars[randomInt(0, illegalChars.length - 1)];
        const badEmail = `user${badChar}name@example.com`;
        expect(isValidEmail(badEmail)).toBe(false);
        const res = validateEmail(badEmail);
        expect(res.valid).toBe(false);
      }
    });
  });
});
