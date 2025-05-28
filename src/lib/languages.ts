// Map of language codes to names
export const languageMap: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'ar': 'Arabic',
  'uk': 'Ukrainian',
  'ru': 'Russian',
  'de': 'German',
  'zh': 'Chinese',
  'fa': 'Persian',
  'tr': 'Turkish',
  'sw': 'Swahili',
  'hi': 'Hindi',
  'ur': 'Urdu',
  'ps': 'Pashto',
  'so': 'Somali'
};

// Convert language code to name
export function getLanguageName(code: string): string {
  return languageMap[code.toLowerCase()] || code;
}

// Convert language name to code
export function getLanguageCode(name: string): string {
  const normalizedName = name.toLowerCase();
  const entry = Object.entries(languageMap).find(([_, langName]) => 
    langName.toLowerCase() === normalizedName
  );
  return entry ? entry[0] : name.toLowerCase();
}

// Format language for display
export function formatLanguage(language: string): string {
  return getLanguageName(language);
}

// Format language list for display
export function formatLanguages(languages: string[]): string {
  return languages.map(formatLanguage).join(', ');
}