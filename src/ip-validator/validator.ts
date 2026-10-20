import {
  isIPv4Address,
  isIPv4Broadcast,
  isIPv4LinkLocal,
  isIPv4Loopback,
  isIPv4Multicast,
  isIPv4Private,
  isIPv4Unspecified,
  parseIPv4,
} from './ipv4.js';
import {
  isIPv6Address,
  isIPv6LinkLocal,
  isIPv6Loopback,
  isIPv6Multicast,
  isIPv6Private,
  isIPv6Unspecified,
  parseIPv6,
} from './ipv6.js';
import type {
  IPValidationError,
  IPValidationOptions,
  IPValidationResult,
} from './types.js';

/**
 * Checks whether an input value is a valid IPv4 address in dotted-decimal notation.
 *
 * @param input - The value to check.
 * @returns True if valid IPv4, false otherwise.
 */
export function isIPv4(input: unknown): boolean {
  return isIPv4Address(input);
}

/**
 * Checks whether an input value is a valid IPv6 address in standard hexadecimal notation.
 *
 * @param input - The value to check.
 * @returns True if valid IPv6, false otherwise.
 */
export function isIPv6(input: unknown): boolean {
  return isIPv6Address(input);
}

/**
 * Checks whether an input value is an IP address.
 *
 * @param input - The value to check.
 * @returns 4 for IPv4, 6 for IPv6, or 0 if neither.
 */
export function isIP(input: unknown): 0 | 4 | 6 {
  if (isIPv4(input)) {
    return 4;
  }
  if (isIPv6(input)) {
    return 6;
  }
  return 0;
}

/**
 * Validates and classifies an IPv4 or IPv6 address.
 *
 * NOTE: Validating IP address syntax does NOT verify host reachability, routing, or assignment.
 *
 * @param input - The IP address string to validate.
 * @param options - Configuration options for CIDR prefixes, zone IDs, and version enforcement.
 * @returns A structured result containing validity, version, normalized string, and classifications.
 */
