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

    insert ( table, { messageId, date, sender, recipient, alt_recipient, title, body, attachments, file } ) {
        const mailData = {}
        // Prepare SQLite3 queries
        const DB = this.DB;
        const duplicated = DB.prepare( `SELECT * FROM ${ table } WHERE uniqueId LIKE @uniqueId` )
        const insertion = DB.prepare( `INSERT INTO ${ table } VALUES ( @messageId, @date, @uniqueId, @sender, @recipient, @alt_recipient, @title, @body, @attachments, @file )` )
        // Transform data for insertion
        for ( const [ key, value ] of Object.entries( { messageId, date } ) ) mailData[ key ] = value
        for ( const [ key, value ] of Object.entries( { title, body } ) ) mailData[ key ] = value.replace( /'+/g, "''" )
        for ( const [ key, value ] of Object.entries( { sender, recipient, alt_recipient, attachments } ) ) mailData[ key ] = JSON.stringify( value )?.replace( /'+/g, "''" )
        mailData.file = file.replace( /'/g, "''" )

        // Check DB with uniqueId
        const uniqueId = mailData.messageId + "#" + mailData.date;
        const matches = duplicated.all( { uniqueId } )
        // If not exist, perform an insertion
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

            if ( date_start !== undefined && date_end !== undefined ) {
                conds.push( `date BETWEEN @date_start AND @date_end` )
            }

            return DB.prepare( `SELECT * FROM ${ table } ${ ( conds.length > 0 ? `WHERE ${ conds.join( " AND " ) } ` : "" ) }ORDER BY date DESC NULLS LAST;` )
                .all( { uniqueId, date_start, date_end, attachments, recipients, ...cond } )

        }

    }

    search ( table, { messageId, date, uniqueId, sender, recipient, alt_recipient, title, body, attachments, file } ) {
        const DB = this.DB;
        const condition = { messageId, date, uniqueId, sender, recipient, alt_recipient, title, body, attachments, file };
        const expression = [];
        for ( const name of Object.entries( condition )
            .filter( ( [ key, value ] ) => ( value !== undefined ) ).map( ( [ key, value ] ) => key ) ) {
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
                }
                default: {
                    expression.push( `( ${ name } LIKE @${ name } )` )
                }
            }
        }
        const state = DB.prepare( `SELECT * FROM ${ table }${ ( expression.length > 0 ? ` WHERE ${ expression.join( " AND " ) }` : "" ) } ORDER BY date DESC NULLS LAST;` )
        return state.all( condition );
    }

}
