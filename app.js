const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const indexRouter = require('./routes/index');
const checkDirectoryRouter = require('./routes/checkDirectory');
const performAnalysisRouter = require('./routes/performAnalysis');

// Define search configuration
const searchConfig = {
    'content.xml': [
        { key: 'category', pattern: new RegExp('componentGroup\\s*=\\s*["\']([^"\']+)["\']'), cleaning: 'singleQuotations' },
        { key: 'title', pattern: new RegExp('jcr:title\\s*=\\s*["\']([^"\']+)["\']'), cleaning: 'singleQuotations' },
        { key: 'resourceSuperType', pattern: new RegExp('sling:resourceSuperType\\s*=\\s*["\']([^"\']+)["\']'), cleaning: 'singleQuotations' }
    ],
    '.html': [
        { key: 'ddsTags', pattern: new RegExp('<(dds-[a-zA-Z0-9-]+)', 'g'), cleaning: 'tags', unique: true },
        { key: 'caemTags', pattern: new RegExp('<(caem-[a-zA-Z0-9-]+)', 'g'), cleaning: 'tags', unique: true },
        { key: 'carbonImport', pattern: /.*carbonRequestAttributeHelper.*attributeName\s*=\s*['"]([^'"]+)['"][^"']*["']/g, cleaning: 'multipleQuotations', unique: true },
        { key: 'resourceType', pattern: new RegExp("resourceType\\s*=\\s*['\"\\s]([^'\"]+)['\"\\s]", 'g'), cleaning: 'multipleQuotations', unique: true },
        { key: 'dynamicDataSlyUse', pattern: /data-sly-use\.\w+\s*=\s*["'](\/apps[^"']*)["']/g, cleaning: 'multipleQuotations', unique: true }
    ]
};

const fileSearcherConfig = {
    exclusions: ['node_modules', 'widgets']
};

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/checkDirectory', checkDirectoryRouter);
app.use('/performAnalysis', (req, res, next) => {
    req.searchConfig = searchConfig; // Make searchConfig available in the request object
    req.fileSearcherConfig = fileSearcherConfig;
    next();
}, performAnalysisRouter);
app.use('/', indexRouter);

app.listen(3000, () => {
    console.log('Application Link : http://localhost:3000');
});