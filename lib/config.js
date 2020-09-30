'use strict';

const Joi = require('@hapi/joi');
const File = require('./file');

const prefs = File.read('slackrc');

const config = Joi.attempt(prefs, Joi.object({
    slack_token: Joi.string().regex(/^xoxp/).required(),
    user: Joi.string().default(process.env.USER),
    channel: Joi.string().regex(/^#/).required(),
    editor: Joi.string().default(process.env.EDITOR),
    editor_args: Joi.array().items(Joi.string()).default([])
}).required());


// loop until we find a file (max 7 days)
for (let i = 0;  i < 7; ++i) {
    if (!config.prev_standup) {
        const d = new Date();
        // move to local time in GMT
        d.setMinutes(-1 * d.getTimezoneOffset());
        // move back i day(s)
        i && d.setDate(d.getDate() - i);
        // date string yyyy-MM-dd
        const ds = d.toISOString().replace(/[ T].*$/, '');
        // find standupFile in standupDir
        const standup_file = `standup.${config.channel}.${ds}`;
        if (File.exists(standup_file)) {
            config.prev_standup = standup_file;
            config.prev_today = (i === 0 ? true : false);
        }

        // update standup value
        if (i === 0) {
            config.standup_file = standup_file;
        }
    }
}

config.standup = { channel: config.channel, user: config.user };

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

module.exports = config;
