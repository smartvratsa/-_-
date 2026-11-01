import dns from 'dns';

// Known popular domains with correct spellings
export const KNOWN_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.bg': 'gmail.com',
  'abv.com': 'abv.bg',
  'avb.bg': 'abv.bg',
  'abw.bg': 'abv.bg',
  'abv.net': 'abv.bg',
  'mail.com': 'mail.bg',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
};

// Known temporary/disposable email domains that are not permitted
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'yopmail.com',
  'trashmail.com',
  'dispostable.com',
  'fakemailgenerator.com',
  'getairmail.com',
  'throwawaymail.com',
  'crazymailing.com',
  'mytemp.email',
  'mohmal.com',
  'generator.email',
  'dropmail.me',
]);

export interface EmailValidationResult {
  valid: boolean;
  email: string;
  domain: string;
  mxFound: boolean;
  suggestedCorrection?: string;
  error?: string;
}

/**
 * Validates syntax, disposable check, common typos, and DNS MX record existence.
 */
export async function validateEmailExistence(emailInput: string): Promise<EmailValidationResult> {
  const email = (emailInput || '').trim().toLowerCase();

  // 1. Basic format / regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    return {
      valid: false,
      email,
      domain: '',
      mxFound: false,
      error: 'Моля, въведете коректен формат на имейл (напр. име@domain.bg).',
    };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return {
      valid: false,
      email,
      domain: '',
      mxFound: false,
      error: 'Невалидна структура на имейл адреса.',
    };
  }

  const localPart = parts[0];
  const domain = parts[1];

  if (localPart.length < 1 || domain.length < 3) {
    return {
      valid: false,
      email,
      domain,
      mxFound: false,
      error: 'Прекалено кратък имейл адрес или домейн.',
    };
  }

  // 2. Check disposable email blacklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      email,
      domain,
      mxFound: false,
      error: 'Временни или еднократни пощенски кутии не са разрешени за доброволци във Враца.',
    };
  }

  // 3. Typo detection in popular domains
  if (KNOWN_DOMAINS[domain]) {
    const suggestedDomain = KNOWN_DOMAINS[domain];
    const suggestedCorrection = `${localPart}@${suggestedDomain}`;
    return {
      valid: false,
      email,
      domain,
      mxFound: false,
      suggestedCorrection,
      error: `Възможна грешка в домейна. Имахте ли предвид ${suggestedCorrection}?`,
    };
  }

  // 4. DNS MX Record lookup (checks if domain actually exists on internet and receives email)
  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      // Fallback: check A/AAAA record
      try {
        const aRecords = await dns.promises.resolve4(domain);
        if (!aRecords || aRecords.length === 0) {
          return {
            valid: false,
            email,
            domain,
            mxFound: false,
            error: `Домейнът "${domain}" не разполага с работещ пощенски сървър за получаване на писма.`,
          };
        }
      } catch {
        return {
          valid: false,
          email,
          domain,
          mxFound: false,
          error: `Домейнът "${domain}" не съществува в глобалната DNS мрежа.`,
        };
      }
    }

    return {
      valid: true,
      email,
      domain,
      mxFound: true,
    };
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'SERVFAIL') {
      return {
        valid: false,
        email,
        domain,
        mxFound: false,
        error: `Домейнът "${domain}" не съществува или няма активен пощенски сървър (MX запис).`,
      };
    }

    // If DNS query timed out or had a transient network issue, allow standard known domains
    if (['gmail.com', 'abv.bg', 'mail.bg', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(domain)) {
      return {
        valid: true,
        email,
        domain,
        mxFound: true,
      };
    }

    return {
      valid: false,
      email,
      domain,
      mxFound: false,
      error: `Неуспешна проверка на пощенския домейн "${domain}". Моля, уверете се, че имейлът е реален.`,
    };
  }
}
