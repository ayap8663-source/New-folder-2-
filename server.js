const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');
const path    = require('path');

const db                  = require('./db');
const { estExpress, calculerRemuneration } = require('./calcul');

const app    = express();
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'agence_traduction_secret_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Middleware Auth ──────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux admins' });
  }
  next();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, motDePasse } = req.body;
  if (!email || !motDePasse) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(motDePasse, user.motDePasse))) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = jwt.sign(
    { id: user.id, nom: user.nom, role: user.role },
    SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, nom: user.nom, role: user.role } });
});

// ─── Users ────────────────────────────────────────────────────────────────────

// GET /api/users — liste tous les traducteurs (admin seulement)
app.get('/api/users', authMiddleware, adminOnly, async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, nom, email, role, createdAt FROM users WHERE role = 'traducteur' ORDER BY nom"
  );
  res.json(rows);
});

// POST /api/users — créer un traducteur (admin seulement)
app.post('/api/users', authMiddleware, adminOnly, async (req, res) => {
  const { nom, email, motDePasse, role = 'traducteur' } = req.body;
  if (!nom || !email || !motDePasse) {
    return res.status(400).json({ error: 'nom, email et motDePasse requis' });
  }

  const hash = await bcrypt.hash(motDePasse, 10);
  try {
    const [result] = await db.query(
      'INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)',
      [nom, email, hash, role]
    );
    res.status(201).json({ id: result.insertId, nom, email, role });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    throw err;
  }
});

// ─── Projets ──────────────────────────────────────────────────────────────────

// GET /api/projets
// Admin → tous les projets | Traducteur → ses projets uniquement
app.get('/api/projets', authMiddleware, async (req, res) => {
  let sql = `
    SELECT p.*, u.nom AS traducteurNom
    FROM projets p
    JOIN users u ON u.id = p.traducteurId
  `;
  const params = [];

  if (req.user.role === 'traducteur') {
    sql += ' WHERE p.traducteurId = ?';
    params.push(req.user.id);
  }

  sql += ' ORDER BY p.deadline ASC';

  const [rows] = await db.query(sql, params);

  // Enrichir chaque projet avec le calcul de rémunération
  const projets = rows.map(p => ({
    ...p,
    calcul: calculerRemuneration(p),
  }));

  res.json(projets);
});

// POST /api/projets — créer un projet (admin seulement)
app.post('/api/projets', authMiddleware, adminOnly, async (req, res) => {
  const { traducteurId, titre, nbPages, tarifParPage, deadline } = req.body;

  if (!traducteurId || !titre || !nbPages || !tarifParPage || !deadline) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return res.status(400).json({ error: 'Format de deadline invalide' });
  }

  // Calcul Express au moment de la création (précision ms)
  const express = estExpress(deadlineDate) ? 1 : 0;

  const [result] = await db.query(
    `INSERT INTO projets (traducteurId, titre, nbPages, tarifParPage, deadline, isExpress)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [traducteurId, titre, nbPages, tarifParPage, deadlineDate, express]
  );

  const [rows] = await db.query(
    'SELECT p.*, u.nom AS traducteurNom FROM projets p JOIN users u ON u.id = p.traducteurId WHERE p.id = ?',
    [result.insertId]
  );

  res.status(201).json({
    ...rows[0],
    calcul: calculerRemuneration(rows[0]),
  });
});

// PUT /api/projets/:id/rendu — le traducteur marque le projet comme livré
app.put('/api/projets/:id/rendu', authMiddleware, async (req, res) => {
  const { id } = req.params;

  // Récupérer le projet
  const [rows] = await db.query('SELECT * FROM projets WHERE id = ?', [id]);
  const projet = rows[0];

  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  // Un traducteur ne peut livrer que ses propres projets
  if (req.user.role === 'traducteur' && projet.traducteurId !== req.user.id) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  if (projet.dateRendu) {
    return res.status(409).json({ error: 'Ce projet a déjà été livré' });
  }

  // dateRendu = maintenant, précision ms
  const dateRendu = new Date();

  await db.query(
    'UPDATE projets SET dateRendu = ? WHERE id = ?',
    [dateRendu, id]
  );

  const projetMaj = { ...projet, dateRendu };
  res.json({
    ...projetMaj,
    calcul: calculerRemuneration(projetMaj),
  });
});

// GET /api/projets/:id/calcul — détail du calcul de rémunération
app.get('/api/projets/:id/calcul', authMiddleware, async (req, res) => {
  const [rows] = await db.query(
    'SELECT p.*, u.nom AS traducteurNom FROM projets p JOIN users u ON u.id = p.traducteurId WHERE p.id = ?',
    [req.params.id]
  );

  if (!rows[0]) return res.status(404).json({ error: 'Projet introuvable' });

  const projet = rows[0];

  if (req.user.role === 'traducteur' && projet.traducteurId !== req.user.id) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  res.json({
    projet: {
      id: projet.id,
      titre: projet.titre,
      nbPages: projet.nbPages,
      tarifParPage: projet.tarifParPage,
      deadline: projet.deadline,
      dateRendu: projet.dateRendu,
      isExpress: !!projet.isExpress,
      traducteurNom: projet.traducteurNom,
    },
    calcul: calculerRemuneration(projet),
  });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Agence de Traduction — serveur démarré sur http://localhost:${PORT}`);
});
