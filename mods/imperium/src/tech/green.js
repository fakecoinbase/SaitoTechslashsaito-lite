
    this.importTech("neural-motivator", {
      name        	:       "Neural Motivator" ,
      color       	:       "green" ,
      prereqs             :       [],
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].neural_motivator == undefined) {
          imperium_self.game.players_info[player-1].neural_motivator = 0;
        }
      },
      onNewRound : function(imperium_self, player, mycallback) {
        if (player == this.game.player) {
          imperium_self.game.players_info[player-1].neural_motivator = 1;
        }
        return 1;
      },
    });


    this.importTech("dacxive-animators", {
      name                :       "Dacxive Animators" ,
      color               :       "green" ,
      prereqs             :       ["green"],
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].dacxive_animators == undefined) {
          imperium_self.game.players_info[player-1].dacxive_animators;
        }
      },
      onNewRound : function(imperium_self, player, mycallback) {
        if (player == this.game.player) {
          imperium_self.game.players_info[player-1].dacxive_animators = 1;
        }
        return 1;
      },
    });


    this.importTech("hyper-metabolism", {
      name        	: 	"Hyper Metabolism" ,
      color       	: 	"green" ,
      prereqs     	:       ['green','green'],
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].hyper_metabolism == undefined) {
          imperium_self.game.players_info[player-1].hyper_metabolism = 0;
        }
      },
      onNewRound : function(imperium_self, player, mycallback) {
        if (player == this.game.player) {
          imperium_self.game.players_info[player-1].hyper_metabolism = 1;
        }
        return 1;
      },
    });


    this.importTech("x89-bacterial-weapon", {
      name        	:       "X-89 Bacterial Weapon" ,
      color       	:       "green" ,
      prereqs     	:       ['green','green','green'],
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].x89_bacterial_weapon == undefined) {
          imperium_self.game.players_info[player-1].x89_bacterial_weapon = 0;
        }
      },
      onNewRound : function(imperium_self, player, mycallback) {
        if (player == this.game.player) {
          imperium_self.game.players_info[player-1].x89_bacterial_weapon = 1;
        }
        return 1;
      },
    });


