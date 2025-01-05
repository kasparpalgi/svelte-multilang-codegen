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
npm install -D chokidar-cli npm-run-all
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

5. Add to eg. `$lib/runes/language.svnpm create svelte@latese.ts`:

```ts
export let locale = $state('en');

// Loads a single translation file
export function loadSection(section: string): Promise<Record<string, string>> {
	// Dynamic import –> returns promise
	return (
		import(`../i18n/${locale}/${section}.json`)
			// Default export is `module.default`
			.then((module) => module.default)
	);
}

// Load multiple sections at once and merge them
export function loadTranslations(sections: string[]): Promise<Record<string, string>> {
	return Promise.all(sections.map((section) => loadSection(section))).then((results) => {
		let merged = {};
		for (const r of results) {
			merged = { ...merged, ...r };
		}
		return merged;
	});
}
```

6. Usage in your SvelteKit components:

```svelte
<script lang="ts>
   import { loadTranslations } from '$lib/runes/language.svelte';
   import type { Translations } from '$lib/types';

   let requiredSections = ['common', 'calendar']; // change this
	let trans: Translations = $state({}) as Translations;

	$effect(() => {
		loadTranslations(requiredSections).then((data) => {
			trans = data as Translations;
		});
	});
</script>

Calendar in another language: {trans.calendar}
```

7. In your Svelte's main `package.json` add:

```json
{
  "scripts": {
    "dev:vite": "vite --host",
		"dev:watch-i18n": "chokidar \"./src/lib/i18n/en/*.json\" -c \"npm run codegen:i18n\"",
		"codegen:i18n": "node ./codegen/index.mjs",
		"dev": "npm-run-all --parallel dev:vite dev:watch-i18n",
      // rest of your scripts
  }
}
```