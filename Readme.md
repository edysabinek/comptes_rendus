# Journal Spirituel 📖

Application web pour suivre et analyser vos temps de prière et de lecture biblique hebdomadaires et mensuels.

## ✨ Fonctionnalités

### 📅 Saisie hebdomadaire
- Collez vos notes d'une semaine complète (lundi → dimanche)
- **Résumé hebdomadaire automatique** affiché immédiatement
- Stockage annuel (toutes vos semaines dans un seul fichier)
- Semaines ISO 8601 (le jeudi détermine l'année de la semaine)

### 🏷️ Suivi des sujets de prière
- Créez des sujets personnalisés (ex: Dirigeants, Retraite_matin, Moi)
- Assignez des couleurs à chaque sujet
- Détection automatique dans vos commentaires de prière (PS)
- Statistiques par sujet dans le résumé hebdomadaire

### 📊 Exports Excel enrichis
**Export mensuel** :
- Onglet 1 : Journal détaillé du mois
- Onglet 2 : Résumé mensuel avec totaux hebdomadaires (ISO)
- Onglet 3 : Analyse des sujets de prière

**Export annuel** :
- Onglet 1 : Journal complet de l'année
- Onglets 2-13 : Un résumé par mois (automatique)
- Onglet final : Analyse annuelle des sujets

### 🎨 Interface moderne
- Design spirituel apaisant
- Résumé hebdomadaire visuel
- Compteur de caractères
- Sauvegarde locale (localStorage)
- Responsive mobile/tablette/desktop

## 📝 Format des notes

### Structure de base
```
≈≈===≈
01

✅️ LB = 06h30 - 07h00 : Genèse 1-3
✅️ PS = 07h00 - 07h30 : Dirigeants
✅️ RDQD = 12h15 - 12h30
✅️ Matin = 06h00 - 06h30
✅️ LLC = 20h00 - 20h45 [p12-p45] : Le berger et le troupeau
✅️ EV = 18h00 - 18h30
✅️ Jeune = Partiel
```

### Sujets de prière (PS)
Le sujet de prière est détecté automatiquement dans le commentaire après `:` sur les lignes PS.

**Exemples** :
```
PS = 08h36 a 09h05 : Retraite_matin       → Sujet: "Retraite_matin"
PS = 13h10 à 13h47 : Dirigeants      → Sujet: "Dirigeants"  
PS = 05h05 - 05h17 : Moi         → Sujet: "Moi"
```

Pour que l'application suive ces sujets, créez-les d'abord dans l'onglet "Thèmes".

## 📖 Utilisation

1. **Créer vos sujets** : Onglet "Thèmes"
2. **Saisir une semaine** : Collez vos notes → "Enregistrer"
3. **Voir le résumé** : Affiché automatiquement
4. **Exporter Excel** : Mensuel ou Annuel

Consultez le README complet pour plus de détails !

**Fait avec ❤️ pour votre marche spirituelle**