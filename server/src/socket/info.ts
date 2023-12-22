import { nsp as nspGame } from './game.js'
import { nspGeneral } from './general.js'

function emitServerConnections() {
  nspGeneral.emit('info:serverConnections', {
    total: nspGeneral.sockets.size,
    authenticated: [...nspGeneral.sockets.values()].filter((s) => s.data.userID != null).length,
    game: nspGame.sockets.size,
  })
}

export async function initializeInfo() {
  emitServerConnections()
}

export async function terminateInfo() {
  emitServerConnections()
}
