import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, normalizeLanguage, type Language } from '../i18n';

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const current: Language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs ${className || ''}`}
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const isActive = current === lng;
        const baseClasses =
          'rounded-full px-2 py-0.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-black';
        const stateClasses = isActive
          ? 'bg-black text-white'
          : 'text-neutral-600 hover:bg-neutral-100';

        const labelKey =
          lng === 'en' ? 'language_en' : lng === 'fr' ? 'language_fr' : 'language_ar';

        return (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            className={`${baseClasses} ${stateClasses}`}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

