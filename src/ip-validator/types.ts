export type IPErrorCode =
  | 'INVALID_TYPE'
  | 'EMPTY_INPUT'
  | 'WHITESPACE_SURROUNDING'
  | 'INVALID_IPV4_OCTET_COUNT'
  | 'INVALID_IPV4_OCTET_VALUE'
  | 'INVALID_IPV4_LEADING_ZERO'
  | 'INVALID_IPV4_NON_DIGIT'
  | 'INVALID_IPV6_FORMAT'
  | 'INVALID_IPV6_GROUP_COUNT'
  | 'INVALID_IPV6_GROUP_LENGTH'
  | 'INVALID_IPV6_MULTIPLE_COMPRESSION'
  | 'INVALID_IPV6_NON_HEX'
  | 'INVALID_IPV4_MAPPED_IPV6'
  | 'CIDR_NOT_ALLOWED'
  | 'INVALID_CIDR_PREFIX'
  | 'ZONE_ID_NOT_ALLOWED'
  | 'INVALID_ZONE_ID';

export interface IPValidationError {
  readonly code: IPErrorCode;
  readonly message: string;
}

export interface IPValidationOptions {
  /**
   * Whether to allow CIDR prefix notation (e.g. "192.168.1.0/24" or "fe80::/64").
   * @default false
   */
  readonly allowCidr?: boolean | undefined;

  /**
   * Whether to allow IPv6 zone index / Scope ID (e.g. "fe80::1%eth0").
   * @default false
   */
  readonly allowZoneId?: boolean | undefined;

  /**
   * Enforce an explicit IP version (4 or 6). If specified, other IP versions will fail validation.
   */
  readonly version?: (4 | 6) | undefined;
}

export interface IPValidationDetails {
  readonly version: 4 | 6;
  readonly isLoopback: boolean;
  readonly isPrivate: boolean;
  readonly isLinkLocal: boolean;
  readonly isMulticast: boolean;
  readonly isUnspecified: boolean;
  readonly isBroadcast?: boolean | undefined;
  readonly isIPv4Mapped?: boolean | undefined;
  readonly cidrPrefix?: number | undefined;
  readonly zoneId?: string | undefined;
}

export interface IPValidationResult {
  readonly valid: boolean;
  readonly version?: (4 | 6) | undefined;
  /**
   * Canonical normalized representation (RFC 5952 for IPv6, dotted-decimal for IPv4).
   * Undefined if validation fails.
   */
  readonly normalized?: string | undefined;
  readonly errors: readonly IPValidationError[];
  readonly details?: IPValidationDetails | undefined;
}
