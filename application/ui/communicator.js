"use strict";
const oneday = ( ( 23 * 60 + 59 ) * 60 + 59 ) * 1000 + 999;
let currentlySelected;

function dateParser ( dateString, isEnd ) {
    let date = new Date( dateString );
    if ( isEnd ) date = new Date( date.setUTCMilliseconds( oneday ) )

    return Number( date );
}

class Clock {
    constructor () {
        this.node = document.querySelector( "#clock" )
    }

    startClock () {
        this.stamp = Date.now();
        document.querySelector( "#loading" ).classList.add( "spinkit" )
        this.clock = setInterval( () => { this.node.textContent = new Date( Date.now() - this.stamp ).toISOString().replace( /.+?([\d:]{8,8}).+/, "$1" ) }, 1000 )
        return this.clock
    }

    pauseClock ( clock ) {
        if ( clock ) clearInterval( clock )
        else clearInterval( this.clock )
        document.querySelector( "#loading" ).classList.remove( "spinkit" )
        document.querySelector( "#currentJob" ).textContent = ""
    }
}
[ 'date', 'from', 'cc', 'to', 'attachments', 'subject', 'TEXT', 'messageId' ]

function cE ( el, className, textContent ) {
    const cD = document.createElement( el )
    cD.className = className
    cD.textContent = textContent

    return cD
}

class BlobManager {
    constructor () {
        this.blobList = []
    }

    regist ( blob ) {
        const OURL = URL.createObjectURL( blob );
        this.blobList.push( OURL );
        return OURL;
    }

    clear () {
        this.blobList.forEach( uri => URL.revokeObjectURL( uri ) );
        this.blobList.splice( 0 );
    }
}

function parseCID ( html, files ) {
    for ( const attachment of ( files || [] ) ) {
        const blob = new Blob( [ attachment.arrayBuffer ], { type: attachment.mimeType } )
        if ( attachment.contentId ) {
            html = html.replace( RegExp( `src="cid:${ attachment.contentId.replace( /<(.+?)>/, "$1" ) }"`, "g" ), `src="${ blobManager.regist( blob ) }"` )
        }
        //html = html.replace( RegExp( `src="cid:${ attachment.filename }@.+?"`, "g" ), `src="${ OURL }"` )
    }
    return html
}

