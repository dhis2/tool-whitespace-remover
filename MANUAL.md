# Whitespace Cleaner Tool User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Navigating the UI](#navigating-the-ui)
4. [Warnings](#warnings)
5. [Known Issues](#known-issues)

## Introduction
The **Whitespace Cleaner Tool** is a web application designed to clean up whitespace issues in your DHIS2 metadata. It identifies and fixes leading, trailing, and double spaces in metadata properties like `name`, `code`, `description`, and `shortName`.

## Installation
Follow these steps to install the Whitespace Cleaner in your DHIS2 instance:

1. **Download the Zip File**:
   - Ensure you have the build ZIP file of the Whitespace Cleaner application.

2. **Log In to DHIS2**:
   - Open your preferred web browser and log in to your DHIS2 instance with an account that has administrative privileges.

3. **Navigate to the App Management**:
   - Go to the `App Management` app within DHIS2.

4. **Upload the App**:
   - In the App Management screen, click on the `Install app` button.
   - Choose the ZIP file you downloaded and click `Upload`.
   - Once uploaded, the Whitespace Cleaner app will appear in your DHIS2 app list.

5. **Launch the App**:
   - From the DHIS2 home screen, click on the Whitespace Cleaner icon to launch the app.

## Navigating the UI

### Header
- **Logo**: Takes you back to the DHIS2 main page.
- **Title**: Displays "Whitespace Cleaner".
- **Exit Button**: Click this to exit the Whitespace Cleaner app.

### Main View
- **Loading Indicator**: Appears when the app is fetching metadata.
- **Tabs**: Different tables dynamically created here based on metadata types (e.g., Data Elements, Indicators). Scrolls horizontally if issues are found for many metadata types.

### Actions
Selecting a Tab for an object type gives you a table with objects of that type with whitespace issues. These are highlighted in yellow. Removing the white spaces has two steps:

1. **"Check"** refers to checking whether removing the white space will result in conflict. For example, if an data element with name "ANC 1 visit" exists, trying to remove the trailing space from another data element with name "ANC 1 visit " will be flagged since it would result in a conflict - names must be unique (except organisation units).
2. **"Fix** means removing the white space and updating the object. This can only be done after the a Check has been done successfully.

You can either perform these action on individual objects, or by selecting one or more objects and using the "Check selected" and "Fix selected" buttons.

### Modal Pop-Ups
The app uses two types of modals to provide feedback:
1. **Conflict Summary Modal**:
   - Shows a summary of conflicts found during the checks.
   - Columns: `Object Name`, `Object ID`, `Conflicting Property`, and `Conflicting Object ID`.
2. **Import Results Modal**:
   - Displays import results after attempting to fix metadata objects.
   - Columns: `Object Name`, `Object ID`, and `Error Message`.

## Warnings
- The **app should be used and tested in a development or test environment** to prevent any unintended issues in the production environment.
- The app will **only operate on the metadata a user has access to**. To perform a complete review, the user must have **access to all metadata**, through sharing or by having the `ALL` authority.

## Known Issues
- **Objects cannot be identified based on spaces in shortnames due to API limitations**. However, shortname whitespace issues are corrected for objects that are identified based on other properties (e.g., name, code).

### Using the App
1. **Load Metadata**: When the app is launched, it automatically fetches and displays metadata in tables sorted by type (Data Elements, Indicators, etc.).
2. **Select Rows**:
   - You can select or deselect rows using the checkbox in the first column.
   - Use the `Check Selected` button after selecting rows to find and highlight conflicts.
3. **Fix Conflicts**:
   - Rows marked as `Ready` can be fixed by clicking the `Fix Selected` button.
   - For individual objects, use the `Check` and `Fix` buttons in the `Actions` column.
4. **View Results**:
   - The app will display notifications for success and error
