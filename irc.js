'use strict';

/* IRC */
const path = require('path');
const IRC = require('irc.js');
// const IRC = require('./IRCJS');
const fs = require('fs');

var irc = null;
var channel = null;

module.exports.bridgeMessage = function (name, text) {
  if (irc === null) {
    console.error('irc instance not yet defined');
    return false;
  }
  console.error('bridgemsg', text);
  var lines = text.replace('@r2tgircBot', '').split('\n');
  var count = 10;
  const who = '<' + name + '> ';
  for (var line of lines) {
    console.log('LINE', line);
    if (count-- < 1) {
      irc.privmsg(channel, who + '...');
      break;
    }
    irc.privmsg(channel, who + line.trim());
  }
};

module.exports.bind = function (endpoint) {
  /* config */
  // TODO: use colors
  const Chi = '\x1b[32m';
  const Cend = '\x1b[0m';
  const print = console.log;

  function finalize () {
    // if (irc) irc.privmsg (channel, "byebye");
    print('^C :D');
    process.exit(0);
  }

  process.on('SIGINT', finalize);
  process.on('SIGTERM', finalize);

  function startIrcBot (OPT) {
    if (OPT.help || OPT.h) {
      print('r2tgirc.js [--ssl] [--host host] [--port port] [--config config.json] [--realname name]');
      print('    [--nick nick] [-ssl] [--channel chan] [--group tggrpid] [--owner nick]');
/*
  console.error(`Usage: tgircbot [options]
  --nick [r2tg]              change nickname
  --channel [#radare]        specify different IRC channel
  --host [irc.freenode.net]  host to connect
  --port [6667]              specify tcp port of the irc server
  --ssl                      use SSL to connect to the IRC
`);
*/
      process.exit(0);
    }
    const configFile = OPT.config || OPT.c || './config.json';
    const absConfigFile = path.resolve(configFile);
    if (!fs.existsSync(absConfigFile)) {
      console.error('Cannot find', configFile);
      process.exit(1);
    }
    const config = require(absConfigFile);

    /* parse commandline options */
    var nick = OPT.nick || config.irc.nick || 'r2tg';
    channel = OPT.channel || config.irc.channel || '#radare';
    var host = OPT.host || config.irc.host || 'irc.freenode.net';
    var port = OPT.port || config.irc.port || 6667;
    var realName = OPT.realname || config.irc.realname || 'bridge-irc-telegram';
    if (channel[0] !== '#') {
      channel = '#' + channel;
    }

    // LOL NO
    if (OPT.ssl) {
      // LOL. irc.js ssl support is broken, so i'm workarounding this with a socat pipe
      const sslport = 9000 + (100 * Math.random());
      const cmd = 'socat TCP4-LISTEN:' + sslport + ' OPENSSL:' + host + ':' + port + ',verify=0';
      // print ("SPAWN ("+cmd+")")
      require('child_process')
        .spawn('/bin/sh', ['-c', cmd], {
          stdio: 'pipe'
        })
        .on('exit', function () {
          print('socat closed');
        });
      host = '127.0.0.1';
      port = sslport;
    }

    /* connect to irc */
    print(Chi, '[=>] Connecting to irc ', Cend);
    print(Chi, '     HOST: ', host, Cend);
    print(Chi, '     PORT: ', port, Cend);
    print(Chi, '     NICK: ', nick, Cend);
    print(Chi, '     CHAN: ', channel, Cend);

    irc = new IRC(host, port);

    irc.on('disconnected', function (data) {
      print('Disconnected from the IRC. Reconnecting in 5s');
      setTimeout(() => {
        irc.connect(nick, realName);
        if (endpoint.onReconnect) {
          endpoint.onReconnect();
        }
      }, 3000);
      // reconnect in telegram too
    });

    irc.on('raw', function (data) {
      print('raw', data);
    });
    irc.on('connected', function (s) {
      irc.nick(nick);
      irc.join(channel, function (x) {
        irc.privmsg(channel, 'hi');
        if (endpoint && endpoint.launch) {
          endpoint.launch(module.exports, config);
        }
      });
      print('connected');
    });

    irc.on('privmsg', function (from, to, msg) {
      if (msg.indexOf(nick) !== -1) {
        irc.privmsg(channel, 'I am just a bot, please mention the nick after me.');
      }
/*
  const msgtimeout = 1000;
  var limit = OPT.limit || 10;
      function tailRun (o) {
        if (o != null && o !== '') {
          if (o.split('\n').length < limit) {
            (function () {
              var a = o.split(o.indexOf('\r') !== -1 ? '\r' : '\n');
              var timedmsg = function (x) {
                irc.privmsg(to, a[0]);
                a = a.slice(1);
                if (a.length > 0) {
                  setTimeout(timedmsg, msgtimeout);
                }
              };
              setTimeout(timedmsg, msgtimeout);
            })();
          } else {
            irc.privmsg(to, 'Output limited to ' + limit + ' lines');
          }
        }
      }
*/
      print('<' + from + '> to ' + to + ' ' + msg);
      if (endpoint.bridgeMessage !== null) {
        endpoint.bridgeMessage(from, msg);
      } else {
        console.error('Undefined endpoint');
        irc.privmsg(channel, 'Bridge not initialized yet, message not forwarded.');
      }
      //  const msgline = to + ' <' + from + '> ' + msg;
      // endpoint.bridgeMessage(msgline);
    });

    irc.connect(nick, realName);
  }
  return {
    start: startIrcBot
  };
};
