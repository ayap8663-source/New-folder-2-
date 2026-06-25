-- ============================================================
-- Agence de Traduction — Schéma MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS agence_traduction
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE agence_traduction;

-- ------------------------------------------------------------
-- Table users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nom         VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  UNIQUE NOT NULL,
  motDePasse  VARCHAR(255)  NOT NULL,
  role        ENUM('admin','traducteur') NOT NULL DEFAULT 'traducteur',
  createdAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Table projets
-- IMPORTANT: isExpress est déterminé à la création (deadline - NOW() < 24h)
--            dateRendu est NULL tant que le traducteur n'a pas livré
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  traducteurId  INT            NOT NULL,
  titre         VARCHAR(200)   NOT NULL,
  nbPages       INT            NOT NULL CHECK (nbPages > 0),
  tarifParPage  DECIMAL(10,2)  NOT NULL CHECK (tarifParPage > 0),
  deadline      DATETIME(3)    NOT NULL,   -- précision milliseconde
  dateRendu     DATETIME(3)    DEFAULT NULL,
  isExpress     TINYINT(1)     NOT NULL DEFAULT 0,
  createdAt     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (traducteurId) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Données de test
-- Mot de passe pour tous : "password123"
-- Hash bcrypt (10 rounds) de "password123"
-- ------------------------------------------------------------
INSERT INTO users (nom, email, motDePasse, role) VALUES
  ('Alice Admin',    'admin@agence.fr',        '$2a$10$uslZApUm0heUcS4iryxWAuBmmnQ3yMTsjGK64ahl9GO/64iAkw0Y6', 'admin'),
  ('Bruno Traducteur','bruno@agence.fr',        '$2a$10$uslZApUm0heUcS4iryxWAuBmmnQ3yMTsjGK64ahl9GO/64iAkw0Y6', 'traducteur'),
  ('Clara Traductrice','clara@agence.fr',       '$2a$10$uslZApUm0heUcS4iryxWAuBmmnQ3yMTsjGK64ahl9GO/64iAkw0Y6', 'traducteur');

-- Projets de démonstration (deadlines relatives à NOW())
-- Le calcul isExpress se fait côté serveur à la création
INSERT INTO projets (traducteurId, titre, nbPages, tarifParPage, deadline, dateRendu, isExpress, createdAt)
VALUES
  -- Projet terminé à l'heure, non-express
  (2, 'Manuel technique Airbus A320',    12, 15.00,
   DATE_ADD(NOW(), INTERVAL -2 DAY),
   DATE_ADD(NOW(), INTERVAL -3 DAY),
   0,
   DATE_ADD(NOW(), INTERVAL -5 DAY)),

  -- Projet terminé EN RETARD de 3h, non-express → pénalité 3×10%=30%
  (2, 'Contrat juridique Anglo-Français',  8, 20.00,
   DATE_ADD(NOW(), INTERVAL -1 DAY),
   DATE_ADD(NOW(), INTERVAL '-21' HOUR),
   0,
   DATE_ADD(NOW(), INTERVAL -3 DAY)),

  -- Projet express, non rendu
  (3, 'Notice médicale urgente',           5, 18.00,
   DATE_ADD(NOW(), INTERVAL 10 HOUR),
   NULL,
   1,
   NOW()),

  -- Projet non-express, non rendu
  (3, 'Rapport annuel – société XYZ',     20, 12.00,
   DATE_ADD(NOW(), INTERVAL 5 DAY),
   NULL,
   0,
   NOW());
