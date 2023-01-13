# EML manager
This application helps searching specific emails from EML files by several conditions like subject, contents, sender, recipients and etc.

# Copyright or license
This application follows AGPL which inherits from PostalMime
## PostalMime modification announce
### base64-decoder.js
    import { Blob } from 'node:buffer';
### pass-through-decoder.js
    import { Blob } from 'node:buffer';
### postal-mime.js
    import { Blob } from 'node:buffer';
### qp-decoder.js
    import { Blob } from 'node:buffer';

# How to install
## 1. Use release
Download the latest release for windows and use it.

## 2. Clone repository and build
Use the following git command for cloning this repository

    git clone https://github.com/ethereum/go-ethereum.git
    
After cloning is completed, use the following command for downloading dependencies.

Unfortunately, pnpm doesn't support electronjs (22.0.1)

    npm install

Use the following command for build better-sqlite3 module for electronjs.

This statement is not needed, when you use electron-forege for running electronjs application.

    npm exec electron-build

After that, use the following statement for launching eml-manager.

### 1. Use electron directly.

    npm run electron

or

    npm exec electron .

### 2. Use electron-forge

    npm run start

or

    npm exec electron-forge start

If you want to make a single installer file for Windows, use the following statement.

    npm run make

or

    npm exec electron-forge make

# Caution
Uninstalling or updating the installed version of this application through the installer could remove every e-mail files(.eml) under the application directory.

If you DO NOT want to lose them all, you must backup or temporarily move e-mail files(.eml) to the other position, before uninstalling or updating.

# How to use
## Updating e-mail DB
Updating or initiating e-mail DB for searching e-mail contents is performed automatically on application launching.

Eml-manager checks its eml file container which exists under an application directory and parses them into DB.

Therefore, to update e-mail DB, you need to copy e-mail files(.eml) into (app root)/update/inbox or (app root)/update/outbox.

Be careful, when copying e-mails into update directory. Eml-manager defines what mail is received one or sent one by an imported directory

## Open (app root)/update directory for copying e-mail files.
Click [Open update source directory]

It launches explorer with positioning (app root)/update.

## Manually updates e-mail DB without re-launching of application.
Click [Update e-mail DB] in the menu.

It activates updating procedure that equals to re-launching

![UI description](https://user-images.githubusercontent.com/7787191/212237510-c0d1e71b-43eb-4fa3-ac94-29b2f8d4c9ce.png)
