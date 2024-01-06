const fs = require('fs');

// Read the content of the text file
const textContent = fs.readFileSync('diamond_sutra.txt', 'utf-8');

// Split the text into lines and filter out blank lines
const nonBlankLines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

// Create the JSON file content
const jsonFileContent = JSON.stringify(nonBlankLines, null, 2);

// Write the JSON file
fs.writeFileSync('diamond_sutra.json', jsonFileContent, 'utf-8');

console.log('Conversion completed: toib.json file has been created.');
