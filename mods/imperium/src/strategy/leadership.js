

    this.importStrategyCard("leadership", {
      name     			:       "Leadership",
      rank			:	1,
      img			:	"/imperium/img/strategy/INITIATIVE.png",
      text			:	"Player gets three tokens for their command, strategy and fleet pools. All players may purchase additional tokens at three influence per token." ,
      strategyPrimaryEvent 	:	function(imperium_self, player, strategy_card_player) {

	if (imperium_self.game.player == strategy_card_player) {

          if (imperium_self.game.player == player) {
            imperium_self.addMove("resolve\tstrategy");
            imperium_self.addMove("strategy\t"+"leadership"+"\t"+strategy_card_player+"\t2");
            imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);
            imperium_self.playerAllocateNewTokens(imperium_self.game.player, 3, 0, 1);
          }
 	}

	return 0;

      },

      strategySecondaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (player == imperium_self.game.player) {
	  if (strategy_card_player != imperium_self.game.player) {
            imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
            imperium_self.playerBuyTokens(2);
 	  } else {
            imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
            imperium_self.playerBuyTokens(2);
	  }
        }

      },

    });


