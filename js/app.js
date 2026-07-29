import { parseSamsungNote } from './parser.js';
import { generateExcel, parseFRDate } from './excel.js';
import { validateSamsungNote } from './validator.js';

// === ÉTAT GLOBAL ===
let journal = [];
let themes = [];
let currentChart = null;
let currentYear = new Date().getFullYear();

// === ÉLÉMENTS DOM ===
const input = document.getElementById('noteInput');
const yearInput = document.getElementById('year');
const monthInput = document.getElementById('month');
const charCount = document.getElementById('charCount');

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  loadThemes();
  loadJournal();
  updateCharCount();
  renderThemesList();
  renderThemesHelp();
  updateYearInput();
  initializeAnalysisControls();
});

// === GESTION DES ONGLETS ===
function initializeTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Désactiver tous les onglets
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Activer l'onglet cliqué
      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// === ANNÉE ===
function updateYearInput() {
  yearInput.value = currentYear;
}

yearInput.addEventListener('change', () => {
  currentYear = Number.parseInt(yearInput.value);
  loadJournal();
});

// === COMPTEUR DE CARACTÈRES ET VALIDATION EN DIRECT ===
input.addEventListener('input', () => {
  updateCharCount();
  const issues = validateSamsungNote(input.value);
  renderErrorReport(issues);
});

function updateCharCount() {
  charCount.textContent = input.value.length.toLocaleString();
}

