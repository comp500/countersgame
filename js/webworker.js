/*
TODO:
weight wins by depth DONE
input territories in gui DONE
turn processor DONE
check territory array stuff
new round button
*/

function processMove(state, moveNum, mine) {
    if (state.board[moveNum].value == 0) {
        return false;
    }
	if (state.board[moveNum].mine != mine) {
		return false;
	}
    var i = moveNum;
    var hand = 0;
	hand = state.board[i].value;
	state.board[i].value = 0;
	i++;
	if (i == 12) {
		i = 0;
	}
    while (true) {
        state.board[i].value += 1;
		hand -= 1;
		if (state.board[i].value == 4) {
			state.board[i].value = 0;
			if (mine) {
				if (state.board[i].mine) {
					state.myTerr++;
					state.lastTerr = true;
					if (hand == 0) {
						break;
					}
				} else {
					if (hand == 0) {
						state.myTerr++;
						state.lastTerr = true;
						break;
					} else {
						state.oppTerr++;
						state.lastTerr = false;
					}
				}
			} else {
				if (!state.board[i].mine) {
					state.oppTerr++;
					state.lastTerr = false;
					if (hand == 0) {
						break;
					}
				} else {
					if (hand == 0) {
						state.oppTerr++;
						state.lastTerr = false;
						break;
					} else {
						state.myTerr++;
						state.lastTerr = true;
					}
				}
			}
		}
		if (hand == 0 && state.board[i].value == 1) {
			break;
		}
		if (hand == 0) {
            hand = state.board[i].value;
			state.board[i].value = 0;
        }
		i++;
		if (i == 12) {
			i = 0;
		}
    }
	return true;
}

var wins = [];
var runs;

function run(state, moveNum, oppMoveNum, globMoveNum, depth) {
	depth++;
	runs++;
	if (depth > state.searchDepth) {
		return;
	} else if (depth == 1) {
		postMessage({
			type: "log",
			value: "depth: " + depth + " runs: "+ runs + " glob: " + globMoveNum
		});
	}
	if (state.board[moveNum].value == 0) {
        return;
    }
	if (state.board[moveNum].mine != true) {
		return;
	}
	var oldmyTerr = state.myTerr;
	var oldoppTerr = state.oppTerr;
	var move = processMove(state, moveNum, true);
	var oppMove = processMove(state, oppMoveNum, false);
	var changeTerr = state.myTerr - oldmyTerr;
	var changeOppTerr = state.oppTerr - oldoppTerr;
	var depthWeight = 1 / depth;
	wins[globMoveNum] += (changeTerr * depthWeight);
	wins[globMoveNum] -= (changeOppTerr * depthWeight);
	if (move || oppMove) {
		if ((state.oppTerr + state.myTerr) == 11) {
			if (state.lastTerr) {
				state.myTerr++;
				wins[globMoveNum] += 1;
			} else {
				state.oppTerr++;
				wins[globMoveNum] -= 1;
			}
			if (state.oppTerr < state.myTerr) {
				wins[globMoveNum] += 10;
			} else {
				wins[globMoveNum] -= 10;
			}
			postMessage({
				type: "log",
				value: "Win through move number " + (globMoveNum + 1)
			});
		} else {
			var savedState = JSON.stringify(state);
			/*for (var k = 0; k < state.board.length; k++) {
				console.log("Pos "+k+": " + state.board[k].value);
			}*/
			for (var i = 0; i < 12; i++) {
				for (var j = 0; j < 12; j++) {
					run(JSON.parse(savedState), i, j, globMoveNum, depth);
				}
			}
		}
	}
}

function start(state) {
	for (var i = 0; i < 12; i++) {
		wins[i] = 0;
	}
	runs = 0;
	var stateString = JSON.stringify(state);
	for (var i = 0; i < 12; i++) {
		for (var j = 0; j < 12; j++) {
			run(JSON.parse(stateString), i, j, i, 0);
			postMessage({
				type: "status",
				value: (((i * 12) + j) + 1)
			});
		}
	}
	postMessage({
		type: "output",
		value: wins
	});
}

onmessage = function(e) {
	postMessage({
		type: "log",
		value: "Worker started"
	});
	start(e.data);
};
