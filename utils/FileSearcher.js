const fs = require('fs');
const path = require('path');

class FileSearcher {
    constructor(config = {}) {
        this.exclusions = config.exclusions || [];
    }

    shouldExclude(filePath) {
        return this.exclusions.some(pattern => filePath.includes(pattern));
    }

    getFilesInDirectorySync(directory) {
        const files = [];
        try {
            if (this.shouldExclude(directory)) {
                return files;
            }

            const entries = fs.readdirSync(directory, { withFileTypes: true });
            for (const entry of entries) {
                const entryPath = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    files.push(...this.getFilesInDirectorySync(entryPath));
                } else {
                    files.push(entryPath);
                }
            }
        } catch (error) {
            console.error(`Error reading directory: ${directory}`, error);
        }
        return files;
    }

    isFileSync(filePath) {
        try {
            const stats = fs.lstatSync(filePath);
            return stats.isFile();
        } catch (error) {
            console.error(`Error checking if path is file: ${filePath}`, error);
            return false;
        }
    }

    cleanUpResults(results) {
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

    searchFilesSync(directoryPath, regexArray, filenameMask = '') {
        const result = {};

        const searchInFileSync = (filePath) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const fileMatches = {};

                for (const regex of regexArray) {
                    const matches = content.match(regex) || [];
                    if (matches.length > 0) {
                        fileMatches[regex.source] = matches;
                    }
                }
                if (Object.keys(fileMatches).length > 0) {
                    result[filePath] = fileMatches;
                }
            } catch (err) {
                console.error('Error reading file:', err);
            }
        };

        try {
            const isFilePath = this.isFileSync(directoryPath);
            if (isFilePath) {
                searchInFileSync(directoryPath);
            } else {
                const files = this.getFilesInDirectorySync(directoryPath);
                const filteredFiles = filenameMask ? files.filter(file => file.includes(filenameMask)) : files;
                filteredFiles.forEach(file => searchInFileSync(file));
            }

            return this.cleanUpResults(result);
        } catch (error) {
            console.error('Error during file search:', error);
            throw error;
        }
    }
}

module.exports = FileSearcher;