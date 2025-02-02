/*
 * Copyright (C) 2024 Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
/**
 * Copyright (C) 2024 Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import translations from '../src/gui/src/i18n/translations/translations.js';
import fs from 'fs';

let hadError = false;
function reportError(message) {
    hadError = true;
    process.stderr.write(`❌ ${message}\n`);
}

// Check that each translation file is recorded in `translations`
async function checkTranslationRegistrations() {
    const files = await fs.promises.readdir('./src/gui/src/i18n/translations');
    for (const fileName of files) {
        if (!fileName.endsWith('.js')) continue;
        const translationName = fileName.substring(0, fileName.length - 3);
        if (translationName === 'translations') continue;

        const translation = translations[translationName];
        if (!translation) {
            reportError(`Translation '${translationName}' is not listed in translations.js, please add it!`);
            continue;
        }

        if (!translation.name) {
            reportError(`Translation '${translationName}' is missing a name!`);
        }
        if (!translation.code) {
            reportError(`Translation '${translationName}' is missing a code!`);
        } else if (translation.code !== translationName) {
            reportError(`Translation '${translationName}' has code '${translation.code}', which should be '${translationName}'!`);
        }
        if (typeof translation.dictionary !== 'object') {
            reportError(`Translation '${translationName}' is missing a translations dictionary! Should be an object.`);
        }
    }
}

// Ensure that translations only contain keys that exist in the en dictionary
function checkTranslationKeys() {
    const enDictionary = translations.en.dictionary;

    for (const translation of Object.values(translations)) {
        // We compare against the en translation, so checking it doesn't make sense.
        if (translation.code === 'en') continue;

        // If the dictionary is missing, we already reported that in checkTranslationRegistrations().
        if (typeof translation.dictionary !== "object") continue;

        for (const [key, value] of Object.entries(translation.dictionary)) {
            if (!enDictionary[key]) {
                reportError(`Translation '${translation.code}' has key '${key}' that doesn't exist in 'en'!`);
            }
        }
    }
}

// Ensure that all keys passed to i18n() exist in the en dictionary
async function checkTranslationUsage() {
    const enDictionary = translations.en.dictionary;

    const sourceDirectories = [
        './src/gui/src/helpers',
        './src/gui/src/UI',
    ];

    // Looks for i18n() calls using either ' or " for the key string.
    // The key itself is at index 2 of the result.
    const i18nRegex = /i18n\((['"])(.*?)\1\)/g;

    for (const dir of sourceDirectories) {
        const files = await fs.promises.readdir(dir, { recursive: true });
        for (const relativeFileName of files) {
            if (!relativeFileName.endsWith('.js')) continue;
            const fileName = `${dir}/${relativeFileName}`;

            const fileContents = await fs.promises.readFile(fileName, { encoding: 'utf8' });
            const i18nUses = fileContents.matchAll(i18nRegex);
            for (const use of i18nUses) {
                const key = use[2];
                if (!enDictionary.hasOwnProperty(key)) {
                    reportError(`Unrecognized i18n key: call ${use[0]} in ${fileName}`);
                }
            }
        }
    }
}

await checkTranslationRegistrations();
checkTranslationKeys();
await checkTranslationUsage();

if (hadError) {
    process.stdout.write('Errors were found in translation files.\n');
    process.exit(1);
}

process.stdout.write('✅ Translations appear valid.\n');
process.exit(0);