# AEM Component Analysis

## Overview

This Node.js application is designed to search for regex patterns within an Adobe Experience Manager (AEM) project. It analyzes component files, applies regex patterns according to configuration, maps the usage of components and subcomponents, and lists them in data tables. 

## Features

- Search for files in a specified directory based on configurable patterns.
- Apply regex patterns to extract and analyze data.
- Generate dynamic tables displaying results and usage counts.
- Exclude specified directories from search results.
- Export data in various formats (PDF, Excel) using DataTables.
- Use Material Design for styling and DataTables for enhanced table functionality.

**Note**: This application is intended to be run on a developer machine as it analyzes AEM projects locally.

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/aem-component-analysis.git
   cd aem-component-analysis
2. **Install Dependencies**

    Ensure you have Node.js installed. Then, run:
    ```bash
    npm install
## Configuration
1. **Search Configuration**
    
    Modify the searchConfig object in app.js to customize regex patterns and keys for different file types:

    ```javascript
    const searchConfig = {
        'content.xml': [
            // Example patterns for content.xml
        ],
        '.html': [
            // Example patterns for .html files
        ]
    };
    ```
2. **Folder Exclusion Configuration**

    Modify the fileSearcherConfig object in app.js to exclude regex patterns in directories:

    ```json
    {
        "exclusions": ["node_modules"],
    }
    ```
    This configuration can be found in the utils/FileSearcher class.

## Usage
1. **Start the Application**

    Run the following command to start the Express server:

    ```bash
    npm start
    ```
    The server will be available at http://localhost:3000.

2. **Perform Analysis**

- Navigate to http://localhost:3000.
- Paste the path to your AEM project folder in the input field and click "Analyse".
- The application will process the files and display results in dynamic tables.
## API Endpoints
- POST /checkDirectory: Check if a directory exists and is valid.
  - Request Body: { "location": "/path/to/directory" }
  - Response: { "directoryExists": 1 } if valid, { "directoryExists": 0 } if not.
- POST /performAnalysis: Perform the analysis on the specified directory.
  - Request Body: { "location": "/path/to/directory" }
  - Response: HTML page with analysis results.
## Files and Structure
- server.js: Main server file to start the Express application.
- routes/checkDirectory.js: Route for checking directory existence.
- routes/performAnalysis.js: Route for performing the analysis.
- utils/FilePathHandler.js: Utility class for processing and adjusting file paths.
- utils/FileSearcher.js: Class responsible for searching files and applying regex patterns.
- views/index.ejs: Main page for inputting the directory path.
- views/results.ejs: Page for displaying analysis results.
- public/scripts/app.js: Client-side JavaScript for validating directories and handling UI interactions.
- public/scripts/dataTables.js: JavaScript for initializing and managing DataTables.
- public/styles/style.css: Custom CSS styles.
## Contributing
Contributions are welcome! Please fork the repository and submit a pull request with your changes. Ensure that your code adheres to the existing style and includes tests if applicable.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements
- Materialize CSS for styling.
- DataTables for enhanced table functionality.
## Contact

For any questions or issues, please open an issue on GitHub or contact mail@ebenezer-isaac.com