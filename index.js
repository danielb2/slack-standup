#!/usr/bin/env node
'use strict';

const Config = require('./lib/config.js'); // blocking lib
const Fs = require('fs');
const Json5 = require('json5');
const Util = require('util');


// Declare internals

const internals = {
    extend: Util._extend,
    format: Util.format,
    exec: require('child_process').spawnSync,
    post: require('request').post,
    attachments: [
        { fallback: 'Breakfast', color: '#000000', fields: [{ title: 'Breakfast', value: '' }] },
        { fallback: 'Previous', color: '#F37321', fields: [{ title: 'Previous', value: '' }] },
        { fallback: 'Today',     color: '#57BA47', fields: [{ title: 'Today',     value: '' }] },
        { fallback: 'Issues',      color: '#005593', fields: [{ title: 'Issues',      value: '' }] },
        { fallback: 'Blockers',  color: '#CC0000', fields: [{ title: 'Blockers',  value: '' }] }
    ]
};


internals.initStandupFile = function () {

    // blank standup file for first time ...
    const blank_standup = {
        live: false,
        text: ['*Status Update*'],
        breakfast: ['* '],
        previous: ['* ', '* '],
        today: ['* ', '* '],
        issues: ['* <https://github.com/danielb2/purdy.js/issues/22|purdy-cli> Purdy Issue'],
        blockers: ['* None, on track']
    };

    if (Config.prev_standup) {
        if (!Config.prev_today) {
            const prev_standup = Fs.readFileSync(Config.prev_standup, { encoding: 'utf8' });

            // TODO: try/catch ... fails use blank ?? (shouldn't fail)
            const prev_json = Json5.parse(prev_standup);

            // add Today to Previous ~ ?? more parsing
            prev_json.previous = [].concat(prev_json.previous, '// -----', prev_json.today);

            // default to false unless already posted
            prev_json.live = Config.standup_json ? true : false;

            // create new standup file using JSON5 to unquote keys
            Fs.writeFileSync(Config.standup_file, JSON.stringify(prev_json, null, 2), 'utf8');
        }
    }
    else {
        Fs.writeFileSync(Config.standup_file, JSON.stringify(blank_standup, null, 2), 'utf8');
    }
};


internals.launchEditor = function () {

    const editor = internals.exec(Config.editor, [].concat(Config.editor_args, Config.standup_file), { stdio: 'inherit' });

    if (editor.status !== 0) {
        console.log(internals.format('Error: trying to launch editor: `%s %s %s`', Config.editor, Config.editor_args.join(' '), Config.standup_file));
        process.exit(1);
    }
};


internals.getStandupData = function () {

    // parse standup file
    const standup = Fs.readFileSync(Config.standup_file, { encoding: 'utf8' });
    let standup_json = {};
    try {
        standup_json = Json5.parse(standup);
    }
    catch (e) {
        // if not ok - exit (gives user feed back on parse errors)
        console.log(internals.format('Error# parsing standup file :%s', e.message).replace(/:/, '\'').replace(/:/, '\'').replace(/#/, ':'));
        process.exit(1);
    }

    return standup_json;
};


internals.makeNewStandup = function (standup_json) {

    let new_standup = {
        channel: Config.channel,
        as_user: Config.user,
        text: standup_json.text.join('\n'),
        attachments: internals.attachments
    };

    // properties
    ['breakfast', 'previous', 'today', 'issues', 'blockers'].forEach((prop, index) => {
        // remove commented values
        const values = standup_json[prop].filter((value) => {

            return !(/^(?:#[#-]|\/\/|\/[*])/.test(value));
        })
        .map((value, idx) => {

            return value
            .replace(/^[*][ ]/, '\u2022 ') // bullets
            .replace(/^[-][ -]/, '\u2013 ') // en-dash
            .replace(/^[#][ .]/, internals.format('%s. ', (idx + 1))) // numbers
            ;
        });
        // use commas for the first and line-ends for the rest
        new_standup.attachments[index].fields[0].value = values.join(index ? '\n' : ', ');
    });

    // WTF ~ this took me awhile to figure out and then remember (later)!! Need to abstract this!!
    new_standup.attachments = JSON.stringify(new_standup.attachments);

    // postMessage or update or delete
    if (Config.standup_ts_json) {
        if (standup_json.live) {
            internals.extend(new_standup, Config.standup_ts_json);
        }
        else {
            new_standup = Config.standup_ts_json;
        }
    }
    else {
        if (!standup_json.live) {
            console.log('Standup Not Sent! Note: the \'live\' property must be true.');
            process.exit(2);
        }
    }

    return new_standup;
};


internals.postURL = function (standup_json) {

    let postURL = 'https://slack.com/api/chat.postMessage?token=' + Config.slack_token;
    if (Config.standup_ts_json && standup_json.live) {
        postURL = postURL.replace(/postMessage/, 'update');
    }
    if (Config.standup_ts_json && !standup_json.live) {
        postURL = postURL.replace(/postMessage/, 'delete');
    }

    return postURL;
};


internals.main = function () {

    internals.initStandupFile();
    internals.launchEditor();
    const standup_json = internals.getStandupData();
    const new_standup = internals.makeNewStandup(standup_json);
    const postURL = internals.postURL(standup_json);

    internals.post(postURL, { form: new_standup }, (err, resp, body) => {

        if (err) {
            console.log(err);
            process.exit(1);
        }

        const response_json = JSON.parse(body);
        if (response_json.ok) {
            if (standup_json.live) {
                Fs.writeFileSync(Config.standup_ts_file, JSON.stringify({ ts: response_json.ts, channel: response_json.channel }), 'utf8');
                console.log(internals.format('Standup %s! [channel: \'%s\']', (Config.standup_ts_json ? 'Updated' : 'Sent'), Config.channel));
            }
            else if (Config.standup_ts_json) {
                Fs.unlinkSync(Config.standup_ts_file);
                console.log(internals.format('Standup Deleted! [channel: \'%s\']', Config.channel));
            }
        }
        else {
            if (response_json.error === 'message_not_found') {
                fs.unlinkSync(config.standup_ts_file);
                console.log('Standup Not Send! Note: the original messge was probably deleted manually. Re-run and try again.');
                process.exit(2);
            }
        }
    });
};

internals.main();
