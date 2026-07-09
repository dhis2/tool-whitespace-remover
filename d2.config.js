/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    name: 'whitespace-cleaner',
    title: 'Whitespace Cleaner Tool',
    description:
        'Tool for identifying and removing leading, trailing and double whitespace in metadata',
    minDHIS2Version: '2.41',

    entryPoints: {
        app: './src/App.tsx',
    },

    viteConfigExtensions: './viteConfigExtensions.mts',
}

module.exports = config
