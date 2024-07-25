const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const indexRouter = require('./routes/index');
const checkDirectoryRouter = require('./routes/checkDirectory');
const performAnalysisRouter = require('./routes/performAnalysis');

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/checkDirectory', checkDirectoryRouter);
app.use('/performAnalysis', performAnalysisRouter);
app.use('/', indexRouter);

app.listen(3000, () => {
  console.log('App listening on port 3000!');
});