export function validateIP(input: unknown, options?: IPValidationOptions): IPValidationResult {
  if (typeof input !== 'string') {
    return {
      valid: false,
      errors: [{ code: 'INVALID_TYPE', message: `IP address must be a string, received ${typeof input}` }],
    };
  }

  if (input.length === 0) {
    return {
      valid: false,
      errors: [{ code: 'EMPTY_INPUT', message: 'IP address string cannot be empty' }],
    };
  }

  if (input !== input.trim()) {
    return {
      valid: false,
      errors: [
        {
          code: 'WHITESPACE_SURROUNDING',
          message: 'IP address must not contain leading or trailing whitespace',
        },
      ],
    };
  }

  let addressPart = input;
  let isBracketed = false;

  // Handle bracketed IP addresses [::1] or [192.168.1.1]
  if (addressPart.startsWith('[') || addressPart.endsWith(']')) {
    if (!options?.allowBrackets) {
      return {
        valid: false,
        errors: [
          {
            code: 'BRACKETED_NOT_ALLOWED',
            message: 'Bracketed IP addresses are not allowed by current options',
          },
        ],
      };
    }
    if (!addressPart.startsWith('[') || !addressPart.endsWith(']')) {
      return {
        valid: false,
        errors: [
          {
            code: 'INVALID_IPV6_FORMAT',
            message: 'Malformed bracketed IP address: must start with "[" and end with "]"',
          },
        ],
      };
    }
    const inner = addressPart.slice(1, -1);
    if (inner.includes('[') || inner.includes(']')) {
      return {
        valid: false,
        errors: [
          {
            code: 'INVALID_IPV6_FORMAT',
            message: 'Nested brackets are not allowed in IP address',
          },
        ],
      };
    }
    if (inner.length === 0) {
      return {
        valid: false,
        errors: [
          {
            code: 'EMPTY_INPUT',
            message: 'Bracketed IP address content cannot be empty',
          },
        ],
      };
    }
    addressPart = inner;
    isBracketed = true;
  }

  let cidrPrefix: number | undefined;

  // Handle CIDR notation (/prefix)
  if (addressPart.includes('/')) {
    if (!options?.allowCidr) {
      return {
        valid: false,
        errors: [
          {
            code: 'CIDR_NOT_ALLOWED',
            message: 'CIDR prefix notation is not allowed by current options',
          },
        ],
      };
    }

    const slashIndex = addressPart.indexOf('/');
    const prefixStr = addressPart.slice(slashIndex + 1);
    addressPart = addressPart.slice(0, slashIndex);

    if (!/^\d+$/.test(prefixStr)) {
      return {
        valid: false,
        errors: [
          {
            code: 'INVALID_CIDR_PREFIX',
            message: `CIDR prefix must be an integer, received "${prefixStr}"`,
          },
        ],
      };
    }
    cidrPrefix = Number(prefixStr);
  }

  const errors: IPValidationError[] = [];
  const enforceVersion = options?.version;

  // Attempt IPv4
  if (enforceVersion === undefined || enforceVersion === 4) {
    // Only attempt if it looks like IPv4 or doesn't have colons
    if (!addressPart.includes(':') || enforceVersion === 4) {
      const { parsed, errors: v4Errors } = parseIPv4(addressPart);
      if (parsed) {
        if (cidrPrefix !== undefined && (cidrPrefix < 0 || cidrPrefix > 32)) {
          return {
            valid: false,
            version: 4,
            errors: [
              {
                code: 'INVALID_CIDR_PREFIX',
                message: `IPv4 CIDR prefix must be between 0 and 32, received ${cidrPrefix}`,
              },
            ],
          };
        }

        let normalized = cidrPrefix !== undefined ? `${parsed.normalized}/${cidrPrefix}` : parsed.normalized;
        if (isBracketed) {
          normalized = `[${normalized}]`;
        }
        return {
          valid: true,
          version: 4,
          normalized,
          errors: [],
          details: {
            version: 4,
            isLoopback: isIPv4Loopback(parsed.octets),
            isPrivate: isIPv4Private(parsed.octets),
            isLinkLocal: isIPv4LinkLocal(parsed.octets),
            isMulticast: isIPv4Multicast(parsed.octets),
            isUnspecified: isIPv4Unspecified(parsed.octets),
            isBroadcast: isIPv4Broadcast(parsed.octets),
            ...(cidrPrefix !== undefined ? { cidrPrefix } : {}),
          },
        };
      }
      if (enforceVersion === 4) {
        return {
          valid: false,
          version: 4,
          errors: v4Errors,
        };
      }
    }
  }

  // Attempt IPv6
  if (enforceVersion === undefined || enforceVersion === 6) {
    const { parsed, errors: v6Errors } = parseIPv6(addressPart, {
      allowZoneId: options?.allowZoneId,
    });
    if (parsed) {
      if (cidrPrefix !== undefined && (cidrPrefix < 0 || cidrPrefix > 128)) {
        return {
          valid: false,
          version: 6,
          errors: [
            {
              code: 'INVALID_CIDR_PREFIX',
              message: `IPv6 CIDR prefix must be between 0 and 128, received ${cidrPrefix}`,
            },
          ],
        };
      }

      let normalized = cidrPrefix !== undefined ? `${parsed.normalized}/${cidrPrefix}` : parsed.normalized;
      if (isBracketed) {
        normalized = `[${normalized}]`;
      }
      return {
        valid: true,
        version: 6,
        normalized,
        errors: [],
        details: {
          version: 6,
          isLoopback: isIPv6Loopback(parsed.words),
          isPrivate: isIPv6Private(parsed.words),
          isLinkLocal: isIPv6LinkLocal(parsed.words),
          isMulticast: isIPv6Multicast(parsed.words),
          isUnspecified: isIPv6Unspecified(parsed.words),
          isIPv4Mapped: parsed.isIPv4Mapped,
          ...(cidrPrefix !== undefined ? { cidrPrefix } : {}),
          ...(parsed.zoneId !== undefined ? { zoneId: parsed.zoneId } : {}),
        },
      };
    }
    if (enforceVersion === 6) {
      return {
        valid: false,
        version: 6,
        errors: v6Errors,
      };
    }
    errors.push(...v6Errors);
  }

  return {
    valid: false,
    errors: errors.length > 0 ? errors : [{ code: 'INVALID_IPV4_OCTET_COUNT', message: 'Invalid IP address format' }],
  };
}
