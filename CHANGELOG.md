# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-20

### Added
- **Initial release of `@rahul_dadhich15/regex-validation-toolkit`**:
  - **Module 1: `regex-patterns`**:
    - Reusable catalogue containing 24 production-grade regular expressions across characters, identifiers, and common candidate inputs.
    - Explicit contracts distinguishing lexical matching from semantic validation.
    - Public functions: `regexPatterns`, `getRegexPattern`, `createRegexPattern`, and `testRegexPattern`.
    - Fully immutable, non-shared RegExp factories avoiding `lastIndex` mutation pitfalls.
  - **Module 2: `regex-builder`**:
    - Composable, typed regex builder avoiding string concatenation and precedence bugs.
    - Helpers: `escapeRegex`, `escapeCharacterClass`, `literal`, `sequence`, `oneOf`, `optional`, `zeroOrMore`, `oneOrMore`, `exactly`, `between`, `atLeast`, `capture`, `nonCapture`, `lookahead`, `negativeLookahead`, `characterClass`, `negatedCharacterClass`, `range`, `startOfLine`, `endOfLine`, `digit`, `whitespace`, `wordCharacter`, `buildRegex`, `compileRegex`, and `resolvePattern`.
    - Safe group name validation and repetition bounds checking.
    - Strict RegExp flag validation and compilation error wrapping with `RegexCompilationError`.
  - **Module 3: `email-validator`**:
    - RFC 5321/5322 email syntax validation with structured results and detailed error codes.
    - Non-destructive validation: avoids lowercasing local parts while normalizing domain names.
    - Full support for subdomains, plus-tagging, internationalized domain names (IDN/Punycode), optional Unicode local parts, and optional IPv4 literal domains.
    - Public functions: `isValidEmail` and `validateEmail`.
  - **Module 4: `ip-validator`**:
    - Pure TypeScript IPv4 and IPv6 syntax validation with zero external dependencies.
    - Strict IPv4 dotted-decimal validation rejecting ambiguous leading zeros.
    - Complete IPv6 validation supporting `::` compression, IPv4-mapped addresses (`::ffff:x.x.x.x`), and optional Scope IDs / zone indices.
    - RFC 5952 canonical IPv6 normalization.
    - Full IP classification: loopback, private (RFC 1918 / CGNAT / ULA), link-local, multicast, unspecified, and broadcast.
    - CIDR prefix length validation for IPv4 (/0 to /32) and IPv6 (/0 to /128).
    - Public functions: `isIPv4`, `isIPv6`, `isIP`, and `validateIP`.
  - **Build & Quality Assurance**:
    - Dual ESM and CommonJS builds via `tsup`.
    - TypeScript declaration generation (`.d.ts` and `.d.cts`).
    - Zero runtime dependencies.
    - Comprehensive Vitest test suite with 120 tests and >98% statement and line coverage.
