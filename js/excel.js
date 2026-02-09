// excel.js
// Génération Excel avec ExcelJS (support couleurs personnalisées)
export function parseFRDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
}

export async function generateExcel(journal, label, themes, exportType = 'monthly') {
  const workbook = new ExcelJS.Workbook();

  if (exportType === 'monthly') {
    await createMonthlyExcel(workbook, journal, label, themes);
  } else if (exportType === 'yearly') {
    await createYearlyExcel(workbook, journal, label, themes);
  }

  // Télécharger le fichier
  const buffer = await workbook.xlsx.writeBuffer();
  downloadExcel(buffer, `Journal_${label}.xlsx`);
}


// === EXPORT MENSUEL ===
async function createMonthlyExcel(workbook, journal, monthLabel, themes) {
  // FEUILLE 1 : Journal détaillé
  createDetailedSheet(workbook, journal, 'Detail');

  // FEUILLE 2 : Résumé mensuel (avec totaux hebdo)
  createMonthlyResumeSheet(workbook, journal, monthLabel);

  // FEUILLE 3 : Analyse par thèmes
  createThemeAnalysisSheet(workbook, journal, themes, 'Themes_Priere');
}

// === EXPORT ANNUEL ===
async function createYearlyExcel(workbook, journal, year, themes) {
  // FEUILLE 1 : Vue complète de l'année
  createDetailedSheet(workbook, journal, 'Journal_Complet');

  // FEUILLE 2-13 : Un onglet par mois
  for (let month = 1; month <= 12; month++) {
    const monthData = filterByMonth(journal, parseInt(year), month);
    if (monthData.length > 0) {
      const monthName = getMonthName(month);
      createMonthlyResumeSheet(workbook, monthData, monthName);
    }
  }

  // DERNIÈRE FEUILLE : Analyse thèmes annuelle
  createThemeAnalysisSheet(workbook, journal, themes, `Themes_${year}`);
}

// FEUILLE 1 : Journal détaillé
function createDetailedSheet(workbook, journal, sheetName) {
  const ws = workbook.addWorksheet(sheetName);

  // Définir les colonnes
  ws.columns = [
    { header: 'Date', key: 'Date', width: 12 },
    { header: 'Jour', key: 'Jour', width: 8 },
    { header: 'Activité', key: 'Activité', width: 15 },
    { header: 'Accomplie', key: 'Accomplie', width: 10 },
    { header: 'Heure Début', key: 'Heure_Debut', width: 12 },
    { header: 'Heure Fin', key: 'Heure_Fin', width: 12 },
    { header: 'Durée', key: 'Duree', width: 10 },
    { header: 'Durée (min)', key: 'Duree_minutes', width: 12 },
    { header: 'Commentaire', key: 'Commentaire', width: 40 }
  ];

  // Styliser l'en-tête
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6366F1' }
  };
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 25;

  // Ajouter les données
  journal.forEach((row, index) => {
    const excelRow = ws.addRow(row);

    // Alterner les couleurs de fond
    if (index % 2 === 0) {
      excelRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }

    // Colorer selon l'activité
    const activityColors = {
      'LB': 'FFE0E7FF',
      'PS': 'FFDCFCE7',
      'ADG': 'FFDCFCE7',
      'RDQD': 'FFFEF3C7',
      'LLC': 'FFFCE7F3',
      'EV': 'FFFED7AA',
      'JC': 'FFE9D5FF',
      'JP': 'FFE9D5FF'
    };

    const activity = row.Activité?.toString() || '';
    const activityKey = activity.split('_')[0];
    const color = activityColors[activityKey];

    if (color) {
      excelRow.getCell('Activité').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color }
      };
    }

    // Mettre en gras si accomplie
    if (row.Accomplie === 1) {
      excelRow.getCell('Accomplie').font = { bold: true, color: { argb: 'FF16A34A' } };
      excelRow.getCell('Accomplie').value = '✓';
    }
  });

  // Masquer la colonne Duree_minutes
  ws.getColumn('Duree_minutes').hidden = true;

  // Ajouter des bordures
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });
}

