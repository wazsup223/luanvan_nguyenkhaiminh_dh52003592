const { Sequelize } = require('sequelize');
require('dotenv').config();

// Read config from .env file
const sequelize = new Sequelize(
  process.env.DB_NAME || 'fastfood_multibranch',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully!');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
  }
}

module.exports = { sequelize, Sequelize, testConnection };
