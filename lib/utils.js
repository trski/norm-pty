const _ = require('lodash');
const cp = require('child_process');
const util = require('util');
const execFile = util.promisify(cp.execFile);

let utils = {};

utils.to = (p) => {
  return p.then((res) => {
    return [null, res];
  }).catch((err) => {
    return [err];
  });
};

utils.strips = (t) => {
  if (t == undefined) {
    return '';
  }
  return t.toString().replace(/^\s+/, '').replace(/\s+$/, '');
};

utils.getISODate = () => {
  let date = new Date();
  let t = date.toISOString();
  return t;
};

utils.setUpdatedDate = (node) => {
  let date = new Date();
  let updated = date.toISOString();
  node.updated = updated;
  return node;
};

utils.getUTCDate = (d) => {
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds());
};

utils.gitClone = async (opts) => {
  console.log(JSON.stringify(opts));
  let cpOpts = {
    env: process.env,
    shell: false,
    stdio: [0, 1, 2]
  };
  let fname = '/usr/bin/git';
  let args = [
    'clone',
    opts.repo,
    opts.path + '/'
  ];
  console.log(JSON.stringify(args));
  let res = null;
  let err = null;
  try {
    res = await execFile(fname, args, cpOpts);
  } catch(e) {
    console.log('error: ', e);
    err = e;
  }
  return [err, res];
};

utils.gitCheckout = async (opts) => {
  let cpOpts = {
    env: process.env,
    cwd: opts.path,
    shell: false,
    stdio: [0, 1, 2]
  };
  let fname = '/usr/bin/git';
  let args = [
    'checkout',
    opts.branch
  ];
  console.log(JSON.stringify(args));
  let res = null;
  let err = null;
  try {
    res = await execFile(fname, args, cpOpts);
  } catch(e) {
    console.log('error: ', e);
    err = e;
  }
  return [err, res];
};

module.exports = utils;
