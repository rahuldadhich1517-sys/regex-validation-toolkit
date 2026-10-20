import { isIPv4Address } from '../ip-validator/ipv4.js';
import type {
  EmailValidationError,
  EmailValidationOptions,
  EmailValidationResult,
} from './types.js';

const DEFAULT_OPTIONS: Required<EmailValidationOptions> = {
  requireTld: true,
  allowIdn: true,
  allowUnicodeLocalPart: false,
  allowIpDomain: false,
};

// RFC 5322 permitted unquoted characters in local part
const ASCII_LOCAL_PART_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;

/**
 * Validates the syntax of an email address according to practical RFC 5321 / RFC 5322 rules.
 *
 * NOTE: This function validates syntax only. It does not check whether the email address
 * actually exists, has an active MX DNS record, or can receive mail.
 *
 * @param email - The email address string to validate.
 * @param options - Configuration options for TLD requirements, IDN, Unicode, and IP domains.
 * @returns A structured result containing validity, normalized string (if valid), and any errors.
 */
export function validateEmail(
  email: unknown,
  options?: EmailValidationOptions,
): EmailValidationResult {
  const opts: Required<EmailValidationOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const errors: EmailValidationError[] = [];

  // Runtime type validation
  if (typeof email !== 'string') {
    return {
      valid: false,
      errors: [{ code: 'INVALID_TYPE', message: `Email must be a string, received ${typeof email}` }],
    };
  }

  // Empty check
  if (email.length === 0) {
    return {
      valid: false,
      errors: [{ code: 'EMPTY_INPUT', message: 'Email address cannot be empty' }],
    };
  }

  // Whitespace checks
  if (email !== email.trim()) {
    return {
      valid: false,
      errors: [
        {
          code: 'WHITESPACE_SURROUNDING',
          message: 'Email address must not contain leading or trailing whitespace',
        },
      ],
    };
  }

  if (email.trim().length === 0) {
    return {
      valid: false,
      errors: [{ code: 'EMPTY_INPUT', message: 'Email address cannot be empty or whitespace-only' }],
    };
  }

  // Control characters check (\x00-\x1F and \x7F)
  if (/[\x00-\x1F\x7F]/.test(email)) {
    return {
      valid: false,
      errors: [
        {
          code: 'CONTROL_CHARACTERS',
          message: 'Email address contains prohibited control characters',
        },
      ],
    };
  }

  // Total length limit check (RFC 5321 Section 4.5.3.1.3 / RFC 3696 errata)
  if (email.length > 254) {
    errors.push({
      code: 'TOTAL_LENGTH_EXCEEDED',
      message: `Email address exceeds maximum length of 254 characters (got ${email.length})`,
    });
  }

  // Check @ separator
  const atCount = (email.match(/@/g) || []).length;
  if (atCount === 0) {
    return {
      valid: false,
      errors: [{ code: 'MISSING_AT', message: 'Email address is missing the "@" symbol' }],
    };
  }
  if (atCount > 1) {
    return {
      valid: false,
      errors: [{ code: 'MULTIPLE_AT', message: 'Email address cannot contain multiple "@" symbols' }],
    };
  }

  const atIndex = email.indexOf('@');
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  // Validate local part
  if (localPart.length === 0) {
    errors.push({ code: 'LOCAL_PART_EMPTY', message: 'Local part of email address cannot be empty' });
  } else {
    if (localPart.length > 64) {
      errors.push({
        code: 'LOCAL_PART_TOO_LONG',
        message: `Local part exceeds maximum length of 64 characters (got ${localPart.length})`,
      });
    }

    if (localPart.startsWith('.')) {
      errors.push({ code: 'LOCAL_PART_LEADING_DOT', message: 'Local part cannot start with a dot' });
    }

    if (localPart.endsWith('.')) {
      errors.push({ code: 'LOCAL_PART_TRAILING_DOT', message: 'Local part cannot end with a dot' });
    }

    if (localPart.includes('..')) {
      errors.push({
        code: 'LOCAL_PART_CONSECUTIVE_DOTS',
        message: 'Local part cannot contain consecutive dots',
      });
    }

    if (opts.allowUnicodeLocalPart) {
      // Check for illegal ASCII characters like spaces or quotes
      if (/[\s"(),:;<>@[\\\]]/.test(localPart)) {
        errors.push({
          code: 'LOCAL_PART_INVALID_CHARACTERS',
          message: 'Local part contains invalid characters',
        });
      }
    } else {
      if (!ASCII_LOCAL_PART_REGEX.test(localPart)) {
        errors.push({
          code: 'LOCAL_PART_INVALID_CHARACTERS',
          message: 'Local part contains invalid ASCII characters or unsupported Unicode',
        });
      }
    }
  }

  // Validate domain
  let isIdn = false;
  let isIp = false;
  let normalizedDomain = domain.toLowerCase();
  let asciiDomain = normalizedDomain;
  let tld: string | undefined;

  if (domain.length === 0) {
    errors.push({ code: 'DOMAIN_EMPTY', message: 'Domain part of email address cannot be empty' });
  } else {
    if (domain.length > 255) {
      errors.push({
        code: 'DOMAIN_TOO_LONG',
        message: `Domain exceeds maximum length of 255 characters (got ${domain.length})`,
      });
    }

    // Check for IP domain literal [192.168.1.1]
    if (domain.startsWith('[') && domain.endsWith(']')) {
      isIp = true;
      if (!opts.allowIpDomain) {
        errors.push({
          code: 'IP_DOMAIN_NOT_ALLOWED',
          message: 'IP address literal domains are not allowed by current options',
        });
      } else {
        const ipLiteral = domain.slice(1, -1);
        if (!isIPv4Address(ipLiteral)) {
          errors.push({
            code: 'IP_DOMAIN_INVALID',
            message: `Invalid IP address literal domain: "${ipLiteral}"`,
          });
        }
      }
    } else {
      // Regular domain name
      if (/\s/.test(domain)) {
        errors.push({
          code: 'DOMAIN_INVALID_CHARACTERS',
          message: 'Domain cannot contain whitespace',
        });
      }

      // Check for Internationalized Domain Name (IDN)
      const hasNonAscii = /[^\x00-\x7F]/.test(domain);
      if (hasNonAscii) {
        isIdn = true;
        if (!opts.allowIdn) {
          errors.push({
            code: 'DOMAIN_INVALID_CHARACTERS',
            message: 'Internationalized domain names are not allowed by current options',
          });
        } else {
          try {
            // URL host parser will convert IDN to punycode
            const url = new URL(`http://${domain}`);
            asciiDomain = url.hostname;
            normalizedDomain = url.hostname;
          } catch {
            errors.push({
              code: 'IDN_CONVERSION_FAILED',
              message: 'Failed to convert internationalized domain name to Punycode',
            });
          }
        }
      } else if (domain.includes('xn--')) {
        isIdn = true;
      }

      // Check domain labels
      if (asciiDomain.startsWith('.') || asciiDomain.endsWith('.') || asciiDomain.includes('..')) {
        errors.push({
          code: 'DOMAIN_LABEL_EMPTY',
          message: 'Domain cannot contain empty labels, leading/trailing dots, or consecutive dots',
        });
      }

      const labels = asciiDomain.split('.');

      if (opts.requireTld && labels.length < 2) {
        errors.push({
          code: 'DOMAIN_MISSING_TLD',
          message: 'Domain must include a top-level domain (TLD)',
        });
      }

      for (const label of labels) {
        if (label.length === 0) {
          continue; // already reported in DOMAIN_LABEL_EMPTY
        }
        if (label.length > 63) {
          errors.push({
            code: 'DOMAIN_LABEL_TOO_LONG',
            message: `Domain label "${label}" exceeds maximum length of 63 characters`,
          });
        }
        if (label.startsWith('-')) {
          errors.push({
            code: 'DOMAIN_LABEL_LEADING_HYPHEN',
            message: `Domain label "${label}" cannot start with a hyphen`,
          });
        }
        if (label.endsWith('-')) {
          errors.push({
            code: 'DOMAIN_LABEL_TRAILING_HYPHEN',
            message: `Domain label "${label}" cannot end with a hyphen`,
          });
        }
        if (!/^[a-zA-Z0-9-]+$/.test(label)) {
          errors.push({
            code: 'DOMAIN_INVALID_CHARACTERS',
            message: `Domain label "${label}" contains invalid characters`,
          });
        }
      }

      if (labels.length >= 2) {
        const lastLabel = labels[labels.length - 1]!;
        tld = lastLabel.toLowerCase();
        if (tld.length < 2) {
          errors.push({
            code: 'DOMAIN_INVALID_TLD',
            message: 'Top-level domain must be at least 2 characters long',
          });
        } else if (/^\d+$/.test(tld)) {
          errors.push({
            code: 'DOMAIN_INVALID_TLD',
            message: 'Top-level domain cannot be entirely numeric',
          });
        } else if (!/^[a-zA-Z]+$/.test(tld) && !tld.startsWith('xn--')) {
          errors.push({
            code: 'DOMAIN_INVALID_TLD',
            message: 'Top-level domain must contain only ASCII letters or valid Punycode',
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    normalized: `${localPart}@${normalizedDomain}`,
    errors: [],
    details: {
      localPart,
      domain: normalizedDomain,
      tld,
      isIdn,
      isIpDomain: isIp,
    },
  };
}

/**
 * Returns true if the given input is a syntactically valid email address.
 *
 * @param email - The value to check.
 * @param options - Optional validation options.
 * @returns Boolean indicating whether the email syntax is valid.
 */
export function isValidEmail(email: unknown, options?: EmailValidationOptions): boolean {
  return validateEmail(email, options).valid;
}
