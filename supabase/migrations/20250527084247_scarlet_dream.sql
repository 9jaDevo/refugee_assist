/*
  # Normalize language data

  1. Changes
    - Add function to normalize language codes
    - Update existing services to use normalized language codes
    - Add trigger to enforce normalized language codes on insert/update

  2. Security
    - No changes to RLS policies
*/

-- Create function to normalize language codes
CREATE OR REPLACE FUNCTION normalize_language_code(lang text)
RETURNS text AS $$
BEGIN
  -- Convert full names to ISO codes
  RETURN CASE LOWER(lang)
    WHEN 'english' THEN 'en'
    WHEN 'spanish' THEN 'es'
    WHEN 'french' THEN 'fr'
    WHEN 'arabic' THEN 'ar'
    WHEN 'ukrainian' THEN 'uk'
    WHEN 'russian' THEN 'ru'
    WHEN 'german' THEN 'de'
    WHEN 'chinese' THEN 'zh'
    WHEN 'persian' THEN 'fa'
    WHEN 'turkish' THEN 'tr'
    WHEN 'swahili' THEN 'sw'
    WHEN 'hindi' THEN 'hi'
    WHEN 'urdu' THEN 'ur'
    WHEN 'pashto' THEN 'ps'
    WHEN 'somali' THEN 'so'
    ELSE LOWER(lang) -- Keep as-is if already a code
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to normalize language array
CREATE OR REPLACE FUNCTION normalize_languages(langs text[])
RETURNS text[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT DISTINCT normalize_language_code(lang)
    FROM unnest(langs) AS lang
    WHERE lang IS NOT NULL AND lang != ''
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing services to use normalized language codes
UPDATE services
SET languages = normalize_languages(languages)
WHERE EXISTS (
  SELECT 1 FROM unnest(languages) AS lang
  WHERE length(lang) > 2
);

-- Create trigger to normalize languages on insert/update
CREATE OR REPLACE FUNCTION normalize_languages_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.languages = normalize_languages(NEW.languages);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_languages_on_change
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION normalize_languages_trigger();