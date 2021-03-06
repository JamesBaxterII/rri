import { GameType, ROUNDS, createDice } from "../rules.js";

import HTMLDice from "./html-dice.js";
import Game from "./game.js";
import Round from "./round.js";
import Board from "./board-canvas.js";
import * as scoreTable from "./score-table.js";


export default class SingleGame extends Game {
	constructor(_board:Board, readonly _type: GameType) {
		super(_board);
	}

	async play() {
		super.play();
		this._node.innerHTML = "";
		this._node.appendChild(this._bonusPool.node);

		let num = 1;
		while (num <= ROUNDS[this._type]) {
			let round = new Round(num, this._board, this._bonusPool);
			this._node.appendChild(round.node);
			let dice = createDice(HTMLDice, this._type, num);
			await round.play(dice);
			round.node.remove();
			num++;
		}

		this._outro();

		return true;
	}

	_outro() {
		super._outro();

		let s = this._board.getScore();
		this._board.showScore(s);

		const parent = document.querySelector("#score") as HTMLElement;
		parent.innerHTML = "";
		parent.appendChild(scoreTable.renderSingle(s));
	}
}
