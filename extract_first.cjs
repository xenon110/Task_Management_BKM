const fs = require('fs');

const lines = fs.readFileSync('C:\\Users\\yashs\\.gemini\\antigravity-ide\\brain\\312404ea-ac3e-4cc8-bc7c-e13799a4cd62\\.system_generated\\logs\\transcript_full.jsonl', 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (data.content && data.content.includes('File Path: `file:///c:/Users/yashs/Downloads/T0_Do/src/layouts/MainLayout.tsx`')) {
      if (!fs.existsSync('first_main_layout.txt')) {
         fs.writeFileSync('first_main_layout.txt', data.content);
         console.log('Saved FIRST MainLayout.tsx');
      }
    }
  } catch(e) {
  }
}
