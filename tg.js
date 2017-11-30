'use strict';

const TelegramBot = require('node-telegram-bot-api');
const util = require('./util');

var gChatId = null;
var bot = null;

module.exports = {
  bridgeMessage: bridgeMessage,
  launch: launch
};

function bridgeMessage (name, text) {
  if (gChatId !== null && bot !== null) {
    bot.sendMessage(gChatId, '<' + name + '> ' + text);
  } else {
    console.error('Global chat_id not yet known');
  }
};

function launch (endpoint, config) {
  const token = config.tg.token;

  /* Telegram Bot Side */
  if (bot !== null) {
    return;
  }
  bot = new TelegramBot(token, {
    polling: true
  });
  bot.onText(/(.*)/, function (msg, match) {
    console.log('bridge', msg);
  });

  bot.on('message', function (msg) {
    var chatId = msg.chat.id;
    if (!gChatId && chatId) {
      gChatId = chatId;
    }
    console.log(gChatId, chatId);
    // bot.sendMessage(chatId, 'hello world');
    try {
      var name = msg.from.username || msg.from.first_name;
      if (!name) {
        name = msg.chat.username || msg.chat.first_name;
      }
    } catch (e) {
      if (!name) {
        name = msg.from.username || msg.from.first_name;
      }
      console.log(e);
    }
    console.log(msg);
    endpoint.bridgeMessage(name, msg.text);
    endpoint.onReconnect = function() {
      bot = null;
      launch(endpoint);
    }
    // bot.sendPhoto(chatId, 'cats.png', {caption: 'Lovely kittens'});
  });
  return bot;
};
