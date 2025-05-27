const { readFile, writeFile, readdir, stat, mkdir } = require('fs').promises;
const { join, basename, extname, relative, dirname } = require('path');
const { Type, DEFAULT_SCHEMA, load } = require('js-yaml');
const tinycolor = require('tinycolor2');
const projectRoot = join(__dirname, '..');

/**
 * @typedef {Object} TokenColor - Textmate token color.
 * @prop {string} [name] - Optional name.
 * @prop {string[]} scope - Array of scopes.
 * @prop {Record<'foreground'|'background'|'fontStyle',string|undefined>} settings - Textmate token settings.
 *       Note: fontStyle is a space-separated list of any of `italic`, `bold`, `underline`.
 */

/**
 * @typedef {Object} Theme - Parsed theme object.
 * @prop {Record<'base'|'ansi'|'brightOther'|'other', string[]>} celadon - Celadon color variables.
 * @prop {Record<string, string|null|undefined>} colors - VSCode color mapping.
 * @prop {TokenColor[]} tokenColors - Textmate token colors.
 */

/**
 * @typedef {(yamlObj: Theme) => Theme} ThemeTransform
 */

const withAlphaType = new Type('!alpha', {
    kind: 'sequence',
    construct: ([hexRGB, alpha]) => hexRGB + alpha,
    represent: ([hexRGB, alpha]) => hexRGB + alpha,
});

const schema = DEFAULT_SCHEMA.extend([withAlphaType]);

async function findYmlFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async entry => {
        const res = join(dir, entry.name);
        if (entry.isDirectory()) {
            return await findYmlFiles(res);
        } else if (extname(entry.name) === '.yml') {
            return res;
        } else {
            return [];
        }
    }));
    return files.flat();
}

async function generateTheme(yamlPath, jsonPath) {
    const yamlFile = await readFile(yamlPath, 'utf-8');
    /** @type {Theme} */
    const base = load(yamlFile, { schema });

    // Remove nulls and other falsey values from colors
    for (const key of Object.keys(base.colors)) {
        if (!base.colors[key]) {
            delete base.colors[key];
        }
    }

    await writeFile(jsonPath, JSON.stringify(base, null, 2), 'utf-8');
}

module.exports = async () => {
    const srcDir = join(__dirname, '..', 'src');
    const themeDir = join(__dirname, '..', 'theme');
    const ymlFiles = await findYmlFiles(srcDir);

    for (const yamlPath of ymlFiles) {
        // 保持 theme 目录下的子目录结构
        const relPath = relative(srcDir, yamlPath);
        const jsonPath = join(themeDir, dirname(relPath), `${basename(yamlPath, '.yml')}.json`);
        // 确保子目录存在
        await mkdir(dirname(jsonPath), { recursive: true });
        console.log(
            `Generating theme: ${relative(projectRoot, yamlPath)} -> ${relative(projectRoot, jsonPath)}`
        );
        await generateTheme(yamlPath, jsonPath);
    }
};
