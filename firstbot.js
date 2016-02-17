var fs = require('fs');
var moment = require('moment-timezone');
var irc = require('irc');
var low = require('lowdb');
var storage = require('lowdb/file-sync');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var db = low('db.json', { storage });
var client = new irc.Client(config.server, config.nick, {
    channels: config.channels,
    userName: 'firstbot',
    realName: 'firstbot',
    autoRejoin: true
});

var isEmpty = function (obj) {
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

var stats = function (channel, to) {
    var stats = db('stats').chain().where({
        channel: channel
    }).pluck('nick').countBy().value();
    if (isEmpty(stats)) {
        client.say(to, 'No stats for current channel');
        return;
    }
    var sorted = [];
    for (var nick in stats) {
        sorted.push([nick, stats[nick]]);
    }
    sorted.sort(function(a, b) {
        return a[1] - b[1];
    });
    client.say(to, 'Current stats:');
    for (var i = sorted.length - 1; i >= 0; i--) {
        client.say(to, sorted[i][0] + ': ' + sorted[i][1]);
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
        stats(channel, nick);
    } else if (text === config.command.stats) {
        stats(channel, nick);
    }
});

client.addListener('error', function (message) {
    console.log('error: ', message);
});

console.log('firstbot running with following configuration:')
console.log(config);
