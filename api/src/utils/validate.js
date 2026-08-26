'use strict';

// Server-side input validation & sanitization helpers.
// Closes audit findings #11 (Improper Input Validation, CWE-20) and
// #12 (Improper Server-Side Validation, CWE-20): all incoming values are
// validated and sanitized on the server regardless of any client-side checks.

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

// Strip HTML tags and neutralize angle brackets / control characters so stored
// values cannot carry an XSS payload into any consumer that renders them.
function sanitizeText(value) {
  if (value === undefined || value === null) return value;
  return (
    String(value)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, " ") // control chars incl. NUL
      .replace(/<[^>]*>/g, '') // HTML tags
      .replace(/[<>]/g, '') // stray angle brackets
      .trim()
  );
}

// Validates a single string field against required / length rules and returns
// the sanitized value. Throws ValidationError on violation.
function validateString(
  value,
  field,
  { required = false, max = 500, min = 0 } = {}
) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  const clean = sanitizeText(value);
  if (required && clean.length < Math.max(1, min)) {
    throw new ValidationError(`${field} is required`);
  }
  if (min && clean.length < min) {
    throw new ValidationError(`${field} must be at least ${min} characters`);
  }
  if (clean.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters`);
  }
  return clean;
}

// Parses a YYYY-MM-DD (or ISO) date string, rejecting anything that is not a
// real date. Returns a Date or undefined.
function validateDate(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`${field} is not a valid date`);
  }
  return d;
}

// Coerces to a bounded positive integer, falling back to a default.
function toBoundedInt(value, { def, min = 1, max = 1000 } = {}) {
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

module.exports = {
  ValidationError,
  sanitizeText,
  validateString,
  validateDate,
  toBoundedInt,
};
