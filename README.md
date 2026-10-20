# @rahul_dadhich15/regex-validation-toolkit

A production-grade, zero-dependency TypeScript toolkit for reusable regular expressions, composable regex construction, RFC-compliant email syntax validation, and strict IPv4/IPv6 validation.

[![CI](https://github.com/rahuldadhich1517-sys/regex-validation-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/rahuldadhich1517-sys/regex-validation-toolkit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@rahul_dadhich15/regex-validation-toolkit.svg)](https://www.npmjs.com/package/@rahul_dadhich15/regex-validation-toolkit)
[![npm downloads](https://img.shields.io/npm/dm/@rahul_dadhich15/regex-validation-toolkit.svg)](https://www.npmjs.com/package/@rahul_dadhich15/regex-validation-toolkit)
[![TypeScript](https://img.shields.io/badge/TypeScript-supported-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/@rahul_dadhich15/regex-validation-toolkit)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/@rahul_dadhich15/regex-validation-toolkit)

---

## Table of Contents

1. [Package Overview](#package-overview)
2. [Key Features](#key-features)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Module 1: Regex Patterns](#module-1-regex-patterns)
6. [Module 2: Regex Builder](#module-2-regex-builder)
7. [Module 3: Email Validator](#module-3-email-validator)
8. [Module 4: IP Validator (IPv4 & IPv6)](#module-4-ip-validator-ipv4--ipv6)
9. [Options and Return Types](#options-and-return-types)
10. [Error Handling Strategy](#error-handling-strategy)
11. [TypeScript Examples](#typescript-examples)
12. [Security Considerations](#security-considerations)
13. [Email Validation Limitations](#email-validation-limitations)
14. [IP Validation Limitations](#ip-validation-limitations)
15. [Supported Environments](#supported-environments)
16. [API Reference](#api-reference)
17. [Contributing](#contributing)
18. [License & Changelog](#license--changelog)

---

## Package Overview

In modern application engineering, regular expressions and network string validations (such as emails and IP addresses) are frequently copy-pasted across codebases, introducing critical vulnerabilities:

- **Catastrophic Backtracking (ReDoS)** from unvetted nested quantifiers.
- **State Leakage Bugs** caused by reusing global (`g`) or sticky (`y`) RegExp instances with mutable `lastIndex`.
- **Precedence Flaws** in manual string concatenation (e.g. `a + b + '+'` producing `ab+` instead of `(?:ab)+`).
- **Semantic Confusion** treating coarse lexical pattern matches as proof of email deliverability or IP reachability.
- **Ambiguous Formats** like accepting octal-style IPv4 (`01.02.03.04`) or uncompressed malformed IPv6.

`@rahul_dadhich15/regex-validation-toolkit` solves these challenges with a clean, fully-typed, zero-dependency library providing four focused utility modules.

---

## Key Features

- **Zero Runtime Dependencies**: No bloated dependency tree, no transitive vulnerabilities.
- **Dual ESM and CommonJS Support**: Full support for `import` and `require()`, complete with TypeScript declarations (`.d.ts` and `.d.cts`).
- **Subpath Exports**: Import the entire toolkit from the root or import isolated modules (`/regex-patterns`, `/regex-builder`, `/email-validator`, `/ip-validator`).
- **24 Curated Regex Patterns**: Battle-tested patterns across characters, identifiers, and common candidates with explicit documentation distinguishing lexical matching from semantic validation.
- **Composable Regex Builder**: Safe, token-aware combinators that prevent grouping and precedence traps, validate group identifiers, check repetition bounds, and reject invalid flags.
- **RFC 5321 / RFC 5322 Email Validator**: Practical syntax validation supporting subdomains, plus-tagging, Internationalized Domain Names (IDN/Punycode), non-destructive domain normalization, and structured diagnostics.
- **Strict IPv4 & IPv6 Validation**: Full dotted-decimal IPv4 validation (rejecting leading zeros) and comprehensive IPv6 syntax validation (supporting single `::` compression, IPv4-mapped IPv6, RFC 5952 canonical normalization, CIDR prefixes, and classification).
- **Security-First Architecture**: Strictly zero network calls, zero telemetry, no `eval()` or dynamic code evaluation, and prototype-pollution immunity.

---

## Installation

```bash
npm install @rahul_dadhich15/regex-validation-toolkit
```

Or using your favorite package manager:

```bash
pnpm add @rahul_dadhich15/regex-validation-toolkit
# or
yarn add @rahul_dadhich15/regex-validation-toolkit
```

---

## Quick Start

```typescript
import {
  testRegexPattern,
  sequence,
  startOfLine,
  endOfLine,
  digit,
  oneOrMore,
  compileRegex,
  isValidEmail,
  validateEmail,
  isIPv4,
  isIPv6,
  validateIP,
} from '@rahul_dadhich15/regex-validation-toolkit';

// 1. Reusable patterns
testRegexPattern('slug', 'production-ready-toolkit'); // true
testRegexPattern('semver', '1.0.0-rc.1+build.123'); // true

// 2. Composable regex builder
const pinPattern = sequence(startOfLine(), oneOrMore(digit()), endOfLine());
const pinRegex = compileRegex(pinPattern);
pinRegex.test('482910'); // true

// 3. Email validation
const emailResult = validateEmail('User+Project@EXAMPLE.com');
if (emailResult.valid) {
  console.log(emailResult.normalized); // 'User+Project@example.com' (domain lowercased)
}

// 4. IP validation
isIPv4('192.168.1.1'); // true
isIPv4('01.02.03.04'); // false (ambiguous leading zeros rejected)
isIPv6('2001:db8::1'); // true

const ipResult = validateIP('127.0.0.1');
console.log(ipResult.details?.isLoopback); // true
console.log(ipResult.details?.isPrivate);  // false
```

---

## Module 1: Regex Patterns

The `regex-patterns` module provides an immutable catalogue of 24 regular expressions for characters, identifiers, and input candidates.

### Pattern Categories

| Category | Pattern Name | Anchored Pattern | Description |
| :--- | :--- | :--- | :--- |
| **Characters** | `digits` | `^\d+$` | ASCII digits (0-9). |
| | `letters` | `^[a-zA-Z]+$` | ASCII English letters (A-Z, a-z). |
| | `alphanumeric` | `^[a-zA-Z0-9]+$` | ASCII alphanumeric characters. |
| | `whitespace` | `^\s+$` | Standard ECMAScript whitespace characters. |
| | `nonWhitespace` | `^\S+$` | Non-whitespace characters. |
| | `wordCharacters` | `^\w+$` | ASCII word characters (`[a-zA-Z0-9_]`). |
| | `lowercase` | `^[a-z]+$` | Lowercase ASCII letters. |
| | `uppercase` | `^[A-Z]+$` | Uppercase ASCII letters. |
| | `hexadecimal` | `^[0-9a-fA-F]+$` | Hexadecimal characters (0-9, a-f, A-F). |
| **Identifiers** | `slug` | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Hyphen-separated lowercase URL slug. |
| | `username` | `^[a-zA-Z0-9](?:[a-zA-Z0-9_-]{1,28}[a-zA-Z0-9])?$` | Alphanumeric username (1-30 chars). |
| | `identifier` | `^[a-zA-Z_$][a-zA-Z0-9_$]*$` | Standard JavaScript/code identifier. |
| | `hexColor` | `^#(?:[0-9a-fA-F]{3,4}\|[0-9a-fA-F]{6}\|[0-9a-fA-F]{8})$` | 3, 4, 6, or 8-digit CSS hex color. |
| | `semver` | *(Full SemVer 2.0.0)* | Semantic Versioning 2.0.0 specification. |
| **Input Candidates** | `integer` | `^[+-]?(?:0\|[1-9]\d*)$` | Integer with optional sign, no leading zeros. |
| | `decimal` | `^[+-]?(?:0\|[1-9]\d*)\.\d+$` | Decimal string with fractional part. |
| | `signedNumber` | `^[+-](?:0\|[1-9]\d*)(?:\.\d+)?$` | Numbers with explicit leading `+` or `-`. |
| | `uuid` | `^[0-9a-fA-F]{8}-...-[0-9a-fA-F]{12}$` | RFC 4122 UUID v1-v5 format. |
| | `urlCandidate` | `^https?:\/\/[^\s/$.?#].[^\s]*$` | Coarse HTTP/HTTPS candidate check. |
| | `emailCandidate` | `^[^\s@]+@[^\s@]+\.[^\s@]+$` | Coarse email candidate shape. |
| | `ipv4Candidate` | `^(?:\d{1,3}\.){3}\d{1,3}$` | 4-octet shape candidate. |
| | `ipv6Candidate` | *(Hex colon format)* | Hexadecimal colon IPv6 candidate. |
| | `dateIsoCandidate` | `^\d{4}-\d{2}-\d{2}$` | ISO 8601 YYYY-MM-DD shape candidate. |
| | `timeCandidate` | `^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$` | 24-hour time shape candidate. |

> [!IMPORTANT]
> **Lexical Matching vs. Semantic Validation**:
> Candidate patterns match lexical shapes only. For instance, `dateIsoCandidate` matches `2026-02-31`, and `ipv4Candidate` matches `999.999.999.999`. Always use `isIPv4()` or `validateEmail()` for semantic validation.

### API Reference

```typescript
import {
  regexPatterns,
  getRegexPattern,
  createRegexPattern,
  testRegexPattern
} from '@rahul_dadhich15/regex-validation-toolkit/regex-patterns';

// 1. Direct test
testRegexPattern('slug', 'my-post-slug'); // true

// 2. Retrieve definition metadata
const def = getRegexPattern('hexColor');
console.log(def.description);
console.log(def.limitations);

// 3. Create fresh RegExp instance with custom flags or unanchored matching
const rx = createRegexPattern('digits', { flags: 'm', anchored: false });
```

---

## Module 2: Regex Builder

The `regex-builder` module provides composable helpers that construct valid regular expressions from small parts without manual string concatenation.

### Precedence Protection

In naive string concatenation, adding a quantifier to an alternation breaks precedence:

```typescript
// Naive concatenation:
const bad = 'cat|dog' + '+'; // produces 'cat|dog+' (matches 'cat' or 'doggggg')

// Using regex-builder:
import { oneOf, oneOrMore } from '@rahul_dadhich15/regex-validation-toolkit/regex-builder';
const good = oneOrMore(oneOf('cat', 'dog')); // produces '(?:cat|dog)+'
```

`regex-builder` inspects each operand and automatically inserts non-capturing groups `(?:...)` when necessary.

### Helper Functions

- `escapeRegex(string)`: Escapes all regex metacharacters (`\ ^ $ . * + ? ( ) [ ] { } | /`).
- `escapeCharacterClass(string)`: Escapes characters with special meaning in character classes (`\ ] ^ -`).
- `literal(string)`: Creates an escaped, immutable `RegexFragment`.
- `sequence(...parts)`: Combines parts sequentially in order.
- `oneOf(...alternatives)`: Creates an alternation `(?:a|b|c)`.
- `optional(part)`: Quantifies part zero or one time (`?`).
- `zeroOrMore(part)`: Quantifies part zero or more times (`*`).
- `oneOrMore(part)`: Quantifies part one or more times (`+`).
- `exactly(part, count)`: Quantifies part exactly `count` times (`{n}`).
- `between(part, min, max)`: Quantifies part between `min` and `max` times (`{min,max}`).
- `atLeast(part, min)`: Quantifies part at least `min` times (`{min,}`).
- `capture(part, name?)`: Creates an unnamed `(...)` or named `(?<name>...)` capture group.
- `nonCapture(part)`: Creates a non-capturing group `(?:...)`.
- `lookahead(part)`: Creates a positive lookahead assertion `(?=...)`.
- `negativeLookahead(part)`: Creates a negative lookahead assertion `(?!...)`.
- `characterClass(...items)`: Creates a positive character class `[...]`.
- `negatedCharacterClass(...items)`: Creates a negated character class `[^...]`.
- `range(from, to)`: Defines a validated character class range `{ from: 'a', to: 'z' }`.
- `startOfLine()`: Returns `^`.
- `endOfLine()`: Returns `$`.
- `digit()`: Returns `\d`.
- `whitespace()`: Returns `\s`.
- `wordCharacter()`: Returns `\w`.
- `compileRegex(pattern, flags?)`: Compiles and validates regular expression flags.

### Example: Building a Currency Parser

```typescript
import {
  sequence,
  startOfLine,
  endOfLine,
  oneOf,
  optional,
  oneOrMore,
  digit,
  exactly,
  literal,
  compileRegex
} from '@rahul_dadhich15/regex-validation-toolkit/regex-builder';

const currencyRegex = compileRegex(
  sequence(
    startOfLine(),
    oneOf('$', '€', '£'),
    oneOrMore(digit()),
    optional(
      sequence(
        literal('.'),
        exactly(digit(), 2)
      )
    ),
    endOfLine()
  )
);

currencyRegex.test('$199.99'); // true
currencyRegex.test('€50');     // true
currencyRegex.test('$19.9');   // false
```

---

## Module 3: Email Validator

The `email-validator` module provides robust syntax verification conforming to RFC 5321 and RFC 5322.

### Validation Rules

- **Total Length**: Verified not to exceed 254 characters (RFC 5321 / RFC 3696 errata).
- **Local Part**: Max 64 characters. Allowed characters: `a-z`, `A-Z`, `0-9`, and symbols `!#$%&'*+/=?^_`{|}~-`. Dots are permitted internally, but prohibited as leading, trailing, or consecutive (`..`).
- **Domain Part**: Max 255 characters. Domain labels (max 63 characters each) must be alphanumeric with internal hyphens (no leading or trailing hyphens).
- **Top-Level Domain (TLD)**: Requires at least 2 characters, strictly non-numeric and ASCII letters or valid Punycode.
- **Normalization**: Preserves local-part casing (per RFC 5321) while canonicalizing domain labels to lowercase.
- **Internationalized Domain Names (IDN)**: Converts Unicode domains (e.g. `münchen.de`) to standard Punycode (`xn--mnchen-3ya.de`) for DNS syntax validation without making network calls.

### API Reference

```typescript
import { isValidEmail, validateEmail } from '@rahul_dadhich15/regex-validation-toolkit/email-validator';

// 1. Boolean check
isValidEmail('user@example.com'); // true
isValidEmail('user..name@example.com'); // false

// 2. Structured diagnostics
const result = validateEmail('Customer.Service+Support@Sub.EXAMPLE.COM');
if (result.valid) {
  console.log(result.normalized);
  // => 'Customer.Service+Support@sub.example.com'
  console.log(result.details);
  // => { localPart: 'Customer.Service+Support', domain: 'sub.example.com', tld: 'com', isIdn: false, isIpDomain: false }
} else {
  console.error(result.errors);
}
```

### Options

```typescript
const result = validateEmail('admin@localhost', {
  requireTld: false,              // Allow local domains without dot (default: true)
  allowIdn: true,                 // Allow internationalized domain names (default: true)
  allowUnicodeLocalPart: false,   // Allow non-ASCII in local-part per RFC 6530 (default: false)
  allowIpDomain: false,           // Allow IP literal domain [192.168.1.1] (default: false)
});
```

---

## Module 4: IP Validator (IPv4 & IPv6)

The `ip-validator` module provides deterministic, dependency-free IPv4 and IPv6 syntax validation and classification.

### IPv4 Rules

- Dotted-decimal format with exactly 4 octets (`0.0.0.0` to `255.255.255.255`).
- Strictly rejects leading zeros (e.g. `01.02.03.04`) to prevent ambiguous octal interpretation.
- Rejects signs (`+`), spaces, newlines, and non-decimal characters.

### IPv6 Rules

- Full 8-group hexadecimal notation (`2001:0db8:85a3:0000:0000:8a2e:0370:7334`).
- Shorthand `::` zero-compression allowed at most once.
- IPv4-mapped IPv6 addresses (`::ffff:192.168.1.1` and `0:0:0:0:0:ffff:192.168.1.1`).
- RFC 5952 canonical normalization (lowercase hex, leading zeros omitted, longest zero-run compressed, first run tie-break).
- Optional Scope IDs / zone indices (`fe80::1%eth0`).
- Optional CIDR prefix notation (`192.168.1.0/24` and `fe80::/64`).

### API Reference

```typescript
import {
  isIPv4,
  isIPv6,
  isIP,
  validateIP
} from '@rahul_dadhich15/regex-validation-toolkit/ip-validator';

// Quick predicates
isIPv4('192.168.1.1'); // true
isIPv6('::1');         // true
isIP('127.0.0.1');     // 4
isIP('2001:db8::1');   // 6
isIP('invalid');       // 0

// Detailed validation & classification
const info = validateIP('::1');
console.log(info.valid);                   // true
console.log(info.version);                 // 6
console.log(info.details?.isLoopback);     // true
console.log(info.details?.isPrivate);      // false
console.log(info.details?.isUnspecified);  // false
```

### IP Classification Table

| Classification | IPv4 Definition | IPv6 Definition |
| :--- | :--- | :--- |
| **Loopback** | `127.0.0.0/8` | `::1` |
| **Private** | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10` (CGNAT) | `fc00::/7` (Unique Local Address / ULA) |
| **Link-Local** | `169.254.0.0/16` | `fe80::/10` |
| **Multicast** | `224.0.0.0/4` | `ff00::/8` |
| **Unspecified** | `0.0.0.0` | `::` |
| **Broadcast** | `255.255.255.255` | N/A |
| **IPv4-Mapped** | N/A | `::ffff:x.x.x.x` |

---

## Options and Return Types

### `EmailValidationResult`

```typescript
interface EmailValidationResult {
  readonly valid: boolean;
  readonly normalized?: string;
  readonly errors: readonly EmailValidationError[];
  readonly details?: {
    readonly localPart: string;
    readonly domain: string;
    readonly tld?: string;
    readonly isIdn?: boolean;
    readonly isIpDomain?: boolean;
  };
}
```

### `IPValidationResult`

```typescript
interface IPValidationResult {
  readonly valid: boolean;
  readonly version?: 4 | 6;
  readonly normalized?: string;
  readonly errors: readonly IPValidationError[];
  readonly details?: {
    readonly version: 4 | 6;
    readonly isLoopback: boolean;
    readonly isPrivate: boolean;
    readonly isLinkLocal: boolean;
    readonly isMulticast: boolean;
    readonly isUnspecified: boolean;
    readonly isBroadcast?: boolean;
    readonly isIPv4Mapped?: boolean;
    readonly cidrPrefix?: number;
    readonly zoneId?: string;
  };
}
```

---

## Error Handling Strategy

The toolkit adopts a structured, predictable error hierarchy:

1. **Validation Utilities (`validateEmail`, `validateIP`)**:
   - Return structured validation result objects containing strongly-typed error codes.
   - Consumers do not need to wrap standard validation in `try...catch` blocks.
2. **Construction Utilities (`regex-builder`)**:
   - Throw documented subclasses of `RegexToolkitError` on programmatic errors (e.g. invalid repetition bounds, malformed capture group names, invalid regex flags).

```typescript
import {
  RegexToolkitError,
  RegexBuilderError,
  RegexCompilationError,
  InvalidOptionError
} from '@rahul_dadhich15/regex-validation-toolkit';

try {
  compileRegex('[unclosed');
} catch (error) {
  if (error instanceof RegexCompilationError) {
    console.error('Compilation failed:', error.message);
    console.error('Original cause:', error.cause);
  }
}
```

---

## TypeScript Examples

### Form Validation Workflow

```typescript
import {
  isValidEmail,
  validateEmail,
  validateIP,
  testRegexPattern,
} from '@rahul_dadhich15/regex-validation-toolkit';

interface UserRegistrationInput {
  username: string;
  email: string;
  clientIp: string;
}

function validateRegistration(input: UserRegistrationInput) {
  const errors: string[] = [];

  if (!testRegexPattern('username', input.username)) {
    errors.push('Username must be 1-30 alphanumeric characters with internal hyphens/underscores.');
  }

  const emailRes = validateEmail(input.email);
  if (!emailRes.valid) {
    errors.push(`Invalid email: ${emailRes.errors.map(e => e.message).join(', ')}`);
  }

  const ipRes = validateIP(input.clientIp);
  if (!ipRes.valid) {
    errors.push(`Invalid IP address: ${ipRes.errors.map(e => e.message).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      username: input.username,
      email: emailRes.normalized,
      clientIp: ipRes.normalized,
    },
  };
}
```

---

## Security Considerations

- **ReDoS Protection**: All exported regex patterns are linear and strictly avoid nested quantifiers. Adversary strings (up to 10,000 characters) execute in under a millisecond.
- **No Shared Mutable State**: Factories create fresh `RegExp` objects so `lastIndex` cannot cause multithreading or repeated-call concurrency issues.
- **No `eval()` or Dynamic Code Evaluation**: Regexes are constructed solely via standard `new RegExp()` constructor syntax after input validation.
- **Zero Network Invocations**: Validation is entirely local. No DNS queries, SMTP probing, or HTTP telemetry.
- **Custom Patterns Warning**: While `escapeRegex()` ensures user-supplied strings cannot inject metacharacters, composing custom patterns with builder combinators requires developer caution to avoid exponential backtracking.

---

## Email Validation Limitations

- **Syntax Validation Only**: Validating syntax does not verify that the mailbox exists, that the domain has an active MX DNS record, or that the mailbox is deliverable.
- **No SMTP or Network Probing**: This package never performs socket connections or DNS queries.
- **Unicode Local Part**: RFC 6530/6531 internationalized local parts (`dörte@example.com`) are rejected by default unless `{ allowUnicodeLocalPart: true }` is enabled.
- **Surrounding Whitespace**: Leading and trailing whitespaces are strictly rejected and are not silently trimmed.

---

## IP Validation Limitations

- **Syntax Validation Only**: Validating IP address syntax does not check if the host is reachable, online, or assigned by an RIR/ISP.
- **Strict Dotted-Decimal**: Non-standard octal or hex IPv4 representations (e.g. `0177.0.0.1` or `0x7f000001`) are rejected for security and consistency across operating systems.
- **CIDR Prefixes**: Suffixes such as `/24` are rejected by default unless `{ allowCidr: true }` is explicitly provided.

---

## Supported Environments

- **Node.js**: >= 18.0.0
- **Deno**: >= 1.30.0
- **Bun**: >= 1.0.0
- **Browsers**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Edge Runtimes**: Cloudflare Workers, Vercel Edge Runtime

---

## API Reference

### Root Exports (`@rahul_dadhich15/regex-validation-toolkit`)

```typescript
// Patterns
export { regexPatterns, getRegexPattern, createRegexPattern, testRegexPattern } from './regex-patterns';

// Builder
export {
  literal, sequence, oneOf, optional, zeroOrMore, oneOrMore, exactly, between, atLeast,
  capture, nonCapture, lookahead, negativeLookahead, characterClass, negatedCharacterClass,
  range, startOfLine, endOfLine, digit, whitespace, wordCharacter, buildRegex, compileRegex,
  escapeRegex, escapeCharacterClass, RegexFragment, fragment, validateFlags
} from './regex-builder';

// Email
export { isValidEmail, validateEmail } from './email-validator';

// IP
export {
  isIPv4, isIPv6, isIP, validateIP,
  isIPv4Address, parseIPv4, isIPv4Loopback, isIPv4Private, isIPv4LinkLocal, isIPv4Multicast, isIPv4Unspecified, isIPv4Broadcast,
  isIPv6Address, parseIPv6, formatCanonicalIPv6, isIPv6Loopback, isIPv6Unspecified, isIPv6LinkLocal, isIPv6Multicast, isIPv6Private
} from './ip-validator';

// Errors
export {
  RegexToolkitError, RegexBuilderError, RegexCompilationError, InvalidOptionError
} from './errors';
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository and create a feature branch (`git checkout -b feature/my-feature`).
2. Ensure strict TypeScript types and maintain 0 runtime dependencies.
3. Add unit tests in the `tests/` directory ensuring coverage remains >= 95%.
4. Run `npm run typecheck`, `npm run test:coverage`, and `npm run build`.
5. Open a Pull Request with a clear description of your changes.

---

## License & Changelog

- **License**: Released under the [MIT License](LICENSE). Copyright &copy; 2026 Rahul Dadhich.
- **Changelog**: See [CHANGELOG.md](CHANGELOG.md) for detailed version history.
