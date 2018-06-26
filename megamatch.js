const path = require('path');
const fs = require('fs');
const minimatch = require('minimatch');

function match(conf, file, opts = {}) {

    Object.keys(match.defaultOptions).forEach(name => {
        if (typeof opts[name] === 'undefined') {
            opts[name] = match.defaultOptions[name];
        }
    });

    conf = Array.isArray(conf) ? conf : [conf];

    return conf.some(matcher => {

        if (matcher instanceof AndMatch || matcher.and) {
            for (let i = 0 ; i < matcher.and.length; i++) {
                const subMatcher = matcher.and[i];
                if (!match(subMatcher, file, opts)) {
                    return false;
                }
            }
            return true;

        } else if (matcher instanceof RegExp) {
            return matcher.exec(file);
        } else if (typeof matcher === 'function') {
            return matcher(file, opts);
        } else if (typeof matcher === 'string') {
            matcher = typeof opts.matchBase === 'string' && !path.isAbsolute(matcher) && path.join(opts.matchBase, matcher) || matcher;

            if (opts.recursive && fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
                const names = file.split('/');
                const matches = matcher.split('/');
                return names.length <= matches.length && !names.some((name, i) => {
                    const name2 = matches[i];
                    const doesMatch = name2 === name || minimatch(name, name2);
                    return !doesMatch;
                });

            } else {
                return minimatch(file, matcher, opts);
            }
        } else if (matcher.include) {

            // const recursive = opts.recursive && fs.lstatSync(file).isDirectory();
            const include = match(matcher.include, file, opts);
            const res = include && (!matcher.exclude || !match(matcher.exclude, file, opts));

            return res;

        } else {
            throw 'invalid matcher:' + matcher;
        }
    });
}

match.defaultOptions = {recursive: true, matchBase: true};

class AndMatch {
    constructor(...args) {
        this.and = args;
    }

}

match.and = function(...args) {
    return new AndMatch(...args);
};

module.exports = match;