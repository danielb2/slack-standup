#!/usr/bin/env node
'use strict';

const File = require('./lib/file');
const Util = require('util');
const { WebClient } = require('@slack/web-api');

const Config = require('./lib/config.js'); // blocking lib

// Declare internals

const internals = {
    colors: [
        'FF0000', // red
        'FF7F00', // orange
        'FFFF00', // yellow
        '00FF00', // green
        '0000FF', // blue
        '4B0082', // indigo
        '9400D3'  // violet
    ],
    extend: Util._extend,
    format: Util.format,
    exec: require('child_process').spawnSync,
    methodMap: {
        postMessage: 'Sent',
        update: 'Updated',
        delete: 'Deleted',
    }
};


internals.initStandupFile = function () {

    // blank standup file for first time ...
    const blank_standup = {
        live: false,
        text: '*Status Update*',
        body: {
            breakfast: 'cereal',
            previous: 'some work you did yesterday',
            today: '1. do something\n2. really\n3. well',
            along: '<https://walmart.slack.com/archives/C5G525Q3U/p1599776004007200|can we>  see',
            issues: ['* [Purdy Issue](https://github.com/danielb2/purdy.js/issues/22)'],
            blockers: ['* None, on track']
        }
    };

    if (Config.prev_standup) {
        if (!Config.prev_today) {
            const prev_json = File.read(Config.prev_standup);

            // add Today to Previous ~ ?? more parsing
            prev_json.previous = [].concat(prev_json.previous, '// -----', prev_json.today);

            // default to false unless already posted
            prev_json.live = Config.standup_json ? true : false;

            // create new standup file using JSON5 to unquote keys
            File.write(Config.standup_file, prev_json);
        }
    }
    else {
        File.write(Config.standup_file, blank_standup);
    }
};


internals.launchEditor = function () {

    const editor = internals.exec(
        Config.editor,
        [].concat(Config.editor_args, File.filePath(Config.standup_file)), { stdio: 'inherit' }
    );

    if (editor.status !== 0) {
        console.log(`Error: trying to launch editor: ${Config.editor} ${Config.editor_args.join(' ')} ${Config.standup_file}`);
        process.exit(1);
    }
};


internals.makeNewStandup = function (standup) {

    let new_standup = {
        channel: standup.channel || Config.channel,
        mrkdwn: true,
        parse: 'full',
        ts: standup.ts,
        as_user: Config.user,
        text: [].concat(standup.text).join('\n'),
        attachments: []
    };

    const keys = Object.keys(standup.body).filter((item) => {

        if (item === 'text' || item === 'live') {
            return false;
        }

        return true;
    });


    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        const title = key.charAt(0).toUpperCase() + key.slice(1,key.length).toLowerCase();

        standup.body[key] = [].concat(standup.body[key]);

        const values = standup.body[key].filter((value) => {

            return !(/^(?:#[#-]|\/\/|\/[*])/.test(value));
        }).map((value, idx) => {

            return value
                .replace(/^[*][ ]/, '\u2022 ') // bullets
                .replace(/^[-][ -]/, '\u2013 ') // en-dash
                .replace(/^[#][ .]/, `${idx + 1}. `); // numbers
        });


        const color = internals.colors[i % internals.colors.length];
        const section = {
            fallback: title,
            type: 'mrkdwn',
            color: '#' + color,
            fields: [{ title,  value: values.join('\n') }]
        };

        new_standup.attachments.push(section);
    }

    if (!standup.live && !standup.ts) {
        console.log('Standup Not Sent! Note: the \'live\' property must be true.');
        process.exit();
    }

    return new_standup;
};

internals.main = async function () {

    const web = new WebClient(Config.slack_token);

    internals.initStandupFile();
    internals.launchEditor();
    const standup = File.read(Config.standup_file);
    const new_standup = internals.makeNewStandup(standup);

    console.log(new_standup);

    const method = (() => {
        if (standup.live && standup.ts) return 'update';
        if (standup.live) return 'postMessage';
        if (!standup.live) return 'delete';
    })();
    console.log(method);


    let response;
    try {
        response = await web.chat[method]({
            ...new_standup
        });
        if (!response.ok) {
            console.log(response);
        }
        standup.ts = response.ts;
        standup.channel = response.channel;
    } catch (e) {
        if (e.data.error === 'message_not_found') {
            delete standup.ts;
            console.log('Standup not sent! Note: the original messge was probably deleted manually. Re-run and try again.');
            File.write(Config.standup_file, standup);
        } else {
            console.log(e.data.error);
        }
        process.exit();
    }

    if (!standup.live) {
        delete standup.ts;
    }

    File.write(Config.standup_file, standup);
    console.log(`Standup ${internals.methodMap[method]}! [channel: \'${Config.channel}\']`);

    // internals.post(postURL, { form: new_standup }, (err, resp, body) => {
    //
    //     if (err) {
    //         console.log(err);
    //         process.exit(1);
    //     }
    //
    //     const response_json = JSON.parse(body);
    //
    //     if (!response_json.ok) {
    //         console.log(body);
    //     }
    //
    //     if (response_json.ok) {
    //         let action;
    //         if (standup_json.live) {
    //             File.write(Config.standup_ts_file, { ts: response_json.ts, channel: response_json.channel });
    //             File.write(Config.standup_file, standup_json, null);
    //             action = Config.standup_ts_json ? 'Updated' : 'Sent';
    //         }
    //         else {
    //             File.rm(Config.standup_ts_file);
    //             action = 'Deleted';
    //         }
    //
    //         console.log(`Standup ${action}! [channel: \'${Config.channel}\']`);
    //     }
    //     else {
    //         if (response_json.error === 'message_not_found') {
    //             File.rm(Config.standup_ts_file);
    //             console.log('Standup not sent! Note: the original messge was probably deleted manually. Re-run and try again.');
    //             process.exit(2);
    //         }
    //     }
    // });
};

internals.main();
