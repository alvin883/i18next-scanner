#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import program from 'commander';
import ensureArray from 'ensure-array';
import sort from 'gulp-sort';
import vfs from 'vinyl-fs';
import scanner from '../src/index.js';
import examples from './examples.js';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

async function main() {
    program
        .version(pkg.version)
        .usage('[options] <file ...>')
        .option(
            '--config <config>',
            'Path to the config file (default: i18next-scanner.config.js)',
            'i18next-scanner.config.js'
        )
        .option('--output <path>', 'Path to the output directory (default: .)');

    program.on('--help', () => console.log(examples));

    program.parse(process.argv);

    if (!program.config) {
        program.help();
        return;
    }

    let config = {};
    try {
        const configModule = await import(
            pathToFileURL(path.resolve(program.config))
        );
        config = configModule.default;
    } catch (err) {
        console.error('i18next-scanner:', err);
        return;
    }

    {
        // Input
        config.input =
            program.args.length > 0 ? program.args : ensureArray(config.input);
        config.input = config.input.map(function (s) {
            s = s.trim();

            // On Windows, arguments contain spaces must be enclosed with double quotes, not single quotes.
            if (s.match(/(^'.*'$|^".*"$)/)) {
                // Remove first and last character
                s = s.slice(1, -1);
            }
            return s;
        });

        if (config.input.length === 0) {
            program.help();
            return;
        }
    }

    {
        // Output
        config.output = program.output || config.output;

        if (!config.output) {
            config.output = '.';
        }
    }

    vfs.src(config.input)
        .pipe(sort()) // Sort files in stream by path
        .pipe(scanner(config.options, config.transform, config.flush))
        .pipe(vfs.dest(config.output));
}

main();
