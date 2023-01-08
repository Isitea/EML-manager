const { contextBridge, ipcRenderer } = require( 'electron' )

contextBridge.exposeInMainWorld( 'server', {
    ipc_on: function (...args) { return ipcRenderer.on( ...args ) },
//    ipc_once: function (...args) { return ipcRenderer.once( ...args ) },
//    ipc_removeListener: function ( ...args ) { return ipcRenderer.removeListener( ...args ) },
//    ipc_removeAllListeners: function ( ...args ) { return ipcRenderer.removeAllListeners( ...args ) },
//    ipc_send: function (...args) { return ipcRenderer.send( ...args ) },
    invoke: function ( ...args ) { return ipcRenderer.invoke( ...args ) },
} )