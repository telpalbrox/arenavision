const express = require('express');
const request = require('superagent');
const cheerio = require('cheerio');

const ARENAVISION_URL = 'https://arenavision.in/schedule';
const PORT = process.env.PORT || 3000;

const app = express();

app.get('/', async function(req, res) {
    const agent = request.agent();
    const response = await agent.get(ARENAVISION_URL).set('Cookie', getCookie());
    const $schedulePage = cheerio.load(response.text);
    const data = parseSchedulePage($schedulePage);
    res.status(200).json(mapChannels(data, agent));
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
                    channelNumber,
                    language
                };
            });
            return channel;
        }).filter((channel) => !!channel);
        return event;
    });
}

function getCookie() {
    var now = new Date();
    var time = now.getTime();
    time += 19360000 * 1000;
    now.setTime(time);
    return 'beget=begetok' + '; expires=' + now.toGMTString() + '; path=/';
}
