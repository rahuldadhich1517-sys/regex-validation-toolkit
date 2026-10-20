import { parseIPv4 } from './ipv4.js';
import type { IPValidationError } from './types.js';

export interface ParsedIPv6 {
  words: [number, number, number, number, number, number, number, number];
  normalized: string;
  isIPv4Mapped: boolean;
  zoneId?: string | undefined;
}

/**
 * Finds the longest run of consecutive 16-bit zeros for RFC 5952 compression.
 */
function findLongestZeroRun(words: number[]): { start: number; length: number } {
  let bestStart = -1;
  let bestLen = 0;
  let currentStart = -1;
  let currentLen = 0;

  for (let i = 0; i < words.length; i++) {
    if (words[i] === 0) {
      if (currentStart === -1) {
        currentStart = i;
        currentLen = 1;
      } else {
        currentLen++;
      }
    } else {
      if (currentStart !== -1) {
        if (currentLen > bestLen) {
          bestLen = currentLen;
          bestStart = currentStart;
        }
        currentStart = -1;
        currentLen = 0;
      }
    }
  }

  if (currentStart !== -1 && currentLen > bestLen) {
    bestLen = currentLen;
    bestStart = currentStart;
  }

  return { start: bestStart, length: bestLen };
}

/**
 * Converts 8 16-bit words into RFC 5952 canonical IPv6 text representation.
 */
export function formatCanonicalIPv6(
  words: [number, number, number, number, number, number, number, number],
  isIPv4Mapped?: boolean,
): string {
  // If IPv4 mapped address (::ffff:x.x.x.x)
  if (isIPv4Mapped) {
    const o0 = (words[6]! >> 8) & 0xff;
    const o1 = words[6]! & 0xff;
    const o2 = (words[7]! >> 8) & 0xff;
    const o3 = words[7]! & 0xff;
    return `::ffff:${o0}.${o1}.${o2}.${o3}`;
  }

  const { start, length } = findLongestZeroRun(words);

  // RFC 5952 Section 4.2.2: Do not use :: to shorten just one 16-bit 0 field
  if (length < 2) {
    return words.map((w) => w.toString(16)).join(':');
  }

  // All zeros
  if (length === 8) {
    return '::';
  }

  const left = words.slice(0, start).map((w) => w.toString(16)).join(':');
  const right = words.slice(start + length).map((w) => w.toString(16)).join(':');

  return `${left}::${right}`;
}

/**
 * Validates and parses an IPv6 address string into its eight 16-bit numerical groups.
 */
