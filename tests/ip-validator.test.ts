import { describe, expect, it } from 'vitest';
import {
  formatCanonicalIPv6,
  isIP,
  isIPv4,
  isIPv4Address,
  isIPv6,
  isIPv6Address,
  parseIPv4,
  parseIPv6,
  validateIP,
} from '../src/ip-validator/index.js';

describe('ip-validator module', () => {
  describe('IPv4 validation', () => {
    it('validates standard IPv4 addresses', () => {
      expect(isIPv4('0.0.0.0')).toBe(true);
      expect(isIPv4('127.0.0.1')).toBe(true);
      expect(isIPv4('192.168.1.1')).toBe(true);
      expect(isIPv4('255.255.255.255')).toBe(true);
      expect(isIPv4('10.254.0.99')).toBe(true);
      expect(isIPv4Address('172.16.0.1')).toBe(true);
    });

    it('rejects invalid octet numbers (> 255, negative)', () => {
      expect(isIPv4('256.0.0.1')).toBe(false);
      expect(isIPv4('192.168.1.300')).toBe(false);
      expect(isIPv4('192.168.1.-1')).toBe(false);
    });

    it('rejects leading zeros in IPv4 octets to avoid octal confusion', () => {
      expect(isIPv4('01.02.03.04')).toBe(false);
      expect(isIPv4('192.168.01.1')).toBe(false);
      expect(isIPv4('00.0.0.0')).toBe(false);
      // '0' by itself is valid
      expect(isIPv4('0.0.0.0')).toBe(true);
      expect(isIPv4('10.0.0.1')).toBe(true);
    });

    it('rejects incorrect octet counts (too few or too many)', () => {
      expect(isIPv4('127.0.0')).toBe(false);
      expect(isIPv4('127.1')).toBe(false);
      expect(isIPv4('192.168.1.1.1')).toBe(false);
    });

    it('rejects empty octets, leading/trailing dots, spaces, and signs', () => {
      expect(isIPv4('192..1.1')).toBe(false);
      expect(isIPv4('.192.168.1.1')).toBe(false);
      expect(isIPv4('192.168.1.1.')).toBe(false);
      expect(isIPv4(' 192.168.1.1')).toBe(false);
      expect(isIPv4('192.168.1.1 ')).toBe(false);
      expect(isIPv4('+192.168.1.1')).toBe(false);
      expect(isIPv4('192.168.1.a')).toBe(false);
    });

    it('classifies special IPv4 ranges correctly', () => {
      // Loopback
      expect(validateIP('127.0.0.1').details?.isLoopback).toBe(true);
      expect(validateIP('127.128.0.5').details?.isLoopback).toBe(true);
      expect(validateIP('192.168.1.1').details?.isLoopback).toBe(false);

      // Private (RFC 1918 + Carrier-grade NAT)
      expect(validateIP('10.0.0.1').details?.isPrivate).toBe(true);
      expect(validateIP('172.16.5.10').details?.isPrivate).toBe(true);
      expect(validateIP('172.31.255.255').details?.isPrivate).toBe(true);
      expect(validateIP('172.32.0.1').details?.isPrivate).toBe(false);
      expect(validateIP('192.168.1.100').details?.isPrivate).toBe(true);
      expect(validateIP('100.64.0.1').details?.isPrivate).toBe(true); // CGNAT
      expect(validateIP('8.8.8.8').details?.isPrivate).toBe(false);

      // Link-local (169.254.0.0/16)
      expect(validateIP('169.254.1.2').details?.isLinkLocal).toBe(true);
      expect(validateIP('169.255.1.2').details?.isLinkLocal).toBe(false);

      // Multicast (224.0.0.0 - 239.255.255.255)
      expect(validateIP('224.0.0.1').details?.isMulticast).toBe(true);
      expect(validateIP('239.255.255.255').details?.isMulticast).toBe(true);
      expect(validateIP('240.0.0.1').details?.isMulticast).toBe(false);

      // Unspecified
      expect(validateIP('0.0.0.0').details?.isUnspecified).toBe(true);
      expect(validateIP('0.0.0.1').details?.isUnspecified).toBe(false);

      // Broadcast
      expect(validateIP('255.255.255.255').details?.isBroadcast).toBe(true);
      expect(validateIP('255.255.255.254').details?.isBroadcast).toBe(false);
    });
  });

  describe('IPv6 validation', () => {
    it('validates full 8-group IPv6 addresses', () => {
      expect(isIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isIPv6('fe80:0000:0000:0000:0202:b3ff:fe1e:8329')).toBe(true);
      expect(isIPv6Address('0:0:0:0:0:0:0:0')).toBe(true);
      expect(isIPv6Address('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('validates compressed IPv6 addresses using "::"', () => {
      expect(isIPv6('::1')).toBe(true);
      expect(isIPv6('::')).toBe(true);
      expect(isIPv6('2001:db8::1')).toBe(true);
      expect(isIPv6('2001:db8::')).toBe(true);
      expect(isIPv6('::1234:5678')).toBe(true);
    });

    it('rejects multiple "::" compression markers', () => {
      expect(isIPv6('2001::db8::1')).toBe(false);
      expect(isIPv6('::1::')).toBe(false);
      expect(validateIP('2001::db8::1').errors[0]?.code).toBe('INVALID_IPV6_MULTIPLE_COMPRESSION');
    });

    it('rejects invalid group counts', () => {
      // 9 groups
      expect(isIPv6('1:2:3:4:5:6:7:8:9')).toBe(false);
      // 7 groups without compression
      expect(isIPv6('1:2:3:4:5:6:7')).toBe(false);
      // 8 groups WITH compression (too many)
      expect(isIPv6('1:2:3:4:5:6:7::8')).toBe(false);
    });

    it('rejects invalid group lengths and non-hex characters', () => {
      expect(isIPv6('2001:00db8::1')).toBe(false); // 5 hex digits in compressed
      expect(isIPv6('1:2:3:4:5:6:7:00000')).toBe(false); // 5 hex digits in uncompressed
      expect(isIPv6('2001:ghij::1')).toBe(false); // non-hex
      expect(isIPv6('2001:db8:::1')).toBe(false); // 3 colons
      expect(isIPv6('1:2:3:4:5:6:7:gggg')).toBe(false); // non-hex in uncompressed
      expect(isIPv6('1:2:3:4:5:6:7:')).toBe(false); // empty group
    });

    it('validates IPv4-mapped IPv6 addresses', () => {
      expect(isIPv6('::ffff:192.168.1.1')).toBe(true);
      expect(isIPv6('0:0:0:0:0:ffff:192.168.1.1')).toBe(true);

      const res = validateIP('::ffff:192.168.1.1');
      expect(res.valid).toBe(true);
      expect(res.details?.isIPv4Mapped).toBe(true);
      expect(res.normalized).toBe('::ffff:192.168.1.1');

      // Invalid IPv4 part
      expect(isIPv6('::ffff:999.999.999.999')).toBe(false);
      expect(isIPv6('::ffff:01.02.03.04')).toBe(false);
    });

    it('handles IPv6 Scope IDs / zone indices when allowZoneId is configured', () => {
      expect(isIPv6('fe80::1%eth0')).toBe(false); // default false
      expect(validateIP('fe80::1%eth0').valid).toBe(false);
      expect(validateIP('fe80::1%eth0').errors[0]?.code).toBe('ZONE_ID_NOT_ALLOWED');

      const res = validateIP('fe80::1%eth0', { allowZoneId: true });
      expect(res.valid).toBe(true);
      expect(res.details?.zoneId).toBe('eth0');
      expect(res.normalized).toBe('fe80::1%eth0');

      // Invalid zone id (empty or weird characters)
      expect(validateIP('fe80::1%', { allowZoneId: true }).valid).toBe(false);
    });

    it('implements RFC 5952 canonical IPv6 normalization', () => {
      // Lowercase hex and omit leading zeros in groups
      expect(formatCanonicalIPv6([0x2001, 0x0db8, 0, 0, 0, 0, 0x1428, 0x57ab])).toBe('2001:db8::1428:57ab');

      // All zeros -> ::
      expect(formatCanonicalIPv6([0, 0, 0, 0, 0, 0, 0, 0])).toBe('::');

      // Loopback -> ::1
      expect(formatCanonicalIPv6([0, 0, 0, 0, 0, 0, 0, 1])).toBe('::1');

      // Single zero is NOT compressed per RFC 5952 section 4.2.2
      expect(formatCanonicalIPv6([1, 2, 0, 4, 5, 6, 7, 8])).toBe('1:2:0:4:5:6:7:8');

      // First run tie-breaking: when equal length, compress the first one
      expect(formatCanonicalIPv6([0x2001, 0xdb8, 0, 0, 1, 0, 0, 1])).toBe('2001:db8::1:0:0:1');
    });

    it('classifies special IPv6 ranges correctly', () => {
      // Loopback (::1)
      expect(validateIP('::1').details?.isLoopback).toBe(true);
      expect(validateIP('2001:db8::1').details?.isLoopback).toBe(false);

      // Unspecified (::)
      expect(validateIP('::').details?.isUnspecified).toBe(true);
      expect(validateIP('::1').details?.isUnspecified).toBe(false);

      // Link-local (fe80::/10)
      expect(validateIP('fe80::1').details?.isLinkLocal).toBe(true);
      expect(validateIP('fec0::1').details?.isLinkLocal).toBe(false);

      // Multicast (ff00::/8)
      expect(validateIP('ff02::1').details?.isMulticast).toBe(true);
      expect(validateIP('2001:db8::1').details?.isMulticast).toBe(false);

      // Private / Unique Local Address ULA (fc00::/7 -> fc00 to fdff)
      expect(validateIP('fc00::1').details?.isPrivate).toBe(true);
      expect(validateIP('fd12:3456:789a::1').details?.isPrivate).toBe(true);
      expect(validateIP('2001:db8::1').details?.isPrivate).toBe(false);
    });
  });

  describe('isIP and validateIP general behaviors', () => {
    it('isIP returns 4 for IPv4, 6 for IPv6, and 0 for invalid inputs', () => {
      expect(isIP('192.168.1.1')).toBe(4);
      expect(isIP('2001:db8::1')).toBe(6);
      expect(isIP('not-an-ip')).toBe(0);
      expect(isIP(null)).toBe(0);
      expect(isIP(undefined)).toBe(0);
      expect(isIP(12345)).toBe(0);
    });

    it('rejects surrounding whitespace without silent trimming', () => {
      expect(validateIP(' 192.168.1.1').valid).toBe(false);
      expect(validateIP(' 192.168.1.1').errors[0]?.code).toBe('WHITESPACE_SURROUNDING');
      expect(validateIP('2001:db8::1 ').valid).toBe(false);
      expect(validateIP('2001:db8::1 ').errors[0]?.code).toBe('WHITESPACE_SURROUNDING');
    });

    it('rejects empty inputs and non-string inputs', () => {
      // @ts-expect-error testing invalid type
      expect(validateIP(null).errors[0]?.code).toBe('INVALID_TYPE');
      expect(validateIP('').errors[0]?.code).toBe('EMPTY_INPUT');
    });

    describe('CIDR prefix validation', () => {
      it('rejects CIDR prefix notation by default', () => {
        expect(isIPv4('192.168.1.0/24')).toBe(false);
        expect(isIPv6('fe80::/64')).toBe(false);
        expect(validateIP('192.168.1.0/24').errors[0]?.code).toBe('CIDR_NOT_ALLOWED');
      });

      it('accepts valid CIDR prefixes when allowCidr is true', () => {
        const v4Res = validateIP('192.168.1.0/24', { allowCidr: true });
        expect(v4Res.valid).toBe(true);
        expect(v4Res.version).toBe(4);
        expect(v4Res.details?.cidrPrefix).toBe(24);
        expect(v4Res.normalized).toBe('192.168.1.0/24');

        const v6Res = validateIP('2001:db8::/32', { allowCidr: true });
        expect(v6Res.valid).toBe(true);
        expect(v6Res.version).toBe(6);
        expect(v6Res.details?.cidrPrefix).toBe(32);
        expect(v6Res.normalized).toBe('2001:db8::/32');
      });

      it('rejects out of bounds CIDR prefixes', () => {
        expect(validateIP('192.168.1.0/33', { allowCidr: true }).errors[0]?.code).toBe('INVALID_CIDR_PREFIX');
        expect(validateIP('192.168.1.0/-1', { allowCidr: true }).errors[0]?.code).toBe('INVALID_CIDR_PREFIX');
        expect(validateIP('192.168.1.0/abc', { allowCidr: true }).errors[0]?.code).toBe('INVALID_CIDR_PREFIX');
        expect(validateIP('2001:db8::/129', { allowCidr: true }).errors[0]?.code).toBe('INVALID_CIDR_PREFIX');
      });
    });

    describe('Version enforcement option', () => {
      it('enforces IPv4 when version: 4', () => {
        expect(validateIP('192.168.1.1', { version: 4 }).valid).toBe(true);
        const res = validateIP('2001:db8::1', { version: 4 });
        expect(res.valid).toBe(false);
        expect(res.version).toBe(4);
      });

      it('enforces IPv6 when version: 6', () => {
        expect(validateIP('2001:db8::1', { version: 6 }).valid).toBe(true);
        const res = validateIP('192.168.1.1', { version: 6 });
        expect(res.valid).toBe(false);
        expect(res.version).toBe(6);
      });
    });
  });
});
