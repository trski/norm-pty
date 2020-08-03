const _ = require('lodash');
const pty = require('node-pty');
const redis = require('redis');
const promisify = require('util').promisify;
const utils = require('./lib/utils');

const to = utils.to;
const ptys = {};
const subs = {};

const ptyFactory = (opts) => {
  let p = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 25,
    env: process.env
  });
  p.guid = opts.guid;
  return p;
};

const rd = redis.createClient();
const setAsync = promisify(rd.set).bind(rd);

const register = async (guid) => {
  let updated = new Date();
  let host = 'localhost';
  let payload = {
    updated
  };
  let [err] = await to(setAsync(
    `agents:${host}:ptys:${guid}`,
    JSON.stringify(payload),
    'EX',
    10
  ));
  if (err) {
    console.error(err);
  }
  return err;
};

const broadcast = redis.createClient();
broadcast.subscribe('broadcast');
broadcast.on('message', async (chan, d) => {
  let err = null;
  try {
    d = JSON.parse(d);
  } catch(e) {
    console.error(e);
    err = e;
  }
  if (err) {
    console.error(err);
    return err;
  }
  // TODO: check for the host
  if (d.msg === 'close') {
    let guid = d.guid;
    let p = ptys[guid];
    if (p === null) {
      return null;
    }
    p.kill();
    p = null;
    delete ptys[guid];
    let sub = subs[guid];
    if (sub) {
      sub.unsubscribe();
      delete subs[guid];
    }
    rd.ltrim(`buffer:${guid}`, 0, -1);
  } else if (d.msg === 'open') {
    console.log('open');
    let guid = d.guid;
    console.log(guid);
    if (!guid) {
      console.error('invalid guid');
      return null;
    }
    let p = ptyFactory({ guid });
    ptys[guid] = p;
    let sub = redis.createClient();
    sub.subscribe(`to-pty:${guid}`);
    sub.on('message', (chan, msg) => {
      p.write(msg);
      p.date = new Date();
    });
    subs[guid] = sub;
    p.on('data', (d) => {
      // TODO: redis logs
      // console.log(d);
      rd.publish(`from-pty:${guid}`, d);
      rd.rpush(`buffer:${guid}`, d);
      rd.ltrim(`buffer:${guid}`, 0, 999);
    });
  } else {
    console.error('bad msg');
  }
});

const poll = () => {
  setTimeout(async () => {
    await _.each(Object.keys(ptys), async (k) => {
      await register(k);
      return poll();
    });
  }, 5000);
};

const reap = () => {
  setTimeout(() => {
    let d = new Date();
    _.each(Object.keys(ptys), (k) => {
      let p = ptys[k];
      if (!p) {
        return null;
      }
      if (p.date) {
        let delta = Math.abs(d - p.date);
        if (delta > (25 * 60 * 1000)) {
          p.kill();
          p = null;
          delete ptys[k];
          delete subs[k];
          rd.ltrim(`buffer:${k}`, 0, -1);
        }
      } else {
        p.date = d;
      }
    });
  }, 5000);
};

// poll();
reap();

console.log('starting ...');
