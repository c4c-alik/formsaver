# FormSaver - Chrome Extension

FormSaver is a Chrome extension that allows users to save and restore form data based on the URL of the webpage. This is particularly useful when filling out forms that require multiple submissions, or when forms are rejected and need to be resubmitted after corrections.

## Features

- **Save Form Data**: Right-click anywhere on a page with forms to save all form field values
- **Restore Form Data**: Restore previously saved form data to the same URL
- **Popup Interface**: Simple popup UI to manually save/restore form data
- **Options Page**: Customizable settings for the extension
- **Automatic Field Detection**: Automatically detects and saves input fields, textareas, and select elements
- **URL-Based Storage**: Saves form data linked to the specific URL where it was captured

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The FormSaver icon should now appear in your Chrome toolbar

## Usage

### Method 1: Right-click Context Menu (Recommended)

1. Navigate to a webpage with forms you want to save
2. Fill out the form fields as needed
3. Right-click anywhere on the page
4. Select "Save Current Form Data" from the context menu
5. The form data is now saved and linked to the current URL

To restore form data:
1. Navigate back to the same URL where you saved the form
2. Right-click anywhere on the page
3. Select "Restore Saved Form Data" from the context menu
4. The form fields will be automatically populated with saved values

### Method 2: Popup Interface

1. Click the FormSaver icon in your Chrome toolbar
2. Click "Save Current Form" to save the current form data
3. Click "Restore Saved Form" to populate the page with saved data

### Method 3: Options Page

1. Right-click the FormSaver extension icon in the toolbar
2. Select "Options" from the context menu
3. Configure settings like:
   - Auto-save functionality
   - Password field exclusion
   - Notification settings
   - Data management options

## Technical Details

### Files Structure

- `manifest.json`: Chrome extension configuration file
- `src/background.ts`: Handles form data storage and context menu
- `src/content.ts`: Runs on web pages to interact with forms
- `src/contextMenu.ts`: Manages the right-click context menu functionality
- `popup/popup.html`: HTML for the extension popup
- `popup/popup.js`: JavaScript for the popup UI
- `options/options.html`: HTML for the options page
- `options/options.js`: JavaScript for the options page
- `assets/`: Contains extension icons

### Permissions

- `storage`: To store form data locally
- `activeTab`: To access the current tab
- `contextMenus`: To add right-click menu options
- `<all_urls>`: To access form data on all websites

### Supported Form Elements

- Text inputs (`<input type="text">`)
- Password inputs are excluded for security reasons
- Checkboxes (`<input type="checkbox">`)
- Radio buttons (`<input type="radio">`)
- Text areas (`<textarea>`)
- Select dropdowns (`<select>`)

## Development

To contribute to this extension:

1. Install dependencies: `npm install`
2. Build the project: `npm run build`
3. For development: `npm run dev` (watches for changes and rebuilds automatically)

## Security

- FormSaver does not transmit any data to external servers
- All data is stored locally in your browser
- Password fields are intentionally excluded from saved data for security

## Contributing

Feel free to submit issues or pull requests to improve FormSaver!

## License

MIT