export function parseIPv6(
  input: string,
  options?: { allowZoneId?: boolean | undefined },
): { parsed?: ParsedIPv6; errors: IPValidationError[] } {
  const errors: IPValidationError[] = [];

  let address = input;
  let zoneId: string | undefined;

  // Handle Zone ID / Scope ID (%eth0)
  if (address.includes('%')) {
    const percentIndex = address.indexOf('%');
    zoneId = address.slice(percentIndex + 1);
    address = address.slice(0, percentIndex);

    if (!options?.allowZoneId) {
      errors.push({
        code: 'ZONE_ID_NOT_ALLOWED',
        message: 'IPv6 Scope ID (zone index) is not allowed by current options',
      });
      return { errors };
    }

    if (zoneId.length === 0 || !/^[a-zA-Z0-9._-]+$/.test(zoneId)) {
      errors.push({
        code: 'INVALID_ZONE_ID',
        message: `Invalid IPv6 Scope ID: "${zoneId}"`,
      });
      return { errors };
    }
  }

  // Check for multiple compression "::"
  const doubleColonCount = (address.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    errors.push({
      code: 'INVALID_IPV6_MULTIPLE_COMPRESSION',
      message: 'IPv6 address cannot contain multiple "::" compression markers',
    });
    return { errors };
  }

  // Check for IPv4-mapped IPv6 (ends with dotted-decimal e.g. ::ffff:192.168.1.1)
  let isIPv4Mapped = false;
  let ipv4Words: [number, number] | undefined;

  if (address.includes('.')) {
    const lastColon = address.lastIndexOf(':');
    if (lastColon === -1) {
      errors.push({
        code: 'INVALID_IPV6_FORMAT',
        message: 'Invalid IPv6 format',
      });
      return { errors };
    }
    const ipv4Str = address.slice(lastColon + 1);
    const { parsed: parsed4, errors: ipv4Errors } = parseIPv4(ipv4Str);
    if (!parsed4 || ipv4Errors.length > 0) {
      errors.push({
        code: 'INVALID_IPV4_MAPPED_IPV6',
        message: `Invalid IPv4 portion in mapped IPv6 address: "${ipv4Str}"`,
      });
      return { errors };
    }

    // Convert 4 octets into 2 16-bit words
    const w6 = (parsed4.octets[0] << 8) | parsed4.octets[1];
    const w7 = (parsed4.octets[2] << 8) | parsed4.octets[3];
    ipv4Words = [w6, w7];

    // Address prefix before IPv4
    address = address.slice(0, lastColon);
    if (address.endsWith(':') && !address.endsWith('::')) {
      // e.g. "::ffff:" -> "::ffff"
      address = address.slice(0, -1);
    }
  }

  const targetLength = ipv4Words ? 6 : 8;
  const words: number[] = [];

  if (doubleColonCount === 1) {
    const parts = address.split('::');
    const leftStr = parts[0]!;
    const rightStr = parts[1]!;

    const leftGroups = leftStr.length > 0 ? leftStr.split(':') : [];
    const rightGroups = rightStr.length > 0 ? rightStr.split(':') : [];

    const explicitCount = leftGroups.length + rightGroups.length;
    if (explicitCount >= targetLength) {
      errors.push({
        code: 'INVALID_IPV6_GROUP_COUNT',
        message: `Too many groups in compressed IPv6 address (got ${explicitCount}, expected < ${targetLength})`,
      });
      return { errors };
    }

    for (const group of [...leftGroups, ...rightGroups]) {
      if (group.length === 0) {
        errors.push({
          code: 'INVALID_IPV6_FORMAT',
          message: 'IPv6 address contains consecutive colons other than "::"',
        });
        return { errors };
      }
      if (group.length > 4) {
        errors.push({
          code: 'INVALID_IPV6_GROUP_LENGTH',
          message: `IPv6 group "${group}" exceeds maximum of 4 hexadecimal digits`,
        });
        return { errors };
      }
      if (!/^[0-9a-fA-F]+$/.test(group)) {
        errors.push({
          code: 'INVALID_IPV6_NON_HEX',
          message: `IPv6 group "${group}" contains non-hexadecimal characters`,
        });
        return { errors };
      }
    }

    const leftWords = leftGroups.map((g) => parseInt(g, 16));
    const rightWords = rightGroups.map((g) => parseInt(g, 16));
    const missingZeros = targetLength - explicitCount;

    words.push(...leftWords, ...new Array(missingZeros).fill(0), ...rightWords);
  } else {
    // No compression
    const groups = address.split(':');
    if (groups.length !== targetLength) {
      errors.push({
        code: 'INVALID_IPV6_GROUP_COUNT',
        message: `IPv6 address without "::" must contain exactly ${targetLength} groups, got ${groups.length}`,
      });
      return { errors };
    }

    for (const group of groups) {
      if (group.length === 0) {
        errors.push({
          code: 'INVALID_IPV6_FORMAT',
          message: 'IPv6 address contains empty group',
        });
        return { errors };
      }
      if (group.length > 4) {
        errors.push({
          code: 'INVALID_IPV6_GROUP_LENGTH',
          message: `IPv6 group "${group}" exceeds maximum of 4 hexadecimal digits`,
        });
        return { errors };
      }
      if (!/^[0-9a-fA-F]+$/.test(group)) {
        errors.push({
          code: 'INVALID_IPV6_NON_HEX',
          message: `IPv6 group "${group}" contains non-hexadecimal characters`,
        });
        return { errors };
      }
      words.push(parseInt(group, 16));
    }
  }

  if (ipv4Words) {
    words.push(ipv4Words[0], ipv4Words[1]);
    // Determine if it is true IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if (
      words[0] === 0 &&
      words[1] === 0 &&
      words[2] === 0 &&
      words[3] === 0 &&
      words[4] === 0 &&
      words[5] === 0xffff
    ) {
      isIPv4Mapped = true;
    }
  }

  if (words.length !== 8) {
    errors.push({
      code: 'INVALID_IPV6_GROUP_COUNT',
      message: `Invalid total group count: expected 8, got ${words.length}`,
    });
    return { errors };
  }

  const tuple = words as [number, number, number, number, number, number, number, number];
  const canonical = formatCanonicalIPv6(tuple, isIPv4Mapped);

  return {
    parsed: {
      words: tuple,
      normalized: zoneId ? `${canonical}%${zoneId}` : canonical,
      isIPv4Mapped,
      zoneId,
    },
    errors: [],
  };
}

/**
 * Strictly checks whether an unknown value is a valid IPv6 address string.
 */
export function isIPv6Address(input: unknown): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  const { parsed } = parseIPv6(input);
  return parsed !== undefined;
}

export function isIPv6Loopback(
  words: [number, number, number, number, number, number, number, number],
): boolean {
  return (
    words[0] === 0 &&
    words[1] === 0 &&
    words[2] === 0 &&
    words[3] === 0 &&
    words[4] === 0 &&
    words[5] === 0 &&
    words[6] === 0 &&
    words[7] === 1
  );
}

export function isIPv6Unspecified(
  words: [number, number, number, number, number, number, number, number],
): boolean {
  return (
    words[0] === 0 &&
    words[1] === 0 &&
    words[2] === 0 &&
    words[3] === 0 &&
    words[4] === 0 &&
    words[5] === 0 &&
    words[6] === 0 &&
    words[7] === 0
  );
}

export function isIPv6LinkLocal(
  words: [number, number, number, number, number, number, number, number],
): boolean {
  return (words[0]! & 0xffc0) === 0xfe80;
}

export function isIPv6Multicast(
  words: [number, number, number, number, number, number, number, number],
): boolean {
  return (words[0]! & 0xff00) === 0xff00;
}

export function isIPv6Private(
  words: [number, number, number, number, number, number, number, number],
): boolean {
  // fc00::/7 (Unique Local Address)
  return (words[0]! & 0xfe00) === 0xfc00;
}
