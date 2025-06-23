import { print_clientConnected, print_clientDisconnected } from "./static/utils.js"
import { getAllGames } from './preprocessing.js';

export function setupConnection(socket) {
    print_clientConnected(socket.id)

    // Emit the initial board games data to the newly connected client
    socket.emit('initial_game_data', getAllGames());

    socket.on("disconnect", () => {
        print_clientDisconnected(socket.id)
    })
}
