/**
 * @rahul_dadhich15/regex-validation-toolkit
 * Production-ready, dependency-free toolkit for reusable regex patterns,
 * composable regex construction, robust email validation, and strict IPv4/IPv6 validation.
 */

// Error hierarchy
export * from './errors.js';

// Module 1: Reusable regex patterns
export * from './regex-patterns/index.js';

// Module 2: Composable regex builder
export * from './regex-builder/index.js';

// Module 3: Email syntax validator
export * from './email-validator/index.js';

// Module 4: IPv4 and IPv6 validator
export * from './ip-validator/index.js';
