const PASSWORD_REQUIREMENTS = [
  {
    key: 'minLength',
    label: 'At least 8 characters',
    test: (pw) => typeof pw === 'string' && pw.length >= 8
  },
  {
    key: 'uppercase',
    label: 'At least one uppercase letter (A-Z)',
    test: (pw) => typeof pw === 'string' && /[A-Z]/.test(pw)
  },
  {
    key: 'lowercase',
    label: 'At least one lowercase letter (a-z)',
    test: (pw) => typeof pw === 'string' && /[a-z]/.test(pw)
  },
  {
    key: 'number',
    label: 'At least one number (0-9)',
    test: (pw) => typeof pw === 'string' && /[0-9]/.test(pw)
  },
  {
    key: 'special',
    label: 'At least one special character (e.g. @, #, $, !, %)',
    test: (pw) => typeof pw === 'string' && /[^A-Za-z0-9\s]/.test(pw)
  }
];

const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';

/**
 * Validates a password against all strong password requirements.
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validatePasswordStrength = (password) => {
  if (typeof password !== 'string') {
    return { valid: false, errors: PASSWORD_REQUIREMENTS.map((r) => r.label) };
  }

  const errors = PASSWORD_REQUIREMENTS.filter((rule) => !rule.test(password)).map(
    (rule) => rule.label
  );

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  PASSWORD_REQUIREMENTS,
  STRONG_PASSWORD_MESSAGE,
  validatePasswordStrength
};