class QueryItem extends HTMLElement {
    constructor ( { messageId, file, uniqueId, sender, recipient, alt_recipient, attachments, ...mail } ) {
        //{ messageId, date, sender, title, body, attachments, file, uniqueId }
        super()
        this.id = messageId
        this.uniqueId = uniqueId
        this.mail = mail;

        mail.sender = JSON.parse( sender )
        mail.recipients = [ ...JSON.parse( recipient ), ...JSON.parse( alt_recipient ) ]
        mail.attachments = JSON.parse( attachments )

        const Openfile = function ( { target } ) {
            window.server.invoke( "OpenFile", { uniqueId, file } )
        }

        const dDate = cE( "div", `itemDate${ ( mail.attachments.length > 0 ? " itemHasAttachment" : "" ) }`, `${ new Date( mail.date ).toLocaleDateString() }` )
        const dTitle = cE( "div", "itemTitle", `제  목: ${ mail.title }` )
        const dSender = cE( "div", "itemSender", `발신인: ${ mail.sender.name }<${ mail.sender.address }>` )
        //const dRecipient = cE( "div", "itemRecipient", `수신인: ${ mail.recipients.map( contact => `${ contact.name } <${ contact.address }>` ).join( ", " ) }` )
        const dRecipient = cE( "div", `itemRecipient`, `수신인: ${ mail.recipients.map( contact => `${ contact.name } <${ contact.address }>` ).shift() }${ ( mail.recipients.length > 1 ? ` 외 ${ mail.recipients.length - 1 }명` : "" ) }` )
        const dAttachment = cE( "div", `itemAttachment${ ( mail.attachments.length == 0 ? " noFileEmbeded" : "" ) }`, `첨  부: ` )
        const dAttachments = mail.attachments.map( filename => cE( "div", "filename", filename ) )
        dAttachment.append( ...dAttachments )
        //dAttachment.addEventListener( "click", Openfile )

        this.append( dDate, dTitle, dSender, dRecipient, dAttachment )

        this.addEventListener( "click", async function ( { target } ) {
            clock.startClock()
            const { html, binaries } = await window.server.invoke( "ReadMail", { file } )

            this.classList.add( "selected" );
            currentlySelected?.classList.remove( "selected" )
            currentlySelected = this;
            blobManager.clear();

            const dDate = cE( "div", `itemDate${ ( mail.attachments.length > 0 ? " itemHasAttachment" : "" ) }`, `${ new Date( mail.date ).toLocaleDateString() }` )
            const dTitle = cE( "div", "itemTitle", `제  목: ${ mail.title }` )
            dTitle.addEventListener( "click", Openfile )
            const dSender = cE( "div", "itemSender", `발신인: ${ mail.sender.name }<${ mail.sender.address }>` )
            const dRecipient = cE( "div", "itemRecipient", `수신인: ` )
            const dRecipients = mail.recipients.map( contact => cE( "div", "contact", `${ contact.name } <${ contact.address }>` ) )
            dRecipient.append( ...dRecipients )
            const dAttachment = cE( "div", `itemAttachment${ ( mail.attachments.length == 0 ? " noFileEmbeded" : "" ) }`, `첨  부: ` )
            const dAttachments = ( function () {
                if ( binaries ) {
                    return binaries.map( ( { filename, arrayBuffer, mimeType: type } ) => {
                        const anchor = cE( "a", "filename", filename );
                        anchor.href = blobManager.regist( new Blob( [ arrayBuffer ], { type } ) );
                        if ( type.match( /image/ ) ) {
                            anchor.target = "blank"
                            const image = cE( "img", "" );
                            image.src = anchor.href;
                            image.addEventListener( "load", function () {
                                image.setAttribute( "nHeight", image.naturalHeight )
                                image.setAttribute( "nWidth", image.naturalWidth )
                            } )
                            anchor.append( image );
                        }
                        anchor.download = filename;
                        return anchor;
                    } )
                }
                else {
                    dAttachment.addEventListener( "click", Openfile )
                    return mail.attachments.map( filename => cE( "div", "filename", filename ) )
                }
            } )()
            dAttachment.append( ...dAttachments )

            const contentBox = document.querySelector( "#content" )
            if ( mail.attachments.length == 0 ) contentBox.classList.add( "noFileEmbeded" )
            else contentBox.classList.remove( "noFileEmbeded" )
            const mailInfo = document.querySelector( "#mailInfo" )
            mailInfo.replaceChildren( dDate, dTitle, dSender, dRecipient, dAttachment )

            if ( html ) {
                //document.querySelector( "#preview" ).innerHTML = html.replace( /<img.+?"cid:.+?>/g, "" ).replace( /\[(https?:[^\s]+)\]/g, "<img src=\"$1\">" )
                document.querySelector( "#preview" ).innerHTML = parseCID( html, binaries )
            }
            else {
                //document.querySelector( "#preview" ).innerHTML = `<pre>${ mail.body.replace( /\[(https?:[^\s]+)\]/g, "<img src=\"$1\">" ) }</pre>`
                document.querySelector( "#preview" ).innerHTML = `<pre>${ mail.body }</pre>`
            }
            new Promise( res => {
                [ ...document.querySelector( "#preview" ).querySelectorAll( "[href]" ) ]
                    .forEach( node => {
                        const uri = node.href
                        node.removeAttribute( "href" )
                        node.addEventListener( "click", () => window.server.invoke( "OpenLink", { uri } ) )
                    } )
                clock.pauseClock();
                res();
            } )
        } )
        //const body = document.createElement( "div" )
        //body.textContent = mail.body
        //this.append( title, body )
    }
}
customElements.define( "query-item", QueryItem )

function getFilters () {
    const box = document.querySelector( "#conditions" )

    const filter = {}
    for ( const key of [ "sender", "recipients", "title", "body" ] ) {
        const value = box.querySelector( `#${ key }` ).value
        if ( value ) filter[ key ] = `%${ value }%`
    }

    if ( box.querySelector( "#dateRestriction" ).checked ) {
        filter.date = {
            start: dateParser( box.querySelector( "#date_start" ).value, false ),
            end: dateParser( box.querySelector( "#date_end" ).value, true )
        }
    }

    if ( box.querySelector( "#attachmentRestriction" ).checked ) {
        switch ( box.querySelector( "#attachments" ).value ) {
            case "name": {
                if ( box.querySelector( "#attachmentsName" ).value ) {
                    filter.attachments = `%${ box.querySelector( "#attachmentsName" ).value }%`
                    break;
                }
            }
            case "true": {
                filter.attachments = true;
                break;
            }
            case "false": {
                filter.attachments = false;
                break;
            }
        }
    }

    const inbox = box.querySelector( "#inbox" ).checked
    const outbox = box.querySelector( "#outbox" ).checked
    if ( inbox && outbox ) filter.mailbox = false
    else if ( inbox ) filter.mailbox = "inbox"
    else if ( outbox ) filter.mailbox = "outbox"

    return filter
}

