const fs = require('fs').promises;
const path = require('path');
const { Sema } = require('async-sema');

class FileSearcher {
  constructor(config = {}) {
    this.readSemaphore = new Sema(5); // Initialize with 5 permits, adjust as needed
    this.exclusions = config.exclusions || [];
  }

  // Helper function to check if a path should be excluded
  shouldExclude(filePath) {
    filePath = String(filePath)
    // Check if any part of the path matches an exclusion pattern
    const isExcluded = this.exclusions.some(pattern => {
      const match = filePath.includes(pattern);
      return match;
    });
    return isExcluded;
  }

  // Recursive function to get all files in a directory
  async getFilesInDirectory(directory) {
    const files = [];
    try {
      // Skip this directory if it matches any exclusion pattern
      if (this.shouldExclude(directory)) {
        return files;
      }

      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          // Recurse into subdirectories
          files.push(...await this.getFilesInDirectory(entryPath));
        } else {
          files.push(entryPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory: ${directory}`, error);
    }

    return files;
  }

  // Check if the path is a file
  async isFile(filePath) {
    try {
      const stats = await fs.lstat(filePath);
      return stats.isFile();
    } catch (error) {
      console.error(`Error checking if path is file: ${filePath}`, error);
      return false;
    }
  }

  // Function to clean up the results
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

  // Search files in a directory with the given regex patterns and file mask
  async searchFiles(directoryPath, regexArray, filenameMask = '') {
    const result = {};

    // Function to search for patterns in a single file
    const searchInFile = async (filePath) => {
      await this.readSemaphore.acquire();
      try {
        console.log(`Searching file: ${filePath}`);
        const content = await fs.readFile(filePath, 'utf8');
        const fileMatches = {};

        // Use regex patterns to find matches in the file content
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
      } finally {
        this.readSemaphore.release();
      }
    };

    try {
      const isFilePath = await this.isFile(directoryPath);
      if (isFilePath) {
        await searchInFile(directoryPath);
      } else {
        const files = await this.getFilesInDirectory(directoryPath);
        const filteredFiles = filenameMask
          ? files.filter(file => {
              return path.extname(file).includes(filenameMask);
            })
          : files;

        const searchPromises = filteredFiles.map(file => searchInFile(file));
        await Promise.all(searchPromises);
      }

      // Clean up the results before returning
      return this.cleanUpResults(result);
    } catch (error) {
      console.error('Error during file search:', error);
      throw error;
    }
  }
}

module.exports = FileSearcher;
