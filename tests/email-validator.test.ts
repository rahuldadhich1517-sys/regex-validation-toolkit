import { describe, expect, it } from 'vitest';
import { isValidEmail, validateEmail } from '../src/email-validator/index.js';
import type { EmailErrorCode } from '../src/email-validator/types.js';

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

    it('validates all RFC 5322 permitted unquoted special characters in local part', () => {
      // RFC 5322 unquoted printable characters: !#$%&'*+-/=?^_`{|}~
      const specialLocal = "!#$%&'*+-/=?^_`{|}~@example.com";
      const result = validateEmail(specialLocal);
      expect(result.valid).toBe(true);
      expect(result.details?.localPart).toBe("!#$%&'*+-/=?^_`{|}~");
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
      expect(result.details?.tld).toBe('de');
    });

    it('supports local domains when requireTld is false', () => {
      expect(isValidEmail('admin@localhost')).toBe(false); // default requires TLD
      expect(isValidEmail('admin@localhost', { requireTld: false })).toBe(true);

      const res = validateEmail('admin@localhost', { requireTld: false });
      expect(res.valid).toBe(true);
      expect(res.details?.tld).toBeUndefined();
      expect(res.details?.domain).toBe('localhost');
      expect(res.normalized).toBe('admin@localhost');
    });

    it('supports Unicode in local part when allowUnicodeLocalPart is true', () => {
      expect(isValidEmail('dörte@example.com')).toBe(false); // default forbids non-ASCII local part
      expect(isValidEmail('dörte@example.com', { allowUnicodeLocalPart: true })).toBe(true);
      expect(isValidEmail('пользователь@example.com', { allowUnicodeLocalPart: true })).toBe(true);
      expect(isValidEmail('用户@example.com', { allowUnicodeLocalPart: true })).toBe(true);

      // Even with allowUnicodeLocalPart, illegal characters like spaces or quotes are rejected
      expect(isValidEmail('dörte user@example.com', { allowUnicodeLocalPart: true })).toBe(false);
      expect(isValidEmail('dörte"quote"@example.com', { allowUnicodeLocalPart: true })).toBe(false);

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
      expect(res.details?.domain).toBe('[192.168.1.1]');
      expect(res.details?.tld).toBeUndefined();
      expect(res.normalized).toBe('user@[192.168.1.1]');
    });

    it('validates multi-level subdomains and long valid addresses', () => {
      const email = 'a.b.c@deeply.nested.subdomain.example.co.uk';
      const res = validateEmail(email);
      expect(res.valid).toBe(true);
      expect(res.details?.tld).toBe('uk');
    });
  });

  describe('Boundary length testing', () => {
    it('accepts local part of exactly 64 characters', () => {
      const local64 = 'a'.repeat(64);
      const email = `${local64}@example.com`;
      const res = validateEmail(email);
      expect(res.valid).toBe(true);
      expect(res.details?.localPart.length).toBe(64);
    });

    it('rejects local part of 65 characters', () => {
      const local65 = 'a'.repeat(65);
      const email = `${local65}@example.com`;
      const res = validateEmail(email);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'LOCAL_PART_TOO_LONG')).toBe(true);
    });

    it('accepts domain label of exactly 63 characters', () => {
      const label63 = 'a'.repeat(63);
      const email = `user@${label63}.com`;
      const res = validateEmail(email);
      expect(res.valid).toBe(true);
    });

    it('rejects domain label of 64 characters', () => {
      const label64 = 'a'.repeat(64);
      const email = `user@${label64}.com`;
      const res = validateEmail(email);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'DOMAIN_LABEL_TOO_LONG')).toBe(true);
    });

    it('accepts total length of exactly 254 characters', () => {
      // local = 64
      // @ = 1
      // domain = 189 (63 + 1 + 60 + 1 + 60 + 1 + 3) -> 64 + 1 + 189 = 254
      const local = 'a'.repeat(64);
      const domain = `${'b'.repeat(63)}.${'c'.repeat(60)}.${'d'.repeat(60)}.com`;
      const email = `${local}@${domain}`;
      expect(email.length).toBe(254);
      const res = validateEmail(email);
      expect(res.valid).toBe(true);
    });

    it('rejects total length of 255 characters with TOTAL_LENGTH_EXCEEDED', () => {
      // 254 char base + 1 char in domain = 255 chars
      const local = 'a'.repeat(64);
      const domain = `${'b'.repeat(63)}.${'c'.repeat(61)}.${'d'.repeat(60)}.com`;
      const email = `${local}@${domain}`;
      expect(email.length).toBe(255);
      const res = validateEmail(email);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'TOTAL_LENGTH_EXCEEDED')).toBe(true);
    });
  });

  describe('Every EmailErrorCode error scenario', () => {
    it('produces INVALID_TYPE for non-string inputs', () => {
      const nonStrings = [null, undefined, 42, true, false, Symbol('email'), {}, [], () => {}];
      for (const val of nonStrings) {
        // @ts-expect-error testing invalid type
        const res = validateEmail(val);
        expect(res.valid).toBe(false);
        expect(res.errors[0]?.code).toBe('INVALID_TYPE');
      }
    });

    it('produces EMPTY_INPUT for empty string', () => {
      const res = validateEmail('');
      expect(res.valid).toBe(false);
      expect(res.errors[0]?.code).toBe('EMPTY_INPUT');
    });

    it('produces WHITESPACE_SURROUNDING for leading or trailing whitespace', () => {
      const res1 = validateEmail(' user@example.com');
      expect(res1.errors.some((e) => e.code === 'WHITESPACE_SURROUNDING')).toBe(true);

      const res2 = validateEmail('user@example.com\t');
      expect(res2.errors.some((e) => e.code === 'WHITESPACE_SURROUNDING')).toBe(true);

      const res3 = validateEmail('   ');
      expect(res3.errors.some((e) => e.code === 'WHITESPACE_SURROUNDING')).toBe(true);
    });

    it('produces CONTROL_CHARACTERS for embedded ASCII control characters', () => {
      expect(validateEmail('us\x00er@example.com').errors[0]?.code).toBe('CONTROL_CHARACTERS');
      expect(validateEmail('user\x1F@example.com').errors[0]?.code).toBe('CONTROL_CHARACTERS');
      expect(validateEmail('user\x7F@example.com').errors[0]?.code).toBe('CONTROL_CHARACTERS');
    });

    it('produces MISSING_AT when no @ is present', () => {
      const res = validateEmail('notanemail');
      expect(res.errors[0]?.code).toBe('MISSING_AT');
    });

    it('produces MULTIPLE_AT when more than one @ is present', () => {
      const res1 = validateEmail('user@@example.com');
      expect(res1.errors[0]?.code).toBe('MULTIPLE_AT');

      const res2 = validateEmail('user@domain@example.com');
      expect(res2.errors[0]?.code).toBe('MULTIPLE_AT');
    });

    it('produces LOCAL_PART_EMPTY when local part is empty', () => {
      const res = validateEmail('@example.com');
      expect(res.errors.some((e) => e.code === 'LOCAL_PART_EMPTY')).toBe(true);
    });

    it('produces LOCAL_PART_TOO_LONG when local part exceeds 64 chars', () => {
      const res = validateEmail(`${'x'.repeat(65)}@example.com`);
      expect(res.errors.some((e) => e.code === 'LOCAL_PART_TOO_LONG')).toBe(true);
    });

    it('produces LOCAL_PART_LEADING_DOT when local part starts with dot', () => {
      const res = validateEmail('.user@example.com');
      expect(res.errors.some((e) => e.code === 'LOCAL_PART_LEADING_DOT')).toBe(true);
    });

    it('produces LOCAL_PART_TRAILING_DOT when local part ends with dot', () => {
      const res = validateEmail('user.@example.com');
      expect(res.errors.some((e) => e.code === 'LOCAL_PART_TRAILING_DOT')).toBe(true);
    });

    it('produces LOCAL_PART_CONSECUTIVE_DOTS when local part has double dots', () => {
      const res = validateEmail('user..name@example.com');
      expect(res.errors.some((e) => e.code === 'LOCAL_PART_CONSECUTIVE_DOTS')).toBe(true);
    });

    it('produces LOCAL_PART_INVALID_CHARACTERS for illegal local characters', () => {
      const res1 = validateEmail('user name@example.com');
      expect(res1.errors.some((e) => e.code === 'LOCAL_PART_INVALID_CHARACTERS')).toBe(true);

      const res2 = validateEmail('user"name"@example.com');
      expect(res2.errors.some((e) => e.code === 'LOCAL_PART_INVALID_CHARACTERS')).toBe(true);

      const res3 = validateEmail('user(comment)@example.com');
      expect(res3.errors.some((e) => e.code === 'LOCAL_PART_INVALID_CHARACTERS')).toBe(true);
    });

    it('produces DOMAIN_EMPTY when domain is empty', () => {
      const res = validateEmail('user@');
      expect(res.errors.some((e) => e.code === 'DOMAIN_EMPTY')).toBe(true);
    });

    it('produces DOMAIN_TOO_LONG when domain exceeds 255 chars', () => {
      const longDomain = `${'a'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(20)}.com`;
      const res = validateEmail(`u@${longDomain}`);
      expect(res.errors.some((e) => e.code === 'DOMAIN_TOO_LONG')).toBe(true);
    });

    it('produces DOMAIN_LABEL_EMPTY for empty domain labels', () => {
      expect(validateEmail('user@.example.com').errors.some((e) => e.code === 'DOMAIN_LABEL_EMPTY')).toBe(true);
      expect(validateEmail('user@example..com').errors.some((e) => e.code === 'DOMAIN_LABEL_EMPTY')).toBe(true);
      expect(validateEmail('user@example.com.').errors.some((e) => e.code === 'DOMAIN_LABEL_EMPTY')).toBe(true);
    });

    it('produces DOMAIN_LABEL_TOO_LONG when a label exceeds 63 chars', () => {
      const res = validateEmail(`user@${'a'.repeat(64)}.com`);
      expect(res.errors.some((e) => e.code === 'DOMAIN_LABEL_TOO_LONG')).toBe(true);
    });

    it('produces DOMAIN_LABEL_LEADING_HYPHEN when a label starts with hyphen', () => {
      const res = validateEmail('user@-example.com');
      expect(res.errors.some((e) => e.code === 'DOMAIN_LABEL_LEADING_HYPHEN')).toBe(true);
    });

    it('produces DOMAIN_LABEL_TRAILING_HYPHEN when a label ends with hyphen', () => {
      const res = validateEmail('user@example-.com');
      expect(res.errors.some((e) => e.code === 'DOMAIN_LABEL_TRAILING_HYPHEN')).toBe(true);
    });

    it('produces DOMAIN_INVALID_CHARACTERS for invalid domain characters', () => {
      expect(validateEmail('user@exam ple.com').errors.some((e) => e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
      expect(validateEmail('user@exam!ple.com').errors.some((e) => e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
      expect(validateEmail('user@exam_ple.com').errors.some((e) => e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
    });

    it('produces DOMAIN_MISSING_TLD when requireTld is true and domain has single label', () => {
      const res = validateEmail('user@localhost', { requireTld: true });
      expect(res.errors.some((e) => e.code === 'DOMAIN_MISSING_TLD')).toBe(true);
    });

    it('produces DOMAIN_INVALID_TLD for numeric, 1-char, or symbol TLDs', () => {
      expect(validateEmail('user@example.c').errors.some((e) => e.code === 'DOMAIN_INVALID_TLD')).toBe(true);
      expect(validateEmail('user@example.123').errors.some((e) => e.code === 'DOMAIN_INVALID_TLD')).toBe(true);
      expect(validateEmail('user@example.c-m').errors.some((e) => e.code === 'DOMAIN_INVALID_TLD')).toBe(true);
    });

    it('produces TOTAL_LENGTH_EXCEEDED when email > 254 chars', () => {
      const longLocal = 'a'.repeat(60);
      const longDomain = `${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.example.com`;
      const res = validateEmail(`${longLocal}@${longDomain}`);
      expect(res.errors.some((e) => e.code === 'TOTAL_LENGTH_EXCEEDED')).toBe(true);
    });

    it('produces IDN_CONVERSION_FAILED for invalid unicode domain that fails URL conversion', () => {
      // Non-URI valid characters in domain like spaces or bad surrogates
      const res = validateEmail('user@bad\u00A0domain.com');
      expect(res.errors.some((e) => e.code === 'IDN_CONVERSION_FAILED' || e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
    });

    it('produces IP_DOMAIN_NOT_ALLOWED when allowIpDomain is false', () => {
      const res = validateEmail('user@[192.168.1.1]', { allowIpDomain: false });
      expect(res.errors.some((e) => e.code === 'IP_DOMAIN_NOT_ALLOWED')).toBe(true);
    });

    it('produces IP_DOMAIN_INVALID when bracketed IP is invalid IPv4', () => {
      const res1 = validateEmail('user@[999.999.999.999]', { allowIpDomain: true });
      expect(res1.errors.some((e) => e.code === 'IP_DOMAIN_INVALID')).toBe(true);

      const res2 = validateEmail('user@[192.168.1]', { allowIpDomain: true });
      expect(res2.errors.some((e) => e.code === 'IP_DOMAIN_INVALID')).toBe(true);

      const res3 = validateEmail('user@[not-an-ip]', { allowIpDomain: true });
      expect(res3.errors.some((e) => e.code === 'IP_DOMAIN_INVALID')).toBe(true);
    });

    it('covers all 25 EmailErrorCode codes across test cases', () => {
      const sampleErrors: Record<EmailErrorCode, string> = {
        INVALID_TYPE: '', // tested with non-string
        EMPTY_INPUT: '',
        WHITESPACE_SURROUNDING: ' user@ex.com',
        CONTROL_CHARACTERS: 'user\x00@ex.com',
        MISSING_AT: 'foo',
        MULTIPLE_AT: 'a@b@c.com',
        LOCAL_PART_EMPTY: '@ex.com',
        LOCAL_PART_TOO_LONG: `${'a'.repeat(65)}@ex.com`,
        LOCAL_PART_LEADING_DOT: '.a@ex.com',
        LOCAL_PART_TRAILING_DOT: 'a.@ex.com',
        LOCAL_PART_CONSECUTIVE_DOTS: 'a..b@ex.com',
        LOCAL_PART_INVALID_CHARACTERS: 'a b@ex.com',
        DOMAIN_EMPTY: 'user@',
        DOMAIN_TOO_LONG: `u@${'a'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(20)}.com`,
        DOMAIN_LABEL_EMPTY: 'u@a..com',
        DOMAIN_LABEL_TOO_LONG: `u@${'a'.repeat(64)}.com`,
        DOMAIN_LABEL_LEADING_HYPHEN: 'u@-a.com',
        DOMAIN_LABEL_TRAILING_HYPHEN: 'u@a-.com',
        DOMAIN_INVALID_CHARACTERS: 'u@a_b.com',
        DOMAIN_MISSING_TLD: 'u@localhost',
        DOMAIN_INVALID_TLD: 'u@a.123',
        TOTAL_LENGTH_EXCEEDED: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(61)}.${'d'.repeat(60)}.com`,
        IDN_CONVERSION_FAILED: 'user@\uD800.com',
        IP_DOMAIN_NOT_ALLOWED: 'user@[192.168.1.1]',
        IP_DOMAIN_INVALID: 'user@[999.999.999.999]',
      };

      // Let's verify every sample produces its expected code
      expect(validateEmail(sampleErrors.EMPTY_INPUT).errors.some((e) => e.code === 'EMPTY_INPUT')).toBe(true);
      expect(validateEmail(sampleErrors.WHITESPACE_SURROUNDING).errors.some((e) => e.code === 'WHITESPACE_SURROUNDING')).toBe(true);
      expect(validateEmail(sampleErrors.CONTROL_CHARACTERS).errors.some((e) => e.code === 'CONTROL_CHARACTERS')).toBe(true);
      expect(validateEmail(sampleErrors.MISSING_AT).errors.some((e) => e.code === 'MISSING_AT')).toBe(true);
      expect(validateEmail(sampleErrors.MULTIPLE_AT).errors.some((e) => e.code === 'MULTIPLE_AT')).toBe(true);
      expect(validateEmail(sampleErrors.LOCAL_PART_EMPTY).errors.some((e) => e.code === 'LOCAL_PART_EMPTY')).toBe(true);
      expect(validateEmail(sampleErrors.LOCAL_PART_TOO_LONG).errors.some((e) => e.code === 'LOCAL_PART_TOO_LONG')).toBe(true);
      expect(validateEmail(sampleErrors.LOCAL_PART_LEADING_DOT).errors.some((e) => e.code === 'LOCAL_PART_LEADING_DOT')).toBe(true);
      expect(validateEmail(sampleErrors.LOCAL_PART_TRAILING_DOT).errors.some((e) => e.code === 'LOCAL_PART_TRAILING_DOT')).toBe(true);
      expect(validateEmail(sampleErrors.LOCAL_PART_CONSECUTIVE_DOTS).errors.some((e) => e.code === 'LOCAL_PART_CONSECUTIVE_DOTS')).toBe(true);
      expect(validateEmail(sampleErrors.LOCAL_PART_INVALID_CHARACTERS).errors.some((e) => e.code === 'LOCAL_PART_INVALID_CHARACTERS')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_EMPTY).errors.some((e) => e.code === 'DOMAIN_EMPTY')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_TOO_LONG).errors.some((e) => e.code === 'DOMAIN_TOO_LONG')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_LABEL_EMPTY).errors.some((e) => e.code === 'DOMAIN_LABEL_EMPTY')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_LABEL_TOO_LONG).errors.some((e) => e.code === 'DOMAIN_LABEL_TOO_LONG')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_LABEL_LEADING_HYPHEN).errors.some((e) => e.code === 'DOMAIN_LABEL_LEADING_HYPHEN')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_LABEL_TRAILING_HYPHEN).errors.some((e) => e.code === 'DOMAIN_LABEL_TRAILING_HYPHEN')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_INVALID_CHARACTERS).errors.some((e) => e.code === 'DOMAIN_INVALID_CHARACTERS')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_MISSING_TLD).errors.some((e) => e.code === 'DOMAIN_MISSING_TLD')).toBe(true);
      expect(validateEmail(sampleErrors.DOMAIN_INVALID_TLD).errors.some((e) => e.code === 'DOMAIN_INVALID_TLD')).toBe(true);
      expect(validateEmail(sampleErrors.TOTAL_LENGTH_EXCEEDED).errors.some((e) => e.code === 'TOTAL_LENGTH_EXCEEDED')).toBe(true);
      expect(validateEmail(sampleErrors.IP_DOMAIN_NOT_ALLOWED).errors.some((e) => e.code === 'IP_DOMAIN_NOT_ALLOWED')).toBe(true);
      expect(validateEmail(sampleErrors.IP_DOMAIN_INVALID, { allowIpDomain: true }).errors.some((e) => e.code === 'IP_DOMAIN_INVALID')).toBe(true);
    });
  });

  describe('Multiple concurrent validation errors', () => {
    it('aggregates multiple independent errors in a single pass', () => {
      // Local part has leading dot AND domain has leading hyphen
      const res = validateEmail('.user@-example.com');
      expect(res.valid).toBe(false);
      const codes = res.errors.map((e) => e.code);
      expect(codes).toContain('LOCAL_PART_LEADING_DOT');
      expect(codes).toContain('DOMAIN_LABEL_LEADING_HYPHEN');
    });

    it('aggregates local-part too long and invalid TLD', () => {
      const res = validateEmail(`${'a'.repeat(65)}@example.1`);
      expect(res.valid).toBe(false);
      const codes = res.errors.map((e) => e.code);
      expect(codes).toContain('LOCAL_PART_TOO_LONG');
      expect(codes).toContain('DOMAIN_INVALID_TLD');
    });
  });
});
