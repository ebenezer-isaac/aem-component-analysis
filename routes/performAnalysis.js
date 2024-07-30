const express = require('express');
const router = express.Router();
const FileSearcher = require('../utils/FileSearcher');
const FilePathHandler = require('../utils/FilePathHandler');
const fs = require('fs');

// Configuration for FileSearcher
const fileSearcherConfig = {
    exclusions: ['node_modules', 'widgets']
};

const fileSearcher = new FileSearcher(fileSearcherConfig);

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

        if (Object.keys(fileData).length > 0) {
            for (const { key, pattern, cleaning }
                of patterns) {
                // Find the correct fileData key that matches componentDir
                const fileDataKey = Object.keys(fileData).find(filePath => filePath.includes(componentDir));

                if (fileDataKey) {
                    // Ensure pattern.source exists in fileData[fileDataKey]
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
// Function to transform data into array format for DataTables
// Function to transform data into array format for DataTables
function transformDataForDataTables(data, headers) {
    // Create an array to hold the rows for DataTables
    const tableRows = [];

    // Iterate over the data
    for (const [filePath, details] of Object.entries(data)) {
        // Prepare a row with the filePath as the first column
        const row = [filePath];

        // Add each header's value to the row
        headers.forEach(header => {
            // Get the cell value, default to empty string if not defined
            const cellValue = details[header] || '';

            row.push(cellValue);
        });

        // Push the row to the tableRows array
        tableRows.push(row);
    }

    return tableRows;
}




// Define the route
router.post('/', async(req, res) => {
    const { location } = req.body;
    const searchConfig = req.searchConfig; // Retrieve searchConfig from request
    const headers = new Set(); // Define headers here

    if (!location) {
        return res.status(400).send('Location is required.');
    }

    try {
        // Extract headers based on searchConfig
        for (const patterns of Object.values(searchConfig)) {
            for (const { key }
                of patterns) {
                headers.add(key);
            }
        }

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

        // Clean up the results before processing
        const cleanedComponentsData = cleanUpResults(componentsData);

        // Use FilePathHandler to process file paths
        const filePathHandler = new FilePathHandler(cleanedComponentsData, Array.from(headers));
        const processedData = filePathHandler.processFilePaths();

        fs.writeFile("component_data.json", JSON.stringify(processedData), function(err) {
            if (err) throw err;
        });

        const dataTableData = transformDataForDataTables(processedData, Array.from(headers));
        res.render('performAnalysis', { location, data: dataTableData, searchConfig, headers: Array.from(headers) });

    } catch (error) {
        console.error('Error during file search:', error);
        res.status(500).send(`An error occurred while performing the analysis: ${error.message}`);
    }
});

module.exports = router;