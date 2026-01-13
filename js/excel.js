// excel.js
export function generateExcel(journal, monthLabel) {
  const wb = XLSX.utils.book_new();

  // FEUILLE 1 — Journal détaillé
  const ws1 = XLSX.utils.json_to_sheet(journal);
  XLSX.utils.book_append_sheet(wb, ws1, 'Journal_Detaille');

  // FEUILLE 2 — Mois (agrégation)
  const byDay = aggregate_all(journal);
  //console.log(JSON.stringify(journal));
  //console.log(byDay)

  const rows = Object.values(byDay);
  const ws2 = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws2, monthLabel);

  XLSX.writeFile(wb, `Journal_${monthLabel}.xlsx`);
}

// Helpers
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
    d.LB_livres = r['Commentaire'];
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

    // On fait le cumul
    semaineTotal.Evang += min;
    moisTotal.Evang += min;
  }

  if (r.Activité === 'JC') {
    d.JC +=1;

    // On fait le cumul
    semaineTotal.JC += 1;
    moisTotal.JC += 1;

  }
  if (r.Activité === 'JP') {
    d.JP +=1;

    // On fait le cumul
    semaineTotal.JP += 1;
    moisTotal.JP += 1;
  }
}

//function toMin(hhmm) {
//  const [h, m] = hhmm.split(':').map(Number);
//  return h * 60 + m;
//}

function countChapters(txt) {
  const m = txt.match(/(\d+)\s*(?:-|a|à)*\s*(\d*)/i);
  if (!m) return 0;
  if (m[1] && !m[2]) return 1;
  return Number(m[2]) - Number(m[1]) + 1;
}

function countPages(txt) {
 const m = txt.match(/p\s*(\d*)\s-\s*p\s*(\d*)/i)
 if (!m) return 0;
 return Number(m[2]) - Number(m[1]) + 1;
}

function aggregate_all(journal) {

  let byDay = {}

  let semaineTotal = {Date: 'Total' ,LB_livres: '', LB_NB:0, LB_Duree:0, PS_NB:0, PS_Duree:0, RDQD_NB:0, RDQD_Duree:0, PEG_NB:0, PEG_Duree:0, LLC_Nom_Livre: '', LLC_NB:0, LLC_Duree:0, JP:0, JC:0, Evang:0};
  let moisTotal = {Date: 'Total', LB_livres: '', LB_NB:0,  LB_Duree:0, PS_NB:0, PS_Duree:0, RDQD_NB:0, RDQD_Duree:0, PEG_NB:0, PEG_Duree:0, LLC_Nom_Livre: '', LLC_NB:0, LLC_Duree:0, JP:0, JC:0, Evang:0};
  let semaineNb = 1;
  let previousDate = ''; // La date précédente traitée

  journal.forEach(d => {
    let current_date = parseFRDate(d.Date);
    if (current_date.getDay() === 1 && previousDate != d.Date) {
        //On est lundi, on prépare le total de la semaine précédente
        previousDate = d.Date;
        // On prépare la ligne total semaine
        semaineTotal.Date = 'Total '+ semaineNb;
        byDay['Total '+ semaineNb] = semaineTotal
        // On est lundi on reinitialise le compteur semaine avant de commencer
        semaineTotal = {LB_NB:0, LB_Duree:0, PS_NB:0, PS_Duree:0, RDQD_NB:0, RDQD_Duree:0, PEG_NB:0, PEG_Duree:0, LLC_NB:0, LLC_Duree:0, JP:0, JC:0, Evang:0};
        semaineNb += 1;
    }
    if (!byDay[d.Date]) byDay[d.Date] = initDay(d.Date);
    aggregate(byDay[d.Date], d, semaineTotal, moisTotal);
  });
  // On rajoute le total mois
  byDay['Total'] = moisTotal

  return byDay;

}

function parseFRDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(year, month - 1, day); // mois en JS commence à 0
}

// Next
// import ExcelJS from 'exceljs'; // ou require('exceljs') si CommonJS
//
// export async function generateExcel(journal, monthLabel) {
//     const workbook = new ExcelJS.Workbook();
//
//     // FEUILLE 1 — Journal détaillé
//     const ws1 = workbook.addWorksheet('Journal_Detaille');
//     ws1.addRows(journal); // Ajoute toutes les lignes
//
//     // Exemple : cacher la colonne "id"
//     if (journal.length > 0 && journal[0].hasOwnProperty('id')) {
//         ws1.getColumn('id').hidden = true;
//     }
//
//     // Exemple : colorer une ligne spécifique (ex: 3ème ligne)
//     // const row = ws1.getRow(3);
//     // row.eachCell(cell => {
//     //   cell.fill = {
//     //     type: 'pattern',
//     //     pattern: 'solid',
//     //     fgColor: { argb: 'FFFFE0E0' }
//     //   };
//     // });
//
//     // FEUILLE 2 — Mois (agrégation)
//     const byDay = aggregate_all(journal);
//     const rows = Object.values(byDay);
//     const ws2 = workbook.addWorksheet(monthLabel);
//     ws2.addRows(rows);
//
//     // Sauvegarder le fichier
//     await workbook.xlsx.writeFile(`Journal_${monthLabel}.xlsx`);
// }
// // Exemple : masquer plusieurs colonnes
// ws1.getColumn('id').hidden = true;
// ws1.getColumn('internalCode').hidden = true;
//
// // Exemple : fixer la largeur d'une colonne
// ws1.getColumn('nom').width = 25;
//
// // Exemple : colorer une ligne entière
// const row = ws1.getRow(2);
// row.eachCell(cell => {
//     cell.fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFD9EAD3' },
//     };
// });