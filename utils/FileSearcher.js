const fs = require('fs').promises;
const path = require('path');
const { Sema } = require('async-sema'); // Import Sema from async-sema

class FileSearcher {
  constructor() {
    this.readSemaphore = new Sema(5); // Initialize with 5 permits, adjust as needed
  }

  async getFilesInDirectory(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = entries
      .filter(file => !file.isDirectory())
      .map(file => path.join(directory, file.name));
    const directories = entries.filter(file => file.isDirectory());

    for (const dir of directories) {
      const dirPath = path.join(directory, dir.name);
      files.push(...await this.getFilesInDirectory(dirPath));
    }

    return files;
  }

  async isFile(filePath) {
    try {
      const stats = await fs.lstat(filePath);
      return stats.isFile();
    } catch (error) {
      console.error(`Error checking if path is file: ${filePath}`, error);
      throw error;
    }
  }

  async searchFiles(path, regex, filenameMask = '') {
    const result = {};

    try {
      const isFilePath = await this.isFile(path);

      if (isFilePath) {
        await this.readSemaphore.acquire();
        try {
          const content = await fs.readFile(path, 'utf8');
          const lines = content.split('\n');
          const matches = lines.filter(line => regex.test(line));

          if (matches.length > 0) {
            result[path] = matches;
          }
        } catch (err) {
          console.error('Error reading file:', err);
        } finally {
          this.readSemaphore.release();
        }
      } else {
        const files = await this.getFilesInDirectory(path);
        const filteredFiles = filenameMask
          ? files.filter(file => path.basename(file).includes(filenameMask))
          : files;

        const promises = filteredFiles.map(async file => {
          await this.readSemaphore.acquire();
          try {
            const content = await fs.readFile(file, 'utf8');
            const lines = content.split('\n');
            const matches = lines.filter(line => regex.test(line));

            if (matches.length > 0) {
              result[file] = matches;
            }
          } catch (err) {
            console.error('Error reading file:', err);
          } finally {
            this.readSemaphore.release();
          }
        });

        await Promise.all(promises);
      }

      return result;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

module.exports = FileSearcher;
