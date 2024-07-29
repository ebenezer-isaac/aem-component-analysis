const express = require('express');
const router = express.Router();
const FileSearcher = require('../utils/FileSearcher');

const fileSearcherConfig = {
  exclusions: ['node_modules']
};

const fileSearcher = new FileSearcher(fileSearcherConfig);


// Function to define search configuration
function getComponentSearchConfig() {
  return {
    'context.xml': [
      { key: 'category', pattern: new RegExp('componentGroup\\s*=\\s*"([^"]+)"'), cleaning: 'quotations' },
      { key: 'title', pattern: new RegExp('jcr:title\\s*=\\s*"([^"]+)"'), cleaning: 'quotations' },
      { key: 'resourceSuperType', pattern: new RegExp('sling:resourceSuperType\\s*=\\s*"([^"]+)"'), cleaning: 'quotations' }
    ],
    '*.html': [
      { key: 'ddsTags', pattern: new RegExp('<(dds-[a-zA-Z0-9-]+)', 'g'), cleaning: 'tags' },
      { key: 'caemTags', pattern: new RegExp('<(caem-[a-zA-Z0-9-]+)', 'g'), cleaning: 'tags' }
    ]
  };
}

// Cleaning functions dictionary
const cleaningFunctions = {
  quotations: (match, pattern) => {
    const regexResult = match.match(pattern);
    return regexResult ? regexResult[1] : '';
  },
  tags: (match) => {
    const tagName = match.match(/<(dds-[a-zA-Z0-9-]+)|(caem-[a-zA-Z0-9-]+)/);
    return tagName ? tagName[0].substring(1) : '';
  }
};

// Function to search component files and process results
async function searchAndProcessComponentFiles(fileSearcher, componentDir, searchConfig) {
  const componentData = {};

  for (const [fileMask, patterns] of Object.entries(searchConfig)) {
    const fileData = await fileSearcher.searchFiles(componentDir, patterns.map(p => p.pattern), fileMask);

    for (const { key, pattern, cleaning } of patterns) {
      const matches = fileData[componentDir]?.[pattern.source] || [];
      const matchResults = matches.map(match => cleaningFunctions[cleaning](match, pattern));

      if (matchResults.length > 0) {
        if (!componentData[key]) {
          componentData[key] = [];
        }
        componentData[key].push(...matchResults);
      }
    }
  }

  return componentData;
}

// Function to ensure unique matches for 'tags' cleaning configuration
function ensureUniqueTags(componentData, searchConfig) {
  for (const componentDirData of Object.values(componentData)) {
    for (const patterns of Object.values(searchConfig)) {
      for (const { key, cleaning } of patterns) {
        if (cleaning === 'tags' && componentDirData[key]) {
          componentDirData[key] = [...new Set(componentDirData[key])];
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

router.post('/', async (req, res) => {
  const { location } = req.body;

  if (!location) {
    return res.status(400).send('Location is required.');
  }

  const searchConfig = getComponentSearchConfig();

  try {
    // Initial search for directories containing components
    const initialComponentPattern = new RegExp('jcr:primaryType\\s*=\\s*"cq:Component"');
    const componentDirsData = await fileSearcher.searchFiles(location, [initialComponentPattern], "content.xml");
    const componentDirs = Object.keys(componentDirsData);

    const componentsData = {};

    for (const componentDir of componentDirs) {
      const componentData = await searchAndProcessComponentFiles(fileSearcher, componentDir, searchConfig);
      if (Object.keys(componentData).length > 0) { // Only add non-empty component data
        componentsData[componentDir] = componentData;
      }
    }

    // Ensure unique matches for all keys with 'tags' cleaning configuration
    ensureUniqueTags(componentsData, searchConfig);

    // Clean up the results before rendering
    const cleanedComponentsData = cleanUpResults(componentsData);

    res.render('performAnalysis', { location, data: cleanedComponentsData });
  } catch (error) {
    console.error('Error during file search:', error);
    res.status(500).send(`An error occurred while performing the analysis: ${error.message}`);
  }
});

module.exports = router;
