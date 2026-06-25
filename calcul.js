/**
 * Logique métier — Calcul de rémunération d'un projet de traduction.
 *
 * Règles :
 *  - Montant de base = tarifParPage × nbPages
 *  - Express : si (deadline - dateCreation) < 24 h → +30 %
 *    (évalué une seule fois à la création, stocké dans isExpress)
 *  - Retard : si dateRendu > deadline → pénalité 10 % par heure entamée
 *    Le plancher est 0 € (jamais négatif).
 */

const MS_PAR_HEURE = 60 * 60 * 1000;   // 3 600 000 ms
const SEUIL_EXPRESS_MS = 24 * MS_PAR_HEURE;  // 86 400 000 ms

/**
 * Détermine si une commande est "Express" au moment de sa création.
 * @param {Date|string} deadline
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
function estExpress(deadline, now = new Date()) {
  const deadlineMs = new Date(deadline).getTime();
  const nowMs      = now.getTime();
  const delaiMs    = deadlineMs - nowMs;
  return delaiMs < SEUIL_EXPRESS_MS;  // < 24 h → Express
}

/**
 * Calcule le nombre d'heures de retard (arrondi supérieur, entier).
 * @param {Date|string} deadline
 * @param {Date|string} dateRendu
 * @returns {number} 0 si à l'heure ou en avance
 */
function heuresRetard(deadline, dateRendu) {
  const renduMs    = new Date(dateRendu).getTime();
  const deadlineMs = new Date(deadline).getTime();
  const retardMs   = renduMs - deadlineMs;
  if (retardMs <= 0) return 0;
  return Math.ceil(retardMs / MS_PAR_HEURE);  // chaque heure entamée compte
}

/**
 * Calcul complet de la rémunération d'un projet.
 *
 * @param {object} projet
 * @param {number}  projet.nbPages
 * @param {number}  projet.tarifParPage
 * @param {boolean} projet.isExpress    - stocké en DB à la création
 * @param {Date|string} projet.deadline
 * @param {Date|string|null} projet.dateRendu - null si non livré
 * @returns {{
 *   montantBase: number,
 *   bonusExpress: number,
 *   penaliteRetard: number,
 *   heuresRetard: number,
 *   montantFinal: number,
 *   statut: 'en_cours'|'livre_a_temps'|'livre_en_retard'
 * }}
 */
function calculerRemuneration(projet) {
  const { nbPages, tarifParPage, isExpress, deadline, dateRendu } = projet;

  const montantBase = tarifParPage * nbPages;

  // Bonus Express (+30 %)
  const bonusExpress = isExpress ? montantBase * 0.30 : 0;
  const montantApresBonus = montantBase + bonusExpress;

  // Statut de livraison
  let statut = 'en_cours';
  let penaliteRetard = 0;
  let nbHeuresRetard = 0;

  if (dateRendu) {
    nbHeuresRetard = heuresRetard(deadline, dateRendu);
    if (nbHeuresRetard > 0) {
      statut = 'livre_en_retard';
      // 10 % par heure entamée, plafonné au montant total
      penaliteRetard = Math.min(
        montantApresBonus * nbHeuresRetard * 0.10,
        montantApresBonus
      );
    } else {
      statut = 'livre_a_temps';
    }
  }

  const montantFinal = Math.max(0, montantApresBonus - penaliteRetard);

  return {
    montantBase:    +montantBase.toFixed(2),
    bonusExpress:   +bonusExpress.toFixed(2),
    penaliteRetard: +penaliteRetard.toFixed(2),
    heuresRetard:   nbHeuresRetard,
    montantFinal:   +montantFinal.toFixed(2),
    statut,
  };
}

module.exports = { estExpress, heuresRetard, calculerRemuneration };
