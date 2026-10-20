/**
 * Base error class for all errors thrown by @rahul_dadhich15/regex-validation-toolkit.
 */
export class RegexToolkitError extends Error {
  public override readonly name: string = 'RegexToolkitError';

  constructor(message: string) {
    super(message);
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when constructing a regular expression fails (e.g., invalid repetition count or group name).
 */
export class RegexBuilderError extends RegexToolkitError {
  public override readonly name: string = 'RegexBuilderError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when compiling a regular expression fails (e.g., invalid or duplicate flags, syntax errors).
 */
export class RegexCompilationError extends RegexToolkitError {
  public override readonly name: string = 'RegexCompilationError';
  public override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when an invalid option or parameter is supplied.
 */
export class InvalidOptionError extends RegexToolkitError {
  public override readonly name: string = 'InvalidOptionError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
