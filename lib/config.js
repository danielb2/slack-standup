'use strict';

/**
 * config.js - finds all the config values for this app
 *
 * NOTE: lib's should not process.exit. We are breaking
 *  than rule in this file. Also we are blocking (not async)
 *  and waiting until we find/open/use the files we need.
 *  This shouldn't be used on a server or anywhere except
 *  CLI (command line interface) by a user.
 *
*/

const Fs = require('fs-extra');
const Util = require('util');
const Path = require('path');
const Pkg = require('../package.json');
const Yaml = require('js-yaml');
const Joi = require('@hapi/joi');

const internals = {
    _two(f, g) {

        return (...args) => g(f(...args));
    },
    compose(...fns) {

        return fns.reduce(this._two);
    },
    xdg: process.env.XDG_CONFIG_HOME || Path.join(process.env.HOME, '.config')
};

internals.standup_dir = Path.join(internals.xdg, Pkg.name);

internals.readFile = internals.compose(
    (file) => Path.join(internals.standup_dir, file),
    Fs.readFileSync
);

internals.readJSON = internals.compose(
    internals.readFile,
    JSON.parse
);

internals.readYaml = internals.compose(
    internals.readFile,
    Yaml.safeLoad
);

let json;
let yaml;
try {
    json = internals.readJSON('slackrc.json');
    yaml = internals.readYaml('slackrc.yaml');
}
catch (e) {

    console.log(Util.format('Error: required preference file not found or not readable!'));
}

// clean helpers
//
const _ = {
    format: Util.format,
    isDefined: function (value) {

        return !Util.isUndefined(value);
    }
};

const prefs = json || yaml;

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
        const standup_file = _.format('%s/standup.%s.json', internals.standup_dir, ds);
        if (Fs.existsSync(standup_file)) {
            config.prev_standup = standup_file;
            config.prev_today = (i === 0 ? true : false);
        }

        // update standup value
        if (i === 0) {
            config.standup_file = standup_file;
            config.standup_ts_file = standup_file.replace(/\.json/, _.format('.%s.json', config.channel.replace(/[^a-zA-Z0-9-]/g, '')));
        }
    }
}

config.standup = { channel: config.channel, user: config.user };

// if prev_standup and today ... look for json file with update object
if (config.prev_standup && config.prev_today) {
    if (Fs.existsSync(config.standup_ts_file)) {
        try {
            config.standup_ts_json = require(config.standup_ts_file);
        }
        catch (e) {
            config.standup_ts_json = null;
        }
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

module.exports = config;
