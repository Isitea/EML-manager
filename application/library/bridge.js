import Database from "better-sqlite3";

export class Bridge {
    constructor ( storage = ":memory:" ) {
        this.DB = new Database( storage );
    }

    initTable ( table, structure ) {
        const DB = this.DB
        const createTable = DB.prepare( `CREATE TABLE IF NOT EXISTS ${ table } ( ${ structure } );` )
        createTable.run()
        return DB.prepare( `SELECT * FROM ${ table } LIMIT 1` ).all()
    }

    insert ( table, mailData ) {
        const DB = this.DB;
        const duplicated = DB.prepare( `SELECT * FROM ${ table } WHERE uniqueId LIKE @uniqueId` )
        const insertion = DB.prepare( `INSERT INTO ${ table } VALUES ( @messageId, @date, @uniqueId, @sender, @recipient, @alt_recipient, @title, @body, @attachments, @file )` )
        for ( const [ key, value ] of Object.entries( mailData ) ) {
            mailData[ key ] = ( typeof value === "string" ? value : JSON.stringify( value ) ).replace( /'+/g, "''" );
        }
        const uniqueId = mailData.messageId + "#" + mailData.date;
        const matches = duplicated.all( { uniqueId } )
        if ( matches.length === 0 ) insertion.run( { ...mailData, uniqueId } )
    }

    search ( table, { uniqueId, date_start, date_end, attachments, recipients, ...cond } ) {
        const DB = this.DB;
        if ( uniqueId !== undefined ) {
            return DB.prepare( `SELECT * FROM ${ table } WHERE $uniquId = @uniqueId ORDER BY date DESC NULLS LAST;` )
                .all( { uniqueId } )
        }
        else {
            const conds = Object.entries( cond )
                .map( ( [ key, value ] ) => ( Boolean( value ) ? `${ key } LIKE @${ key }` : false ) )
                .filter( state => Boolean( state ) );

            if ( recipients !== undefined ) {
                conds.push( `( recipient LIKE @recipients OR alt_recipient LIKE @recipients )` )
            }

            if ( attachments !== undefined ) {
                switch ( cond.attachments ) {
                    case true: {
                        conds.push( `attachments NOT LIKE '[]'` )
                        break;
                    }
                    case false: {
                        conds.push( `attachments = '[]'` )
                        break;
                    }
                    default: {
                        conds.push( `attachments LIKE @attachments` )
                    }
                }
            }

            if ( date_start && date_end ) {
                conds.push( `date BETWEEN @date_start AND @date_end` )
            }

            return DB.prepare( `SELECT * FROM ${ table } ${ ( conds.length > 0 ? `WHERE ${ conds.join( " AND " ) } ` : "" ) }ORDER BY date DESC NULLS LAST;` )
                .all( { uniqueId, date_start, date_end, attachments, recipients, ...cond } )

        }

    }
}
