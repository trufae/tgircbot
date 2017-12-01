'use strict';

/* IRC */
const IRC = require('irc.js');
var irc = null;
var channel = null;

module.exports.bridgeMessage = function (name, text) {
  if (irc === null) {
    console.error('irc instance not yet defined');
    return false;
  }
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

  /* r2 stuff */
  print(Chi, '[=>] Initializing r2 core...', Cend);

  function startIrcBot (OPT) {
    const configFile = OPT.config || './config.json';
    const config = require(configFile);

    /* parse commandline options */
    var nick = OPT.nick || config.irc.nick || 'r2tg';
    channel = OPT.channel || config.irc.channel || '#radare';
    var host = OPT.host || config.irc.host || 'irc.freenode.net';
    var port = OPT.port || config.irc.host || 6667;
    if (channel[0] !== '#') {
      channel = '#' + channel;
    }

    if (OPT.help || OPT.h) {
      print('r2tgirc.js [--ssl] [--host host] [--port port] [--config config.json]');
      print('    [--nick nick] [--channel chan] [--group tggrpid] [--owner nick]');
      process.exit(0);
    }

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
    print(Chi, '     HOST: ', host, ':', port, Cend);
    print(Chi, '     NICK: ', nick, ' ', channel, Cend);

    irc = new IRC(host, port);

    irc.on('disconnected', function (data) {
      print('Disconnected from the IRC');
      irc.connect(nick, 'radare-telegram-irc-bridge');
      if (endpoint.onReconnect) {
        endpoint.onReconnect();
      }
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

    irc.connect(nick, 'tgircbot');
  }
  return {
    start: startIrcBot
  };
};
