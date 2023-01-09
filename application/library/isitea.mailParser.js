import fs from 'node:fs/promises';
import nodePath from 'node:path';
import { default as PostalMime } from './postal-mime/postal-mime.js'
//import { Blob } from 'node:buffer';

// Implants x00 on String to remove \x00 (\u0000)
Object.defineProperty( String.prototype, "x00", {
    get: function () { return this.replace( /\u0000/g, "" ) }
} )
// Implants alias on String to apply changed company name from hanwha-total to htpchem
Object.defineProperty( String.prototype, "alias", {
    get: function () { return this.replace( /hanwha-total.com/g, "htpchem.com" ) }
} )
// Implants alias on String to apply changed company name from hanwha-total to htpchem
Object.defineProperty( String.prototype, "singleWhite", {
    get: function () { return this.replace( /(\s)+/g, "$1" ) }
} )

class Contact {
    constructor ( contact ) {
        this.address = contact.address?.alias || ""
        this.name = contact.name?.x00 || ""
    }
}

class Attachments {
    constructor ( attachments ) {
        this.files = attachments.map( ( { content: arrayBuffer, ...data } ) => ( { arrayBuffer, ...data } ) )
    }

    get list () {
        return this.files.map( file => file.filename )
    }
}

class eMail {
    constructor ( rfc822, path = "" ) {
        let { date, from, to, cc, attachments, subject, text, html, messageId } = rfc822;
        const binaries = new Attachments( attachments );
        for ( const [ field, value ] of Object.entries( {
            messageId: messageId.replace( /^<|>$/g, "" ),
            date: Number( new Date( date ) ),
            sender: new Contact( from ),
            recipient: to?.map( contact => new Contact( contact ) ) || [],
            alt_recipient: cc?.map( contact => new Contact( contact ) ) || [],
            title: subject?.x00 || "",
            body: text?.x00.alias || "",
            html: html?.x00.alias || "",
            binaries: binaries.files,
            file: path,
        } ) ) {
            this[ field ] = value;
        }
        this.attachments = binaries.list
    }
}

async function* getMails ( dirname, blocSize = 10 ) {
    const dir = await fs.opendir( dirname );
    const mails = [];
    for await ( const dirent of dir ) {
        if ( dirent.isFile() && dirent.name.match( /.+?\.eml$/ ) ) {
            let path = nodePath.normalize( nodePath.join( dirname, dirent.name ) );
            mails.push( path );
            if ( mails.length >= blocSize ) {
                yield mails.splice( 0 );
            }
        }
    }
    yield mails.splice( 0 );
}

export async function* readMailBox ( dirname, blocSize = 10, limits = 0 ) {
    let counter = 0;
    for await ( const mails of getMails( dirname, blocSize ) ) {
        yield ( await Promise.all( mails.map( readEML ) ) ).filter( item => ( item !== false ) )
        counter += mails.length;
        if ( limits !== 0 && counter >= limits ) {
            break;
        }
    }
}

export async function readEML ( filename ) {
    if ( filename === "" ) return false
    return fs.open( filename, "r" )
        .then( file =>
            file.readFile( { encoding: "utf8" } )
                .then( rfc822 => ( new PostalMime() ).parse( rfc822 ) )
                .then( mail => new eMail( mail, filename ) )
                .then( parsed => {
                    file.close();
                    //console.log( `Parsed ${ ( ++operations ).toString().padStart( 4, "0" ) }: ${ filename }` )
                    return parsed
                } )
                .catch( e => console.log( `Error on parsing : ${ filename }\r\n`, e ) )
        )
}

let operations = 0; //for debugging