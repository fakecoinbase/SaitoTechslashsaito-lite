
    this.importStrategyCard("trade", {
      name     			:       "Trade",
      rank			:	5,
      img			:	"/imperium/img/strategy/TRADE.png",
      text			:	"The player of this card gains 3 trade goods and refreshes their commodities. They may then choose to refresh any number of other players. Any players who have not been refreshed are then permitted to refresh their commodities by spending a trade good.",
      strategyPrimaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player == strategy_card_player) {

          imperium_self.addMove("resolve\tstrategy");
          imperium_self.addMove("strategy\t"+"trade"+"\t"+strategy_card_player+"\t2");
          imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
          imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);
          imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tgoods\t3");
          imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tcommodities\t"+imperium_self.game.players_info[imperium_self.game.player-1].commodity_limit);
 
          let factions = imperium_self.returnFactions();
          let html = '<p>You will receive 3 trade goods and '+imperium_self.game.players_info[imperium_self.game.player-1].commodity_limit+' commodities. You may choose to replenish the commodities of any other players: </p><ul>';
          for (let i = 0; i < imperium_self.game.players_info.length; i++) {
            if (i != imperium_self.game.player-1) {
              html += '<li class="option" id="'+i+'">' + factions[imperium_self.game.players_info[i].faction].name + '</li>';
            }
          }
          html += '<li class="option" id="finish">stop replenishing</li>';
 
          imperium_self.updateStatus(html);
 
          $('.option').off();
          $('.option').on('click', function() {
            let id = $(this).attr("id");
            if (id != "finish") {
              imperium_self.addMove("purchase\t"+(parseInt(id)+1)+"\tcommodities\t"+imperium_self.game.players_info[id].commodity_limit);
              $(this).hide();
            } else {
              imperium_self.endTurn();
            }
          });

        }

      },
      strategySecondaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player == player) {
        if (imperium_self.game.player != strategy_card_player) {

	  if (imperium_self.game.players_info[player-1].commodities == imperium_self.game.players_info[player-1].commodity_limit) { 
	    imperium_self.updateLog(imperium_self.returnFaction(player) + " skips the Trade secondary as they have already refreshed commodities");
            imperium_self.endTurn();
	    return 1;
	  }

          let html = '<p>Trade has been played. Do you wish to spend 1 strategy token to refresh your commodities? </p><ul>';
          html += '<li class="option" id="yes">Yes</li>';
          html += '<li class="option" id="no">No</li>';
          html += '</ul>';

          imperium_self.updateStatus(html);

          $('.option').off();
          $('.option').on('click', function() {

            let id = $(this).attr("id");

            if (id == "yes") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tcommodities\t"+imperium_self.game.players_info[imperium_self.game.player-1].commodity_limit);
              imperium_self.addMove("expend\t"+imperium_self.game.player+"\tstrategy\t1");
            }
            if (id == "no") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.endTurn();
              return 0;
            }
 
          });
        } else {
          imperium_self.addMove("resolve\tstrategy\t1");
          imperium_self.endTurn();
          return 0;
        }
        }
      },
    });

