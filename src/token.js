var constants = require('./constants');
var Grid = constants.Grid;
var ActionTypes = constants.ActionTypes;
var Events = constants.Events;
var utils = require('./utils');

function Token(options) {
  this.player = options.player;
  this.id     = options.id;
  this.game   = this.player.game;
  this.team   = this.player.team;

  this.active = false;
  this.inBlockade = false;
  this.cords  = {x: 0, y: 0};
}

Token.prototype.getPossibleAction = function getPossibleAction(rolled) {
  var action = {};
  var forecast;
  var enemyToken;
  var allyToken;
  var blockadeAhead;

  forecast = this._forecastCords(rolled);
  blockadeAhead = this._blockadeAhead(rolled);

  if (!blockadeAhead) {
    action.forecast = forecast;
    action.token = this;
    action.rolled = rolled;

    if (this.active) {
      enemyToken = this.player.enemyTokenAt(forecast);
      allyTokens = this.player.allyTokensAt(forecast, this);

      if (enemyToken) {
        action.type = ActionTypes.KILL_MOVE;
        action.enemyToken = enemyToken;
      } else if (allyTokens) {
        action.type = ActionTypes.CREATE_BLOCKADE;
        action.allyTokens = allyTokens;
      } else {
        action.type = ActionTypes.MOVE_BY;
      }
    } else if (rolled === 6) {
      action.type = ActionTypes.BORN;
    }

    if (action.type) return action;
  }

  return false;
};

Token.prototype.executeAction = function executeAction(action) {

  switch (action.type) {
  case ActionTypes.BORN:
    this.born();
    break;

  case ActionTypes.MOVE_BY:
  case ActionTypes.CREATE_BLOCKADE:
  case ActionTypes.KILL_MOVE:
    this.moveTo({x: action.forecast[0], y: action.forecast[1]});
    break;
  }
};

Token.prototype.born = function born() {
  var startPoint = Grid.startPoint[this.team];
  this.active = true;
  this.game.emit(Events.TOKEN_BORN, { token: this });

  this.moveTo({x: startPoint[0], y: startPoint[1]});
};

Token.prototype._forecastCords = function _forecastCords(rolled) {
  var cordArray = [this.cords.x, this.cords.y];
  var index;
  var cords;

  if (this.active) {
    index = utils.findCordsInArray(cordArray, Grid.path);
    index += rolled;
    if (index > (Grid.path.length - 1)) {
      index -= (Grid.path.length);
    }
    cords = Grid.path[index];
  } else if (rolled === 6) {
    cords = Grid.startPoint[this.team];
  }

  return cords;
};

Token.prototype._findAllCordsAhead = function _findAllCordsAhead(rolled) {
  var cordArray = [this.cords.x, this.cords.y];
  var initialIndex;
  var endingIndex;
  var cordsList = [];

  if (this.active) {
    initialIndex = utils.findCordsInArray(cordArray, Grid.path);
    endingIndex = initialIndex + rolled;
    initialIndex += 1; //Excludes first element in slice
    endingIndex += 1; //Includes last element in slice

    cordsList = Grid.path.slice(initialIndex, endingIndex);

    if (endingIndex > (Grid.path.length - 1)) {
      endingIndex -= (Grid.path.length);
      cordsList = cordsList.concat(Grid.path.slice(0, endingIndex));
    }
  } else if (rolled === 6) {
    cordsList = [Grid.startPoint[this.team]];
  }

  return cordsList;
};

Token.prototype._blockadeAhead = function _blockadeAhead(rolled) {
  var blockade = this.player.blockadeAhead(this._findAllCordsAhead(rolled));

  if (blockade) {
    this.game.emit(Events.TOKEN_BLOCKED, { token: this, blockade: blockade });
  }

  return blockade;
};

Token.prototype._createBlockade = function _createBlockade(cords, allyTokens) {
  allyTokens.push(this);
  this.player.registerBlockade(cords, allyTokens);
  this.game.emit(Events.TOKEN_BLOCKADE, { tokens: allyTokens, cords: cords });
};

//TODO: Remove this function no longer in use
Token.prototype.moveBy = function moveBy(rolled) {
  var newCord = this._forecastCords(rolled);
  this.moveTo({x: newCord[0], y: newCord[1]});
};

Token.prototype.moveTo = function moveTo(cords) {
  var cordArray = [cords.x, cords.y];
  var enemyToken = this.player.enemyTokenAt(cordArray);
  var allyTokens = this.player.allyTokensAt(cordArray, this);

  if (this.inBlockade) this._leaveBlockade();
  if (enemyToken) this._kill(enemyToken);
  if (allyTokens) this._createBlockade(cordArray, allyTokens);

  this.cords.x = cords.x;
  this.cords.y = cords.y;
  this.game.emit(Events.TOKEN_MOVE_TO, { token: this, cords: this.cords});
};

Token.prototype._leaveBlockade = function _leaveBlockade() {
  var cords = [this.cords.x, this.cords.y];
  var allyTokens;
  this.inBlockade = false;
  allyTokens = this.player.allyTokensAt(cords, this);
  this.player.registerBlockade(cords, allyTokens);
};

Token.prototype.killedBy = function killedBy(otherToken) {
  this.active = false;
  this.cords = { x: 0, y: 0 };
};

Token.prototype._kill = function _kill(killedToken) {
  killedToken.killedBy(this);
  this.game.emit(Events.TOKEN_KILLED, { killed: killedToken, by: this });
};

module.exports = Token;
