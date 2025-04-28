# StickyVocab Chrome Extension

A Chrome extension that helps you save and learn vocabulary terms while browsing the web.

## Features

- **Vocabulary Collection**: Highlight any text, click on "Note" to add a definition.
- **Automatic Term Recognition**: The extension will automatically highlight terms you've saved when you visit new websites.
- **Definition Tooltips**: Hover over highlighted terms to see their definitions.
- **Term Management**: View, search, edit, and delete your saved terms through the extension popup.

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing this extension
5. The StickyVocab extension should now appear in your extensions list and toolbar

## Icons

Before loading the extension, you'll need to create icon files or replace the placeholders:

### Option 1: Create icons with Node.js

If you have Node.js installed:

1. Install the required package: `npm install canvas`
2. Run the icon creation script: `node icons/create_icons.js`

### Option 2: Create icons manually

Create three PNG files with the following dimensions:

- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

## Usage

1. **Adding Terms**:

   - Highlight text on any webpage
   - Click the "Note" tooltip that appears
   - Enter a definition in the popup and click "Save"

2. **Managing Terms**:

   - Click the StickyVocab icon in your Chrome toolbar
   - View all your saved terms
   - Search for specific terms using the search box
   - Edit or delete terms as needed

3. **Learning While Browsing**:
   - When you browse websites, the extension will automatically highlight terms you've saved
   - Hover over these highlights to see their definitions

## License

MIT
