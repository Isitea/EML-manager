import { readMailBox, readEML } from "./isitea.mailParser.js";
//import { rename, unlink } from "node:fs/promises"
import { rename, stat } from "node:fs/promises"
function unlink ( args ) { console.log( args ) }

const _Structure = "messageId TEXT NOT NULL, date INTEGER NOT NULL, uniqueId TEXT NOT NULL,sender TEXT NOT NULL, recipient TEXT NOT NULL, alt_recipient TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, attachments TEXT NOT NULL, file TEXT NOT NULL, primary key ( uniqueId )";
const mailBoxes = [ "inbox", "outbox" ]
let operations = 0; //for debugging

class Verbose {
    constructor ( terminal ) {
        this.setTerminal( terminal );
    }

    setTerminal ( terminal ) {
        if ( terminal ) this.terminal = terminal;
        else this.terminal = console
    }

    log ( ...args ) {
        this.terminal.log( ...args );
    }

    info ( ...args ) {
        this.terminal.info( ...args );
    }
}

export class eMailBox {
    constructor ( bridge, terminal ) {
        this.verbose = new Verbose( terminal )
        this.bridge = bridge
    }

    async initDB () {
        const { bridge, verbose } = this;
        for ( const table of mailBoxes ) {
            const rows = bridge.initTable( table, _Structure )
            if ( rows.length === 0 ) {
                await ( async function () {
                    for await ( const list of readMailBox( table, 10, 0 ) ) {
                        for ( const mail of list ) {
                            bridge.insert( table, mail )
                            verbose.log( ++operations, mail.file.replace( /^.+?([^/\\]+\.eml$)/, "$1" ) )
                        }
                    }
                } )()
            }
        }
    }

    search ( box, condition ) {
        const { bridge, verbose } = this;
        verbose.info( "Filtering e-mails" )
        if ( condition.attachments ) {
            switch ( condition.attachments ) {
                case false: {
                    condition.attachments = "[]"
                    break;
                }
                case true:
                case "": {
                    condition.attachments = "[_%]"
                    break;
                }
                default: {
                    condition.attachments = `[%${ condition.attachments }%]`
                }
            }
        }
        return bridge.search( box, condition )
    }

    async updateDB () {
        const { bridge, verbose } = this;
        for ( const table of mailBoxes ) {
            for await ( const list of readMailBox( `update/${ table }`, 10, 0 ) ) {
                for ( const mail of list ) {
                    const { file } = mail
                    mail.file = file.replace( /(^update[/\\])/, "" );
                    try {
                        await stat( mail.file )
                        verbose.info( `[Passed] ${ file.replace( /^.+?([^/\\]+\.eml$)/, "$1" ) } is already exists.` )
                    }
                    catch {
                        await rename( file, mail.file )
                        bridge.insert( table, mail )
                        verbose.log( ++operations, file.replace( /^.+?([^/\\]+\.eml$)/, "$1" ) )
                    }
                }
            }
        }
    }

    readMail ( { path, uniqueId, box } ) {
        if ( path ) {
            return readEML( path )
        }
        else if ( uniqueId && box ) {
            const DB = this.bridge.DB
            DB.prepare( `SELECT file FROM ${ box } WHERE uniqueId = @uniqueId` ).get( { uniqueId } )
            const file_from_uniqueId = uniqueId
            return readEML( file_from_uniqueId )
        }

        return Promise.resolve( false )
    }
}
