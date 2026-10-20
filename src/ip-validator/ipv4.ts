import type { IPValidationError } from './types.js';

export interface ParsedIPv4 {
  octets: [number, number, number, number];
  normalized: string;
}

/**
 * Validates and parses an IPv4 address string into its numerical octets.
 */
export function parseIPv4(input: string): { parsed?: ParsedIPv4; errors: IPValidationError[] } {
  const errors: IPValidationError[] = [];
  const parts = input.split('.');

  if (parts.length !== 4) {
    errors.push({
      code: 'INVALID_IPV4_OCTET_COUNT',
      message: `IPv4 address must contain exactly 4 octets, got ${parts.length}`,
    });
    return { errors };
  }

  const octets: number[] = [];

  for (let i = 0; i < 4; i++) {
    const part = parts[i]!;
    if (part.length === 0) {
      errors.push({
        code: 'INVALID_IPV4_OCTET_VALUE',
        message: `Octet ${i + 1} cannot be empty`,
      });
      continue;
    }
    if (!/^\d+$/.test(part)) {
      errors.push({
        code: 'INVALID_IPV4_NON_DIGIT',
        message: `Octet ${i + 1} ("${part}") contains non-digit characters`,
      });
      continue;
    }
    if (part.length > 1 && part[0] === '0') {
      errors.push({
        code: 'INVALID_IPV4_LEADING_ZERO',
        message: `Octet ${i + 1} ("${part}") contains prohibited leading zeros`,
      });
      continue;
    }
    const val = Number(part);
    if (val < 0 || val > 255) {
      errors.push({
        code: 'INVALID_IPV4_OCTET_VALUE',
        message: `Octet ${i + 1} ("${part}") must be between 0 and 255`,
      });
      continue;
    }
    octets.push(val);
  }

  if (errors.length > 0 || octets.length !== 4) {
    return { errors };
  }

  const tuple = octets as [number, number, number, number];
  return {
    parsed: {
      octets: tuple,
      normalized: tuple.join('.'),
    },
    errors: [],
  };
}

/**
 * Strictly checks whether an unknown value is a valid IPv4 address string.
 */
export function isIPv4Address(input: unknown): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  const { parsed } = parseIPv4(input);
  return parsed !== undefined;
}

export function isIPv4Loopback(octets: [number, number, number, number]): boolean {
  return octets[0] === 127;
}

export function isIPv4Private(octets: [number, number, number, number]): boolean {
  const [o0, o1] = octets;
  // 10.0.0.0/8
  if (o0 === 10) return true;
  // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
  if (o0 === 172 && o1 >= 16 && o1 <= 31) return true;
  // 192.168.0.0/16
  if (o0 === 192 && o1 === 168) return true;
  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (o0 === 100 && o1 >= 64 && o1 <= 127) return true;
  return false;
}

export function isIPv4LinkLocal(octets: [number, number, number, number]): boolean {
  return octets[0] === 169 && octets[1] === 254;
}

export function isIPv4Multicast(octets: [number, number, number, number]): boolean {
  return octets[0] >= 224 && octets[0] <= 239;
}

export function isIPv4Unspecified(octets: [number, number, number, number]): boolean {
  return octets[0] === 0 && octets[1] === 0 && octets[2] === 0 && octets[3] === 0;
}

export function isIPv4Broadcast(octets: [number, number, number, number]): boolean {
  return octets[0] === 255 && octets[1] === 255 && octets[2] === 255 && octets[3] === 255;
}
