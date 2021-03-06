const _ = require('lodash');
const redis = require('redis');
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const urlParser = require('url');
const WebSocket = require('ws');
const uuid = require('uuid');
const promisify = require('util').promisify;
const utils = require('./lib/utils');
const config = require('./config');

const app = express();
const to = utils.to;
let redisOpts = {
  port: config.REDIS.PORT,
  host: config.REDIS.HOST
};
if (config.REDIS.PASS) {
  redisOpts.password = config.REDIS.PASS;
}
if (config.REDIS.TLS) {
  redisOpts.tls = config.REDIS.TLS;
}
const rd = redis.createClient(redisOpts);
// const getAsync = promisify(rd.get).bind(rd);
// const hgetAsync = promisify(rd.hget).bind(rd);
const hgetallAsync = promisify(rd.hgetall).bind(rd);
const lrangeAsync = promisify(rd.lrange).bind(rd);
const clients = {};
const subs = {};

app.set('trust proxy', 1);
app.use(bodyParser.json({limit: '800000kb'}));
app.engine('html', require('ejs').renderFile);
app.use(express.static('./static/dist/'));
app.set('views', process.cwd() + '/templates');

app.get('/', (req, res) => {
  res.json({status: 'success'});
});

app.get('/ptys/:guid', (req, res) => {
  let opts = {
    guid: req.params.guid
  };
  res.render('index.html', opts);
});

app.get('/v1/ptys', async (req, res, next) => {
  let [err, d] = await to(hgetallAsync('ptys'));
  if (err) {
    return next(err);
  }
  res.json({data: d});
});

app.post('/v1/ptys', async (req, res, next) => {
  let token = req.query.token;
  if (token !== config.TOKEN) {
    return next(new Error('bad token'));
  }
  let opts = req.body;
  if (!opts) {
    return next(new Error('bad json'));
  }
  let host = opts.host;
  // TODO: check if that host is valid
  let guid = uuid.v4();
  let d = {
    host,
    guid,
    msg: 'open'
  };
  let sub = redis.createClient(redisOpts);
  sub.subscribe(`from-pty:${guid}`);
  sub.on('message', (chan, msg) => {
    let d = clients[guid];
    if (!d) {
      console.log('no clients');
      return null;
    }
    _.each(d, (ws) => {
      if (!ws) {
        return true;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  });
  subs[guid] = sub;
  rd.publish('broadcast', JSON.stringify(d));
  res.json({ guid });
});

app.put('/v1/ptys/:guid/close', async (req, res) => {
  let guid = req.params.guid;
  let d = {
    guid,
    msg: 'close'
  };
  rd.publish('broadcast', JSON.stringify(d));
  res.json({status: 'success'});
});

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

const svr = http.createServer(app);
const wb = new WebSocket.Server({server: svr, path: '/ws'});

wb.on('connection', async (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  let q = urlParser.parse(req.url, true).query;
  let guid = q.guid;
  console.log(guid);
  let d = clients[guid] || [];
  d.push(ws);
  clients[guid] = d;
  console.log(clients.length);
  let cache = await lrangeAsync(`buffer:${guid}`, 0, -1) || [];
  if (cache.length) {
    ws.send(cache.join(''));
  }
  ws.on('message', (msg) => {
    rd.publish(`to-pty:${guid}`, msg);
  });
});

const interval = setInterval(function ping() {
  wb.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 10000);

wb.on('close', function close() {
  clearInterval(interval);
});

if (!config.PORT) {
  console.error('bad port');
  process.exit(1);
}

svr.listen(config.PORT, '127.0.0.1', () => {
  console.log('listening ...');
});
