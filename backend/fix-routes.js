const fs = require('fs');

let content = fs.readFileSync('src/routes/prompt.routes.ts', 'utf8');

// Remove all response schemas
content = content.replace(/,\s*response:\s*\{[\s\S]*?\},\s*\},\s*\},/g, ',\n      // Removed response schema to allow full data serialization\n    },');

fs.writeFileSync('src/routes/prompt.routes.ts', content);
console.log('Fixed!');
