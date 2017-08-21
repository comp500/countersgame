function clear(starting) {
	document.getElementById("log").textContent = "";
	document.getElementById("output").textContent = starting ? "Processing..." : "Idle";
	for (var k = 0; k < 12; k++) {
		var el = document.getElementById(k + "-res");
		el.textContent = "";
		el.style.color = "";
	}
}

function log(text) {
	if (document) {
		var el = document.getElementById("log");
		el.textContent += text + "\n";
		el.scrollTop = el.scrollHeight;
	}
	console.log(text);
}

function output(text) {
	if (document) {
		document.getElementById("output").textContent = text;
		for (var k = 0; k < 12; k++) {
			var el = document.getElementById(k + "-res");
			el.textContent = text[k];
			if (text[k] < 0) {
				el.style.color = "red";
			}
		}
		var biggestIndex = text.indexOf(Math.max(...text));
		document.getElementById(biggestIndex + "-res").style.color = "green";
	}
	console.log(text);
}

function status(value) {
	if (document) {
		var progressbar = document.getElementById("progressbar");
		//progressbar.textContent = value + "/144";
		if (value == 0) {
			progressbar.classList.add("notransition");
			progressbar.style.width = "0";
		} else {
			progressbar.classList.remove("notransition");
			progressbar.style.width = ((value / 144) * 100) + "%";
		}
	}
}

function createState(myTerr, oppTerr) {
	var state = {
		board: [],
		myTerr: 0,
		oppTerr: 0,
		lastTerr: false
	};
	for (var i = 0; i <= 5; i++) {
		if (myTerr > 0) {
			state.board[i] = {value: 4, mine: true};
		} else {
			state.board[i] = {value: 4, mine: false};
		}
		myTerr--;
	}
	for (var i = 6; i <= 11; i++) {
		if (oppTerr > 0) {
			state.board[i] = {value: 4, mine: false};
		} else {
			state.board[i] = {value: 4, mine: true};
		}
		oppTerr--;
	}
	return state;
}

var processRunning = false;

var myWorker;

function start() {
	if (window.Worker) {
		if (processRunning) {
			if (myWorker) {
				myWorker.terminate();
			}
			clear();
			status(0);
			processRunning = false;
			document.getElementById("runbutton").textContent = "Run";
		} else {
			clear(true);
			log("Starting worker...");

			processRunning = true;
			document.getElementById("runbutton").textContent = "Stop";
			status(0);

			myWorker = new Worker("js/webworker.js");
			myWorker.onmessage = function(e) {
				if (e.data.type == "output") {
					output(e.data.value);
					processRunning = false;
					document.getElementById("runbutton").textContent = "Run";
				} else if (e.data.type == "status") {
					status(e.data.value);
				} else {
					log(e.data.value);
				}
			};

			myWorker.onerror = function(e) {
				log("Error from WebWorker: " + e.message);
			};

			var terr = parseInt(document.getElementById("myTerr").value);
			var oppTerr = parseInt(document.getElementById("oppTerr").value);
			var terrCurrent = parseInt(document.getElementById("myTerrCurrent").value);
			var oppTerrCurrent = parseInt(document.getElementById("oppTerrCurrent").value);
			var inputError = false;

			if ((terr + oppTerr) == 12 && terr > 0 && oppTerr > 0) {
				var state = createState(terr, oppTerr);
				for (var k = 0; k < 12; k++) {
					var val = parseInt(document.getElementById(k).value);
					state.board[k].value = val;
					if (val < 0) {
						log("Position " + (k + 1) + " is less than 0, stopped.");
						inputError = true;
					}
				}
				state.myTerr = terrCurrent || 0;
				state.oppTerr = oppTerrCurrent || 0;
				state.searchDepth = parseInt(document.getElementById("depth").value) || 2;
				if (terrCurrent < 0 || oppTerrCurrent < 0 || state.searchDepth < 1) {
					log("Territory/search data invalid, stopped.");
					inputError = true;
				}
				if (!inputError) {
					myWorker.postMessage(state);
				} else {
					if (myWorker) {
						myWorker.terminate();
					}
					processRunning = false;
					document.getElementById("runbutton").textContent = "Run";
				}
			} else {
				log("Territories do not add to 12, stopped.");
				if (myWorker) {
					myWorker.terminate();
				}
				processRunning = false;
				document.getElementById("runbutton").textContent = "Run";
			}
		}
	} else {
		log("Web workers not supported, this will not work!");
	}
}

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

function runMove(mine) {
	clear();
	var terr = parseInt(document.getElementById("myTerr").value);
	var oppTerr = parseInt(document.getElementById("oppTerr").value);
	var terrCurrent = parseInt(document.getElementById("myTerrCurrent").value);
	var oppTerrCurrent = parseInt(document.getElementById("oppTerrCurrent").value);
	var inputError = false;

	if ((terr + oppTerr) == 12 && terr > 0 && oppTerr > 0) {
		var state = createState(terr, oppTerr);
		for (var k = 0; k < 12; k++) {
			var val = parseInt(document.getElementById(k).value);
			state.board[k].value = val;
			if (val < 0) {
				log("Position " + (k + 1) + " is less than 0, stopped.");
				inputError = true;
			}
		}
		state.myTerr = terrCurrent || 0;
		state.oppTerr = oppTerrCurrent || 0;
		state.searchDepth = parseInt(document.getElementById("depth").value) || 2;
		if (terrCurrent < 0 || oppTerrCurrent < 0 || state.searchDepth < 1) {
			log("Territory/search data invalid, stopped.");
			inputError = true;
		}

		var moveNum = parseInt(document.getElementById("posNum").value);
		if (!moveNum || moveNum < 1 || moveNum > 12) {
			log("Move number invalid, stopped");
			inputError = true;
		} else {
			moveNum--;
		}

		if (!inputError) {
			if (processMove(state, moveNum, mine)) {
				for (var k = 0; k < 12; k++) {
					document.getElementById(k).value = state.board[k].value;
				}
				document.getElementById("myTerrCurrent").value = state.myTerr;
				document.getElementById("oppTerrCurrent").value = state.oppTerr;
				log("Move finished.");
			} else {
				log("Move failed.")
			}
		}
	} else {
		log("Territories do not add to 12, stopped.");
	}
}

function clickMove() {
	runMove(true);
}

function clickOppMove() {
	runMove(false);
}

function clickNewRound() {
	clear();
	var myTerrCurrent = document.getElementById("myTerrCurrent");
	var oppTerrCurrent = document.getElementById("oppTerrCurrent");
	var total = parseInt(myTerrCurrent.value) + parseInt(oppTerrCurrent.value);
	if (total == 12) {
		document.getElementById("myTerr").value = myTerrCurrent.value;
		document.getElementById("oppTerr").value = oppTerrCurrent.value;
		myTerrCurrent.value = 0;
		oppTerrCurrent.value = 0;
		for (var k = 0; k < 12; k++) {
			document.getElementById(k).value = 4;
		}
		log("New round started.");
	} else {
		log("Total is not equal to 12, stopping.");
	}
}
