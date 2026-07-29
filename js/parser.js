// parser.js
// Parse le texte Samsung Note en lignes d'activités détaillées

export function parseSamsungNote(text, year, month) {
  const activities = [];
  const blocks = text.split(/≈≈===≈/);

  blocks.forEach(block => {
    const dayMatch = block.match(/^\s*(\d{2})/m);
    if (!dayMatch) return;

    const day = dayMatch[1];
    const date = `${day}/${month}/${year}`;

    // LB : ([\p{L}0-9 -_|+*]*?)
    extract(block, /LB\s*=\s*(\d{1,2}h\d{2})\s*(?:[-‐‑‒–—]|a|à)\s*(\d{1,2}h\d{2})\s*:\s*([\p{L}0-9 -_|+*]*?)(?:\r?\n|$)/giu,
      m => activities.push(row(date, day, 'LB', m[1], m[2], m[3]))
    );

    // PS (capture le commentaire pour extraction de thème)
    extract(block, /PS\s*=\s*(\d{1,2}h\d{2})\s*(?:[-‐‑‒–—]|a|à)\s*(\d{1,2}h\d{2})\s*:?\s*([\p{L}0-9 -_|+*]*?)(?:\r?\n|$)/giu,
      m => activities.push(row(date, day, 'PS', m[1], m[2], m[3]))
    );

    // ADG
    extract(block, /ADG\s*=\s*(\d{1,2}h\d{2})\s*(?:[-‐‑‒–—]|a|à)\s*(\d{1,2}h\d{2})/gi,
      m => activities.push(row(date, day, 'ADG', m[1], m[2], m[3]))
    );

    // RDQD
    extract(block, /RDQD\s*=\s*(\d{1,2}h\d{2})\s*(?:[-‐‑‒–—]|a|à)\s*(\d{1,2}h\d{2})\s*:?\s*([\p{L}0-9 -_|+*]*?)(?:\r?\n|$)/giu,
      m => activities.push(row(date, day, 'RDQD', m[1], m[2], m[3]))
    );

    // PEG
    extract(block, /(Matin|Culte F|Autre)\s*=\s*(\d{1,2}h\d{2})\s*(?:[-‐‑‒–—]|a|à)\s*(\d{1,2}h\d{2})/gi,
      m => activities.push(row(date, day, `PEG_${normalize(m[1])}`, m[2], m[3], ''))
    );

    // LLC
    extract(block, /LLC\s*=\s*(\d{1,2}h\d{2})\s*(?:[-‐‑‒–—]|a|à)\s*(\d{1,2}h\d{2})\s*\[([^\]]*)\]/gi,
      m => activities.push(row(date, day, 'LLC', m[1], m[2], m[3]))
    );

    // LLC : Nom du livre.
    let livre = block.match(/Livre\s*=\s*([\p{L}0-9 -_|+*]*?)(?:\r?\n|$)/iu);
    if (livre) {
        activities.push({
                            Date: date,
                            Jour: day,
                            Activité: 'Livre',
                            Accomplie: 1,
                            Heure_Debut: '00:00',
                            Heure_Fin: '00:00',
                            Duree: '00:00',
                            Duree_minutes: 0,
                            'Commentaire': livre[1]
                          })
    }

    // EV
    extract(block, /EV\s*=\s*(\d{1,2}h\d{2})\s*[-‐‑‒–—]\s*(\d{1,2}h\d{2})/gi,
      m => activities.push(row(date, day, 'EV', m[1], m[2], ''))
    );

    // Jeunes
    extract(block, /✅️\s*Jeune\s*=\s*(Partiel|Complet)/gi,
      m => activities.push(applyJeuneToDay(date, day, m[1]))
    );
  });

  return activities;
}

// Helpers
function row(date, day, activity, start, end, comment) {
  return {
    Date: date,
    Jour: day,
    Activité: activity,
    Accomplie: activity_done(start, end),
    Heure_Debut: formatTime(start),
    Heure_Fin: formatTime(end),
    Duree: duration(start, end),
    Duree_minutes: duration_minutes(start, end),
    'Commentaire': comment?.trim() || ''
  };
}

function formatTime(timeStr) {
  if (!timeStr) return '00:00';
  const [h, m] = timeStr.split('h');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function duration_minutes(s, e) {
  const [sh, sm] = s.split('h').map(Number);
  const [eh, em] = e.split('h').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function duration(s, e) {
  const m = duration_minutes(s, e);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function activity_done(s, e) {
  const m = duration_minutes(s, e);
  if (m == 0) return 0;
  return 1;
}

function extract(text, regex, cb) {
  [...text.matchAll(regex)].forEach(cb);
}

function normalize(str) {
  return str.replace(' ', '');
}

function applyJeuneToDay(date, day, comment) {
  let activite = 'JP';

  if (comment.toLowerCase() === 'complet') {
    activite = 'JC';
  }
  return {
    Date: date,
    Jour: day,
    Activité: activite,
    Accomplie: 1,
    Heure_Debut: '00:00',
    Heure_Fin: '00:00',
    Duree: '00:00',
    Duree_minutes: 0,
    'Commentaire': 'Jeune ' + comment?.trim() || ''
  };
}
