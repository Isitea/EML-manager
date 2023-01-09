import { readMailBox, readEML } from "./isitea.mailParser.js";
//import { rename, unlink } from "node:fs/promises"
import { rename } from "node:fs/promises"
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
                            verbose.log( ++operations, mail.file.replace( /^.+?[/\\]/, "" ) )
                        }
                    }
                } )()
            }
        }
    }

    search ( box, condition ) {
        const { bridge, verbose } = this;
        const DB = bridge.DB
        const expression = []
        for ( const name of Object.keys( condition ) ) {
            switch ( name ) {
                case "date": {
                    condition.date_start = condition.date.start
                    condition.date_end = condition.date.end
                    expression.push( `( date BETWEEN @date_start AND @date_end )` )
                    break;
                }
                case "attachments": {
                    switch ( condition.attachments ) {
                        case false: {
                            condition.attachments = "[]"
                            break;
                        }
                        case true: {
                            condition.attachments = "[_%]"
                            break;
                        }
                        default: {
                            condition.attachments = `[${ condition.attachments }]`
                        }
                    }
                    expression.push( `( attachments LIKE @attachments)` )
                    break;
                }
                case "recipients": {
                    expression.push( `( recipient LIKE @recipients OR alt_recipient LIKE @recipients )` )
                    break;
                }
                default: {
                    expression.push( `( ${ name } LIKE @${ name } )` )
                }
            }
        }
        const state = DB.prepare( `SELECT * FROM ${ box }${ ( expression.length > 0 ? ` WHERE ${ expression.join( " AND " ) }` : "" ) }` )
        return { [ box ]: state.all( condition ) }
    }

    async updateDB () {
        for ( const table of mailBoxes ) {
            for await ( const list of readMailBox( `update/${ table }`, 10, 0 ) ) {
                for ( const mail of list ) {
                    const { file } = mail
                    mail.file = file.replace( /(^update[/\\])/, "" );
                    await rename( file, mail.file )
                        .then( () => bridge.insert( table, mail ) )
                        .then( () => console.log( file ) )
                        .catch( () => console.log( file ) )
                    //.catch( () => unlink( file ) )
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
