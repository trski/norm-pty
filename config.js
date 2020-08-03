const _ = require('lodash');

let config = {};

// db
config.DB_OPTS = {
  user: process.env.PGUSER || 'test',
  database: process.env.PGDATABASE || 'test',
  password: process.env.PGPASSWORD || '',
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT || 5432,
  max: 50, // max number of clients in the pool
  idleTimeoutMillis: 30000
};

config.SECRET_KEY = process.env.SECRET_KEY;

// redis
config.REDIS = {
  PORT: process.env.REDIS_PORT || 6379,
  HOST: process.env.REDIS_HOST || '127.0.0.1',
  PASS: process.env.REDIS_PASS
};

if (process.env.REDIS_SSL > 0) {
  // console.log('got redis ssl');
  config.REDIS.TLS = {
    servername: process.env.REDIS_HOST
  };
}

config.REDIS_URL = (() => {
  let proto = 'redis';
  if (process.env.REDIS_SSL) {
    proto += 's';
  }
  let auth = '';
  if (config.REDIS.PASS) {
    auth = 'redis:' + config.REDIS.PASS + '@';
  }
  let d = proto + '://' + auth +
  config.REDIS.HOST + ':' + config.REDIS.PORT;
  return d;
})();

module.exports = config;
