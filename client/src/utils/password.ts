export interface PasswordRequirementResult {
  key: string;
  label: string;
  met: boolean;
}

export const PASSWORD_RULES: Array<{
  key: string;
  label: string;
  test: (password: string) => boolean;
}> = [
  {
    key: 'minLength',
    label: 'Minimum 8 characters',
    test: (pw) => pw.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'At least one uppercase letter (A-Z)',
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    key: 'lowercase',
    label: 'At least one lowercase letter (a-z)',
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    key: 'number',
    label: 'At least one number (0-9)',
    test: (pw) => /[0-9]/.test(pw),
  },
  {
    key: 'special',
    label: 'At least one special character (@, #, $, !, %)',
    test: (pw) => /[^A-Za-z0-9\s]/.test(pw),
  },
];

export const evaluatePassword = (password: string): {
  results: PasswordRequirementResult[];
  isValid: boolean;
} => {
  const results = PASSWORD_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    met: rule.test(password),
  }));

  return {
    results,
    isValid: results.every((r) => r.met),
  };
};
