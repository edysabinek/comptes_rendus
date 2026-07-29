// validator.js
// Analyse le texte brut des notes Samsung Note et remonte les erreurs et avertissements de saisie.

export function validateSamsungNote(text) {
  const issues = [];
  if (!text || !text.trim()) return issues;

  const blocks = text.split(/≈≈===≈/);

  blocks.forEach((block, blockIndex) => {
    const dayMatch = block.match(/^\s*(\d{2})/m);
    const day = dayMatch ? `Jour ${dayMatch[1]}` : `Bloc #${blockIndex + 1}`;

    const lines = block.split(/\r?\n/);

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 1. Détection des lignes d'activités avec heures
      const activityKeywords = ['PS', 'LB', 'ADG', 'RDQD', 'PEG', 'LLC', 'EV', 'Matin', 'Culte F', 'Autre'];
      const activityLine = stripLeadingMarkers(trimmed);
      
      const startsWithKey = activityKeywords.some(key => 
        new RegExp(`^${key}\\b`, 'i').test(activityLine)
      );

      const timeMatch = activityLine.match(/(\d{1,2}h\d{2})\s*(?:[-‐‑‒–—]|a|à)\s*(\d{1,2}h\d{2})/i);

      if (startsWithKey && /[=:]/.test(activityLine) && !/^PEG\s*:?\s*$/i.test(activityLine)) {
        if (!timeMatch) {
          if (!activityLine.toLowerCase().startsWith('livre')) {
            issues.push({
              day,
              line: trimmed,
              type: 'warning',
              message: `Ligne d'activité mal formée (format attendu: "ACTIVITE = 08h00 - 09h00")`
            });
          }
        } else {
          const startStr = timeMatch[1];
          const endStr = timeMatch[2];

          const [sh, sm] = startStr.split('h').map(Number);
          const [eh, em] = endStr.split('h').map(Number);

          if (sh > 23 || eh > 23 || sm > 59 || em > 59) {
            issues.push({
              day,
              line: trimmed,
              type: 'error',
              message: `Heure ou minute invalide (${startStr} à ${endStr})`
            });
          } else {
            const startMinutes = sh * 60 + sm;
            const endMinutes = eh * 60 + em;

            if (endMinutes < startMinutes) {
              issues.push({
                day,
                line: trimmed,
                type: 'error',
                message: `Heure de fin (${endStr}) antérieure à l'heure de début (${startStr}) - Durée négative !`
              });
            }
          }
        }
      }

      // 2. Contrôle spécifique LB (Lectures bibliques)
      if (/^LB\b/i.test(activityLine) && activityLine.includes(':')) {
        const afterColon = activityLine.split(':')[1]?.trim();
        if (afterColon) {
          const refs = afterColon.split(/[,;]/).map(r => r.trim()).filter(Boolean);
          refs.forEach(ref => {
            const rangeMatch = ref.match(/(\d+)\s*(?:[-‐‑‒–—]\s*(\d+))?\s*$/);
            if (rangeMatch) {
              const before = ref.slice(0, rangeMatch.index).trim();
              if (!before || !/[a-zA-Z\p{L}]/u.test(before)) {
                issues.push({
                  day,
                  line: trimmed,
                  type: 'warning',
                  message: `Référence biblique "${ref}" sans nom de livre devant la plage`
                });
              } else if (rangeMatch[2]) {
                const startChap = parseInt(rangeMatch[1], 10);
                const endChap = parseInt(rangeMatch[2], 10);
                if (endChap < startChap) {
                  issues.push({
                    day,
                    line: trimmed,
                    type: 'warning',
                    message: `Plage de chapitres inversée (${startChap} à ${endChap}) dans "${ref}"`
                  });
                }
              }
            }
          });
        }
      }

      // 3. Contrôle spécifique LLC (Lecture de livre)
      if (/^LLC\b/i.test(activityLine)) {
        if (!activityLine.includes('[') || !activityLine.includes(']')) {
          issues.push({
            day,
            line: trimmed,
            type: 'warning',
            message: `Format LLC incomplet : les crochets [p X - p Y] sont requis`
          });
        } else {
          const bracketContent = activityLine.match(/\[([^\]]*)\]/)?.[1];
          if (bracketContent) {
            const pageMatch = bracketContent.match(/p\s*(\d+)\s*[-‐‑‒–—]\s*p\s*(\d+)/i);
            if (pageMatch) {
              const pStart = parseInt(pageMatch[1], 10);
              const pEnd = parseInt(pageMatch[2], 10);
              if (pEnd < pStart) {
                issues.push({
                  day,
                  line: trimmed,
                  type: 'warning',
                  message: `Plage de pages inversée (p ${pStart} - p ${pEnd})`
                });
              }
            }
          }
        }
      }
    });
  });

  return issues;
}

function stripLeadingMarkers(line) {
  return line.replace(/^[^\p{L}\d]*(?=(?:PS|LB|ADG|RDQD|PEG|LLC|EV|Matin|Culte F|Autre)\b)/iu, '');
}
