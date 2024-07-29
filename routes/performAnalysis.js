const express = require('express');
const router = express.Router();
const FileSearcher = require('../utils/FileSearcher');
var fs = require('fs');

const fileSearcherConfig = {
    exclusions: ['node_modules', 'widgets']
};

const fileSearcher = new FileSearcher(fileSearcherConfig);

// Function to define search configuration
const searchConfig = {
    'content.xml': [
        { key: 'category', pattern: new RegExp('componentGroup\\s*=\\s*["\']([^"\']+)["\']'), cleaning: 'singleQuotations' },
        { key: 'title', pattern: new RegExp('jcr:title\\s*=\\s*["\']([^"\']+)["\']'), cleaning: 'singleQuotations' },
        { key: 'resourceSuperType', pattern: new RegExp('sling:resourceSuperType\\s*=\\s*["\']([^"\']+)["\']'), cleaning: 'singleQuotations' }
    ],
    '.html': [
        { key: 'ddsTags', pattern: new RegExp('<(dds-[a-zA-Z0-9-]+)', 'g'), cleaning: 'tags', unique: true },
        { key: 'caemTags', pattern: new RegExp('<(caem-[a-zA-Z0-9-]+)', 'g'), cleaning: 'tags', unique: true },
        { key: 'carbonImport', pattern: new RegExp('attributeName\\s*=\\s*["\']([^"\']+)["\']', 'g'), cleaning: 'multipleQuotations', unique: true },
        { key: 'resourceType', pattern: new RegExp("resourceType\\s*=\\s*['\"\\s]([^'\"]+)['\"\\s]", 'g'), cleaning: 'multipleQuotations', unique: true },
        { key: 'dynamicDataSlyUse', pattern: /data-sly-use\.\w+\s*=\s*["'](\/apps[^"']*)["']/g, cleaning: 'multipleQuotations', unique: true }

    ]
};



// Extract headers based on searchConfig
const headers = new Set();
for (const patterns of Object.values(searchConfig)) {
    for (const { key }
        of patterns) {
        headers.add(key);
    }
}

// Cleaning functions dictionary
const cleaningFunctions = {
    // Handles single values by trimming quotes
    singleQuotations: (match, pattern) => {
        const regexResult = match.match(pattern);
        return regexResult ? regexResult[1].replace(/^['"]|['"]$/g, '') : ''; // Remove quotes
    },

    // Handles multiple values by trimming quotes from each
    multipleQuotations: (match, pattern) => {
        const regexResult = [...match.matchAll(pattern)];
        return regexResult.map(result => result[1].replace(/^['"]|['"]$/g, '')).join(', '); // Remove quotes and join values
    },

    tags: (match, pattern) => {
        const tagMatch = pattern.exec(match);
        return tagMatch ? tagMatch[1] : ''; // Extract the first capturing group
    }
};


// Function to search component files and process results
async function searchAndProcessComponentFiles(fileSearcher, componentDir, searchConfig) {
    const componentData = {};

    for (const [fileMask, patterns] of Object.entries(searchConfig)) {
        const fileData = await fileSearcher.searchFiles(componentDir, patterns.map(p => p.pattern), fileMask);
        console.log('fileData:', fileData); // Debugging: Log fileData

        if (Object.keys(fileData).length > 0) {
            for (const { key, pattern, cleaning }
                of patterns) {
                // Find the correct fileData key that matches componentDir
                const fileDataKey = Object.keys(fileData).find(filePath => filePath.includes(componentDir));

                if (fileDataKey) {
                    // Ensure pattern.source exists in fileData[fileDataKey]
                    if (fileData[fileDataKey][pattern.source]) {
                        const matches = fileData[fileDataKey][pattern.source];

                        console.log('Cleaning function:', cleaning, 'Matches:', matches);
                        const matchResults = matches.map(match => cleaningFunctions[cleaning](match, pattern)).filter(result => result.trim() !== '');
                        console.log('Match Results:', matchResults);
                        if (matchResults.length > 0) {
                            if (!componentData[key]) {
                                componentData[key] = [];
                            }
                            componentData[key].push(...matchResults);
                        }
                    } else {
                        console.warn(`Pattern source ${pattern.source} not found in fileData[${fileDataKey}]`);
                    }
                } else {
                    console.warn(`No matching key found in fileData for componentDir ${componentDir}`);
                }
            }
        }
    }



    return componentData;
}

// Function to ensure unique matches for 'tags' cleaning configuration
function ensureUniqueTags(componentData, searchConfig) {
    for (const componentDirData of Object.values(componentData)) {
        for (const patterns of Object.values(searchConfig)) {
            for (const { key, cleaning, unique }
                of patterns) {
                if (unique && componentDirData[key]) {
                    // Apply uniqueness only for array values
                    if (Array.isArray(componentDirData[key])) {
                        componentDirData[key] = [...new Set(componentDirData[key])];
                    }
                }
            }
        }
    }
}


// Function to clean up the results
function cleanUpResults(results) {
    const cleanedResults = {};

    for (const [filePath, data] of Object.entries(results)) {
        cleanedResults[filePath] = {};

        for (const [key, values] of Object.entries(data)) {
            if (values.length > 0) {
                // Remove empty strings and empty arrays
                cleanedResults[filePath][key] = values.filter(value => value.trim() !== '');
            } else {
                // Only include keys with non-empty values
                cleanedResults[filePath][key] = [];
            }
        }
    }

    return cleanedResults;
}

router.post('/', async(req, res) => {
    const { location } = req.body;

    if (!location) {
        return res.status(400).send('Location is required.');
    }



    try {
        // Initial search for directories containing components
        const initialComponentPattern = new RegExp('jcr:primaryType\\s*=\\s*"cq:Component"');
        const componentDirsData = await fileSearcher.searchFiles(location, [initialComponentPattern], "content.xml");
        const componentDirs = Object.keys(componentDirsData);

        const componentsData = {};

        for (let componentDir of componentDirs) {
            componentDir = componentDir.split("\\").slice(0, -1).join("\\"); // Remove the file name part
            const componentData = await searchAndProcessComponentFiles(fileSearcher, componentDir, searchConfig);
            if (Object.keys(componentData).length > 0) { // Only add non-empty component data
                componentsData[componentDir] = componentData;
            }
        }

        // Ensure unique matches for all keys with 'tags' cleaning configuration
        ensureUniqueTags(componentsData, searchConfig);

        // Clean up the results before rendering
        const cleanedComponentsData = cleanUpResults(componentsData);
        fs.writeFile("component_data.json", JSON.stringify(cleanedComponentsData), function(err) {
            if (err) throw err;
            console.log('data save  complete');
        });
        res.render('performAnalysis', { location, data: cleanedComponentsData, searchConfig, headers: Array.from(headers) });
    } catch (error) {
        console.error('Error during file search:', error);
        res.status(500).send(`An error occurred while performing the analysis: ${error.message}`);
    }
});

module.exports = router;