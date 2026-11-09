-- Address line breaks as drawn in the Contact Us Figma frame (1189:6068).
-- Only touches the starting value, never one staff have edited.
UPDATE "SiteSetting"
SET "contactAddress" = E'235, Binnamangala\n13th Cross Road, Indiranagar\nBengaluru, Bengaluru Urban\nKarnataka 560038'
WHERE "id" = 'singleton'
  AND "contactAddress" = E'235, Binnamangala, 13th Cross Road, Indiranagar\nBengaluru, Bengaluru Urban\nKarnataka 560038';
