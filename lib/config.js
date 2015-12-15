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

const Fs = require('fs');
const Util = require('util');
const Path = require('path');
const Pkg = require('../package.json');

// clean helpers
//
const _ = {
    format: Util.format,
    isDefined: function (value) {

        return !Util.isUndefined(value);
    }
};

// exports' signature
const config = {
    slack_token: '',
    user: '',
    channel: '',
    editor: '',
    editor_args: [],
    standup: null,
    standup_ts_json: null,
    standup_ts_file: null,
    prev_standup: null,
    prev_today: false,
    image_url: null
};

// looking for standup directory in $HOME
const xdg = process.env.XDG_CONFIG_HOME || Path.join(process.env.HOME, '.config');
const standup_dir = Path.join(xdg, Pkg.name);
const prefs_file = Path.join(standup_dir, 'slackrc.json');

try {
    Fs.mkdirSync(standup_dir);
}
catch (e) {
}

/**
 *
 * dirIsWritable - check path to see if exists and is writable ~ not async
 *
*/
const dirIsWritable = function (path) {

    const baseStatObj = {
        isDirectory: function () {

            return false;
        }
    };

    // test to see if directory exists
    var dirStat = baseStatObj;
    try {
        dirStat = Fs.statSync(path);
    }
    catch (e) {
        dirStat = baseStatObj;
    }

    // test to see if directory is read/write
    const dirOk = dirStat.isDirectory();
    if (dirOk) {
        try {
            Fs.accessSync(path, Fs.R_OK | Fs.W_OK);
        }
        catch (e) {
            dirOk = false;
        }
    }

    return dirOk;
};

/**
 *
 * fileIsReadable - check path to see if exists and is readable ~ not async
 *
*/
const fileIsReadable = function (path) {

    const baseStatObj = {
        isFile: function () {

            return false;
        }
    };

    // test to see if directory exists
    var fileStat = baseStatObj;
    try {
        fileStat = Fs.statSync(path);
    }
    catch (e) {
        fileStat = baseStatObj;
    }

    // test to see if directory is read/write
    var fileOk = fileStat.isFile();
    if (fileOk) {
        try {
            Fs.accessSync(path, Fs.R_OK | Fs.W_OK);
        }
        catch (e) {
            fileOk = false;
        }
    }

    return fileOk;
};


// if not ok - exit
if (!dirIsWritable(standup_dir)) {
    console.log(_.format('Error: required directory \'%s\' not found or not writable!', standup_dir));
    process.exit(1);
}

// if not ok - exit
if (!fileIsReadable(prefs_file)) {
    console.log(_.format('Error: required preference file \'%s\' not found or not readable!', prefs_file));
    process.exit(1);
}

// else import in prefs file
var prefs = {};
try {
    prefs = require(prefs_file);
}
catch (e) {
    // if not ok - exit (gives user feed back on parse errors)
    console.log(_.format('Error# parsing preference file :%s', e.message).replace(/:/, '\'').replace(/:/, '\'').replace(/#/, ':'));
    process.exit(1);
}


// populate config from ENV, root, standup
//
Object.keys(config)
.map(function (prop) {

    // env using uppercase values
    if (_.isDefined(process.env[prop.toUpperCase()])) {
        config[prop] = process.env[prop.toUpperCase()];
    }

    // top level of rc file
    if (_.isDefined(prefs[prop])) {
        config[prop] = prefs[prop];
    }
    // standup level of rc file
    if (_.isDefined(prefs.standup) && _.isDefined(prefs.standup[prop])) {
        config[prop] = prefs.standup[prop];
    }

    // if not set ~ get out
    if (config[prop] === '') {
        console.log(_.format('Error: required preference \'%s\' not found in file \'%s\' or as uppercase in ENV!', prop, prefs_file));
        process.exit(1);
    }
    return prop;
});

// loop until we find a file (max 7 days)
for (let d, ds, i = 0, standup_file; i < 7; i++) {
    if (!config.prev_standup) {
        d = new Date();
        // move to local time in GMT
        d.setMinutes(-1 * d.getTimezoneOffset());
        // move back i day(s)
        i && d.setDate(d.getDate() - i);
        // date string yyyy-MM-dd
        ds = d.toISOString().replace(/[ T].*$/, '');
        // find standupFile in standupDir
        standup_file = _.format('%s/standup.%s.json', standup_dir, ds);
        if (fileIsReadable(standup_file)) {
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

// if prev_standup and today ... look for json file with update object
if (config.prev_standup && config.prev_today) {
    if (fileIsReadable(config.standup_ts_file)) {
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

// export the config out ... note this is all sync (not async) and will block
//
module.exports = config;
