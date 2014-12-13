var helper = require('./spec_helper');
var Player = require('../src/player');

describe("Player", function() {
  var game, player;

  beforeEach(function() {
    game = helper.mockGame();
    player = new Player();
    player.setTeam("bl");
  });

  it("can set itself to ready", function() {
    player.readyUp();
    player.getReady().should.equal(true);
  });

  describe("joinGame", function() {
    it("can join a game", function() {
      player.joinGame(game).should.equal(true);
    });

    it("sets the game that it was joined to", function() {
      player.joinGame(game);
      player.game.should.equal(game);
    });
  });

  describe("beginTurn", function() {
    it("fires player:turn:begins on the game", function() {
      player.game = game;
      player.beginTurn();
      game.emit.should.be.calledWith("player.turn.begin", { player: player });
    });

    it('fires player.turn.rollDice and waits for the dice to roll', function() {
      player.game = game;
      player.beginTurn();
      callback = game.emit.args[1][1].callback;
      game.emit.should.be.calledWith("player.turn.rollDice", { player: player, callback: callback });
    });

    it('fires player.actions if there are possible actions', function() {
      var dice = { rolled: 6 };
      player.game = game;
      player.beginTurn();
      game.emit.args[1][1].callback(dice);

      game.emit.should.be.calledWith("player.actions");
    });

    it('fires player.turn.end there are no possible actions', function() {
      var dice = { rolled: 3 };
      player.game = game;
      player.beginTurn();
      callback = game.emit.args[1][1].callback(dice);

      game.emit.should.not.be.calledWith("player.actions");
      game.emit.should.be.calledWith("player.turn.end", { player: player });
    });
  });

  describe("createTokensForTeam", function() {
    it("creates 4 tokens for that team", function() {
      player._tokens.length.should.equal(4);
    });
  });

  describe("generatePossibleActions", function() {
    it("returns born actions for inactive tokens when 6 is rolled", function() {
      actions = player.generatePossibleActions(6);
      actions.length.should.equal(4);

      for (var i = 0; i <= 3; i++) {
        actions[0].type.should.eql("born");
      }
    });
  });

  describe("endTurn", function() {
    it("fires player:turn:ends on the game", function() {
      player.game = game;
      player.endTurn();
      game.emit.should.be.calledWith("player.turn.end", { player: player });
    });

    it("calls continueGame on the game instance", function() {
      player.game = game;
      player.endTurn();
      game.continueGame.called.should.equal(true);
    });
  });
});
