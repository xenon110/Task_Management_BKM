const fs = require('fs');

const lines = fs.readFileSync('C:\\Users\\yashs\\.gemini\\antigravity-ide\\brain\\312404ea-ac3e-4cc8-bc7c-e13799a4cd62\\.system_generated\\logs\\transcript_full.jsonl', 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (data.content && data.content.includes('File Path: `file:///c:/Users/yashs/Downloads/T0_Do/src/store/useSpaceStore.ts`')) {
      fs.writeFileSync('space_store_dump.txt', data.content);
      console.log('Saved useSpaceStore.ts');
    }
    if (data.content && data.content.includes('File Path: `file:///c:/Users/yashs/Downloads/T0_Do/src/layouts/MainLayout.tsx`')) {
      fs.writeFileSync('main_layout_dump.txt', data.content);
      console.log('Saved MainLayout.tsx');
    }
    if (data.content && data.content.includes('File Path: `file:///c:/Users/yashs/Downloads/T0_Do/src/App.tsx`')) {
      fs.writeFileSync('app_dump.txt', data.content);
      console.log('Saved App.tsx');
    }
    if (data.content && data.content.includes('File Path: `file:///c:/Users/yashs/Downloads/T0_Do/src/pages/SpacesPage.tsx`')) {
      fs.writeFileSync('spaces_page_dump.txt', data.content);
      console.log('Saved SpacesPage.tsx');
    }
    if (data.content && data.content.includes('File Path: `file:///c:/Users/yashs/Downloads/T0_Do/src/pages/SpaceDetailPage.tsx`')) {
      fs.writeFileSync('space_detail_dump.txt', data.content);
      console.log('Saved SpaceDetailPage.tsx');
    }
  } catch(e) {
  }
}
