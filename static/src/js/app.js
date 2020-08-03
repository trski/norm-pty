'use strict';

var ipToNumber = function(ip) {
  if (!ip) {
    return null;
  }
  var d = ip.split('.');
  if (d.length < 2) {
    return parseInt(d[0]);
  }
  var n=d[0]*Math.pow(256,3);
  n+=d[1]*Math.pow(256,2);
  n+=d[2]*256;
  n+=+d[3];
  return n;
};

var getSha = function(id) {
  let d = id.split(':')[1];
  let res = d.substring(0, 12);
  return res;
};

var events = new Vue();

function createPtyView() {
  var app = new Vue({
    el: "#pty",
    delimiters: ['[[', ']]'],
    created: function() {
      var that = this;
      /*
      var poll = function() {
        that.getActivePty();
        setTimeout(poll, 5000);
      };
      poll();
      */
    },
    mounted: function() {
      let that = this;
      Terminal.applyAddon(fit);
      let term = new Terminal({
        screenKeys: true,
        useStyle: true,
        cursorBlink: true,
        cols: 80,
        rows: 25
      });
      term.setOption('theme', {background: '#222'});
      let host = window.location.host;
      let params = (new URL(location)).searchParams;
      let url = 'ws://' + host + '/ws?guid=' + GUID;
      var ws = new ReconnectingWebSocket(url);
      term.on('data', function(data) {
        ws.send(data);
      });
      term.open(document.getElementById('terminal'), true);
      ws.onopen = function() {
        term.reset();
      };
      ws.onerror = function() {
        that.pty = null;
        console.log('ws error');
      };
      ws.onclose = function() {
        console.log('ws closed');
      };
      ws.onmessage = function(msg) {
        term.write(msg.data);
      };
      that.term = term;
      // that.term.write('\x1bc');
      that.ws = ws;
    },
    data: {
      term: null,
      ws: null,
      active: '',
      pty: null,
    },
    methods: {
      getActivePty: function() {
        var that = this;
        $.get('/v1/active-pty', function(res) {
          that.pty = res.data;
        }).fail(function() {
          console.log('failed to get active pty');
        });
      }
    }
  });
};
