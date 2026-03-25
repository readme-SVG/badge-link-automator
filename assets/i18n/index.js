import en from './en.js';
import zh from './zh.js';
import es from './es.js';
import fr from './fr.js';
import pt from './pt.js';
import ru from './ru.js';
import ja from './ja.js';
import de from './de.js';
import uk from './uk.js';
import pl from './pl.js';
import nl from './nl.js';
import kk from './kk.js';
import sv from './sv.js';
import cs from './cs.js';

export const DEFAULT_LOCALE = 'en';

export const TRANSLATIONS = {
    en,
    zh,
    es,
    fr,
    pt,
    ru,
    ja,
    de,
    uk,
    pl,
    nl,
    kk,
    sv,
    cs
};

export const LOCALE_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'pt', label: 'Português' },
    { code: 'ru', label: 'Русский' },
    { code: 'ja', label: '日本語' },
    { code: 'de', label: 'Deutsch' },
    { code: 'uk', label: 'Українська' },
    { code: 'pl', label: 'Polski' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'kk', label: 'Қазақша' },
    { code: 'sv', label: 'Svenska' },
    { code: 'cs', label: 'Čeština' }
];

const REQUIRED_KEYS = Object.keys(TRANSLATIONS[DEFAULT_LOCALE]);

function validateTranslationKeys() {
    Object.entries(TRANSLATIONS).forEach(([localeCode, localeDictionary]) => {
        if (localeCode === DEFAULT_LOCALE) return;

        const localeKeys = Object.keys(localeDictionary);
        const missing = REQUIRED_KEYS.filter((key) => !localeKeys.includes(key));
        const extra = localeKeys.filter((key) => !REQUIRED_KEYS.includes(key));

        // Warn for missing keys (will fallback to default locale)
        if (missing.length) {
            console.warn(
                `Locale "${localeCode}" missing keys (will use English fallback): [${missing.join(', ')}]`
            );
        }
        // Throw for extra keys (likely a typo/stale key)
        if (extra.length) {
            throw new Error(
                `Locale "${localeCode}" has extra keys: [${extra.join(', ')}]`
            );
        }
    });
}

validateTranslationKeys();

export function isSupportedLocale(localeCode) {
    return Object.prototype.hasOwnProperty.call(TRANSLATIONS, localeCode);
}

export function getLocaleDictionary(localeCode) {
    return TRANSLATIONS[localeCode] || TRANSLATIONS[DEFAULT_LOCALE];
}
