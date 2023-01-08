module.exports = {
    "packagerConfig": {
        "icon": "email.ico",
        "dir": "application",
        "ignore": [ ".+\.(db|log|ico|td|scss|map)", "inbox|outbox|update", "\.gitignore" ]
    },
    "rebuildConfig": {},
    "makers": [
        {
            "name": "@electron-forge/maker-squirrel",
            "config": {
                "copyright": "AGPL from PostalMime",
                "iconUrl": "https://github.com/Isitea/EML-manager/raw/main/email.ico",
            }
        },
    ]
}