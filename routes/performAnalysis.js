const express = require('express');
const router = express.Router();
const FileSearcher = require('../utils/FileSearcher');
const FilePathHandler = require('../utils/FilePathHandler');
const fs = require('fs');

// Cleaning functions dictionary
const cleaningFunctions = {
    singleQuotations: (match, pattern) => {
        const regexResult = match.match(pattern);
        return regexResult ? regexResult[1].replace(/^['"]|['"]$/g, '') : ''; // Remove quotes
    },
    multipleQuotations: (match, pattern) => {
        const regexResult = [...match.matchAll(pattern)];
        return regexResult.map(result => result[1].replace(/^['"]|['"]$/g, '')).join(', '); // Remove quotes and join values
    },
    tags: (match, pattern) => {
        const tagMatch = pattern.exec(match);
        return tagMatch ? tagMatch[1] : ''; // Extract the first capturing group
    }
};

function searchAndProcessComponentFilesSync(fileSearcher, componentDir, searchConfig) {
    const componentData = {};

    for (const [fileMask, patterns] of Object.entries(searchConfig)) {
        const fileData = fileSearcher.searchFilesSync(componentDir, patterns.map(p => p.pattern), fileMask);

        if (Object.keys(fileData).length > 0) {
            for (const { key, pattern, cleaning }
                of patterns) {
                const fileDataKey = Object.keys(fileData).find(filePath => filePath.includes(componentDir));
                if (fileDataKey) {
                    if (fileData[fileDataKey][pattern.source]) {
                        const matches = fileData[fileDataKey][pattern.source];
                        const matchResults = matches.map(match => cleaningFunctions[cleaning](match, pattern)).filter(result => result.trim() !== '');
                        if (matchResults.length > 0) {
                            if (!componentData[key]) {
                                componentData[key] = [];
                            }
                            componentData[key].push(...matchResults);
                        }
                    } else {
                        //console.warn(`Pattern source ${pattern.source} not found in fileData[${fileDataKey}]`);
                    }
                } else {
                    console.warn(`No matching key found in fileData for componentDir ${componentDir}`);
                }
            }
        }
    }

    return componentData;
}

function ensureUniqueTags(componentData, searchConfig) {
    for (const componentDirData of Object.values(componentData)) {
        for (const patterns of Object.values(searchConfig)) {
            for (const { key, cleaning, unique }
                of patterns) {
                if (unique && componentDirData[key]) {
                    if (Array.isArray(componentDirData[key])) {
                        componentDirData[key] = [...new Set(componentDirData[key])];
                    }
                }
            }
        }
    }
}

function cleanUpResults(results) {
    const cleanedResults = {};

    for (const [filePath, data] of Object.entries(results)) {
        cleanedResults[filePath] = {};

        for (const [key, values] of Object.entries(data)) {
            if (values.length > 0) {
                cleanedResults[filePath][key] = values.filter(value => value.trim() !== '');
            } else {
                cleanedResults[filePath][key] = [];
            }
        }
    }

    return cleanedResults;
}

function transformDataForDataTables(data, headers) {
    const tableRows = [];

    for (const [filePath, details] of Object.entries(data)) {
        const row = [filePath];
        headers.forEach(header => {
            const cellValue = details[header] || '';
            row.push(cellValue);
        });
        tableRows.push(row);
    }

    return tableRows;
}

router.post('/', (req, res) => {
    const { location } = req.body;
    const searchConfig = req.searchConfig;
    const fileSearcherConfig = req.fileSearcherConfig;
    const fileSearcher = new FileSearcher(fileSearcherConfig);
    const headers = new Set();

    if (!location) {
        return res.status(400).send('Location is required.');
    }

    try {
        for (const patterns of Object.values(searchConfig)) {
            for (const { key }
                of patterns) {
                headers.add(key);
            }
        }

        const initialComponentPattern = new RegExp('jcr:primaryType\\s*=\\s*"cq:Component"');
        const componentDirsData = fileSearcher.searchFilesSync(location, [initialComponentPattern], "content.xml");
        const componentDirs = Object.keys(componentDirsData);

        const componentsData = {};

        for (let componentDir of componentDirs) {
            componentDir = componentDir.split("\\").slice(0, -1).join("\\");
            const componentData = searchAndProcessComponentFilesSync(fileSearcher, componentDir, searchConfig);
            if (Object.keys(componentData).length > 0) {
                componentsData[componentDir] = componentData;
            }
        }

        ensureUniqueTags(componentsData, searchConfig);
        const cleanedComponentsData = cleanUpResults(componentsData);

        const filePathHandler = new FilePathHandler(cleanedComponentsData, Array.from(headers));
        const processedData = filePathHandler.processFilePaths();

        fs.writeFileSync("component_data.json", JSON.stringify(processedData));

        const dataTableData = transformDataForDataTables(processedData, Array.from(headers));
        res.render('performAnalysis', { location, data: dataTableData, searchConfig, headers: Array.from(headers) });

    } catch (error) {
        console.error('Error during file search:', error);
        res.status(500).send(`An error occurred while performing the analysis: ${error.message}`);
    }
});

module.exports = router;