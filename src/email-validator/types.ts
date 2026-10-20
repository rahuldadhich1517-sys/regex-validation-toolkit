export type EmailErrorCode =
  | 'INVALID_TYPE'
  | 'EMPTY_INPUT'
  | 'WHITESPACE_SURROUNDING'
  | 'CONTROL_CHARACTERS'
  | 'MISSING_AT'
  | 'MULTIPLE_AT'
  | 'LOCAL_PART_EMPTY'
  | 'LOCAL_PART_TOO_LONG'
  | 'LOCAL_PART_LEADING_DOT'
  | 'LOCAL_PART_TRAILING_DOT'
  | 'LOCAL_PART_CONSECUTIVE_DOTS'
  | 'LOCAL_PART_INVALID_CHARACTERS'
  | 'DOMAIN_EMPTY'
  | 'DOMAIN_TOO_LONG'
  | 'DOMAIN_LABEL_EMPTY'
  | 'DOMAIN_LABEL_TOO_LONG'
  | 'DOMAIN_LABEL_LEADING_HYPHEN'
  | 'DOMAIN_LABEL_TRAILING_HYPHEN'
  | 'DOMAIN_INVALID_CHARACTERS'
  | 'DOMAIN_MISSING_TLD'
  | 'DOMAIN_INVALID_TLD'
  | 'TOTAL_LENGTH_EXCEEDED'
  | 'IDN_CONVERSION_FAILED'
  | 'IP_DOMAIN_NOT_ALLOWED'
  | 'IP_DOMAIN_INVALID';

export interface EmailValidationError {
  readonly code: EmailErrorCode;
  readonly message: string;
}

export interface EmailValidationOptions {
  /**
   * Whether a Top-Level Domain (TLD) of at least 2 characters is required.
   * If false, domain names without dots like "user@localhost" are accepted.
   * @default true
   */
  readonly requireTld?: boolean | undefined;

  /**
   * Whether to allow Internationalized Domain Names (IDN, e.g. "münchen.de").
   * IDN domains are converted to ASCII Punycode for syntax verification.
   * @default true
   */
  readonly allowIdn?: boolean | undefined;

  /**
   * Whether to allow Unicode characters in the local part (RFC 6530 / RFC 6531 SMTPUTF8).
   * If false, only RFC 5322 ASCII characters are allowed.
   * @default false
   */
  readonly allowUnicodeLocalPart?: boolean | undefined;

  /**
   * Whether to allow IP address literal domains (e.g. "user@[192.168.1.1]").
   * @default false
   */
  readonly allowIpDomain?: boolean | undefined;
}

export interface EmailValidationDetails {
  readonly localPart: string;
  readonly domain: string;
  readonly tld?: string | undefined;
  readonly isIdn?: boolean | undefined;
  readonly isIpDomain?: boolean | undefined;
}

export interface EmailValidationResult {
  readonly valid: boolean;
  /**
   * Normalized email address (domain lowercased; local part casing preserved).
   * Undefined if validation fails.
   */
  readonly normalized?: string | undefined;
  readonly errors: readonly EmailValidationError[];
  readonly details?: EmailValidationDetails | undefined;
}