function updateList ( response ) {
    const DOMs = [ ...( response?.inbox || [] ), ...( response?.outbox || [] ) ].map( item => new QueryItem( item ) );
    const list = document.querySelector( "#list" );
    list.replaceChildren( ...DOMs )
    list.children[ 0 ]?.click();
}

async function initialize () {
    document.querySelector( "#inbox" )
        .addEventListener( "change", function ( { target } ) {
            if ( !target.checked ) document.querySelector( "#outbox" ).checked = true
        } )
    document.querySelector( "#outbox" )
        .addEventListener( "change", function ( { target } ) {
            if ( !target.checked ) document.querySelector( "#inbox" ).checked = true
        } )
    document.querySelector( "#attachmentRestriction" )
        .addEventListener( "change", function ( { target } ) {
            if ( target.checked ) {
                document.querySelector( "#attachmentOption" ).removeAttribute( "disabled" )
            }
            else {
                document.querySelector( "#attachmentOption" ).setAttribute( "disabled", "" )
            }
        } )
    document.querySelector( "#attachments" )
        .addEventListener( "change", function ( { target } ) {
            switch ( target.value ) {
                case "false": {
                    document.querySelector( "#attachmentsName" ).setAttribute( "disabled", "" )
                    break;
                }
                case "true": {
                    document.querySelector( "#attachmentsName" ).setAttribute( "disabled", "" )
                    break;
                }
                case "name": {
                    document.querySelector( "#attachmentsName" ).removeAttribute( "disabled" )
                    break;
                }
            }
        } )
    document.querySelector( "#dateRestriction" )
        .addEventListener( "change", function ( { target } ) {
            if ( target.checked ) {
                [ ...target.parentElement.querySelectorAll( "[type=date]" ) ]
                    .forEach( node => { node.removeAttribute( "disabled" ) } )
            }
            else {
                [ ...target.parentElement.querySelectorAll( "[type=date]" ) ]
                    .forEach( node => { node.setAttribute( "disabled", "" ) } )
            }
        } )
    document.querySelector( "#date_start" ).value = new Date( new Date().setMonth( -12 ) ).toISOString().replace( /(\d+-\d+-\d+).+/, "$1" )
    document.querySelector( "#date_start" )
        .addEventListener( "change", function ( { target } ) {
            if ( target.value == "" ) {
                target.value = new Date( new Date().setMonth( -12 ) ).toISOString().replace( /(\d+-\d+-\d+).+/, "$1" )
            }
        } )
    document.querySelector( "#date_end" ).value = new Date().toISOString().replace( /(\d+-\d+-\d+).+/, "$1" )
    document.querySelector( "#date_end" )
        .addEventListener( "change", function ( { target } ) {
            if ( target.value == "" ) {
                target.value = new Date().toISOString().replace( /(\d+-\d+-\d+).+/, "$1" )
            }
        } )
    document.querySelector( "#send_query" )
        .addEventListener( "click", function ( { target } ) {
            clock.startClock()
            window.server.invoke( "SearchDB", getFilters() )
                .then( updateList )
                .then( () => clock.pauseClock() )
        } )
    document.querySelector( "#conditions" )
        .addEventListener( "keyup", function ( { key, code, keyCode } ) {
            if ( key === "Enter" && code === "Enter" && keyCode === 13 )
                document.querySelector( "#send_query" ).click();
        } )
    window.server.ipc_on( 'console', function ( electronEvent, ...args ) {
        document.querySelector( "#currentJob" ).textContent = args
    } )
    window.server.ipc_on( 'Request-Action', function ( electronEvent, { type, ...args } ) {
        switch ( type ) {
            case "update": {
                window.server.invoke( "UpdateDB", clock.startClock() )
                    .then( () => clock.pauseClock() )
                break;
            }
        }
    } )

}
async function connectToMainProcess () {
    await window.server.invoke( "InitDB", clock.startClock() )
        .then( () => clock.pauseClock() )

    //For test
    clock.startClock()
    await window.server.invoke( "SearchDB", getFilters() )
        //await window.server.invoke( "SearchDB", { mailbox: "inbox" } )
        .then( updateList )
        .then( () => clock.pauseClock() )

}

const clock = new Clock();
const blobManager = new BlobManager();

await initialize()
connectToMainProcess()
