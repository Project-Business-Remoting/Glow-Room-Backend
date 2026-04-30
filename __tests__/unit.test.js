// ============================================================
//  __tests__/unit.test.js — Tests unitaires
//  Glow Room Backend
// ============================================================

// ─── Helpers purs ────────────────────────────────────────────

function isValidIsoDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function moneyCADFromCents(cents) {
  if (typeof cents !== 'number') return '';
  return `${(cents / 100).toFixed(2).replace('.', ',')} $ CAD`;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isCancelledStatus(status) {
  const s = String(status || '').toLowerCase();
  return s === 'annulé' || s === 'annule' || s === 'cancelled' || s === 'canceled';
}

// ─── Tests ───────────────────────────────────────────────────

describe('isValidIsoDate', () => {
  test('accepte une date valide YYYY-MM-DD', () => {
    expect(isValidIsoDate('2026-05-15')).toBe(true);
  });

  test('rejette une date invalide', () => {
    expect(isValidIsoDate('15/05/2026')).toBe(false);
    expect(isValidIsoDate('2026-5-1')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });
});

describe('moneyCADFromCents', () => {
  test('convertit 2500 centimes en 25,00 $ CAD', () => {
    expect(moneyCADFromCents(2500)).toBe('25,00 $ CAD');
  });

  test('convertit 1500 centimes en 15,00 $ CAD', () => {
    expect(moneyCADFromCents(1500)).toBe('15,00 $ CAD');
  });

  test('retourne une chaîne vide si non-number', () => {
    expect(moneyCADFromCents('2500')).toBe('');
    expect(moneyCADFromCents(null)).toBe('');
    expect(moneyCADFromCents(undefined)).toBe('');
  });
});

describe('esc (XSS protection)', () => {
  test('échappe les caractères HTML dangereux', () => {
    expect(esc('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('laisse les chaînes normales intactes', () => {
    expect(esc('Illan Panhuis')).toBe('Illan Panhuis');
  });

  test('gère null et undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

describe('isCancelledStatus', () => {
  test('reconnaît les statuts annulés en FR et EN', () => {
    expect(isCancelledStatus('annulé')).toBe(true);
    expect(isCancelledStatus('annule')).toBe(true);
    expect(isCancelledStatus('cancelled')).toBe(true);
    expect(isCancelledStatus('canceled')).toBe(true);
  });

  test('est insensible à la casse', () => {
    expect(isCancelledStatus('ANNULÉ')).toBe(true);
    expect(isCancelledStatus('Cancelled')).toBe(true);
  });

  test('retourne false pour un statut actif', () => {
    expect(isCancelledStatus('en_attente')).toBe(false);
    expect(isCancelledStatus('confirmé')).toBe(false);
    expect(isCancelledStatus('')).toBe(false);
    expect(isCancelledStatus(null)).toBe(false);
  });
});

describe('lang validation', () => {
  function normalizeLang(lang) {
    return lang === 'en' ? 'en' : 'fr';
  }

  test('accepte "en" comme langue anglaise', () => {
    expect(normalizeLang('en')).toBe('en');
  });

  test('utilise "fr" par défaut pour tout autre valeur', () => {
    expect(normalizeLang('fr')).toBe('fr');
    expect(normalizeLang(undefined)).toBe('fr');
    expect(normalizeLang(null)).toBe('fr');
    expect(normalizeLang('es')).toBe('fr');
  });
});

describe('DEPOSIT_CENTS', () => {
  const DEPOSIT_CENTS = 2500;

  test('le dépôt est de 25,00 $ CAD', () => {
    expect(moneyCADFromCents(DEPOSIT_CENTS)).toBe('25,00 $ CAD');
  });
});
