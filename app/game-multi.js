import Game from "./game.js";
import JsonRpc from "./json-rpc.js";
import * as html from "./html.js";
const template = document.querySelector("template");
function createRpc(ws) {
    let io = {
        onData(_s) { },
        sendData(s) { ws.send(s); }
    };
    ws.addEventListener("message", e => io.onData(e.data));
    return new JsonRpc(io);
}
function openWebSocket(url) {
    const ws = new WebSocket(url);
    return new Promise((resolve, reject) => {
        ws.addEventListener("open", e => resolve(e.target));
        ws.addEventListener("error", _ => reject(new Error("Cannot connect to server")));
    });
}
export default class MultiGame extends Game {
    constructor() {
        super();
        this._nodes = {};
        this._state = "";
        this._round = 0;
        ["setup", "lobby"].forEach(id => {
            let node = template.content.querySelector(`#multi-${id}`);
            this._nodes[id] = node.cloneNode(true);
        });
        const setup = this._nodes["setup"];
        setup.querySelector("[name=join]").addEventListener("click", _ => this._joinOrCreate());
        setup.querySelector("[name=create-normal]").addEventListener("click", _ => this._joinOrCreate("normal"));
        setup.querySelector("[name=create-lake]").addEventListener("click", _ => this._joinOrCreate("lake"));
        const lobby = this._nodes["lobby"];
        lobby.querySelector("button").addEventListener("click", _ => this._start());
    }
    async play(board) {
        super.play(board);
        return new Promise((_, reject) => {
            this._reject = reject;
            this._setup();
        });
    }
    async _setup() {
        this._rpc = undefined;
        this._node.innerHTML = "";
        const setup = this._nodes["setup"];
        this._node.appendChild(setup);
        try {
            const ws = await openWebSocket("ws://localhost:1234"); // FIXME
            ws.addEventListener("close", e => this._onClose(e));
            const rpc = createRpc(ws);
            rpc.expose("game-change", () => this._sync());
            rpc.expose("game-destroy", () => this._sync()); // FIXME
            this._rpc = rpc;
        }
        catch (e) {
            this._reject(e);
        }
    }
    _onClose(_e) {
        this._reject(new Error("Network connection closed"));
    }
    async _joinOrCreate(type) {
        if (!this._rpc) {
            return;
        }
        const setup = this._nodes["setup"];
        let playerName = setup.querySelector("[name=player-name]").value;
        if (!playerName) {
            return alert("Please provide your name");
        }
        let gameName = setup.querySelector("[name=game-name]").value;
        if (!gameName) {
            return alert("Please provide a game name");
        }
        const buttons = setup.querySelectorAll("button");
        buttons.forEach(b => b.disabled = true);
        let args = [gameName, playerName];
        if (type) {
            args.unshift(type);
        }
        try {
            const lobby = this._nodes["lobby"];
            lobby.querySelector("button").disabled = (!type);
            await this._rpc.call(type ? "create-game" : "join-game", args);
        }
        catch (e) {
            alert(e.message);
        }
        finally {
            buttons.forEach(b => b.disabled = false);
        }
    }
    _start() {
        if (!this._rpc) {
            return;
        }
        this._rpc.call("start-game", []);
    }
    async _sync() {
        if (!this._rpc) {
            return;
        }
        let response = await this._rpc.call("game-info", []);
        this._setState(response.state);
        switch (response.state) {
            case "starting":
                this._updateLobby(response.players);
                break;
            case "playing":
                this._updateRound(response);
                break;
        }
    }
    _setState(state) {
        if (this._state == state) {
            return;
        }
        this._state = state;
        this._node.innerHTML = "";
        switch (state) {
            case "starting":
                this._node.appendChild(this._nodes["lobby"]);
                break;
            case "playing":
                this._node.appendChild(this._bonusPool.node);
                break;
            case "over":
                // FIXME
                break;
        }
    }
    _updateLobby(players) {
        const lobby = this._nodes["lobby"];
        const list = lobby.querySelector("ul");
        list.innerHTML = "";
        players.forEach(p => {
            let item = html.node("li", {}, p.name);
            list.appendChild(item);
        });
        const button = lobby.querySelector("button");
        button.textContent = (button.disabled ? `Wait for ${players[0].name} to start the game` : "Start the game");
    }
    _updateRound(_response) {
    }
}