// === SAUVEGARDE INTELLIGENTE ===
document.getElementById('saveBtn').onclick = () => {
  const noteText = input.value.trim();
  if (!noteText) {
    showStatus('Veuillez coller vos notes', 'error');
    return;
  }

  // Valider et remonter les erreurs de saisie
  const issues = validateSamsungNote(noteText);
  renderErrorReport(issues);

  const hasCriticalErrors = issues.some(i => i.type === 'error');
  if (hasCriticalErrors) {
    showStatus('❌ Enregistrement bloqué : Veuillez corriger les durées négatives ou erreurs d\'heures ci-dessus.', 'error');
    return;
  }

  // Demander le mois
  let month = monthInput.value
  if (!month) {
    month = prompt('Veuillez précisez le mois : Entre (01-12)', new Date().getMonth() + 1);
  }
  if (!month) return;
  monthInput.value = month;

  // Parser les données
  const parsed = parseSamsungNote(noteText, currentYear, month.padStart(2, '0'));

  if (parsed.length === 0) {
    showStatus('Aucune donnée détectée', 'error');
    return;
  }

  // Déterminer la plage de dates
  const dates = parsed.map(p => parseFRDate(p.Date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  // Supprimer les anciennes entrées de cette période pour éviter les doublons
  const existingEntries = journal.filter(entry => {
    const entryDate = parseFRDate(entry.Date);
    return entryDate < minDate || entryDate > maxDate;
  });

  // Ajouter les nouvelles entrées
  journal = [...existingEntries, ...parsed].sort((a, b) => {
    return parseFRDate(a.Date) - parseFRDate(b.Date);
  });

  saveJournal();

  // Déterminer la plage de dates à afficher
  let rangeStr = "";
  if (minDate && maxDate) {
    if (minDate.getTime() === maxDate.getTime()) {
      rangeStr = formatDate(minDate);
    } else {
      rangeStr = `${formatDate(minDate)} - ${formatDate(maxDate)}`;
    }
  }

  if (issues.some(i => i.type === 'warning')) {
    showStatus(`⚠️ ${parsed.length} entrées sauvegardées avec des avertissements de saisie.`, 'success');
  } else {
    showStatus(`✓ ${parsed.length} entrées sauvegardées avec succès !`, 'success');
  }

  displaySummary(parsed, rangeStr, 'weeklySummary');
};

function renderErrorReport(issues) {
  const container = document.getElementById('syntaxErrorsReport');
  if (!container) return;

  if (!issues || issues.length === 0) {
    container.innerHTML = '';
    return;
  }

  const errorsCount = issues.filter(i => i.type === 'error').length;
  const warningsCount = issues.filter(i => i.type === 'warning').length;

  const cardClass = errorsCount > 0 ? 'has-errors' : 'has-warnings';
  const icon = errorsCount > 0 ? '🚫' : '⚠️';
  const title = errorsCount > 0
    ? `${errorsCount} erreur(s) bloquante(s) de saisie`
    : `${warningsCount} avertissement(s) de formatage`;

  container.innerHTML = `
    <div class="error-report-card ${cardClass}">
      <div class="error-report-header">
        <span>${icon}</span>
        <span>${title}</span>
      </div>
      <div class="error-issue-list">
        ${issues.map(issue => `
          <div class="error-issue-item">
            <span class="error-badge ${issue.type}">${issue.type === 'error' ? 'Bloquant' : 'Attention'}</span>
            <div class="error-issue-content">
              <div class="error-issue-day">${issue.day}</div>
              <div class="error-issue-msg">${issue.message}</div>
              <div class="error-issue-line"><code>${escapeHtml(issue.line)}</code></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// === AFFICHAGE DU RÉSUMÉ ===
function displaySummary(entries, rangeLabel, containerId = 'weeklySummary') {
  const summary = calculateWeeklySummary(entries);
  const container = document.getElementById(containerId);

  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune donnée pour cette période</p>';
    return;
  }

  container.innerHTML = `
    <div class="weekly-summary-card">
      <h3>📊 TOTAL ${rangeLabel}</h3>

      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">📖 Lecture Biblique</div>
          <div class="summary-value">${summary.LB.duree} • ${summary.LB.nb} chapitres</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">🙏 Prière Seul(e)</div>
          <div class="summary-value">${summary.PS.duree} • ${summary.PS.nb} fois</div>
          ${summary.PS.themes.length > 0 ? `
            <div class="summary-themes">
              Sujets suivis:
              ${summary.PS.themes.map(t => `
                <div class="theme-line" style="border-left-color: ${t.color}">
                  <span class="theme-name">${t.name}:</span>
                  <span class="theme-time">${t.duree}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="summary-item">
          <div class="summary-label">📿 RDQD</div>
          <div class="summary-value">${summary.RDQD.duree} • ${summary.RDQD.nb} fois</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">⛪ PEG</div>
          <div class="summary-value">${summary.PEG.duree} • ${summary.PEG.nb} fois</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">📚 LLC</div>
          <div class="summary-value">${summary.LLC.duree} • ${summary.LLC.nb} pages</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">✝️ Évangélisation</div>
          <div class="summary-value">${summary.EV.duree}</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">🍽️ Jeûnes</div>
          <div class="summary-value">Partiel: ${summary.JP} • Complet: ${summary.JC}</div>
        </div>
      </div>
    </div>
  `;
}

function calculateWeeklySummary(entries) {
  const summary = {
    LB: { nb: 0, duree: 0 },
    PS: { nb: 0, duree: 0, themes: [] },
    RDQD: { nb: 0, duree: 0 },
    PEG: { nb: 0, duree: 0 },
    LLC: { nb: 0, duree: 0 },
    EV: { duree: 0 },
    JP: 0,
    JC: 0
  };

  // Compteur de thèmes pour PS
  const themeStats = {};

  entries.forEach(entry => {
    if (entry.Accomplie !== 1) return;

    const minutes = entry.Duree_minutes || 0;

    if (entry.Activité === 'LB') {
      summary.LB.nb += countChapters(entry.Commentaire);
      summary.LB.duree += minutes;
    }

    if (['PS', 'ADG'].includes(entry.Activité)) {
      summary.PS.nb += 1;
      summary.PS.duree += minutes;

      // Extraire les thèmes des commentaires PS
      if (entry.Activité === 'PS' && entry.Commentaire) {
        themes.forEach(theme => {
          if (entry.Commentaire.toLowerCase().includes(theme.name.toLowerCase())) {
            if (!themeStats[theme.name]) {
              themeStats[theme.name] = { name: theme.name, duree: 0, color: theme.color };
            }
            themeStats[theme.name].duree += minutes;
          }
        });
      }
    }

    if (entry.Activité === 'RDQD') {
      summary.RDQD.nb += 1;
      summary.RDQD.duree += minutes;
    }

    if (entry.Activité.startsWith('PEG')) {
      summary.PEG.nb += 1;
      summary.PEG.duree += minutes;
    }

    if (entry.Activité === 'LLC') {
      summary.LLC.nb += countPages(entry.Commentaire);
      summary.LLC.duree += minutes;
    }

    if (entry.Activité === 'EV') {
      summary.EV.duree += minutes;
    }

    if (entry.Activité === 'JP') summary.JP += 1;
    if (entry.Activité === 'JC') summary.JC += 1;
  });

  // Formater les durées
  summary.LB.duree = formatDuration(summary.LB.duree);
  summary.PS.duree = formatDuration(summary.PS.duree);
  summary.RDQD.duree = formatDuration(summary.RDQD.duree);
  summary.PEG.duree = formatDuration(summary.PEG.duree);
  summary.LLC.duree = formatDuration(summary.LLC.duree);
  summary.EV.duree = formatDuration(summary.EV.duree);

  // Ajouter les thèmes formatés
  summary.PS.themes = Object.values(themeStats).map(t => ({
    ...t,
    duree: formatDuration(t.duree)
  }));

  return summary;
}

// === GÉNÉRATION EXCEL ===
document.getElementById('generateMonthBtn').onclick = async () => {
  let month = monthInput.value
  if (!month) {
    month = prompt('Veuillez précisez le mois : Entre (01-12)', new Date().getMonth() + 1);
  }
  if (!month) return;
  monthInput.value = month;

  const monthData = filterByMonth(journal, currentYear, Number.parseInt(month));
  if (monthData.length === 0) {
    showStatus('Aucune donnée pour ce mois', 'error');
    return;
  }

  try {
    showStatus('Génération Excel mensuel...', 'success');
    await generateExcel(monthData, `${month.padStart(2, '0')}-${currentYear}`, themes, 'monthly');
    showStatus('✓ Excel mensuel généré !', 'success');
  } catch (error) {
    console.error(error);
    showStatus('Erreur lors de la génération', 'error');
  }
};

document.getElementById('generateYearBtn').onclick = async () => {
  if (journal.length === 0) {
    showStatus('Aucune donnée pour cette année', 'error');
    return;
  }

  try {
    showStatus('Génération Excel annuel...', 'success');
    await generateExcel(journal, currentYear.toString(), themes, 'yearly');
    showStatus('✓ Excel annuel généré !', 'success');
  } catch (error) {
    console.error(error);
    showStatus('Erreur lors de la génération', 'error');
  }
};

// === BACKUP / RESTORE ===
document.getElementById('backupBtn').onclick = () => {
  const backup = {
    journal,
    themes,
    year: currentYear,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `journal_backup_${currentYear}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);

  showStatus('✓ Backup téléchargé !', 'success');
};

document.getElementById('restoreBtn').onclick = () => {
  document.getElementById('restoreFile').click();
};

document.getElementById('restoreFile').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const backup = JSON.parse(event.target.result);

      if (confirm(`Restaurer le backup du ${new Date(backup.exportDate).toLocaleDateString()} ?\nCela écrasera les données actuelles de l'année ${backup.year}.`)) {
        journal = backup.journal || [];
        themes = backup.themes || [];
        currentYear = backup.year || currentYear;

        saveJournal();
        saveThemes();
        yearInput.value = currentYear;
        renderThemesList();
        renderThemesHelp();

        showStatus('✓ Backup restauré avec succès !', 'success');
      }
    } catch (error) {
      showStatus('Erreur lors de la restauration du backup', 'error');
      console.error(error);
    }
  };
  reader.readAsText(file);

  // Reset input
  e.target.value = '';
};

// === ANALYSE PAR PÉRIODE PERSONNALISÉE (RÉSUMÉ COMPLET) ===
document.getElementById('showCustomStatsBtn').onclick = () => {
  const startStr = document.getElementById('customStartDate').value;
  const endStr = document.getElementById('customEndDate').value;

  if (!startStr || !endStr) {
    showStatus('Veuillez sélectionner les deux dates', 'error');
    return;
  }

  if (startStr > endStr) {
    showStatus('La date de début doit être antérieure ou égale à la date de fin', 'error');
    return;
  }

  const filtered = journal.filter(entry => {
    const [d, m, y] = entry.Date.split('/');
    const entryDateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return entryDateStr >= startStr && entryDateStr <= endStr;
  });

  const [startY, startM, startD] = startStr.split('-');
  const [endY, endM, endD] = endStr.split('-');
  const rangeLabel = `DU ${startD}/${startM} AU ${endD}/${endM}`;
  displaySummary(filtered, rangeLabel, 'customPeriodSummary');
};

// === ANALYSE PAR THÈMES ===
function initializeAnalysisControls() {
  const analysisPeriodSelect = document.getElementById('analysisPeriod');
  const prayerCustomDatesDiv = document.getElementById('prayerCustomDates');
  const prayerStartDateInput = document.getElementById('prayerStartDate');
  const prayerEndDateInput = document.getElementById('prayerEndDate');
  const analyzeBtn = document.getElementById('analyzeBtn');

  if (!analysisPeriodSelect || !prayerCustomDatesDiv) return;

  function updateCustomDatesVisibility() {
    if (analysisPeriodSelect.value === 'custom') {
      prayerCustomDatesDiv.style.display = 'flex';
      if (prayerStartDateInput.value && prayerEndDateInput.value) {
        handlePrayerCustomDateChange();
      }
    } else {
      prayerCustomDatesDiv.style.display = 'none';
    }
  }

  analysisPeriodSelect.addEventListener('change', () => {
    updateCustomDatesVisibility();
    if (analysisPeriodSelect.value !== 'custom') {
      analyzeThemes();
    }
  });

  if (analyzeBtn) {
    analyzeBtn.onclick = () => {
      analyzeThemes();
    };
  }

  function handlePrayerCustomDateChange() {
    const startStr = prayerStartDateInput.value;
    const endStr = prayerEndDateInput.value;

    if (startStr && endStr) {
      if (startStr > endStr) {
        showStatus('La date de début doit être antérieure ou égale à la date de fin', 'error');
        return;
      }
      analyzeThemes();
    }
  }

  if (prayerStartDateInput && prayerEndDateInput) {
    prayerStartDateInput.addEventListener('change', handlePrayerCustomDateChange);
    prayerEndDateInput.addEventListener('change', handlePrayerCustomDateChange);
    prayerStartDateInput.addEventListener('input', handlePrayerCustomDateChange);
    prayerEndDateInput.addEventListener('input', handlePrayerCustomDateChange);
  }

  // Initialiser l'état selon la sélection au chargement
  updateCustomDatesVisibility();
}

function analyzeThemes() {
  const period = document.getElementById('analysisPeriod').value;
  let rangeLabel = '';

  if (period === 'week') {
    rangeLabel = '7 derniers jours glissants';
  } else if (period === 'month') {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const now = new Date();
    rangeLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  } else if (period === 'year') {
    rangeLabel = `Année ${currentYear}`;
  } else if (period === 'custom') {
    const startStr = document.getElementById('prayerStartDate')?.value;
    const endStr = document.getElementById('prayerEndDate')?.value;
    if (!startStr || !endStr) {
      document.getElementById('analysisResults').innerHTML =
        '<p class="empty-state">Veuillez sélectionner les dates de début et de fin pour l\'analyse personnalisée</p>';
      if (currentChart) {
        currentChart.destroy();
        currentChart = null;
      }
      return;
    }
    const [startY, startM, startD] = startStr.split('-');
    const [endY, endM, endD] = endStr.split('-');
    rangeLabel = `Du ${startD}/${startM}/${startY} au ${endD}/${endM}/${endY}`;
  }

  const filteredJournal = filterByPeriod(journal, period);

  if (filteredJournal.length === 0) {
    document.getElementById('analysisResults').innerHTML =
      `<p class="empty-state">Aucune donnée pour la période sélectionnée (${rangeLabel})</p>`;
    if (currentChart) {
      currentChart.destroy();
      currentChart = null;
    }
    return;
  }

  // Calculer les statistiques (uniquement pour les thèmes définis)
  const stats = calculateThemeStats(filteredJournal);

  // Afficher les résultats avec libellé explicite de la période
  renderAnalysisResults(stats, rangeLabel);
  renderThemeChart(stats);
}

function filterByPeriod(data, period) {
  const now = new Date();

  if (period === 'year') return data;

  if (period === 'custom') {
    const startStr = document.getElementById('prayerStartDate')?.value;
    const endStr = document.getElementById('prayerEndDate')?.value;

    if (!startStr || !endStr) return [];

    if (startStr > endStr) return [];

    return data.filter(entry => {
      const [day, month, year] = entry.Date.split('/');
      const entryDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      return entryDateStr >= startStr && entryDateStr <= endStr;
    });
  }

  return data.filter(entry => {
    const [day, month, year] = entry.Date.split('/');
    const entryDate = new Date(year, month - 1, day);

    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return entryDate >= weekAgo;
    }

    if (period === 'month') {
      return entryDate.getMonth() === now.getMonth() &&
        entryDate.getFullYear() === now.getFullYear();
    }

    return true;
  });
}

function calculateThemeStats(data) {
  const stats = {};
  let totalMinutes = 0;

  data.forEach(entry => {
    if (entry.Activité === 'PS' && entry.Accomplie === 1 && entry.Commentaire) {
      const comment = entry.Commentaire.toLowerCase();
      const minutes = entry.Duree_minutes || 0;

      // Vérifier uniquement les thèmes définis par l'utilisateur
      themes.forEach(theme => {
        if (comment.includes(theme.name.toLowerCase())) {
          if (!stats[theme.name]) {
            stats[theme.name] = {
              name: theme.name,
              minutes: 0,
              count: 0,
              color: theme.color
            };
          }
          stats[theme.name].minutes += minutes;
          stats[theme.name].count += 1;
          totalMinutes += minutes;
        }
      });
    }
  });

  // Ajouter les pourcentages
  Object.values(stats).forEach(stat => {
    stat.percentage = totalMinutes > 0 ? (stat.minutes / totalMinutes * 100) : 0;
  });

  return Object.values(stats).sort((a, b) => b.minutes - a.minutes);
}

function renderAnalysisResults(stats, rangeLabel = '') {
  const container = document.getElementById('analysisResults');

  if (stats.length === 0) {
    container.innerHTML = `<p class="empty-state">Aucun sujet de prière suivi trouvé dans les données (${rangeLabel})</p>`;
    return;
  }

  const totalMinutes = stats.reduce((sum, s) => sum + s.minutes, 0);
  const maxMinutes = Math.max(...stats.map(s => s.minutes));

  container.innerHTML = `
    ${rangeLabel ? `<div style="margin-bottom: 1.25rem; background: rgba(99, 102, 241, 0.08); color: var(--primary-dark); padding: 0.6rem 1rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 0.5rem;"><span>📅</span> Période analysée : ${rangeLabel}</div>` : ''}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.length}</div>
        <div class="stat-label">Sujets suivis</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatDuration(totalMinutes)}</div>
        <div class="stat-label">Temps total</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.round(totalMinutes / stats.length)}m</div>
        <div class="stat-label">Moyenne / sujet</div>
      </div>
    </div>

    <div class="theme-breakdown">
      ${stats.map(stat => `
        <div class="theme-breakdown-item" style="border-left-color: ${stat.color}">
          <div class="theme-breakdown-info">
            <div class="theme-breakdown-name">${stat.name}</div>
            <div class="theme-breakdown-time">
              ${formatDuration(stat.minutes)} • ${stat.count} occurrence${stat.count > 1 ? 's' : ''}
            </div>
          </div>
          <div class="theme-breakdown-bar">
            <div class="theme-breakdown-fill"
                 style="width: ${(stat.minutes / maxMinutes * 100)}%; background-color: ${stat.color}">
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderThemeChart(stats) {
  const canvas = document.getElementById('themeChart');
  const ctx = canvas.getContext('2d');

  // Détruire le graphique existant
  if (currentChart) {
    currentChart.destroy();
  }

  if (stats.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Aucune donnée à afficher', canvas.width / 2, canvas.height / 2);
    return;
  }

  currentChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: stats.map(s => s.name),
      datasets: [{
        data: stats.map(s => s.minutes),
        backgroundColor: stats.map(s => s.color),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              family: 'DM Sans',
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const percentage = stats[context.dataIndex].percentage.toFixed(1);
              return `${label}: ${formatDuration(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// === GESTION DES THÈMES ===
document.getElementById('generateMonthBtn').onclick = async () => {
  let month = monthInput.value
  if (!month) {
    month = prompt('Veuillez précisez le mois : Entre (01-12)', new Date().getMonth() + 1);
  }
  if (!month) return;
  monthInput.value = month;

  const monthData = filterByMonth(journal, currentYear, Number.parseInt(month));
  if (monthData.length === 0) {
    showStatus('Aucune donnée pour ce mois', 'error');
    return;
  }

  try {
    showStatus('Génération Excel mensuel...', 'success');
    await generateExcel(monthData, `${month.padStart(2, '0')}-${currentYear}`, themes, 'monthly');
    showStatus('✓ Excel mensuel généré !', 'success');
  } catch (error) {
    console.error(error);
    showStatus('Erreur lors de la génération', 'error');
  }
};

document.getElementById('generateYearBtn').onclick = async () => {
  if (journal.length === 0) {
    showStatus('Aucune donnée pour cette année', 'error');
    return;
  }

  try {
    showStatus('Génération Excel annuel...', 'success');
    await generateExcel(journal, currentYear.toString(), themes, 'yearly');
    showStatus('✓ Excel annuel généré !', 'success');
  } catch (error) {
    console.error(error);
    showStatus('Erreur lors de la génération', 'error');
  }
};

// === GESTION DES THÈMES ===
document.getElementById('addThemeBtn').onclick = () => {
  const themeName = document.getElementById('newTheme').value.trim();
  const themeColor = document.getElementById('themeColor').value;

  if (!themeName) {
    showStatus('Veuillez entrer un nom de thème', 'error');
    return;
  }

  // Vérifier si le thème existe déjà
  if (themes.find(t => t.name.toLowerCase() === themeName.toLowerCase())) {
    showStatus('Ce thème existe déjà', 'error');
    return;
  }

  themes.push({ name: themeName, color: themeColor });
  saveThemes();
  renderThemesList();
  renderThemesHelp();

  // Réinitialiser le formulaire
  document.getElementById('newTheme').value = '';
  document.getElementById('themeColor').value = '#6366f1';

  showStatus(`✓ Thème "${themeName}" ajouté`, 'success');
};

function renderThemesList() {
  const container = document.getElementById('themesList');

  if (themes.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun thème défini. Ajoutez votre premier thème ci-dessus.</p>';
    return;
  }

  container.innerHTML = themes.map(theme => `
    <div class="theme-item">
      <div class="theme-info">
        <div class="theme-color-dot" style="background-color: ${theme.color}"></div>
        <span class="theme-name">${theme.name}</span>
      </div>
      <button class="delete-theme-btn" onclick="deleteTheme('${theme.name}')">
        Supprimer
      </button>
    </div>
  `).join('');
}

function renderThemesHelp() {
  const container = document.getElementById('themesHelp');

  if (themes.length === 0) {
    container.innerHTML = '<p class="empty-state" style="font-size: 0.9rem;">Aucun thème défini</p>';
    return;
  }

  container.innerHTML = themes.map(theme => `
    <span class="theme-tag" style="background-color: ${theme.color}">
      ${theme.name}
    </span>
  `).join('');
}

window.deleteTheme = (themeName) => {
  if (confirm(`Supprimer le thème "${themeName}" ?`)) {
    themes = themes.filter(t => t.name !== themeName);
    saveThemes();
    renderThemesList();
    renderThemesHelp();
    showStatus(`✓ Thème "${themeName}" supprimé`, 'success');
  }
};

function saveThemes() {
  localStorage.setItem('prayer_themes', JSON.stringify(themes));
}

function loadThemes() {
  const stored = localStorage.getItem('prayer_themes');
  if (stored) {
    themes = JSON.parse(stored);
  } else {
    // Thèmes par défaut (vides - l'utilisateur les créera)
    themes = [];
    saveThemes();
  }
}

// === STOCKAGE ANNUEL ===
function saveJournal() {
  localStorage.setItem(`journal_${currentYear}`, JSON.stringify(journal));
}

function loadJournal() {
  const stored = localStorage.getItem(`journal_${currentYear}`);
  if (stored) {
    journal = JSON.parse(stored);
  } else {
    journal = [];
  }
}

// === UTILITAIRES ===

// Calcul de la semaine ISO 8601 (le jeudi détermine l'année)
function getISOWeek(date) {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return 1 + Math.round(((tempDate - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Obtenir la plage de dates d'une semaine (lundi-dimanche)
function getWeekRange(date) {
  const tempDate = new Date(date);
  const day = tempDate.getDay();
  const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1); // Ajuster au lundi
  const monday = new Date(tempDate.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return `${formatDate(monday)} - ${formatDate(sunday)}`;
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function filterByMonth(data, year, month) {
  return data.filter(entry => {
    const [day, m, y] = entry.Date.split('/');
    return Number.parseInt(y) === year && Number.parseInt(m) === month;
  });
}

function getMonthName(month) {
  const names = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return names[month - 1];
}

function parseChapterCountOld(txt) {
  const m = txt.match(/(\d+)\s*(?:-|a|à)*\s*(\d*)/i);
  if (!m) return 0;
  if (m[1] && !m[2]) return 1;
  return Number(m[2]) - Number(m[1]) + 1;
}

/**
 * Calcule le nombre de chapitres lus à partir d'une ligne de lecture biblique.
 *
 * Format attendu : "LB = 08h08 - 09h17 : 1Tes 1-5, 2Thes 1-3, 1Tim 1-6"
 *
 * Cas supportés :
 *  - Plage de chapitres  : "1Tes 1-5"  → 5 chapitres
 *  - Chapitre unique     : "Jn 3"      → 1 chapitre
 *  - Livre seul (1 chap) : "Phm"       → 1 chapitre
 *
 * Séparateurs acceptés entre les livres : virgule (,) ou point-virgule (;)
 *
 * @param {string} txt - Le commentaire texte de ligne LB
 * @returns {number} Le nombre total de chapitres lus, ou 0 si la ligne est invalide
 */
export function countChapters(txt) {
  // Découper par virgule ou point-virgule
  const references = txt
    .split(/[,;]/)
    .map((ref) => ref.trim())
    .filter(Boolean);
  let totalChapters = 0;

  for (const ref of references) {
    console.log(ref + " = " + parseChapterCount(ref))
    totalChapters += parseChapterCount(ref);
  }

  return totalChapters;
}

/**
 * Calcule le nombre de chapitres pour une seule référence biblique.
 *
 * Stratégie : on cherche la plage numérique à la FIN de la référence,
 * indépendamment du format du nom du livre (avec ou sans espace, préfixe chiffre).
 *
 * Ex : "2Cor 11-13" → 3, "1 Cor 1-6" → 6, "Gal 1-2" → 2, "Phm" → 1
 *
 * @param {string} ref - Ex: "1Tes 1-5", "1 Cor 1-6", "Jn 3", "Phm"
 * @returns {number}
 */
function parseChapterCount(ref) {
  const trimmed = ref.trim();
  if (!trimmed) return 0;

  // Chercher une plage ou un numéro de chapitre en FIN de chaîne :
  //   "... 11-13"  → start=11, end=13
  //   "... 1 - 6" → start=1,  end=6
  //   "... 3"     → start=3,  end=undefined
  const rangeMatch = trimmed.match(/(\d+)\s*(?:[-‐‑‒–—]\s*(\d+))?\s*$/);

  if (!rangeMatch) {
    // Pas de chiffre du tout → livre à un seul chapitre (ex: "Phm", "Jud")
    return 1;
  }

  // Vérifier qu'il y a bien un nom de livre avant la plage (au moins 1 lettre)
  const before = trimmed.slice(0, rangeMatch.index).trim();
  if (!before || !/[a-zA-Z\p{L}]/u.test(before)) return 0;

  const start = parseInt(rangeMatch[1], 10);
  const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start;

  // Plage invalide (ex: "5-3")
  if (end < start) return 0;

  return end - start + 1;
}

export function countPages(txt) {
  const m = txt.match(/p\s*(\d*)\s*[-‐‑‒–—]\s*p\s*(\d*)/i);
  if (!m) return 0;
  return Number(m[2]) - Number(m[1]) + 1;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0 && mins === 0) return '0h00';
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

// === MESSAGES DE STATUT ===
function showStatus(message, type = 'success') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status-message ${type}`;

  setTimeout(() => {
    status.textContent = '';
    status.className = 'status-message';
  }, 5000);
}
