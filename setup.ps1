# ============================================================
# setup.ps1 — Installation automatique Agence de Traduction
# Lancer avec : powershell -ExecutionPolicy Bypass -File setup.ps1
# ============================================================

$mysql = "C:\xampp\mysql\bin\mysql.exe"
$schema = Join-Path $PSScriptRoot "schema.sql"

Write-Host ""
Write-Host "=== Agence de Traduction — Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier Node.js
Write-Host "[ 1/3 ] Vérification de Node.js..." -ForegroundColor Yellow
$nodeVersion = node -v 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR : Node.js n'est pas installé. Téléchargez-le sur https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "       Node.js $nodeVersion détecté." -ForegroundColor Green

# 2. Vérifier MySQL (XAMPP)
Write-Host "[ 2/3 ] Vérification de MySQL (XAMPP)..." -ForegroundColor Yellow
if (-not (Test-Path $mysql)) {
    Write-Host "ERREUR : MySQL XAMPP introuvable à $mysql" -ForegroundColor Red
    Write-Host "         Assurez-vous que XAMPP est installé dans C:\xampp et que MySQL est démarré." -ForegroundColor Red
    exit 1
}

$testConn = & $mysql -u root -e "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR : Impossible de se connecter à MySQL." -ForegroundColor Red
    Write-Host "         Démarrez MySQL depuis le XAMPP Control Panel." -ForegroundColor Red
    exit 1
}
Write-Host "       MySQL accessible." -ForegroundColor Green

# 3. Charger le schéma
Write-Host "[ 3/3 ] Création de la base de données..." -ForegroundColor Yellow
Get-Content $schema | & $mysql -u root 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR : Échec du chargement du schéma." -ForegroundColor Red
    exit 1
}
Write-Host "       Base 'agence_traduction' créée avec données de démo." -ForegroundColor Green

# 4. npm install
Write-Host ""
Write-Host "[ + ] Installation des dépendances npm..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm install --silent
Write-Host "       Dépendances installées." -ForegroundColor Green

# Done
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Setup terminé ! Lancez maintenant :" -ForegroundColor Green
Write-Host "   node server.js" -ForegroundColor White
Write-Host " Puis ouvrez : http://localhost:3000" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
