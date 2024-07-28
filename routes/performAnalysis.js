const express = require('express');
const router = express.Router();
const FileSearcher = require('../utils/FileSearcher');

router.post('/', async (req, res) => {
  const location = req.body.location;
  const filenameMask = req.body.filenameMask; // New parameter
  const searchPattern = new RegExp("jcr:primaryType\\s*=\\s*\"cq:Component\""); // Replace with your regex pattern

  const fileSearcher = new FileSearcher();

  try {
    const initialData = await fileSearcher.searchFiles(location, searchPattern, filenameMask);

    // Extract directories from initial data keys
    const directories = Object.keys(initialData);
    const contextMask = 'context.xml';
    const componentGroupPattern = new RegExp('componentGroup\\s*=\\s*"([^"]+)"');
    const titlePattern = new RegExp('jcr:title\\s*=\\s*"([^"]+)"');

    const newData = {};

    for (const dir of directories) {
      const componentGroupData = await fileSearcher.searchFiles(dir, componentGroupPattern, contextMask);
      const titleData = await fileSearcher.searchFiles(dir, titlePattern, contextMask);

      const componentGroup = componentGroupData[dir] && componentGroupData[dir][0] ? componentGroupData[dir][0].match(componentGroupPattern)[1] : '';
      const title = titleData[dir] && titleData[dir][0] ? titleData[dir][0].match(titlePattern)[1] : '';

      newData[dir] = {
        category: componentGroup,
        title: title
      };
    }

    res.render('performAnalysis', { location, data: newData });
  } catch (error) {
    console.error('Error during file search:', error);
    res.status(500).send('An error occurred while performing the analysis.');
  }
});

module.exports = router;
