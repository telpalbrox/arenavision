const express = require('express');
const request = require('superagent');
const cheerio = require('cheerio');

const ARENAVISION_URL = 'https://arenavision.in/';
const ARENAVISION_SCHEDULE_URL = `${ARENAVISION_URL}/schedule`
const ARENAVISION_CHANNEL_URL = `${ARENAVISION_URL}/av`;
const PORT = process.env.PORT || 3000;

const app = express();

app.get('/', async function(req, res) {
    const agent = request.agent();
    const response = await agent.get(ARENAVISION_SCHEDULE_URL).set('Cookie', getCookie());
    const $schedulePage = cheerio.load(response.text);
    const data = parseSchedulePage($schedulePage);
    const data2 = mapChannels(data, agent);
    res.status(200).json(await getChannelsUrls(data2));
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
            event[columnsName[index]] = $column.text();
        });
        return event;
    }).get();
}

function mapChannels(arenaVisionResponse, agent) {
    return arenaVisionResponse.map((event) => {
        const rawChannels = event.channels;
        const rawChannelsArray = rawChannels.replace(/\n/gi, ' ').replace(/\t/gi, '').split(' ');
        event.channels = rawChannelsArray.map((rawChannel, index) => {
            if (rawChannel[0] === '[') {
                return;
            }
            let channel = null;
            rawChannel.split('-').forEach((channelNumberString) => {
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

async function getChannelUrl(channelNumber) {
    if (channelCache[channelNumber]) {
        return channelCache[channelNumber];
    }
    try {
        var response = await request.get(`${ARENAVISION_CHANNEL_URL}${channelNumber}`).set('Cookie', getCookie());
    } catch (e) {
        return null;
    }
    const $channelPage = cheerio.load(response.text);
    const url = $channelPage('p.auto-style1 a').attr('href');
    channelCache[channelNumber] = url;
    return url;
}

async function getChannelsUrls(arenaVisionResponse) {
    for(let i = 0; i < arenaVisionResponse.length; i++) {
        const event = arenaVisionResponse[i];
        for(let j = 0; j < event.channels.length; j++) {
            const channel = event.channels[j];
            channel.url = await getChannelUrl(channel.number);
        }
    }
    return arenaVisionResponse;
}

function getCookie() {
    var now = new Date();
    var time = now.getTime();
    time += 19360000 * 1000;
    now.setTime(time);
    return 'beget=begetok' + '; expires=' + now.toGMTString() + '; path=/';
}
