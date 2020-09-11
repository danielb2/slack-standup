'use strict';

const Fs = require('fs-extra');
const Path = require('path');
const Pkg = require('../package.json');
const Json = require('json5');
const Yaml = require('js-yaml');


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


try {
    internals.extension = Fs.readdirSync(internals.standup_dir)
        .filter((f) => f.match(/slackrc.(yaml|json)$/)).pop().split('.').pop();
}
catch (e) {
    console.log(`Error: no valid slackrc exists in '${internals.standup_dir}/'`);
    process.exit(1);
}



internals.json_stringify = (obj) => Json.stringify(obj, null, 2);


exports.parse = internals.extension === 'json' ? Json.parse : Yaml.safeLoad;


exports.stringify = internals.extension === 'json' ? internals.json_stringify : Yaml.safeDump;


exports.filePath = internals.compose(
    (file) => Path.join(internals.standup_dir, [file, internals.extension].join('.'))
);


exports.read = internals.compose(
    exports.filePath,
    Fs.readFileSync,
    exports.parse
);


exports.write = internals.compose(
    (file, data) => [exports.filePath(file), exports.stringify(data)],
    ([path, yaml]) => Fs.writeFileSync(path, yaml)
);


exports.exists = internals.compose(
    exports.filePath,
    Fs.existsSync
);


exports.rm = internals.compose(
    exports.filePath,
    Fs.unlinkSync
);
