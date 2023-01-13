const { app, BrowserWindow, ipcMain, shell, Menu } = require( "electron" );
const { exec } = require( "node:child_process" )
const { join } = require( "node:path" );
const { mkdir } = require( "node:fs/promises" )

if ( require( 'electron-squirrel-startup' ) ) app.quit();
app.disableHardwareAcceleration();

class Tunnel {
    constructor ( tunnel ) {
        this.tunnel = tunnel
        this.flag = true
    }

    info ( ...args ) {
        this.flag = false
        this.log( ...args )
    }

    log ( ...args ) {
        if ( this.flag && typeof this.tunnel.send === "function" ) {
            this.tunnel.send( "console", ...args )
            this.flag = false
            setTimeout( () => this.flag = true, 1000 )
        }
        else {
            console.log( ...args )
        }
    }

    query ( type, statement ) {
        this.tunnel.send( type, statement )
    }
}

async function main () {
    //Make directory before activating
    await mkdir( "inbox", { recursive: true } )
    await mkdir( "outbox", { recursive: true } )
    await mkdir( "update/inbox", { recursive: true } )
    await mkdir( "update/outbox", { recursive: true } )

    const ESModule = import( './isitea.manager.js' );

    const createWindow = () => {
        const win = new BrowserWindow( {
            width: 1280,
            height: 720,
            webPreferences: {
                preload: join( __dirname, "ui/electron.preload.cjs" ),
                nodeIntegration: true,
            }
        } )

        //win.webContents.openDevTools()
        win.loadFile( join( __dirname, 'ui/index.html' ) )

        return win.webContents
    }

    app.whenReady().then( async () => {
        // Create GUI as Window
        const WebView = createWindow()
        const tunnel = new Tunnel( WebView )
        const { eMailBox, Bridge } = await ESModule;
        const manager = new eMailBox( new Bridge( "./emails.db" ), tunnel )

        ipcMain.handle( "InitDB", async function ( electronEvent, ...args ) {
            await manager.initDB()
            await manager.updateDB()
        } );
        ipcMain.handle( "UpdateDB", async function ( electronEvent, ...args ) {
            await manager.updateDB()
        } );
        ipcMain.handle( "OpenFile", function ( electronEvent, { file } ) {
            exec( `"${ join( __dirname, file ) }"` )
        } )
        ipcMain.handle( "ReadMail", async function ( electronEvent, { file } ) {
            return await manager.readMail( { path: file } )
        } )
        ipcMain.handle( "OpenLink", function ( electronEvent, { uri } ) {
            shell.openExternal( uri )
        } )
        ipcMain.handle( "SearchDB", function ( electronEvent, { mailbox, ...args } ) {
            //console.log( args )
            if ( mailbox ) {
                return { [ mailbox ]: manager.search( mailbox, args ) }
            }
            else {
                return {
                    inbox: manager.search( "inbox", args ),
                    outbox: manager.search( "outbox", args ),
                }
            }
        } )

        // Adjust Menubar
        const menu = Menu.buildFromTemplate( [
            {
                label: "Update e-mail DB",
                click: function () {
                    tunnel.query( "Request-Action", { type: "update" } )
                }
            },
            { type: "separator" },
            {
                label: "Open update source directory",
                click: function () {
                    exec( `start update` )
                }
            },
            { type: "separator" },
            { role: "quit" },
        ] )
        Menu.setApplicationMenu( menu )

    } )

    app.on( 'window-all-closed', () => {
        if ( process.platform !== 'darwin' ) app.quit()
    } )
}

main();
