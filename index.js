const path = require('path');
const express = require('express');
const request = require('superagent');
const cheerio = require('cheerio');
const serveStatic = require('serve-static');

const ARENAVISION_URL = process.env.ARENAVISION_URL || 'http://arenavision.in';
const ARENAVISION_SCHEDULE_PATH = process.env.ARENAVISION_SCHEDULE_PATH || 'guide';
const ARENAVISION_SCHEDULE_URL = `${ARENAVISION_URL}/${ARENAVISION_SCHEDULE_PATH}`;
const PORT = process.env.PORT || 3000;

const app = express();

app.use(serveStatic(path.join(__dirname, 'web')));

app.get('/json', async function(req, res) {
    try {
        res.status(200).json(await getArenavision());
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.get('/html', async function(req, res) {
    res.send(`
    <body>
    <style>
    body { white-space: pre; font-family: monospace; }
    </style>
    ${JSON.stringify(await getArenavision(), null, 4)}
    </body>
    `);
});

app.listen(PORT, function(err) {
    if (err) {
        return console.log(err);
    }
    console.log(`Listening on ${PORT}`);
});

const columnsName = ['day', 'time', 'sport', 'competition', 'title', 'channels'];

function parseSchedulePage($schedulePage) {
    const $rows = $schedulePage('table.auto-style1 tr');
    return $rows.map((index, row) => {
        const $row = $schedulePage(row);
        if (!index || index >= $rows.length - 2) {
            return;
        }
        const event = {};
        $row.find('td').each((index, column) => {
            const $column = $schedulePage(column);
            event[columnsName[index]] = toTitleCase($column.text().replace(/\n/gi, ' ').replace(/\t/gi, '').trim());
        });
        if (Object.keys(event).length < 6) {
            return;
        }
        return event;
    }).get().filter((event) => !!event.day);
}

function mapChannels(arenaVisionResponse, agent) {
    return arenaVisionResponse.map((event) => {
        const rawChannels = event.channels || '';
        const rawChannelsArray = rawChannels.replace(/\n/gi, ' ').replace(/\t/gi, '').split(' ');
        event.channels = rawChannelsArray.map((rawChannel, index) => {
            if (rawChannel[0] === '[') {
                return;
            }
            let channel = null;
            rawChannel.split('-').forEach((channelNumberString) => {
                if (channelNumberString === '') {
                    return;
                }
                const channelNumber = parseInt(channelNumberString, 10);
                const language = rawChannelsArray[index + 1] && rawChannelsArray[index + 1].replace(/[\[\]]+/gi, '');
                channel = {
                    number: channelNumber,
                    language
                };
            });
            return channel;
        }).filter((channel) => !!channel);
        return event;
    });
}

const channelCache = {};

async function getChannelAcestreamUrl(channelNumber, channelUrl) {
    if (channelCache[channelNumber]) {
        return channelCache[channelNumber];
    }
    const channelNumberString = String(channelNumber).padStart(2, '0');
    try {
        var response = await request.get(channelUrl).set('Cookie', getCookie());
    } catch (err) {
        console.error(`Error getting channel ${channelNumberString}`);
        console.error(err);
        return null;
    }
    const $channelPage = cheerio.load(response.text);
    const url = $channelPage('p.auto-style1 a').attr('href');
    channelCache[channelNumber] = url;
    return url;
}

async function getAcestreamChannelsUrls(arenaVisionResponse, channelsUrls) {
    for(let i = 0; i < arenaVisionResponse.length; i++) {
        const event = arenaVisionResponse[i];
        for(let j = 0; j < event.channels.length; j++) {
            const channel = event.channels[j];
            channel.url = await getChannelAcestreamUrl(channel.number, channelsUrls.get(channel.number));
        }
    }
    return arenaVisionResponse;
}

async function getArenavision() {
    const response = await request.get(ARENAVISION_SCHEDULE_URL).set('Cookie', getCookie());
    const $schedulePage = cheerio.load(response.text);
    const channelsUrls = getChanelsUrls($schedulePage);
    const data = parseSchedulePage($schedulePage);
    const data2 = mapChannels(data);
    return await getAcestreamChannelsUrls(data2, channelsUrls);
}

function getChanelsUrls($schedulePage) {
    const $chanelLinks = $schedulePage('li.expanded li a');
    const channelsUrls = new Map();
    $chanelLinks.each((index, link) => {
        const $link = $schedulePage(link);
        channelsUrls.set(parseInt($link.text().replace(/ArenaVision /gi, ''), 10), $link.attr('href'));
    });
    return channelsUrls;
}

function getCookie() {
    var now = new Date();
    var time = now.getTime();
    time += 19360000 * 1000;
    now.setTime(time);
    return 'beget=begetok' + '; expires=' + now.toGMTString() + '; path=/';
}

function toTitleCase(string) {
    return string.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
