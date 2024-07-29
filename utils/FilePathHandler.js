// utils/FilePathHandler.js

class FilePathHandler {
    constructor(data, headers) {
        this.data = data;
        this.headers = headers;
    }

    // Function to find the longest common prefix
    findCommonPrefix(paths) {
        if (!paths.length) return '';
        let prefix = paths[0];
        for (let i = 1; i < paths.length; i++) {
            while (paths[i].indexOf(prefix) !== 0) {
                prefix = prefix.substring(0, prefix.length - 1);
                if (!prefix) return '';
            }
        }
        return prefix;
    }

    // Function to adjust file paths by removing the common prefix and /apps/ prefix
    adjustFilePath(filePath, commonPrefix) {
        const segments = commonPrefix.split(/[/\\]/);
        let adjustedPath = filePath.replace(/\\/g, '/'); // Replace backslashes with forward slashes

        for (let i = 0; i < segments.length; i++) {
            const prefixToRemove = segments.slice(i).join('/');
            adjustedPath = adjustedPath.replace(new RegExp(`^${prefixToRemove}`), '');
        }

        // Remove /apps/ or apps/ prefix
        adjustedPath = adjustedPath.replace(/^\/?apps\//, '');

        return adjustedPath;
    }

    // Identify columns that contain file paths based on values
    identifyFilePathColumns() {
        const filePathColumns = new Set();
        Object.values(this.data).forEach(details => {
            this.headers.forEach((header, index) => {
                const value = details[header];
                if (Array.isArray(value)) {
                    value.forEach(val => {
                        if (typeof val === 'string' && (val.includes('/') || val.includes('\\'))) {
                            filePathColumns.add(index + 1); // +1 because the first column is 'File Path'
                        }
                    });
                } else if (typeof value === 'string' && (value.includes('/') || value.includes('\\'))) {
                    filePathColumns.add(index + 1); // +1 because the first column is 'File Path'
                }
            });
        });
        return [...filePathColumns];
    }

    processFilePaths() {
        const filePaths = Object.keys(this.data);
        const commonPrefix = this.findCommonPrefix(filePaths);

        const filePathColumns = this.identifyFilePathColumns();
        filePathColumns.unshift(0); // Ensure the first column is always included

        const processedData = {};
        for (const [filePath, details] of Object.entries(this.data)) {
            const displayFilePath = this.adjustFilePath(filePath, commonPrefix);
            const row = {};

            this.headers.forEach((header, index) => {
                let cellValue = details[header] || 'N/A';
                if (filePathColumns.includes(index + 1)) { // Adjust file paths in identified columns
                    if (Array.isArray(cellValue)) {
                        cellValue = cellValue.map(val => this.adjustFilePath(val, commonPrefix)).join(', ');
                    } else {
                        cellValue = this.adjustFilePath(cellValue, commonPrefix);
                    }
                } else if (Array.isArray(cellValue)) {
                    cellValue = cellValue.join(', ');
                }
                row[header] = cellValue;
            });

            processedData[displayFilePath] = row;
        }

        return processedData;
    }
}

module.exports = FilePathHandler;