// FEUILLE 2 : Résumé mensuel avec totaux hebdomadaires (ISO 8601)
function createMonthlyResumeSheet(workbook, journal, monthLabel) {
  const ws = workbook.addWorksheet(monthLabel);
  const byDay = aggregate_all_with_iso_weeks(journal);
  const rows = Object.values(byDay);

  // Définir les colonnes
  ws.columns = [
    { header: 'Date', key: 'Date', width: 15 },
    { header: 'LB Livres', key: 'LB_livres', width: 30 },
    { header: 'LB Nb', key: 'LB_NB', width: 10 },
    { header: 'LB Durée', key: 'LB_Duree', width: 12 },
    { header: 'PS Nb', key: 'PS_NB', width: 10 },
    { header: 'PS Durée', key: 'PS_Duree', width: 12 },
    { header: 'RDQD Nb', key: 'RDQD_NB', width: 10 },
    { header: 'RDQD Durée', key: 'RDQD_Duree', width: 12 },
    { header: 'PEG Nb', key: 'PEG_NB', width: 10 },
    { header: 'PEG Durée', key: 'PEG_Duree', width: 12 },
    { header: 'Livre', key: 'LLC_Nom_Livre', width: 30 },
    { header: 'LLC Nb Pages', key: 'LLC_NB', width: 12 },
    { header: 'LLC Durée', key: 'LLC_Duree', width: 12 },
    { header: 'JP', key: 'JP', width: 8 },
    { header: 'JC', key: 'JC', width: 8 },
    { header: 'Évang', key: 'Evang', width: 10 }
  ];

  // Styliser l'en-tête
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF8B5CF6' }
  };
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 25;

  // Ajouter les données
  rows.forEach((row, index) => {
    const excelRow = ws.addRow(row);

    // Colorer les lignes de total semaine
    if (row.Date?.toString().startsWith('Semaine')) {
      excelRow.font = { bold: true, color: { argb: 'FF6366F1' } };
      excelRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E7FF' }
      };
    }
    // Colorer le total mois
    else if (row.Date?.toString().startsWith('Total')) {
      excelRow.font = { bold: true };
      excelRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' }
      };
    }
    // Alterner les couleurs pour les jours
    else if (index % 2 === 0) {
      excelRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }

    // Convertir les durées en format HH:MM
    ['LB_Duree', 'PS_Duree', 'RDQD_Duree', 'PEG_Duree', 'LLC_Duree', 'Evang'].forEach(col => {
      const cell = excelRow.getCell(col);
      if (typeof cell.value === 'number' && cell.value > 0) {
        cell.value = toHHMM(cell.value);
      }
    });
  });

  // Bordures
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });
}

// FEUILLE 3 : Analyse par thèmes (sujets de prière PS)
function createThemeAnalysisSheet(workbook, journal, themes, sheetName) {
  const ws = workbook.addWorksheet(sheetName);

  // Analyser les données par thème
  const themeStats = analyzeByPSTheme(journal, themes);

  // Titre
  ws.mergeCells('A1:D1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'ANALYSE DU TEMPS DE PRIÈRE PAR SUJET';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF6366F1' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // En-têtes
  ws.addRow([]);
  const headerRow = ws.addRow(['Sujet', 'Temps Total (min)', 'Temps (HH:MM)', 'Nombre d\'occurrences']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6366F1' }
  };
  headerRow.height = 25;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Données
  themeStats.forEach((stat, index) => {
    const row = ws.addRow([
      stat.theme,
      stat.totalMinutes,
      toHHMM(stat.totalMinutes),
      stat.count
    ]);

    // Couleur du thème
    const themeConfig = themes.find(t => t.name === stat.theme);
    if (themeConfig) {
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF' + themeConfig.color.slice(1) }
      };
      row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // Alterner couleurs
    if (index % 2 === 0) {
      [2, 3, 4].forEach(colNum => {
        row.getCell(colNum).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        };
      });
    }
  });

  // Largeurs des colonnes
  ws.getColumn(1).width = 25;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 20;

  // Total général
  if (themeStats.length > 0) {
    const totalMinutes = themeStats.reduce((sum, s) => sum + s.totalMinutes, 0);
    const totalCount = themeStats.reduce((sum, s) => sum + s.count, 0);

    ws.addRow([]);
    const totalRow = ws.addRow(['TOTAL', totalMinutes, toHHMM(totalMinutes), totalCount]);
    totalRow.font = { bold: true, size: 12 };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' }
    };
  }

  // Bordures
  ws.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    }
  });
}

