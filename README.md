tgircbot
========

This Telegram bot connects to the IRC to bridge messages between a channel and a tg group.

That's the script I use to bridge radare, cutter and frida channels.

Who is Using it?
----------------

Right now there are 4 channels/projects using this bot:

- radare2, cutter, frida and kernelnewbies

Configuration
-------------

If you install this module via npm you must take the sample config file and tweak it for
your needs. This is basically something like this:

	{
		"irc": {
			"host": "irc.freenode.net",
			"nick": "tgircbot",
			"channel": "#tgircbot",
			"port": 6667,
			"ssl": false
		},
		"tg": {
			"chatId": 0,
			"token": "XXX"
		}
	}

You may see the options with `tgircbot --help` or just provide this config file with `-c`.

- The token for Telegram can be obtained by chatting with @BotFather
- For chatId; run tgircbot for the first time and copypaste the double negative number

This bot will improve over time, mainly focusing on stability and simplicity. If you
have any problem or complain please let me know.

--pancake
