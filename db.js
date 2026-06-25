const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'agence_traduction',
  timezone: '+00:00',      // stocke/lit en UTC — comparaisons cohérentes
  dateStrings: false,       // retourne de vrais objets Date JS
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
