import { parseSamsungNote } from './parser.js';
import { generateExcel } from './excel.js';

const input = document.getElementById('noteInput');
const monthInput = document.getElementById('month');

let journal = [];

document.getElementById('saveBtn').onclick = () => {
  const [m, y] = monthInput.value.split('-');
    if (!m) {
        alert('Veuillez indiquer le mois (MM-AAAA)');
        return;
    }
  const parsed = parseSamsungNote(input.value, y, m);

  journal = [...journal, ...parsed];
  localStorage.setItem(`journal_${monthInput.value}`, JSON.stringify(journal));
  alert('Données sauvegardées');
};

document.getElementById('generateBtn').onclick = () => {
  generateExcel(journal, monthInput.value);
};
