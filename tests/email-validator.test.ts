import { describe, expect, it } from 'vitest';
import { isValidEmail, validateEmail } from '../src/email-validator/index.js';

describe('email-validator module', () => {
  describe('Valid email scenarios', () => {
    it('validates common ordinary email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('first.last@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('user_name@example-domain.com')).toBe(true);
      expect(isValidEmail('123456@numbers.com')).toBe(true);
      expect(isValidEmail('customer.service+support_123@sub.domain.co.uk')).toBe(true);
    });

    it('returns structured validation result with normalized address and details', () => {
      const result = validateEmail('User+Tag@Example.COM');
      expect(result.valid).toBe(true);
      // Domain is lowercased; local-part casing is preserved per RFC 5321
      expect(result.normalized).toBe('User+Tag@example.com');
      expect(result.errors).toHaveLength(0);
      expect(result.details).toEqual({
        localPart: 'User+Tag',
        domain: 'example.com',
        tld: 'com',
        isIdn: false,
        isIpDomain: false,
      });
    });

    it('supports internationalized domain names (IDN) by default', () => {
      const result = validateEmail('info@münchen.de');
      expect(result.valid).toBe(true);
      expect(result.details?.isIdn).toBe(true);
      expect(result.details?.domain).toBe('xn--mnchen-3ya.de');
      expect(result.normalized).toBe('info@xn--mnchen-3ya.de');
    });

    it('supports punycode domains directly', () => {
      const result = validateEmail('info@xn--mnchen-3ya.de');
      expect(result.valid).toBe(true);
      expect(result.details?.isIdn).toBe(true);
    });

    it('supports local domains when requireTld is false', () => {
      expect(isValidEmail('admin@localhost')).toBe(false); // default requires TLD
      expect(isValidEmail('admin@localhost', { requireTld: false })).toBe(true);

      const res = validateEmail('admin@localhost', { requireTld: false });
      expect(res.valid).toBe(true);
      expect(res.details?.tld).toBeUndefined();
    });

    it('supports Unicode in local part when allowUnicodeLocalPart is true', () => {
      expect(isValidEmail('dörte@example.com')).toBe(false); // default forbids non-ASCII local part
      expect(isValidEmail('dörte@example.com', { allowUnicodeLocalPart: true })).toBe(true);

      // Even with allowUnicodeLocalPart, illegal characters like spaces or quotes are rejected
      expect(isValidEmail('dörte user@example.com', { allowUnicodeLocalPart: true })).toBe(false);

      const res = validateEmail('dörte@example.com', { allowUnicodeLocalPart: true });
      expect(res.valid).toBe(true);
      expect(res.details?.localPart).toBe('dörte');
    });

    it('supports IPv4 literal domains when allowIpDomain is true', () => {
      expect(isValidEmail('user@[192.168.1.1]')).toBe(false); // default false
      expect(isValidEmail('user@[192.168.1.1]', { allowIpDomain: true })).toBe(true);

      const res = validateEmail('user@[192.168.1.1]', { allowIpDomain: true });
      expect(res.valid).toBe(true);
      expect(res.details?.isIpDomain).toBe(true);
    });
  });

  describe('Invalid email scenarios', () => {
    it('rejects non-string inputs at runtime', () => {
      // @ts-expect-error testing invalid type
      expect(isValidEmail(null)).toBe(false);
      // @ts-expect-error testing invalid type
      expect(isValidEmail(undefined)).toBe(false);
      // @ts-expect-error testing invalid type
      expect(isValidEmail(12345)).toBe(false);
      // @ts-expect-error testing invalid type
      expect(isValidEmail({})).toBe(false);

      // @ts-expect-error testing invalid type
      const res = validateEmail(null);
      expect(res.valid).toBe(false);
      expect(res.errors[0]?.code).toBe('INVALID_TYPE');
      expect(res.normalized).toBeUndefined();
    });

    it('rejects empty and whitespace-only strings', () => {
      expect(validateEmail('').errors[0]?.code).toBe('EMPTY_INPUT');
      expect(validateEmail('   ').errors[0]?.code).toBe('WHITESPACE_SURROUNDING');
    });

    it('rejects surrounding whitespace rather than silently trimming', () => {
      const resLeading = validateEmail(' user@example.com');
      expect(resLeading.valid).toBe(false);
      expect(resLeading.errors[0]?.code).toBe('WHITESPACE_SURROUNDING');

      const resTrailing = validateEmail('user@example.com ');
      expect(resTrailing.valid).toBe(false);
      expect(resTrailing.errors[0]?.code).toBe('WHITESPACE_SURROUNDING');
    });

    it('rejects control characters (newlines, tabs, NUL)', () => {
      expect(validateEmail('user\n@example.com').errors[0]?.code).toBe('CONTROL_CHARACTERS');
      expect(validateEmail('user\t@example.com').errors[0]?.code).toBe('CONTROL_CHARACTERS');
      expect(validateEmail('user\0@example.com').errors[0]?.code).toBe('CONTROL_CHARACTERS');
    });

    it('rejects addresses exceeding 254 characters', () => {
      const longAddress = `${'a'.repeat(60)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(70)}.com`;
      expect(longAddress.length).toBeGreaterThan(254);
      const res = validateEmail(longAddress);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'TOTAL_LENGTH_EXCEEDED')).toBe(true);
    });

    it('rejects missing or multiple @ symbols', () => {
      expect(validateEmail('plainaddress').errors[0]?.code).toBe('MISSING_AT');
      expect(validateEmail('user@@example.com').errors[0]?.code).toBe('MULTIPLE_AT');
      expect(validateEmail('user@domain@example.com').errors[0]?.code).toBe('MULTIPLE_AT');
    });

    describe('Local part rules', () => {
      it('rejects empty local part', () => {
        expect(validateEmail('@example.com').errors[0]?.code).toBe('LOCAL_PART_EMPTY');
      });

      it('rejects local parts exceeding 64 characters', () => {
        const longLocal = `${'a'.repeat(65)}@example.com`;
        const res = validateEmail(longLocal);
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.code === 'LOCAL_PART_TOO_LONG')).toBe(true);
      });

      it('rejects leading, trailing, and consecutive dots in local part', () => {
        expect(validateEmail('.user@example.com').errors.some((e) => e.code === 'LOCAL_PART_LEADING_DOT')).toBe(true);
        expect(validateEmail('user.@example.com').errors.some((e) => e.code === 'LOCAL_PART_TRAILING_DOT')).toBe(true);
        expect(validateEmail('user..name@example.com').errors.some((e) => e.code === 'LOCAL_PART_CONSECUTIVE_DOTS')).toBe(true);
      });

      it('rejects invalid characters in local part', () => {
        expect(validateEmail('user name@example.com').errors.some((e) => e.code === 'LOCAL_PART_INVALID_CHARACTERS')).toBe(true);
        expect(validateEmail('user"name"@example.com').errors.some((e) => e.code === 'LOCAL_PART_INVALID_CHARACTERS')).toBe(true);
        expect(validateEmail('user[name]@example.com').errors.some((e) => e.code === 'LOCAL_PART_INVALID_CHARACTERS')).toBe(true);
      });
    });

    describe('Domain rules', () => {
      it('rejects empty domain', () => {
        expect(validateEmail('user@').errors.some((e) => e.code === 'DOMAIN_EMPTY')).toBe(true);
      });

      it('rejects domains exceeding 255 characters', () => {
        const domainLabels = `${'a'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(20)}.com`;
        expect(domainLabels.length).toBeGreaterThan(255);
        const longDomain = `user@${domainLabels}`;
        const res = validateEmail(longDomain);
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.code === 'DOMAIN_TOO_LONG')).toBe(true);
      });

      it('rejects empty domain labels and consecutive dots', () => {
        expect(validateEmail('user@example..com').errors.some((e) => e.code === 'DOMAIN_LABEL_EMPTY')).toBe(true);
        expect(validateEmail('user@.example.com').errors.some((e) => e.code === 'DOMAIN_LABEL_EMPTY')).toBe(true);
        expect(validateEmail('user@example.com.').errors.some((e) => e.code === 'DOMAIN_LABEL_EMPTY')).toBe(true);
      });

      it('rejects domain labels exceeding 63 characters', () => {
        const res = validateEmail(`user@${'a'.repeat(64)}.com`);
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.code === 'DOMAIN_LABEL_TOO_LONG')).toBe(true);
      });

      it('rejects leading and trailing hyphens in domain labels', () => {
        expect(validateEmail('user@-example.com').errors.some((e) => e.code === 'DOMAIN_LABEL_LEADING_HYPHEN')).toBe(true);
        expect(validateEmail('user@example-.com').errors.some((e) => e.code === 'DOMAIN_LABEL_TRAILING_HYPHEN')).toBe(true);
      });

      it('rejects spaces and invalid characters in domain', () => {
        expect(validateEmail('user@exam ple.com').errors.some((e) => e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
        expect(validateEmail('user@exam!ple.com').errors.some((e) => e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
      });

      it('rejects missing or invalid TLDs', () => {
        expect(validateEmail('user@localhost').errors.some((e) => e.code === 'DOMAIN_MISSING_TLD')).toBe(true);
        expect(validateEmail('user@example.c').errors.some((e) => e.code === 'DOMAIN_INVALID_TLD')).toBe(true);
        expect(validateEmail('user@example.123').errors.some((e) => e.code === 'DOMAIN_INVALID_TLD')).toBe(true);
        expect(validateEmail('user@example.c_m').errors.some((e) => e.code === 'DOMAIN_INVALID_TLD')).toBe(true);
      });

      it('rejects malformed IDN domains when conversion fails', () => {
        const res = validateEmail('user@mün chen.de');
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.code === 'IDN_CONVERSION_FAILED' || e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
      });

      it('rejects IDN when allowIdn is false', () => {
        const res = validateEmail('info@münchen.de', { allowIdn: false });
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
      });

      it('rejects invalid IP domain literals', () => {
        expect(validateEmail('user@[999.999.999.999]', { allowIpDomain: true }).errors.some((e) => e.code === 'IP_DOMAIN_INVALID')).toBe(true);
        expect(validateEmail('user@[192.168.1]', { allowIpDomain: true }).errors.some((e) => e.code === 'IP_DOMAIN_INVALID')).toBe(true);
      });
    });
  });
});
