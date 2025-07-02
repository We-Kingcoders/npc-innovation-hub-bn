require('dotenv').config();

const ssl = {
  require: true,
  rejectUnauthorized: false,
};

module.exports = {
  development: {
    username: process.env.DB_USERNAME,   // <-- changed here
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl,
    },
  },
  production: {
    use_env_variable: 'DB_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl,
    },
  },
};
