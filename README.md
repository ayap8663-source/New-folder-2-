# Agence de Traduction — Guide d'exécution

## 1. Téléchargements requis

| Logiciel | Lien | Version recommandée |
|---|---|---|
| **Node.js** | https://nodejs.org | 18 LTS ou supérieure |
| **XAMPP** | https://www.apachefriends.org | 8.x (inclut MariaDB) |

---

## 2. Installation de Node.js

1. Télécharger l'installateur `.msi` depuis https://nodejs.org
2. Lancer l'installateur → **Next** jusqu'à la fin
3. Vérifier dans PowerShell :
   ```
   node -v
   npm -v
   ```

---

## 3. Installation et démarrage de XAMPP

1. Télécharger XAMPP depuis https://www.apachefriends.org
2. Installer dans `C:\xampp` (chemin par défaut)
3. Ouvrir le **XAMPP Control Panel**
4. Cliquer **Start** sur la ligne **MySQL**
5. Le voyant passe au vert → MySQL actif sur le port **3306**

---

## 4. Setup automatique (recommandé)

Ouvrir **PowerShell** dans le dossier du projet et exécuter :

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Le script vérifie Node.js, vérifie MySQL, crée la base, charge les données, puis installe les dépendances npm.

---

## 4-bis. Setup manuel (si le script ne fonctionne pas)

### Créer la base de données

> **Important** : utiliser le pipe PowerShell (`|`) — la redirection `<` ne fonctionne pas avec XAMPP sur Windows.

```powershell
Get-Content "C:\Users\VotreNom\Desktop\New folder (2)\schema.sql" | & "C:\xampp\mysql\bin\mysql.exe" -u root
```

Vérification :
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "USE agence_traduction; SELECT id, nom, role FROM users;"
```

Vous devriez voir les 3 comptes : Alice Admin, Bruno Traducteur, Clara Traductrice.

### Installer les dépendances

```powershell
cd "C:\Users\VotreNom\Desktop\New folder (2)"
npm install
```

---

## 5. Lancer le serveur

```powershell
node server.js
```

Résultat attendu :
```
Agence de Traduction — serveur démarré sur http://localhost:3000
```

---

## 6. Ouvrir l'application

```
http://localhost:3000
```

---

## 7. Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@agence.fr | password123 |
| Traducteur | bruno@agence.fr | password123 |
| Traducteur | clara@agence.fr | password123 |

---

## 8. Résolution de problèmes

| Problème | Solution |
|---|---|
| `mysql` non reconnu | Utiliser `& "C:\xampp\mysql\bin\mysql.exe"` |
| `<` ne fonctionne pas | Utiliser `Get-Content fichier.sql \| & mysql.exe -u root` |
| MySQL ne démarre pas | Vérifier que le port 3306 n'est pas utilisé par un autre service |
| `Cannot connect to database` | Démarrer MySQL dans le XAMPP Control Panel |
| Port 3000 occupé | Créer un fichier `.env` avec `PORT=3001` |
| Mot de passe MySQL non vide | Créer un fichier `.env` avec `DB_PASSWORD=votre_mdp` |

---

## 9. Fichier `.env` (optionnel)

Créer un fichier `.env` à la racine du projet si nécessaire :

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=agence_traduction
PORT=3000
```

---

## Règles métier

- **Tarif de base** : `nbPages × tarifParPage` (défini à la création du projet)
- **Express** : si `deadline − maintenant < 24 h` → **+30 %**
- **Retard** : si `dateRendu > deadline` → **−10 % par heure entamée**
- **Plancher** : le montant final ne peut jamais être négatif
