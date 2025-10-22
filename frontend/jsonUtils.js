// ----------------------
// jsonUtils.js — Node.js JSON utils only
// ----------------------
import fs from 'fs';
import path from 'path';

/**
 * Fetch JSON data from file
 * @param {string} filePath - file path
 * @returns {Promise<Object>}
 */
export async function fetchJSON(filePath) {
  const fullPath = path.resolve(filePath);
  return new Promise((resolve, reject) => {
    fs.readFile(fullPath, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') return resolve({}); // file not found → empty object
        return reject(err);
      }
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Save JSON data to file
 * @param {string} filePath - file path
 * @param {Object} data - JSON data
 * @returns {Promise<void>}
 */
export async function saveJSON(filePath, data) {
  const fullPath = path.resolve(filePath);
  return new Promise((resolve, reject) => {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFile(fullPath, jsonString, 'utf8', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
