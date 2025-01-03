# SvelteKit / Svelte 5 Multilang Codegen + AI translation

**Whenever you add a new item in English it generates other languages and types. Also translates with OpenAI API.**

1. Build Master List of all EN Keys from all JSON files
2. Generate / Update Translations type in `types.ts`
   1. Read existing types file
   2. Regex replace the content inside `export type Translations`
   3. Write back
3. Translate missing keys for other languages. Loop through all languages (except `en`) and:
   1. If the language folder (e.g. `fi/`) doesn’t exist, create it.
   2. For each .json file in the en folder:
      1. Read the EN JSON.
      2. Read the existing language JSON (or create an empty object if missing).
      3. For each key in the EN JSON, if it doesn’t exist in the language JSON, call OpenAI to create a translation.
   3. Finally, write or update the language JSON file with the translations.

## Installation

1. Install
   
```bash
npm i
npm i -D npm-run-all
```

2. Create `/codegen/.env` file with the following content:

```bash
OPENAI_API_KEY = "sk-XXXXXXXX"
```

3. Copy the `root_folder_structure_example/src/lib/i18n` folder to yout `/src/lib` folder and update `languages.json` with your languages.

4. Update your SvelteKit main `package.json` scripts something like this:

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:*",
    "dev:vite": "vite --host",
    "dev:watch-i18n": "chokidar \"./src/lib/i18n/en/*.json\" -c \"node ./codegen/index.js\"",
    "codegen:i18n": "node ./codegen/index.js",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "check": "svelte-kit sync && svelte-check --tsconfig ./jsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./jsconfig.json --watch",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write ."
  }
}
```

Notes:
* `dev:watch-i18n` uses `chokidar-cli` to watch for changes in `en/*.json` and rerun the codegen script.
* You can also run `npm run codegen:i18n` manually.

1. See the lines 59-66 and adjust your promop, [temperature](https://platform.openai.com/docs/api-reference/audio/createTranscription#audio-createtranscription-temperature), etc.