import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import OpenAI from 'openai';

// 1) Instantiate the new openai client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Destructure from fs / path
const { join } = path;
const { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } = fs;

// Now your code...
const i18nRootPath = join(__dirname, '../src/lib/i18n');
const enPath = join(i18nRootPath, 'en');
const typesPath = join(__dirname, '../src/lib/types.ts');

// 1) Read languages
const languages = JSON.parse(
    readFileSync(join(i18nRootPath, 'languages.json'), 'utf8')
).languages;

// 2) Build allEnKeys from en/*.json
let allEnKeys = {};
const enFiles = readdirSync(enPath).filter((file) => file.endsWith('.json'));
for (const file of enFiles) {
    const filePath = join(enPath, file);
    const fileContent = JSON.parse(readFileSync(filePath, 'utf8'));
    allEnKeys = { ...allEnKeys, ...fileContent };
}

// 3) Generate / Update Translations type
function createTranslationsType(keysObj) {
    const typeLines = Object.keys(keysObj).map((key) => `  ${key}: string;`);
    return `export type Translations = {\n${typeLines.join('\n')}\n};`;
}

const typesFileContent = readFileSync(typesPath, 'utf8');
const newTranslationsTypeDefinition = createTranslationsType(allEnKeys);
const updatedTypesFileContent = typesFileContent.replace(
    /export type Translations\s*=\s*{\s*[^}]*};/gm,
    newTranslationsTypeDefinition
);

writeFileSync(typesPath, updatedTypesFileContent, 'utf8');
console.log('[i18n-codegen]: Types updated in types.ts');

// 4) Translate missing keys
async function translateText(targetLang, text) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        attempts++;

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: `Translate the following into ${targetLang}: ${text} (It is a kitchen fitters app that is in multiple languages so you are translating the app's iterface. Provide absolutely no explanations and provide tback ONLY the translation! It will be added automatically to the app so anyything else than translation will break the app. If possible try approx. same length of the text in translation as in English to maintain the UI design.)`
                    }
                ],
                temperature: 0.3
            });

            const message = response.choices?.[0]?.message?.content?.trim() || '';
            if (!message) {
                return text; // fallback
            }

            // Detect "I'm sorry"
            if (message.toLowerCase().startsWith("i'm sorry")) {
                console.warn(`[i18n-codegen] Got apology from OpenAI. Attempt: ${attempts}`);

                // If second attempt also fails, skip
                if (attempts === maxAttempts) {
                    console.warn(`[i18n-codegen] Skipped translation for: ${text}`);
                    return text;
                } else {
                    // Retry once
                    continue;
                }
            }

            // Otherwise, we have a good translation
            return message;
        } catch (err) {
            console.error(`Error translating "${text}" to ${targetLang}`, err);

            // If it’s a network or other error, we can decide to keep retrying or break
            break;
        }
    }

    // If we exit the loop, return the original text
    return text;
}


(async () => {
    // For each language except 'en', create / update the JSON
    for (const lang of languages) {
        if (lang === 'en') continue;
        for (const file of enFiles) {
            const enFilePath = join(enPath, file);
            const langDir = join(i18nRootPath, lang);
            const langFilePath = join(langDir, file);

            if (!existsSync(langDir)) mkdirSync(langDir, { recursive: true });

            const enJson = JSON.parse(readFileSync(enFilePath, 'utf8'));
            let langJson = existsSync(langFilePath)
                ? JSON.parse(readFileSync(langFilePath, 'utf8'))
                : {};

            const updatedJson = { ...langJson };
            for (const key of Object.keys(enJson)) {
                if (!updatedJson[key]) {
                    updatedJson[key] = await translateText(lang, enJson[key]);
                }
            }

            writeFileSync(langFilePath, JSON.stringify(updatedJson, null, 2));
            console.log(`[i18n-codegen]: Updated ${lang}/${file}`);
        }
    }
    console.log('[i18n-codegen]: Done!');
})();