// Analyser le journal par thème (basé sur commentaires PS)
function analyzeByPSTheme(journal, themes) {
  const stats = {};

  journal.forEach(entry => {
    if (entry.Activité === 'PS' && entry.Accomplie === 1 && entry.Commentaire) {
      const comment = entry.Commentaire.toLowerCase();

      // Vérifier chaque thème défini
      themes.forEach(theme => {
        if (comment.includes(theme.name.toLowerCase())) {
          if (!stats[theme.name]) {
            stats[theme.name] = { theme: theme.name, totalMinutes: 0, count: 0 };
          }
          stats[theme.name].totalMinutes += entry.Duree_minutes || 0;
          stats[theme.name].count += 1;
        }
      });
    }
  });

  // Convertir en tableau et trier par temps total
  return Object.values(stats).sort((a, b) => b.totalMinutes - a.totalMinutes);
}

// === FONCTIONS UTILITAIRES ===

function toHHMM(duration) {
  return `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;
}

function downloadExcel(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

// === FONCTIONS D'AGRÉGATION (identiques à l'original) ===

function initDay(date) {
  return {
    Date: date,
    LB_livres: '',
    LB_NB: 0,
    LB_Duree: 0,
    PS_NB: 0,
    PS_Duree: 0,
    RDQD_NB: 0,
    RDQD_Duree: 0,
    PEG_NB: 0,
    PEG_Duree: 0,
    LLC_Nom_Livre: '',
    LLC_NB: 0,
    LLC_Duree: 0,
    JP: 0,
    JC: 0,
    Evang: 0
  };
}

function aggregate(d, r, semaineTotal, moisTotal) {
  const min = r.Duree_minutes;

  if (r.Accomplie == 0) return;

  if (r.Activité === 'LB') {
    let chaps = countChapters(r['Commentaire']);
    d.LB_livres = d.LB_livres + '\n' + r['Commentaire'];
    d.LB_NB += chaps;
    d.LB_Duree += min;

    // On cumule les données
    semaineTotal.LB_NB += chaps;
    moisTotal.LB_NB += chaps;
    semaineTotal.LB_Duree += min;
    moisTotal.LB_Duree += min;
  }

  if (['PS', 'ADG'].includes(r.Activité)) {
    d.PS_NB += 1;
    d.PS_Duree += min;

    // On cumule les données
    semaineTotal.PS_NB += 1;
    moisTotal.PS_NB += 1;
    semaineTotal.PS_Duree += min;
    moisTotal.PS_Duree += min;
  }

  if (['RDQD'].includes(r.Activité)) {
    d.RDQD_NB += 1;
    d.RDQD_Duree += min;

    // On cumule les données
    semaineTotal.RDQD_NB += 1;
    moisTotal.RDQD_NB += 1;
    semaineTotal.RDQD_Duree += min;
    moisTotal.RDQD_Duree += min;
  }

  if (r.Activité.startsWith('PEG')) {
    d.PEG_NB += 1;
    d.PEG_Duree += min;

    // On cumule les données
    semaineTotal.PEG_NB += 1;
    moisTotal.PEG_NB += 1;
    semaineTotal.PEG_Duree += min;
    moisTotal.PEG_Duree += min;
  }

  if (r.Activité === 'Livre') {
        d.LLC_Nom_Livre = d.LLC_Nom_Livre + '\n' + r['Commentaire'];
  }

  if (r.Activité === 'LLC') {
    let pages = countPages(r.Commentaire);
    d.LLC_Duree += min;
    d.LLC_NB += pages;

    // On cumule les données
    semaineTotal.LLC_NB += pages;
    moisTotal.LLC_NB += pages;
    semaineTotal.LLC_Duree += min;
    moisTotal.LLC_Duree += min;
  }

  if (r.Activité === 'EV') {
    d.Evang += min;
    semaineTotal.Evang += min;
    moisTotal.Evang += min;
  }

  if (r.Activité === 'JC') {
    d.JC += 1;

    // On fait le cumul
    semaineTotal.JC += 1;
    moisTotal.JC += 1;
  }

  if (r.Activité === 'JP') {
    d.JP += 1;

    // On fait le cumul
    semaineTotal.JP += 1;
    moisTotal.JP += 1;
  }
}

function countChapters(txt) {
  const m = txt.match(/(\d+)\s*(?:-|a|à)*\s*(\d*)/i);
  if (!m) return 0;
  if (m[1] && !m[2]) return 1;
  return Number(m[2]) - Number(m[1]) + 1;
}

function countPages(txt) {
  const m = txt.match(/p\s*(\d*)\s-\s*p\s*(\d*)/i);
  if (!m) return 0;
  return Number(m[2]) - Number(m[1]) + 1;
}

function aggregate_all_with_iso_weeks(journal) {
  let byDay = {};
  let weeklyTotals = {};
  let moisTotal = { Date: 'Total Mois', LB_livres: '', LB_NB: 0, LB_Duree: 0, PS_NB: 0, PS_Duree: 0, RDQD_NB: 0, RDQD_Duree: 0, PEG_NB: 0, PEG_Duree: 0, LLC_Nom_Livre: '', LLC_NB: 0, LLC_Duree: 0, JP: 0, JC: 0, Evang: 0 };

  journal.forEach(d => {
    const current_date = parseFRDate(d.Date);
    const weekNumber = getISOWeek(current_date);
    const weekKey = `Semaine ${weekNumber}`;

    // Initialiser le total hebdomadaire si nécessaire
    if (!weeklyTotals[weekKey]) {
      weeklyTotals[weekKey] = { Date: weekKey, LB_livres: '', LB_NB: 0, LB_Duree: 0, PS_NB: 0, PS_Duree: 0, RDQD_NB: 0, RDQD_Duree: 0, PEG_NB: 0, PEG_Duree: 0, LLC_Nom_Livre: '', LLC_NB: 0, LLC_Duree: 0, JP: 0, JC: 0, Evang: 0 };
    }

    // Initialiser le jour si nécessaire
    if (!byDay[d.Date]) byDay[d.Date] = initDay(d.Date);

    // Agréger le jour
    aggregate(byDay[d.Date], d, weeklyTotals[weekKey], moisTotal);
  });

  // Construire le résultat final : jours + totaux hebdo + total mois
  let result = {};
  const sortedDays = Object.keys(byDay).sort((a, b) => {
    const dateA = parseFRDate(a);
    const dateB = parseFRDate(b);
    return dateA - dateB;
  });

  let nextWeek = null;
  sortedDays.forEach((day,index) => {
    result[day] = byDay[day];

    const weekNumber = getISOWeek(parseFRDate(day));
    const weekKey = `Semaine ${weekNumber}`;

    // Déterminer la semaine du jour suivant
    const nextDay = sortedDays[index + 1];
    let nextDayWeekNumber = null;
    if (nextDay) {
        const nextDate = parseFRDate(nextDay);
        nextDayWeekNumber = getISOWeek(nextDate);
    }

    // Si la semaine change AU PROCHAIN JOUR (donc on est dimanche) Ajouter le total hebdomadaire
    if (weekNumber !== nextDayWeekNumber && weeklyTotals[weekKey]) {
      nextWeek = `Semaine ${nextDayWeekNumber}`;
      result[weekKey] = weeklyTotals[weekKey];
    }
  });

  // Ajouter le total de la dernière semaine
  if (nextWeek && weeklyTotals[nextWeek]) {
    result[nextWeek] = weeklyTotals[nextWeek];
  }

  // Ajouter le total mois à la fin
  result['Total Mois'] = moisTotal;

  return result;
}

// Calcul semaine ISO 8601
function getISOWeek(date) {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return 1 + Math.round(((tempDate - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function filterByMonth(data, year, month) {
  return data.filter(entry => {
    const [day, m, y] = entry.Date.split('/');
    return parseInt(y) === year && parseInt(m) === month;
  });
}

function getMonthName(month) {
  const names = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
                 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  return names[month - 1];
}