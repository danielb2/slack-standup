'use strict';

const Joi = require('@hapi/joi');
const File = require('./file');
const Fs = require('fs');
const Path = require('path');


const buildConfig = function () {

    const prefs = File.read('slackrc');

    const config = Joi.attempt(prefs, Joi.object({
        slack_token: Joi.string().regex(/^xoxp/).required(),
        user: Joi.string().default(process.env.USER),
        channel: Joi.string().regex(/^#/).required(),
        editor: Joi.string().default(process.env.EDITOR),
        editor_args: Joi.array().items(Joi.string()).default([])
    }).required());

    const today = new Date().toISOString().slice(0,10);

    let files = File.files.filter((file) => {
        const match = RegExp(`standup.${config.channel}`);
        return !!file.match(match);
    });

    config.prev_standup = files.filter((file) => {
        return !file.match(/\.ts\./);
    }).pop();
    config.prev_standup = Path.parse(config.prev_standup || '').name || undefined

    config.standup_file = `standup.${config.channel}.${today}`
    config.standup_ts_file = `standup.${config.channel}.${today}.ts`
    config.prev_today = config.standup_file === config.prev_standup ? true : false;
    config.standup = { channel: config.channel, user: config.user };

    // if prev_standup and today ... look for file with update object
    if (config.prev_standup && config.prev_today) {
        try {
            config.standup_ts_json = File.read(config.standup_ts_file);
        }
        catch (e) {
            config.standup_ts_json = null;
        }
    }

    // special case for editor with options ex: `vim -u /home/user/file`
    if (/[ ]/.test(config.editor)) {
        const parts = config.editor.split(/[ ]+/g);

        // editor is the first one, args are the other
        config.editor = parts.shift();
        config.editor_args = parts;
    }

    // are we in a tmux session
    if (process.env.TMUX || process.env.TMUX_PANE) {
        // gonna launch sublime
        if (/(?:slime|subl|sublime)/.test(config.editor)) {
            config.editor_args.unshift(config.editor);
            config.editor = 'reattach-to-user-namespace';
        }
    }

    return config;
};

module.exports = buildConfig();
