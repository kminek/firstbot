var fs = require('fs');
var moment = require('moment-timezone');
var irc = require('irc');
var low = require('lowdb');
var storage = require('lowdb/file-sync');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var babe = fs.readFileSync('babe.txt').toString().split('\n');

var db = low('db.json', { storage });
var client = new irc.Client(config.server, config.nick, {
    channels: config.channels,
    userName: 'firstbot',
    realName: 'firstbot',
});

var isEmpty = function(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
};

var detectPhrase = function (text, phrase) {
    var textArr = text.split(' ');
    var found = false;
    for (var i = 0; i < textArr.length; i++) {
        if (textArr[i].trim().toLowerCase() === phrase.toLowerCase()) {
            found = true;
            break;
        }
    }
    return found;
};

var stats = function(channel)
{
    var stats = db('stats').chain().where({
        channel: channel
    }).pluck('nick').countBy().value();
    if (isEmpty(stats)) {
        client.say(channel, 'No stats for current channel');
        return;
    }
    client.say(channel, 'Current stats:');
    for (var nick in stats) {
        client.say(channel, nick + ': ' + stats[nick]);
    }
};

client.addListener('message', function (from, to, text, message) {

    var channel = message.args[0];
    var nick = message.nick;
    var localTime = moment().tz(config.timezone);

    if (detectPhrase(text, config.phrase)) {
        var record = {
            channel: channel,
            year: localTime.year(),
            month: localTime.month() + 1,
            day: localTime.date()
        };
        var exists = db('stats').chain().where(record).value().length;
        if (exists !== 0) {
            return;
        }
        record.nick = nick;
        record.date = localTime.format();
        db('stats').push(record);
        client.say(channel, 'Congratulations ' + nick + '! You were first :)');
        stats(channel);
    } else if (text === config.command.stats) {
        stats(channel);
    } else if (text === config.command.babe) {
        var i = 0;
        client.say(channel, babe[i]);
        var interval = setInterval(function () {
            i++;
            if (typeof babe[i] === 'undefined') {
                clearInterval(interval);
                return;
            }
            client.say(channel, babe[i]);
        }, 2100);
    }

});

client.addListener('error', function (message) {
    console.log('error: ', message);
});

console.log('firstbot running with following configuration:')
console.log(config);
