const GameHud = require('../../lib/templates/lib/game-hud/game-hud'); 
const GameBoardSizer = require('../../lib/templates/lib/game-board-sizer/game-board-sizer');
const GameTemplate = require('../../lib/templates/gametemplate');
  
class Imperium extends GameTemplate {
  
  constructor(app) {
  
    super(app);
  
    this.name             = "Imperium";
    this.slug		  = "imperium";
    this.description      = `Red Imperium is a multi-player space exploration and conquest simulator. Each player controls a unique faction vying for political control of the galaxy in the waning days of a dying Empire.`;
    this.categories	  = "Arcade Games Entertainment";
    this.minPlayers       = 2;
    this.maxPlayers       = 4;  
    this.type             = "Strategy Boardgame";

    this.gameboardWidth   = 1900;
  
    this.rmoves           = [];
    this.totalPlayers     = 2;
    this.vp_needed        = 14;




    //
    // specific to THIS game
    //
    this.game.board          = null;
    this.game.sectors        = null; 
    this.game.planets        = null;
    this.game.confirms_needed   = 0;
    this.game.confirms_received = 0;
    this.game.confirms_players  = [];
    
    //
    // not specific to THIS game
    //
    this.factions       	= {};
    this.tech           	= {};
    this.strategy_cards 	= {};
    this.action_cards 		= {};
    this.agenda_cards   	= {};
    this.secret_objectives     	= {};
    this.stage_i_objectives     = {};
    this.stage_ii_objectives    = {};
    this.units          	= {};

    this.hud = new GameHud(this.app, this.menuItems());
   
  
    //
    // game-related
    //
    this.assigns = [];  // floating units needing assignment to ships
    this.game.tracker = {};  // track options in turn
    this.activated_systems_player = 0;

    return this;
  
  }
  

  //
  // this function is CLOSED in imperium-initialize
  //
  // the compile script should process all of the objects that need to
  // be added to the various trees, so that when this function is run
  // in the initializeGame function everything is added to the appropriate
  // tree and the functions are instantiated.
  //
  initializeGameObjects() {




    this.importTech("antimass-deflectors", {
      name        	:       "Antimass Deflectors" ,
      color       	:       "blue" ,
      prereqs             :       [],
      text		: 	"You may move through asteroid fields and gain -1 when receiving PDS fire",
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].antimass_deflectors == undefined) {
          imperium_self.game.players_info[player-1].antimass_deflectors = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "antimass-deflectors") {
          imperium_self.game.players_info[gainer-1].antimass_deflectors = 1;
          imperium_self.game.players_info[gainer-1].fly_through_asteroids = 1;
        }
      },
    });


    this.importTech("gravity-drive", {
      name                :       "Gravity Drive" ,
      color               :       "blue" ,
      prereqs             :       ["blue"],
      text		: 	"One ship may gain +1 movement when you activate a system" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].gravity_drive == undefined) {
          imperium_self.game.players_info[player-1].gravity_drive = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "gravity-drive") {
          imperium_self.game.players_info[gainer-1].gravity_drive = 1;
          imperium_self.game.players_info[gainer-1].ship_move_bonus = 1;
        }
      },
    });




    this.importTech("fleet-logistics", {
      name        	: 	"Fleet Logistics" ,
      color       	: 	"blue" ,
      prereqs     	:       ['blue','blue'],
      text		: 	"You may perform two actions in any turn" ,
      onNewRound : function(imperium_self, player) {
        imperium_self.game.players_info[player-1].fleet_logistics_turn = 0;
      },
      onNewTurn : function(imperium_self, player) {
        imperium_self.game.players_info[player-1].fleet_logistics_turn++;
      },
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].fleet_logistics == undefined) {
          imperium_self.game.players_info[player-1].fleet_logistics = 0;
          imperium_self.game.players_info[player-1].fleet_logistics_exhausted = 0;
          imperium_self.game.players_info[player-1].fleet_logistics_turn = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "fleet-logistics") {
          imperium_self.game.players_info[gainer-1].fleet_logistics = 1;
          imperium_self.game.players_info[gainer-1].fleet_logistics_exhausted = 0;
          imperium_self.game.players_info[gainer-1].perform_two_actions = 1;
        }
      },
      menuOption  :       function(imperium_self, menu, player) {
        if (menu == "main") {
          return { event : 'fleetlogistics', html : '<li class="option" id="fleetlogistics">use fleet logistics</li>' };
        }
        return {};
      },
      menuOptionTriggers:  function(imperium_self, menu, player) {
        if (menu == "main") {
	  if (imperium_self.game.players_info[player-1].fleet_logistics_exhausted == 0) {
	    if (imperium_self.game.players_info[player-1].fleet_logistics_turn < 2) {
	      if (imperium_self.game.players_info[player-1].fleet_logistics == 1) {
                return 1;
	      }
	    }
	  }
        }
        return 0;
      },
      menuOptionActivated:  function(imperium_self, menu, player) {
	if (menu == "main") {
  	  imperium_self.game.players_info[player-1].fleet_logistics_exhausted = 1;
          imperium_self.updateLog(imperium_self.returnFaction(player) + " exhausts Fleet Logistics");
          imperium_self.addMove("setvar\tplayers\t"+player+"\t"+"fleet_logistics_exhausted"+"\t"+"int"+"\t"+"1");
	  imperium_self.addMove("play\t"+player);
	  imperium_self.addMove("play\t"+player);
          imperium_self.addMove("notify\t"+player+" activates fleet logistics");
	  imperium_self.endTurn();
	  imperium_self.updateStatus("Activating Fleet Logistics");
        }
        return 0;
      }

    });


    this.importTech("lightwave-deflector", {
      name        	:       "Light/Wave Deflector" ,
      color       	:       "blue" ,
      prereqs     	:       ['blue','blue','blue'],
      text		:	"Your fleet may move through sectors with opponent ships" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].lightwave_deflector == undefined) {
          imperium_self.game.players_info[player-1].lightwave_deflector = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "lightwave-deflector") {
          imperium_self.game.players_info[gainer-1].lightwave_deflector = 1;
          imperium_self.game.players_info[gainer-1].move_through_sectors_with_opponent_ships = 1;
        }
      },
    });



    this.importTech("neural-motivator", {
      name        	:       "Neural Motivator" ,
      color       	:       "green" ,
      prereqs             :       [],
      text		:	"Gain an extra action card each turn" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].neural_motivator == undefined) {
          imperium_self.game.players_info[player-1].neural_motivator = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "neural-motivator") {
          imperium_self.game.players_info[gainer-1].neural_motivator = 1;
          imperium_self.game.players_info[gainer-1].action_cards_bonus_when_issued = 1;
        }
      },
    });


    this.importTech("dacxive-animators", {
      name                :       "Dacxive Animators" ,
      color               :       "green" ,
      prereqs             :       ["green"],
      text		:	"Place an extra infantry on any planet after winning a defensive ground combat tbere" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].dacxive_animators == undefined) {
          imperium_self.game.players_info[player-1].dacxive_animators = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "neural-motivator") {
          imperium_self.game.players_info[gainer-1].dacxive_animators = 1;
          imperium_self.game.players_info[gainer-1].action_cards_bonus_when_issued = 1;
        }
      },
      groundCombatRoundEnd : function(imperium_self, attacker, defender, sector, planet_idx) {
        let attacker_forces = imperium_self.returnNumberOfGroundForcesOnPlanet(attacker, sector, planet_idx);
        let defender_forces = imperium_self.returnNumberOfGroundForcesOnPlanet(defender, sector, planet_idx);
	if (imperium_self.doesPlayerHaveTech(attacker, "dacxive-animators")) {
	  if (attacker_forces > defender_forces && defender_forces == 0) {
	   imperium_self.addPlanetaryUnit(attacker, sector, planet_idx, "infantry");
	   imperium_self.updateLog(imperium_self.returnFaction(attacker) + " reinforces infantry with Dacxive Animators");
	  }
	}
	if (imperium_self.doesPlayerHaveTech(defender, "dacxive-animators")) {
	  if (attacker_forces < defender_forces && attacker_forces == 0) {
	   imperium_self.addPlanetaryUnit(defender, sector, planet_idx, "infantry");
	   imperium_self.updateLog(imperium_self.returnFaction(defender) + " reinforces infantry with Dacxive Animators");
	  }
	}
      },
    });


    this.importTech("hyper-metabolism", {
      name        	: 	"Hyper Metabolism" ,
      color       	: 	"green" ,
      prereqs     	:       ['green','green'],
      text		:	"Gain an extra command token each round" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].hyper_metabolism == undefined) {
          imperium_self.game.players_info[player-1].hyper_metabolism = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "hyper-metabolism") {
          imperium_self.game.players_info[gainer-1].hyper_metabolism = 1;
          imperium_self.game.players_info[gainer-1].new_tokens_bonus_when_issued = 1;
        }
      },
    });




    this.importTech("x89-bacterial-weapon", {
      name        	:       "X-89 Bacterial Weapon" ,
      color       	:       "green" ,
      prereqs     	:       ['green','green','green'],
      text		:	"Bombardment destroys all infantry on planet" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].x89_bacterial_weapon == undefined) {
          imperium_self.game.players_info[player-1].x89_bacterial_weapon = 0;
          imperium_self.game.players_info[gainer-1].x89_bacterial_weapon_exhausted = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "x89-bacterial-weapon") {
          imperium_self.game.players_info[gainer-1].x89_bacterial_weapon = 1;
          imperium_self.game.players_info[gainer-1].x89_bacterial_weapon_exhausted = 0;
        }
      },
      onNewRound : function(imperium_self, player) {
        imperium_self.game.players_info[player-1].x89_bacterial_weapon_exhausted = 0;
        return 1;
      },
      bombardmentTriggers : function(imperium_self, player, bombarding_player, sector) { 
	if (imperium_self.game.players_info[bombarding_player-1].x89_bacterial_weapon == 1 && imperium_self.game.players_info[bombarding_player-1].x89_bacterial_weapon_exhausted == 0) {
	  if (imperium_self.doesSectorContainPlayerUnit(bombarding_player, sector, "warsun") || imperium_self.doesSectorContainPlayerUnit(bombarding_player, sector, "dreadnaught")) { 
	    return 1;
 	  }
	}
	return 0;
      },
      bombardmentEvent : function(imperium_self, player, bombarding_player, sector, planet_idx) {

	if (imperium_self.game.player != bombarding_player) { return 0; }

        let sys = imperium_self.returnSectorAndPlanets(sector);
        let planet = sys.p[planet_idx];
	let html = '';

        html = '<p>Do you wish to use Bacterial Weapons during Bombardment?</p><ul>';
        html += '<li class="option textchoice" id="attack">use bacterial weapons?</li>';
        html += '<li class="option textchoice" id="skip">skip</li>';
        html += '</ul>';

	imperium_self.updateStatus(html);

        $('.textchoice').off();
        $('.textchoice').on('click', function() {

          let action2 = $(this).attr("id");

	  if (action2 == "attack") {

	    // destroy 100 == destroy them all :)
	    imperium_self.addMove("destroy_infantry_on_planet\t"+player+"\t"+sector+"\t"+planet_idx+"\t"+"100");
            imperium_self.addMove("setvar\tplayers\t"+player+"\t"+"x89_bacterial_weapon_exhausted"+"\t"+"int"+"\t"+"1");
	    imperium_self.addMove("notify\t" + imperium_self.returnFaction(player) + " uses Bacterial Weapons");
	    imperium_self.endTurn();
	  }
	  if (action2 == "skip") {
	    imperium_self.addMove("notify\t" + imperium_self.returnFaction(player) + " refrains from using Bacterial Weapons");
	    imperium_self.endTurn();
	  }
        });
	return 0;
      },
    });



    this.importTech("plasma-scoring", {
      name        	:       "Plasma Scoring" ,
      color       	:       "red" ,
      prereqs             :       [],
      text		:	"All PDS and bombardment fire gets +1 bonus shot" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].plasma_scoring == undefined) {
          imperium_self.game.players_info[player-1].plasma_scoring = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "graviton-laser-system") {
          imperium_self.game.players_info[gainer-1].plasma_scoring = 1;
	  imperium_self.game.players_info[gainer-1].pds_combat_roll_bonus_shots++;
        }
      },
      pdsSpaceDefenseTriggers : function(imperium_self, attacker, player, sector) {
	if (imperium_self.doesPlayerHaveTech(player, "plasma-scoring")) {
 	  if (imperium_self.doesPlayerHavePDSUnitsWithinRange(attacker, player, sector) == 1 && attacker != player) {
	    imperium_self.updateLog(imperium_self.returnFaction(player) + " gets +1 shot from Plasma Scoring");
	  }
	}
	//
	// we don't need the event, just the notification on trigger
	//
	return 0;
      },
    });




    this.importTech("magen-defense-grid", {
      name                :       "Magen Defense Grid" ,
      color               :       "red" ,
      text		:	"When ground combat begins on a planet with PDS or Space Dock, destroy one opponent infantry" ,
      prereqs             :       ["red"],

      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].magen_defense_grid == undefined) {
          imperium_self.game.players_info[player-1].magen_defense_grid = 0;
        }
      },
      onNewRound : function(imperium_self, player) {
        if (player == imperium_self.game.player) {
          imperium_self.game.players_info[player-1].magen_defense_grid = 1;
        }
        return 1;
      },
      groundCombatTriggers : function(imperium_self, player, sector, planet_idx) { 
	if (imperium_self.doesPlayerHaveTech(player, "magen-defense-grid")) {
	  let sys = imperium_self.returnSectorAndPlanets(sector);
	  let planet = sys.p[planet_idx];

          if (player == planet.owner) {
	    let non_infantry_units_on_planet = 0;
	    for (let i = 0; i < planet.units[player-1].length; i++) {
	      if (planet.units[player-1][i].type == "spacedock" || planet.units[player-1][i].type == "pds") {
		imperium_self.updateLog("Magan Defense Grid triggers on " + planet.name);
	        return 1;
	      }
	    }
	  }
	}
        return 0;
      },
      groundCombatEvent : function(imperium_self, player, sector, planet_idx) {

	let sys = imperium_self.returnSectorAndPlanets(sector);
	let planet = sys.p[planet_idx];

	for (let i = 0; i < planet.units.length; i++) {
	  if (planet.units[i] != (player-1)) {
	    for (let ii = 0; i < planet.units[i].length; ii++) {

	      let attacker_unit = planet.units[i][ii];
	      let attacker = (i+1);
	      let defender = player;

	      if (attacker_unit.type == "infantry") {
		imperium_self.assignHitsToGroundForces(attacker, defender, sector, planet_idx, 1);
                imperium_self.eliminateDestroyedUnitsInSector(attacker, sector);
                imperium_self.updateSectorGraphics(sector);
		imperium_self.updateLog(imperium_self.returnFaction(attacker) + " loses 1 infantry to Magan Defense Grid");
		ii = planet.units[i].length+3;
		i = planet.units.length+3;
	      }
	    }
	  }
	}
	return 1;
      }
    });




    this.importTech("duranium-armor", {
      name        	: 	"Duranium Armor" ,
      color       	: 	"red" ,
      prereqs     	:       ['red','red'],
      text		:	"Each round, you may epair any ship which has not taken damage this round" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].duranium_armor == undefined) {
          imperium_self.game.players_info[player-1].duranium_armor = 0;
          imperium_self.game.players_info[player-1].duranium_armor = 0;
        }
      },
      onNewRound : function(imperium_self, player, mycallback) {
        if (player == imperium_self.game.player) {
          imperium_self.game.players_info[player-1].duranium_armor = 1;
          imperium_self.game.players_info[player-1].may_repair_damaged_ships_after_space_combat = 1;
        }
        return 1;
      },
      spaceCombatRoundOver : function(imperium_self, attacker, defender, sector) {

	let sys = imperium_self.returnSectorAndPlanets(sector);

	if (imperium_self.doesPlayerHaveTech(attacker, "duranium-armor")) {
	  for (let i = 0; i < sys.s.units[attacker-1].length; i++) {
	    let this_unit = sys.s.units[attacker-1][i];
	    if (this_unit.last_round_damaged < imperium_self.game.state.space_combat_round) {
	      this_unit.strength = this_unit.max_strength;
	      imperium_self.updateLog(imperium_self.returnFaction(attacker) + " repairs ships with Duranium Armor");
	    }
	  }
        }

	if (imperium_self.doesPlayerHaveTech(defender, "duranium-armor")) {
	  for (let i = 0; i < sys.s.units[defender-1].length; i++) {
	    let this_unit = sys.s.units[defender-1][i];
	    if (this_unit.last_round_damaged < imperium_self.game.state.space_combat_round) {
	      this_unit.strength = this_unit.max_strength;
	      imperium_self.updateLog(imperium_self.returnFaction(defender) + " repairs ships with Duranium Armor");
	    }
	  }
        }

      },
    });




    this.importTech("assault-cannon", {
      name        	:       "Assault Cannon" ,
      color       	:       "red" ,
      prereqs     	:       ['red','red','red'],
      text		:	"If you have three or more capital ships in a sector, destroy one opponent capital ship" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].assault_cannont == undefined) {
          imperium_self.game.players_info[player-1].assault_cannont = 0;
        }
      },
      onNewRound : function(imperium_self, player, mycallback) {
        if (player == imperium_self.game.player) {
          imperium_self.game.players_info[player-1].assault_cannont = 1;
          imperium_self.game.players_info[player-1].may_assign_first_round_combat_shot = 1;
        }
        return 1;
      },
      spaceCombatTriggers :function(imperium_self, player, sector) {
	let sys = imperium_self.returnSectorAndPlanets(sector);

	for (let i = 0; i < sys.s.units.length; i++) {
	  if ((i+1) != player) {
	    if (imperium_self.doesPlayerHaveTech((i+1), "assault-cannon")) {
	      let capital_ships = 0;
	      for (let ii = 0; ii < sys.s.units[i].length; ii++) {
		let thisunit = sys.s.units[i][ii];
		if (thisunit.type == "destroyer") { capital_ships++; }
		if (thisunit.type == "carrier") { capital_ships++; }
		if (thisunit.type == "cruiser") { capital_ships++; }
		if (thisunit.type == "dreadnaught") { capital_ships++; }
		if (thisunit.type == "flagship") { capital_ships++; }
		if (thisunit.type == "warsun") { capital_ships++; }
	      }
	      if (capital_ships >= 3) {

		//
		// if I have an eligible ship
		//
	        for (let z = 0; z < sys.s.units[player-1].length; z++) {
		  let thisunit = sys.s.units[player-1][z];
		  if (thisunit.type == "destroyer") { return 1; }
		  if (thisunit.type == "carrier") { return 1; }
		  if (thisunit.type == "cruiser") { return 1; }
		  if (thisunit.type == "dreadnaught") { return 1; }
		  if (thisunit.type == "flagship") { return 1; }
		  if (thisunit.type == "warsun") { return 1; }
	        }
	        return 1;
	      }
	    }
	  }
	}

      },
      spaceCombatEvent : function(imperium_self, player, sector) {
	imperium_self.game.players_info[player-1].target_units = ['carrier','destroyer','cruiser','dreadnaught','flagship','warsun'];
	imperium_self.game.queue.push("destroy_ships\t"+player+"\t"+"3");
	return 1;
      },
    });




    this.importTech("sarween-tools", {
      name        	: 	"Sarween Tools" ,
      color       	: 	"yellow" ,
      text		:	"Reduce cost of units produced by -1 when using production",
      prereqs     	:       [],
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].sarween_tools == undefined) {
          imperium_self.game.players_info[player-1].sarween_tools = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "sarween-tools") {
          imperium_self.game.players_info[gainer-1].sarween_tools = 1;
          imperium_self.game.players_info[gainer-1].production_bonus = 1;
        }
      },
    });




    this.importTech("graviton-laser-system", {
      name        	:       "Graviton Laser System" ,
      color       	:       "yellow" ,
      text		:	"Exhaust card once per round to target capital ships with PDS fire" ,
      prereqs             :       ["yellow"],
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].graviton_laser_system == undefined) {
          imperium_self.game.players_info[player-1].graviton_laser_system = 0;
          imperium_self.game.players_info[player-1].graviton_laser_system_exhausted = 0;
          imperium_self.game.players_info[player-1].graviton_laser_system_active = 0;
        }
      },
      onNewRound : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].graviton_laser_system == 1) {
          imperium_self.game.players_info[player-1].graviton_laser_system_exhausted = 0;
          imperium_self.game.players_info[player-1].graviton_laser_system_active = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "graviton-laser-system") {
          imperium_self.game.players_info[gainer-1].graviton_laser_system = 1;
          imperium_self.game.players_info[gainer-1].graviton_laser_system_exhausted = 0;
        }
      },
      modifyTargets(imperium_self, attacker, defender, player, combat_type="", targets=[]) {
        if (combat_type == "pds") {
	  //
	  // defenders in PDS are the ones with this enabled
	  //
          if (imperium_self.game.players_info[defender-1].graviton_laser_system_active == 1) {
	    if (!targets.include("warsun")) { targets.push("warsun"); }
	    if (!targets.include("flagship")) { targets.push("flagship"); }
	    if (!targets.include("dreadnaught")) { targets.push("dreadnaught"); }
	    if (!targets.include("cruiser")) { targets.push("cruiser"); }
	    if (!targets.include("carrier")) { targets.push("carrier"); }
	    if (!targets.include("destroyer")) { targets.push("destroyer"); }
          }
        }
	return targets;
      },
      menuOption  :       function(imperium_self, menu, player) {
	if (menu == "pds") {
          return { event : 'graviton', html : '<li class="option" id="graviton">use graviton laser targetting</li>' };
        }
        return {};
      },
      menuOptionTriggers:  function(imperium_self, menu, player) { 
	if (menu == "pds" && imperium_self.game.players_info[player-1].graviton_laser_system_exhausted == 0 && imperium_self.game.players_info[player-1].graviton_laser_system == 1) {
	  return 1;
	}
        return 0;
      },
      menuOptionActivated:  function(imperium_self, menu, player) {
        if (menu == "pds") {
	  imperium_self.updateLog(imperium_self.returnFaction(player) + " exhausts Graviton Laser System");
          imperium_self.game.players_info[player-1].graviton_laser_system_exhausted = 1;
          imperium_self.game.players_info[player-1].graviton_laser_system_active = 1;
          imperium_self.addMove("setvar\tplayers\t"+player+"\t"+"graviton_laser_system_exhausted"+"\t"+"int"+"\t"+"1");
          imperium_self.addMove("setvar\tplayers\t"+player+"\t"+"graviton_laser_system_active"+"\t"+"int"+"\t"+"1");
          imperium_self.addMove("notify\t"+player+" activates graviton_laser_system");
	}
	return 0;
      }
    });






    this.importTech("transit-diodes", {
      name                :       "Transit Diodes" ,
      color               :       "yellow" ,
      prereqs             :       ["yellow", "yellow"],
      text		:	"Exhaust to reallocate 4 infantry between planets your control" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].transit_diodes == undefined) {
          imperium_self.game.players_info[player-1].transit_diodes = 0;
          imperium_self.game.players_info[player-1].transit_diodes_exhausted = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "transit-diodes") {
          imperium_self.game.players_info[gainer-1].transit_diodes = 1;
          imperium_self.game.players_info[gainer-1].transit_diodes_exhausted = 0;
        }
      },
      menuOption  :       function(imperium_self, menu, player) {
	if (menu == "main") {
          return { event : 'transitdiodes', html : '<li class="option" id="transitdiodes">use transit diodes</li>' };
        }
        return {};
      },
      menuOptionTriggers:  function(imperium_self, menu, player) { 
	if (menu == "main" && imperium_self.doesPlayerHaveTech(player, "transit-diodes")) {
	  return 1;
	}
        return 0;
      },
      menuOptionActivated:  function(imperium_self, menu, player) {
        if (menu == "main") {
	  imperium_self.playerRemoveInfantryFromPlanets(player, 4, function(num_to_add) {
	    imperium_self.playerAddInfantryToPlanets(player, num_to_add, function() {
              imperium_self.addMove("setvar\tplayers\t"+player+"\t"+"transit_diodes_exhausted"+"\t"+"int"+"\t"+"1");
              imperium_self.addMove("notify\t"+player+" activates transit diodes");
	      imperium_self.addMove("notify\t"+imperium_self.returnFaction(player) + " has moved infantry");
	      imperium_self.endTurn();
	    });	    
	  });
	}
	return 0;
      }
    });




    this.importTech("integrated-economy", {
      name        	:       "Integrated Economy" ,
      color       	:       "yellow" ,
      prereqs     	:       ['yellow','yellow','yellow'],
      text		:	"You may produce on a planet after capturing it, up to cost (resource) limit of planet." ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].integrated_economy == undefined) {
          imperium_self.game.players_info[player-1].integrated_economy = 0;
          imperium_self.game.players_info[player-1].integrated_economy_planet_invaded = 0;
          imperium_self.game.players_info[player-1].integrated_economy_planet_invaded_resources = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "integrated-economy") {
          imperium_self.game.players_info[gainer-1].integrated_economy = 1;
          imperium_self.game.players_info[gainer-1].integrated_economy_planet_invaded = 0;
          imperium_self.game.players_info[gainer-1].integrated_economy_planet_invaded_resources = 0;
        }
      },
      gainPlanet : function(imperium_self, gainer, planet) {
        if (imperium_self.doesPlayerHaveTech(gainer, "integrated-economy")) {
          imperium_self.game.players_info[gainer-1].may_player_produce_without_spacedock = 1;
          imperium_self.game.players_info[gainer-1].may_player_produce_without_spacedock_production_limit = 0;
console.log("P: " + planet);
          imperium_self.game.players_info[gainer-1].may_player_produce_without_spacedock_cost_limit += imperium_self.game.planets[planet].resources;
        }
      },
    });




    this.importUnit("infantry", {
      name     		:       "Infantry",
      type     		:       "infantry",
      cost 		:	0.5,
      combat 		:	1,
      strength 		:	1,
      space		:	0,
      ground		:	1,
      can_be_stored	:	1,
      capacity_required :	1
    });

    this.importUnit("fighter", {
      name     		:       "Fighter",
      type     		:       "fighter",
      cost 		:	0.5,
      move 		:	1,
      combat 		:	9,
      strength 		:	1,
      can_be_stored	:	1,
      capacity_required :	1
    });

    this.importUnit("pds", {
      name     		:       "PDS",
      type     		:       "pds",
      range 		:	0,
      cost 		:	5,
      combat 		:	6
    });

    this.importUnit("spacedock", {
      name     		:       "Spacedock",
      type     		:       "spacedock",
      capacity 		:	3,
      production 	:	2,
      combat      : 0,
      range       :0
    });
    
    this.importUnit("carrier", {
      name     		:       "Carrier",
      type     		:       "carrier",
      cost 		:	3,
      move 		:	1,
      combat 		:	9,
      capacity 		:	4,
      strength 		:	1
    });

    this.importUnit("destroyer", {
      name     		:       "Destroyer",
      type     		:       "destroyer",
      cost 		:	1,
      move 		:	2,
      combat 		:	9,
      strength 		:	1
    });

    this.importUnit("cruiser", {
      name     		:       "Cruiser",
      type     		:       "cruiser",
      cost 		:	2,
      move 		:	2,
      combat 		:	7,
      strength 		:	1
    });

    this.importUnit("dreadnaught", {
      name     		:       "Dreadnaught",
      type     		:       "dreadnaught",
      cost 		:	4,
      move 		:	1,
      capacity 		:	1,
      combat 		:	6,
      strength 		:	2,
      bombardment_rolls	:	1,
      bombardment_combat:	5
    });

    this.importUnit("flagship", {
      name     		:       "Flagship",
      type     		:       "flagship",
      cost 		:	8,
      move 		:	2,
      capacity 		:	1,
      combat 		:	7,
      strength 		:	2
    });

    this.importUnit("warsun", {
      name     		:       "War Sun",
      type     		:       "warsun",
      cost 		:	12,
      move 		:	1,
      capacity 		:	6,
      combat 		:	3,
      strength 		:	2,
      bombardment_rolls	:	3,
      bombardment_combat:	3
    });

  
    this.importUnit("infantry-ii", {
      name     		:       "Infantry II",
      type     		:       "infantry",
      cost 		:	0.5,
      combat 		:	8,
      strength 		:	1,
      space		:	0,
      ground		:	1,
      can_be_stored	:	1,
      capacity_required :	1,
      extension : 1
    });

    this.importUnit("fighter-ii", {
      name     		:       "Fighter II",
      type     		:       "fighter",
      cost 		:	0.5,
      move 		:	2,
      combat 		:	8,
      strength 		:	1,
      can_be_stored	:	1,
      capacity_required :	1,
      extension : 1
      
    });

    this.importUnit("spacedock-ii", {
      name     		:       "Spacedock II",
      type     		:       "spacedock",
      capacity 		:	5,
      production 	:	4,
      extension : 1
    });

    this.importUnit("pds-ii", {
      name     		:       "PDS II",
      type     		:       "pds",
      cost 		:	5,
      combat 		:	6,
      range		:	2,
      extension : 1
    });

    this.importUnit("carrier-ii", {
      name     		:       "Carrier II",
      type     		:       "carrier",
      cost 		:	3,
      move 		:	2,
      combat 		:	9,
      capacity 		:	6,
      strength 		:	1,
      extension : 1
    });

    this.importUnit("destroyer-ii", {
      name     		:       "Destroyer II",
      type     		:       "destroyer",
      cost 		:	1,
      move 		:	2,
      combat 		:	8,
      strength 		:	1,
      extension : 1
    });

    this.importUnit("cruiser-ii", {
      name     		:       "Cruiser II",
      type     		:       "cruiser",
      cost 		:	2,
      move 		:	2,
      combat 		:	7,
      strength 		:	1,
      extension : 1
    });

    this.importUnit("dreadnaught-ii", {
      name     		:       "Dreadnaught II",
      type     		:       "dreadnaught",
      cost 		:	4,
      move 		:	2,
      capacity 		:	1,
      combat 		:	5,
      strength 		:	2,
      extension : 1
    });




 

    this.importFaction('faction2', {
      name		: 	"Universities of Jol Nar",
      homeworld		: 	"sector50",
      space_units	: 	["carrier","carrier","dreadnaught","fighter"],
      ground_units	: 	["infantry","infantry","pds","spacedock"],
      //tech		: 	["sarween-tools","graviton-laser-system", "transit-diodes", "integrated-economy", "neural-motivator","dacxive-animators","hyper-metabolism","x89-bacterial-weapon","plasma-scoring","magen-defense-grid","duranium-armor","assault-cannon","antimass-deflectors","gravity-drive","fleet-logistics","lightwave-deflector","faction2-analytic","faction2-brilliant","faction2-fragile","faction2-deep-space-conduits","faction2-eres-siphons"],
      tech		: 	["sarween-tools", "neural-motivator", "plasma-scoring", "antimass-deflectors", "faction2-analytic", "faction2-brilliant", "faction2-fragile"],
      background	: 	'faction2.jpg'
    });



    this.importTech('faction2-analytic', {

      name        :       "Analytic" ,
      faction     :       "faction2",
      type        :       "ability" ,
      onNewRound     :    function(imperium_self, player) {
        if (imperium_self.doesPlayerHaveTech(player, "faction2-analytic")) {
          imperium_self.game.players_info[player-1].permanent_ignore_number_of_tech_prerequisites_on_nonunit_upgrade = 1;
        }
      },

    });


    this.importTech('faction2-fragile', {

      name        :       "Fragile" ,
      faction     :       "faction2",
      type        :       "ability" ,
      onNewRound     :    function(imperium_self, player) {
        if (imperium_self.doesPlayerHaveTech(player, "faction2-analytic")) {
          imperium_self.game.players_info[player-1].permanent_ignore_number_of_tech_prerequisites_on_nonunit_upgrade = 1;
        }
      },
      modifyCombatRoll :	  function(imperium_self, attacker, defender, player, combat_type, roll) {

	if (combat_type == "pds") {
          if (imperium_self.doesPlayerHaveTech(attacker, "faction2-fragile")) {
  	    imperium_self.updateLog("Jol Nar combat roll adjusted to -1 due to faction limitation");
	    roll -= 1;
	    if (roll < 1) { roll = 1; }
	  }
        }

	return roll;

      },

    });
    this.importTech('faction2-brilliant', {
      name        :       "Brilliant" ,
      faction     :       "faction2",
      type        :       "ability" ,
      initialize     :    function(imperium_self, player) {
	imperium_self.strategy_cards["technology"].strategySecondaryEvent = function(imperium_self, player, strategy_card_player) {
          imperium_self.playerAcknowledgeNotice("You will first have the option of researching a free-technology, and then invited to purchase an additional tech for 6 resources:", function() {
            imperium_self.playerResearchTechnology(function(tech) {
              //imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.addMove("purchase\t"+player+"\ttechnology\t"+tech);
              imperium_self.endTurn();
            });
          });
	}
      }
    });



    this.importTech('faction2-eres-siphons', {
      name        :       "E-Res Siphons" ,
      faction     :       "faction2",
      type        :       "special" ,
      prereqs	:	["yellow","yellow"],
      initialize  :	  function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].eres_siphons == null) {
          imperium_self.game.players_info[player-1].eres_siphons = 0;
	}
      },
      gainTechnology : function(imperium_self, gainer, tech) {
	if (tech == "faction2-eres-siphons") {
          imperium_self.game.players_info[gainer-1].eres_siphons = 1;
        }
      },
      activateSystemTriggers :    function(imperium_self, activating_player, player, sector) {
	if (imperium_self.game.players_info[player-1].eres_siphons == 1 && activating_player != player) {
          if (imperium_self.doesSectorContainPlayerShips(player, sector) == 1) { return 1; }
	}
        return 0;
      },
      postSystemActivation :   function(imperium_self, activating_player, player, sector) {
        imperium_self.game.players_info[player-1].goods += 4;
      }
    });



    this.importTech('faction2-deep-space-conduits', {
      name        :       "Deep Space Conduits" ,
      faction     :       "faction2",
      type        :       "special" ,
      prereqs	:	["blue","blue"],
      initialize  :	  function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].deep_space_conduits == null) {
          imperium_self.game.players_info[player-1].deep_space_conduits = 0;
          imperium_self.game.players_info[player-1].deep_space_conduits_exhausted = 0;
	}
      },
      onNewRound : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].deep_space_conduits == 1) {
          imperium_self.game.players_info[player-1].deep_space_conduits_exhausted = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
	if (tech == "faction2-deep-space-conduits") {
          imperium_self.game.players_info[gainer-1].deep_space_conduits = 1;
          imperium_self.game.players_info[gainer-1].deep_space_conduits_exhausted = 0;
        }
      },
      activateSystemTriggers : function(imperium_self, activating_player, player, sector) { 
	if (player == imperium_self.game.player && activating_player == player) {
	  if (imperium_self.game.players_info[activating_player-1].deep_space_conduits == 1 && imperium_self.game.players_info[activating_player-1].deep_space_conduits_exhausted == 0) {
	    if (imperium_self.doesSectorContainPlayerUnits(activating_player, sector)) {
	      return 1;
	    }
	  }
	}
	return 0;
      },
      activateSystemEvent : function(imperium_self, activating_player, player, sector) { 

	let html = 'Do you wish to activate Deep Space Conduits: <ul>';
	html    += '<li class="textchoice" id="yes">activate</li>';
	html    += '<li class="textchoice" id="no">skip</li>';
	html    += '</ul>';

	imperium_self.updateStatus(html);

	$('.textchoice').off();
	$('.textchoice').on('click', function() {

	  let action = $(this).attr("id");

	  if (action == "yes") {
	    let sectors = imperium_self.returnSectorsWithPlayerUnits(activating_player);
	    imperium_self.game.players_info[activating_player-1].deep_space_conduits_exhausted = 1;
            imperium_self.addMove("setvar\tplayers\t"+player+"\t"+"deep_space_conduits_exhausted"+"\t"+"int"+"\t"+"1");
	    for (let i = 0; i < sectors.length; i++) {
	      imperium_self.addMove("adjacency\ttemporary\t"+sectors[i]+"\t"+sector);
	    }
	    imperium_self.endTurn();
	  }

	  if (action == "no") {
	    imperium_self.updateStatus();
	    imperium_self.endTurn();
	  }

	});
      }
    });





    this.importFaction('faction1', {
      name		: 	"Federation of Sol",
      homeworld		: 	"sector52",
      space_units	:	["carrier","carrier","destroyer","fighter","fighter","fighter","warsun"],
      ground_units	:	["infantry","infantry","infantry","infantry","infantry","spacedock"],
//      tech		:	["sarween-tools","graviton-laser-system", "transit-diodes", "integrated-economy", "neural-motivator","dacxive-animators","hyper-metabolism","x89-bacterial-weapon","plasma-scoring","magen-defense-grid","duranium-armor","assault-cannon","antimass-deflectors","gravity-drive","fleet-logistics","lightwave-deflector","faction1-orbital-drop","faction1-versatile", "faction1-advanced-carrier-ii", "faction1-advanced-infantry-ii"],
      tech		:	["neural-motivator","antimass-deflectors", "faction1-orbital-drop", "faction1-versatile"],
      background	: 	"faction1.jpg"
    });
 
    this.importTech("faction1-orbital-drop", {

      name        :       "Orbital Drop" ,
      faction     :       "faction1",
      type	:	"ability" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].orbital_drop == undefined) {
          imperium_self.game.players_info[player-1].orbital_drop = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "faction1-orbital-drop") {
          imperium_self.game.players_info[gainer-1].orbital_drop = 1;
        }
      },
      menuOption  :       function(imperium_self, player) {
        let x = {};
            x.trigger = 'orbitaldrop';
            x.html = '<li class="option" id="orbitaldrop">orbital drop</li>';
        return x;
      },
      menuOptionTrigger:  function(imperium_self, player) { return 1; },
      menuOptionActivated:  function(imperium_self, player) {

	if (imperium_self.game.player == player) {
	
          imperium_self.playerSelectPlanetWithFilter(
            "Use Orbital Drop to reinforce which planet with two infantry: " ,
            function(planet) {
	      if (imperium_self.game.planets[planet].owner == imperium_self.game.player) { return 1; } return 0;
            },
            function(planet) {
              planet = imperium_self.game.planets[planet];
              imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+"1"+"\t"+planet.idx+"\t"+"infantry"+"\t"+planet.sector);
              imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+"1"+"\t"+planet.idx+"\t"+"infantry"+"\t"+planet.sector);
              imperium_self.addMove("expend\t"+imperium_self.game.player+"\t"+"strategy"+"\t"+"1");
              imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " deploys three infantry to " + planet.name);
              imperium_self.endTurn();
              return 0;
            },
	    null
	  );
	  return 0;
        };
      }
    });

    this.importTech("faction1-versatile", {

      name        :       "Versatile" ,
      faction     :       "faction1",
      type        :       "ability" ,
      onNewRound     :    function(imperium_self, player) {
        imperium_self.game.players_info[player-1].new_tokens_per_round = 3;
      },

    });


    this.importTech("faction1-advanced-carrier-ii", {

      name        :       "Advanced Carrier II" ,
      faction     :       "faction1",
      replaces    :       "carrier-ii",
      unit        :       1 ,
      type	:	"special",
      prereqs     :       ["blue","blue"],
      initialize :       function(imperium_self, player) {
	imperium_self.game.players_info[player-1].faction1_advanced_carrier_ii = 0;
      },
      gainTechnology :       function(imperium_self, gainer, tech) {
	imperium_self.game.players_info[gainer-1].faction1_advanced_carrier_ii = 1;
      },
      upgradeUnit :       function(imperium_self, player, unit) {

	if (imperium_self.game.players_info[unit.owner-1].faction1_advanced_carrier_ii == 1 && unit.type == "carrier") {
          unit.cost = 3;
          unit.combat = 9;
          unit.move = 2;
          unit.capacity = 8;
        }

        return unit;
      },

    });


    this.importTech("faction1-advanced-infantry-ii", {

      name        :       "Special Ops II" ,
      faction     :       "faction1",
      replaces    :       "infantry-ii",
      unit        :       1 ,
      type	:	"special",
      prereqs     :       ["green","green"],
      initialize :       function(imperium_self, player) {
	imperium_self.game.players_info[player-1].faction1_advanced_infantry_ii = 0;
      },
      gainTechnology :       function(imperium_self, gainer, tech) {
	imperium_self.game.players_info[gainer-1].faction1_advanced_infantry_ii = 1;
      },
      upgradeUnit :       function(imperium_self, player, unit) {

	if (imperium_self.game.players_info[unit.owner-1].faction1_advanced_infantry_ii == 1 && unit.type == "infantry") {
          unit.cost = 0.5;
          unit.combat = 6;
        }

        return unit;
      },

    });




    this.importFaction('faction3', {
      name		: 	"XXCha Kingdom",
      homeworld		: 	"sector51",
      space_units	: 	["carrier","cruiser","cruiser","fighter","fighter","fighter"],
      ground_units	: 	["infantry","infantry","infantry","infantry","pds","spacedock"],
//      tech		: 	["sarween-tools","graviton-laser-system", "transit-diodes", "integrated-economy", "neural-motivator","dacxive-animators","hyper-metabolism","x89-bacterial-weapon","plasma-scoring","magen-defense-grid","duranium-armor","assault-cannon","antimass-deflectors","gravity-drive","fleet-logistics","lightwave-deflector", "faction3-field-nullification", "faction3-peace-accords", "faction3-quash", "faction3-instinct-training"],
      tech		: 	["graviton-laser-system","faction3-peace-accords","faction3-quash"],
      background	: 'faction3.jpg'
    });
  





    this.importTech('faction3-peace-accords', {

      name        :       "Peace Accords" ,
      faction     :       "faction3",
      type        :       "ability",
      initialize  : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].peace_accords == undefined) {
          imperium_self.game.players_info[player-1].peace_accords = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "faction3-peace-accords") {
          imperium_self.game.players_info[gainer-1].peace_accords = 1;
        }
      },
      strategyCardAfterTriggers : function(imperium_self, player, strategy_card_player, card) {
	if (imperium_self.game.players_info[player-1].peace_accords == 1) { return 1; }
	return 0;
      },
      strategyCardAfterEvent : function(imperium_self, player, strategy_card_player, card) {

	if (card == "diplomacy") {

	  let pcs = imperium_self.returnPlayerPlanetCards(player);
	  let sectors = [];
	  let adjacent_sectors = [];
	  let seizable_planets = [];

	  for (let i = 0; i < pcs.length; i++) {
	    if (!sectors.includes(imperium_self.game.planets[pcs[i]].sector)) {
	      sectors.push(imperium_self.game.planets[pcs[i]].sector);
	      adjacent_sectors.push(imperium_self.game.planets[pcs[i]].sector);
	    }
	  }


console.log("SECTORS: " + JSON.stringify(sectors));

	  //
	  // get all planets adjacent to...
	  //
	  for (let i = 0; i < sectors.length; i++) {
	    let as = imperium_self.returnAdjacentSectors(sectors[i]);
	    for (let z = 0; z < as.length; z++) {
	      if (!adjacent_sectors.includes(as[z])) { adjacent_sectors.push(as[z]); }
	    }
    	  }

console.log("ADJACENT SECTORS: " + JSON.stringify(adjacent_sectors));

	  //
	  // get all planets I don't control in those sectors
	  //
	  for (let b = 0; b < adjacent_sectors.length; b++) {
	    let sys = imperium_self.returnSectorAndPlanets(adjacent_sectors[b]);
	    if (sys.p) {
	      for (let y = 0; y < sys.p.length; y++) {
	        let planet_uncontrolled = 0;
	        if (sys.p[y].owner != player) {
		  if (!imperium_self.doesPlanetHaveUnits(sys.p[y])) {
	  	    seizable_planets.push(sys.p[y].planet);
console.log("can seize: " + sys.p[y].planet + " in " + adjacent_sectors[b]);
	          }
	        }
	      }
	    }
	  }

	  //
	  //
	  //
	  if (seizable_planets.length < 0) { 
	    return 1;
	  }



	  if (imperium_self.game.players_info[player-1].peace_accords == 1) {
	    if (imperium_self.game.player == player) {

console.log("SEIZE: " + JSON.stringify(seizable_planets));

              imperium_self.playerSelectPlanetWithFilter(
                "Select a planet to annex via Peace Accords: " ,
                function(planet) {
	  	  if (seizable_planets.includes(planet)) { return 1; } return 0;
                },
                function(planet) {
                  imperium_self.addMove("annex\t"+imperium_self.game.player+"\t"+imperium_self.game.planets[planet].sector+"\t"+imperium_self.game.planets[planet].idx);
                  imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " annexes " + imperium_self.game.planets[planet].name + " via Peace Accords");
	    	  imperium_self.endTurn();
                  return 0;
                },
                null
              );
            }
            return 0;
          }

	  return 1;
	}

	return 1;
      }
    });




    this.importTech('faction3-quash', {
      name        :       "Quash" ,
      faction     :       "faction3",
      type        :       "ability" ,
      initialize : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].quash == undefined) {
          imperium_self.game.players_info[player-1].quash = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "faction3-quash") {
          imperium_self.game.players_info[gainer-1].quash = 1;
        }
      },
      menuOption  :       function(imperium_self, player) {
        let x = {};
            x.trigger = 'quash';
            x.html = '<li class="option" id="quash">quash agenda</li>';
        return x;
      },
      menuOptionTrigger:  function(imperium_self, player) { return 1; },
      menuOptionActivated:  function(imperium_self, player) {

        if (imperium_self.game.player == player) {

          let html = '';
          html += 'Select one agenda to quash in the Galactic Senate.<ul>';
          for (i = 0; i < 3; i++) {
            html += '<li class="option" id="'+imperium_self.game.state.agendas[i]+'">' + laws[imperium_self.game.state.agendas[i]].name + '</li>';
          }
          html += '</ul>';

          imperium_self.updateStatus(html);

          $('.option').off();
          $('.option').on('mouseenter', function() { let s = $(this).attr("id"); imperium_self.showAgendaCard(imperium_self.game.state.agendas[s]); });
          $('.option').on('mouseleave', function() { let s = $(this).attr("id"); imperium_self.hideAgendaCard(imperium_self.game.state.agendas[s]); });
          $('.option').on('click', function() {

             let agenda_to_quash = $(this).attr('id');
	     imperium_self.updateStatus("Quashing Agenda");

             imperium_self.addMove("expend\t"+imperium_self.game.player+"\t"+"strategy"+"\t"+"1");
             imperium_self.addMove("quash\t"+agenda_to_quash+"\t"+"1"); // 1 = re-deal
	     imperium_self.endTurn();
	  });
	}
      }
    });




    this.importTech('faction3-instinct-training', {
      name        :       "Instinct Training" ,
      faction     :       "faction3",
      prereqs	:	["green"] ,
      type        :       "special" ,
      initialize  :	  function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].instinct_training == null) {
          imperium_self.game.players_info[player-1].instinct_training = 0;
	}
      },
      gainTechnology : function(imperium_self, gainer, tech) {
	if (tech == "faction3-instinct-training") {
          imperium_self.game.players_info[gainer-1].instinct_training = 1;
        }
      },
      playActionCardTriggers : function(imperium_self, player, action_card_player, card) {
        if (imperium_self.game.players_info[player-1].instinct_training == 1) { return 1; }
	return 0;
      },
      playActionCardEvent : function(imperium_self, player, action_card_player, card) {

        if (imperium_self.game.player == player) {
          // remove previous action card
          imperium_self.addMove("resolve\t"+"action_card");
          imperium_self.addMove("resolve\t"+"action_card_post");
          imperium_self.addMove("expend\t"+imperium_self.game.player+"strategy"+"1");
	  imperium_self.endTurn();
        }

	return 0;

      },
    });

    this.importTech('faction3-field-nullification', {

      name        :       "Nullification Fields" ,
      faction     :       "faction3",
      type        :       "special" ,
      prereqs	:	["yellow","yellow"] ,
      initialize  : function(imperium_self, player) {
        if (imperium_self.game.players_info[player-1].field_nullification == undefined) {
          imperium_self.game.players_info[player-1].field_nullification = 0;
        }
      },
      gainTechnology : function(imperium_self, gainer, tech) {
        if (tech == "faction3-field-nullification") {
          imperium_self.game.players_info[gainer-1].field_nullification = 1;
        }
      },
      activateSystemTriggers : function(imperium_self, activating_player, player, sector) {
	if (imperium_self.doesSectorContainPlayerShips(imperium_self.game.player, sector)) { return 1; }
	return 0;
      },
      activateSystemEvent : function(imperium_self, activating_player, player, sector) {
	let html = 'Do you wish to use Field Nullification to terminate this player\'s turn? <ul>';
	html += '<li class="textchoice" id="yes">activate nullification field</li>';
	html += '<li class="textchoice" id="no">do not activate</li>';
	html += '</ul>';

	$('.textchoice').off();
	$('.textchoice').on('click', function() {

	  let choice = $(this).attr("id");

	  if (choice == "yes") {
	    imperium_self.endTurn();
	  }
	  if (choice == "no") {
	    imperium_self.endTurn();
	  }
	});
	return 0;
      }
    });




    this.importStrategyCard("construction", {
      name     			:       "Construction",
      rank			:	4,
      img			:	"/imperium/img/strategy/BUILD.png",
      text			:	"Player builds PDS or Space dock on planet they control, and additional PDS on a second planet. Other players may spend a strategy token and activate sector to build PDS or Space Dock in it." ,
      strategyPrimaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player == strategy_card_player) {
          imperium_self.addMove("resolve\tstrategy");
          imperium_self.addMove("strategy\t"+"construction"+"\t"+strategy_card_player+"\t2");
          imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
          imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);
	  imperium_self.playerAcknowledgeNotice("You have played Construction. First you will have the option of producing a PDS or Space Dock. Then you will have the option of producing an additional PDS if you so choose.", function() {
            imperium_self.playerBuildInfrastructure(() => {
              imperium_self.playerBuildInfrastructure(() => {
                imperium_self.endTurn();
              }, 2);
            }, 1);
          });
        }

      },


      strategySecondaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player != strategy_card_player && imperium_self.game.player == player) {

          let html = '<p>Construction has been played. Do you wish to spend 1 strategy token to build a PDS or Space Dock? </p><ul>';
          html += '<li class="option" id="yes">Yes</li>';
          html += '<li class="option" id="no">No</li>';
          html += '</ul>';
 
          imperium_self.updateStatus(html);
 
          $('.option').off();
          $('.option').on('click', function() {
 
            let id = $(this).attr("id");
 
            if (id == "yes") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.addMove("expend\t"+imperium_self.game.player+"\tstrategy\t1");
              imperium_self.playerBuildInfrastructure(() => {
                imperium_self.endTurn();
              }, 1);
            }
            if (id == "no") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.endTurn();
              return 0;
            }
          });
        }
      },
    });




    this.importStrategyCard("diplomacy", {
      name     			:       "Diplomacy",
      rank			:	2,
      img			:	"/imperium/img/strategy/DIPLOMACY.png",
      text			:	"Player selects a sector other than New Byzantium: that sector is activated for all other players and any planets in that sector are refreshed. Other players may spend a strategy token to refresh two planets." ,
      strategyPrimaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player == strategy_card_player) {

	  let chosen = 0;

          imperium_self.updateStatus('Select sector to quagmire in diplomatic negotiations, and refresh any planets in that system: ');
          imperium_self.playerSelectSector(function(sector) {

	    if (chosen == 0) {

              imperium_self.addMove("resolve\tstrategy");
              imperium_self.addMove("strategy\t"+"diplomacy"+"\t"+strategy_card_player+"\t2");
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);
              for (let i = 0; i < imperium_self.game.players_info.length; i++) {
                imperium_self.addMove("activate\t"+(i+1)+"\t"+sector);
              }

              //
              // re-activate any planets in that system
              //
              let sys = imperium_self.returnSectorAndPlanets(sector);
	      if (sys.p) {
                for (let i = 0; i < sys.p.length; i++) {
                  if (sys.p[i].owner == imperium_self.game.player) {
		    for (let p in imperium_self.game.planets) {
		      if (sys.p[i] == imperium_self.game.planets[p]) {
                        imperium_self.addMove("unexhaust\t"+imperium_self.game.player+"\t"+"planet"+"\t"+p);
		      }
		    }
                  }
                }
	      }
              imperium_self.saveSystemAndPlanets(sys);
              imperium_self.endTurn();
	    }
          });
        }
	return 0;

      },

      strategySecondaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player != strategy_card_player && imperium_self.game.player == player) {

          let html = '<p>Do you wish to spend 1 strategy token to unexhaust two planet cards? </p><ul>';
          html += '<li class="option" id="yes">Yes</li>';
          html += '<li class="option" id="no">No</li>';
          html += '</ul>';
          imperium_self.updateStatus(html);

          $('.option').off();
          $('.option').on('click', function() {

            let id = $(this).attr("id");

            if (id == "yes") {

              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              let array_of_cards = imperium_self.returnPlayerExhaustedPlanetCards(imperium_self.game.player); // unexhausted

              let choices_selected = 0;
              let max_choices = 0;

              let html  = "<p>Select planets to unexhaust: </p><ul>";
              let divname = ".cardchoice";
              for (let z = 0; z < array_of_cards.length; z++) {
                max_choices++;
                html += '<li class="cardchoice" id="cardchoice_'+array_of_cards[z]+'">' + imperium_self.returnPlanetCard(array_of_cards[z]) + '</li>';
              }
              if (max_choices == 0) {
                html += '<li class="textchoice" id="cancel">cancel (no options)</li>';
                divname = ".textchoice";
              }
              html += '</ul>';
              if (max_choices >= 2) { max_choices = 2; }

              imperium_self.updateStatus(html);

              $(divname).off();
              $(divname).on('click', function() {

                let action2 = $(this).attr("id");

                if (action2 === "cancel") {
                  imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
                  imperium_self.endTurn();
                  return;
                }

                let tmpx = action2.split("_");
                let divid = "#"+action2;
                let y = tmpx[1];
                let idx = 0;
                for (let i = 0; i < array_of_cards.length; i++) {
                  if (array_of_cards[i] === y) {
                    idx = i;
                  }
                }

                choices_selected++;
                imperium_self.addMove("unexhaust\t"+imperium_self.game.player+"\tplanet\t"+array_of_cards[idx]);

                $(divid).off();
                $(divid).css('opacity','0.3');

                if (choices_selected >= max_choices) {
                  imperium_self.endTurn();
                }

              });
            }

            if (id == "no") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.endTurn();
              return 0;
            }

          });

        } else {
          imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
          imperium_self.endTurn();
          return 0;
        }

      },
    });



    this.importStrategyCard("imperial", {
      name     			:       "Imperial",
      rank			:	8,
      img			:	"/imperium/img/strategy/EMPIRE.png",
      text			:	"The player of this card may score a public objective. All players then go around in Initiative Order and score secret and public objectives" ,
      strategyPrimaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        imperium_self.game.state.round_scoring = 1;

        if (imperium_self.game.player == strategy_card_player) {

	  let supplementary_scoring = function() {
  	    imperium_self.playerAcknowledgeNotice("You will first be asked to score your public objective. The game will then precede and allow all players (including you) to score additional objectives in initiative order.", function() {
              imperium_self.addMove("resolve\tstrategy");
              imperium_self.playerScoreVictoryPoints(imperium_self, function(vp, objective) {
                imperium_self.addMove("strategy\t"+"imperial"+"\t"+strategy_card_player+"\t2");
                imperium_self.addMove("resetconfirmsneeded\t" + imperium_self.game.players_info.length);
                if (vp > 0) { imperium_self.addMove("score\t"+player+"\t"+vp+"\t"+objective); }
		imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored_this_round.push(objective);
                imperium_self.endTurn();
              }, 1);
            });
	  };

	  if (imperium_self.game.planets['new-byzantium'].owner == strategy_card_player) {
	    imperium_self.playerAcknowledgeNotice("Congratulations, Master of New Byzantium (+1 VP). Your power grows by the day. Surely it is only a matter of time before the Galaxy bows to your superiority and a Natural Order is restored to the universe", supplementary_scoring);
	  } else {
	    imperium_self.playerAcknowledgeNotice("Although you do not control New Byzantium, your strategic choice of play has been noticed by the other factions, and will be rewarded by the issuance of a Secret Objective", supplementary_scoring);
	  }
        }

	return 0;
      },
      strategySecondaryEvent 	:	function(imperium_self, player, strategy_card_player) {

	if (player == imperium_self.game.player) {

          imperium_self.game.state.round_scoring = 2;
	  imperium_self.game_halted = 1;

          imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
          imperium_self.playerScoreSecretObjective(imperium_self, function(vp, objective) {
            if (vp > 0) { imperium_self.addMove("score\t"+player+"\t"+vp+"\t"+objective); }
	    imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored_this_round.push(objective);
            imperium_self.playerScoreVictoryPoints(imperium_self, function(vp, objective) {
              if (vp > 0) { imperium_self.addMove("score\t"+player+"\t"+vp+"\t"+objective); }
	      imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored_this_round.push(objective);
              imperium_self.updateStatus("You have played the Imperial Secondary");
	      imperium_self.game_halted = 0;
              imperium_self.endTurn();
            }, 2);
          });

  	  return 0;
        }
      }

    });



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




    this.importStrategyCard("politics", {
      name     			:       "Politics",
      rank			:	3,
      img			:	"/imperium/img/strategy/POLITICS.png",
      text			:	"The player of this card may choose a player to serve as Speaker. If New Byzantium is controlled they may then choose two upcoming agendas for debate in the Galactic Senate. All other players then have the option of spending a strategy token to purchase two action cards. ",
      strategyPrimaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.confirms_needed == 0 || imperium_self.game.confirms_needed == undefined || imperium_self.game.confirms_needed == null) {

          //
          // refresh votes --> total available
          //
          imperium_self.game.state.votes_available = [];
          imperium_self.game.state.votes_cast = [];
          imperium_self.game.state.how_voted_on_agenda = [];
          imperium_self.game.state.voted_on_agenda = [];
          imperium_self.game.state.voting_on_agenda = 0;

          for (let i = 0; i < imperium_self.game.players.length; i++) {
            imperium_self.game.state.votes_available.push(imperium_self.returnAvailableVotes(i+1));
            imperium_self.game.state.votes_cast.push(0);
            imperium_self.game.state.how_voted_on_agenda[i] = "abstain";
            imperium_self.game.state.voted_on_agenda[i] = [];
            //
            // add extra 0s to ensure flexibility if extra agendas added
            //
            for (let z = 0; z < imperium_self.game.state.agendas_per_round+2; z++) {
              imperium_self.game.state.voted_on_agenda[i].push(0);
            }
          }
        }

        //
        // card player goes for primary
        //
        if (imperium_self.game.player == strategy_card_player) {

          //
          // two action cards
          //
          imperium_self.addMove("resolve\tstrategy");
          imperium_self.addMove("gain\t2\t"+imperium_self.game.player+"\taction_cards"+"\t"+2);
          imperium_self.addMove("DEAL\t2\t"+imperium_self.game.player+"\t2");
          imperium_self.addMove("notify\tdealing two action cards to " + imperium_self.returnFaction(player));
          imperium_self.addMove("strategy\t"+"politics"+"\t"+strategy_card_player+"\t2");
          imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);

          //
          // pick the speaker
          //
          let factions = imperium_self.returnFactions();
          let html = 'Make which player the speaker? <ul>';
          for (let i = 0; i < imperium_self.game.players_info.length; i++) {
            html += '<li class="option" id="'+i+'">' + factions[imperium_self.game.players_info[i].faction].name + '</li>';
          }
          html += '</ul>';
          imperium_self.updateStatus(html);

          let chancellor = imperium_self.game.player;
          let selected_agendas = [];

          $('.option').off();
          $('.option').on('click', function() {

            let chancellor = (parseInt($(this).attr("id")) + 1);
            let laws = imperium_self.returnAgendaCards();
            let laws_selected = 0;

	    //
	    // if New Byzantium is unoccupied, we skip the voting stage
	    //

//	    if (imperium_self.game.planets['new-byzantium'].owner == -1) {
//	      imperium_self.playerAcknowledgeNotice("The Galactic Senate has yet to be established on New Byzantium. Occupy the planet to establish the Senate and earn 1 VP: ", function() {
//		imperium_self.endTurn();
//	      });
//	      return 0;
//	    }


            let html = '';
            if (imperium_self.game.state.agendas_per_round == 1) {
              html += 'Select one agenda to advance for consideration in the Galactic Senate.<ul>';
            }
            if (imperium_self.game.state.agendas_per_round == 2) {
              html += 'Select two agendas to advance for consideration in the Galactic Senate.<ul>';
            }
            if (imperium_self.game.state.agendas_per_round == 3) {
              html += 'Select three agendas to advance for consideration in the Galactic Senate.<ul>';
            }

            for (i = 0; i < 3 && i < imperium_self.game.state.agendas.length; i++) {
              html += '<li class="option" id="'+imperium_self.game.state.agendas[i]+'">' + laws[imperium_self.game.state.agendas[i]].name + '</li>';
            }
            html += '</ul>';

            imperium_self.updateStatus(html);

            $('.option').off();
            $('.option').on('mouseenter', function() { let s = $(this).attr("id"); imperium_self.showAgendaCard(s); });
            $('.option').on('mouseleave', function() { let s = $(this).attr("id"); imperium_self.hideAgendaCard(s); });
            $('.option').on('click', function() {

              laws_selected++;
              selected_agendas.push($(this).attr('id'));

              $(this).hide();
              imperium_self.hideAgendaCard(selected_agendas[selected_agendas.length-1]);

              if (laws_selected >= imperium_self.game.state.agendas_per_round) {
                for (i = 1; i >= 0; i--) {
                  imperium_self.addMove("resolve_agenda\t"+selected_agendas[i]);
                  imperium_self.addMove("post_agenda_stage_post\t"+selected_agendas[i]);
                  imperium_self.addMove("post_agenda_stage\t"+selected_agendas[i]);
                  imperium_self.addMove("agenda\t"+selected_agendas[i]+"\t"+i);
                  imperium_self.addMove("pre_agenda_stage_post\t"+selected_agendas[i]);
                  imperium_self.addMove("pre_agenda_stage\t"+selected_agendas[i]);
                  imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);
                }
                imperium_self.addMove("change_speaker\t"+chancellor);
                imperium_self.endTurn();
              }
            });
          });
        }
      },

      strategySecondaryEvent 	:	function(imperium_self, player, strategy_card_player) {
        if (imperium_self.game.player == player) {

          if (imperium_self.game.player != strategy_card_player) {
            imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
            imperium_self.playerBuyActionCards(2);
          } else {
            imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
            imperium_self.endTurn();
          }

        }

      },
    });




    this.importStrategyCard("technology", {
      name     			:       "Technology",
      rank			:	7,
      img			:	"/imperium/img/strategy/TECH.png",
      text			:	"The player of this card may research a technology for free, and then spend 6 resources to research a second if they so choose. All other players may then spend a strategy token and four resources to research a technology" ,
      strategyPrimaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player == strategy_card_player) {
          imperium_self.playerAcknowledgeNotice("You will first have the option of researching a free-technology, and then invited to purchase an additional tech for 6 resources:", function() {
            imperium_self.playerResearchTechnology(function(tech) {
	      imperium_self.game.players_info[imperium_self.game.player-1].tech.push(tech);
              imperium_self.addMove("resolve\tstrategy");
              imperium_self.addMove("strategy\t"+"technology"+"\t"+strategy_card_player+"\t2");
              imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);
              imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);
              imperium_self.addMove("purchase\t"+player+"\ttechnology\t"+tech);
              imperium_self.endTurn();
            });
          });
        }

      },
      strategySecondaryEvent 	:	function(imperium_self, player, strategy_card_player) {

	let html = "";
	let resources_to_spend = 0;

        if (imperium_self.game.player == player) {
        if (imperium_self.game.player != strategy_card_player) {
 
	  resources_to_spend = 4;
          html = '<p>Technology has been played. Do you wish to spend 4 resources and a strategy token to research a technology? </p><ul>';

	  if (
	    imperium_self.game.players_info[player-1].permanent_research_technology_card_must_not_spend_resources == 1 ||
	    imperium_self.game.players_info[player-1].temporary_research_technology_card_must_not_spend_resources == 1
	  ) { 
            html = '<p>Technology has been played. Do you wish to spend a strategy token to research a technology? </p><ul>';
	    resources_to_spend = 0;
	  }

	  let available_resources = imperium_self.returnAvailableResources(imperium_self.game.player);
	  if (available_resources >= 4) {
            html += '<li class="option" id="yes">Yes</li>';
          }
	  html += '<li class="option" id="no">No</li>';
          html += '</ul>';
 
          imperium_self.updateStatus(html);

          $('.option').off();
          $('.option').on('click', function() {

            let id = $(this).attr("id");

            if (id == "yes") {

	      imperium_self.game.players_info[player-1].temporary_research_technology_card_must_not_spend_resources == 0;
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.playerSelectResources(resources_to_spend, function(success) {
                if (success == 1) {
                  imperium_self.playerResearchTechnology(function(tech) {
                    imperium_self.addMove("purchase\t"+player+"\ttechnology\t"+tech);
                    imperium_self.addMove("expend\t"+imperium_self.game.player+"\tstrategy\t1");
                    imperium_self.endTurn();
                  });
                } else {
                  imperium_self.endTurn();
                }
              });
            }
            if (id == "no") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.endTurn();
              return 0;
            }
          });

	  return 0;

        } else {

	  resources_to_spend = 6;
          html = '<p>Do you wish to spend "+resources_to_spend+" resources to research an additional technology? </p><ul>';

	  if (
	    imperium_self.game.players_info[player-1].permanent_research_technology_card_must_not_spend_resources == 1 ||
	    imperium_self.game.players_info[player-1].temporary_research_technology_card_must_not_spend_resources == 1
	  ) { 
            html = '<p>Do you wish to research an additional technology? </p><ul>';
	    resources_to_spend = 0;
	  }

	  let available_resources = imperium_self.returnAvailableResources(imperium_self.game.player);
	  if (available_resources >= resources_to_spend) {
            html += '<li class="option" id="yes">Yes</li>';
	  }
          html += '<li class="option" id="no">No</li>';
          html += '</ul>';

          imperium_self.updateStatus(html);

          $('.option').off();
          $('.option').on('click', function() {

            let id = $(this).attr("id");

            if (id == "yes") {
	      imperium_self.game.players_info[player-1].temporary_research_technology_card_must_not_spend_resources == 0;
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.playerSelectResources(6, function(success) {
                if (success == 1) {
                  imperium_self.playerResearchTechnology(function(tech) {
                    imperium_self.addMove("purchase\t"+player+"\ttechnology\t"+tech);
                    imperium_self.endTurn();
                  });
                } else {
 alert("insufficient resources to build this tech... dying");
                }
              });
            }
            if (id == "no") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.endTurn();
              return 0;
            }
          });

	  return 0;

        }
        }
      },
    });









    this.importAgendaCard('minister-of-technology', {
        name : "Minister of Technology" ,
        type : "Law" ,
        text : "Elect a player. They do not need to spend resources to research technology when the technology card is played" ,
	initialize : function(imperium_self) {
	  imperium_self.game.state.minster_of_technology = null;
	  imperium_self.game.state.minster_of_technology_player = null;
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    imperium_self.game.players_info[i].temporary_research_technology_card_must_not_spend_resources = 0;
	    imperium_self.game.players_info[i].permanent_research_technology_card_must_not_spend_resources = 0;
	  }
	},
        returnAgendaOptions : function(imperium_self) {
          let options = [];
          for (let i = 0; i < imperium_self.game.players_info.length; i++) {
            options.push(imperium_self.returnFaction(i+1));
          }
          return options;
        },
        onPass : function(imperium_self, winning_choice) {
console.log("WINNIGN CHOICE: " + winning_choice);
	  let player_number = 0;
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    if (imperium_self.returnFaction(i+1) == winning_choice) { player_number = i; }
	  }
          imperium_self.game.state.minister_of_technology = 1;
          imperium_self.game.state.minister_of_technology_player = player_number+1;
          imperium_self.game.players_info[player_number-1].permanent_research_technology_card_must_not_spend_resources = 1;
        }
  });





    this.importActionCard('unexpected-breakthrough', {
        name : "Unexpected Breakthrough" ,
        type : "action" ,
        text : "Do not spend resources to research technology the next time the Technology card is played" ,
        playActionCard : function(imperium_self, player, action_card_player, card) {
	  imperium_self.game.players_info[action_card_player-1].temporary_research_technology_card_must_not_spend_resources = 1;
          return 1;
        }
    });






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


    this.importStrategyCard("warfare", {
      name     			:       "Warfare",
      rank			:	6,
      img			:	"/imperium/img/strategy/MILITARY.png",
      text			:	"The player of this card may de-activate a sector if already activated. All other players may then produce in their home system" ,
      strategyPrimaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player == strategy_card_player) {

          imperium_self.updateStatus('Select sector to de-activate.');
          imperium_self.playerSelectSector(function(sector) {
            imperium_self.addMove("resolve\tstrategy");
            imperium_self.addMove("strategy\t"+"warfare"+"\t"+strategy_card_player+"\t2");
            imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
            imperium_self.addMove("deactivate\t"+player+"\t"+sector);
            imperium_self.addMove("resetconfirmsneeded\t"+imperium_self.game.players_info.length);
            imperium_self.endTurn();
          });
    
        }

      },
      strategySecondaryEvent 	:	function(imperium_self, player, strategy_card_player) {

        if (imperium_self.game.player == player) { 
        if (imperium_self.game.player != strategy_card_player) { 

          let html = '<p>Do you wish to spend 1 strategy token to produce in your home sector? </p><ul>';
          html += '<li class="option" id="yes">Yes</li>';
          html += '<li class="option" id="no">No</li>';
          html += '</ul>';
 
          imperium_self.updateStatus(html);
 
          $('.option').off();
          $('.option').on('click', function() {
 
            let id = $(this).attr("id");
 
            if (id == "yes") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.addMove("expend\t"+imperium_self.game.player+"\tstrategy\t1");
              imperium_self.playerProduceUnits(imperium_self.game.players_info[imperium_self.game.player-1].homeworld, 0, 0, 2);
            }
            if (id == "no") {
              imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
              imperium_self.endTurn();
              return 0;
            }
 
          });
        } else {
          imperium_self.addMove("resolve\tstrategy\t1\t"+imperium_self.app.wallet.returnPublicKey());
          imperium_self.endTurn();
          return 0;
        }
        }

      },
    });

  
  this.importSecretObjective('establish-a-blockade', {
      name 		: 	"Establish a Blockade" ,
      text		:	"Have at least 1 ship in the same sector as an opponent's spacedock",
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {

	for (let i in imperium_self.game.board) {
	  let sector = imperium_self.game.board[i].tile;
	  if (imperium_self.doesSectorContainPlayerShip(player, sector)) {
	    if (imperium_self.doesSectorContainNonPlayerUnit(player, sector, "spacedock")) {
	      return 1;
	    }
	  }
	}

	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });




  this.importSecretObjective('galactic-observer', {
      name 		: 	"Galactic Observer" ,
      text		:	"Have at least 1 ship in 6 different sectors" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	let ships_in_systems = 0;
	for (let i in imperium_self.game.board) {
	  let sector = imperium_self.game.board[i].tile;
	  if (imperium_self.doesSectorContainPlayerShip(player, sector)) {
	    ships_in_systems++;
	  }
	}

	if (ships_in_systems > 5) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });



  this.importSecretObjective('master-of-the-ion-cannon', {
      name 		: 	"Master Cannoneer" ,
      text		:	"Have at least 4 PDS units in play" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	let pds_units_in_play = 0;

	for (let i in imperium_self.game.planets) {
	  let planet = imperium_self.game.planets[i];
	  for (let ii = 0; ii < planet.units[player-1].length; ii++) {
	    if (planet.units[player-1][ii].type == "pds") {
	      pds_units_in_play++;
	    }
	  }
	}

	if (pds_units_in_play > 3) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });


  this.importSecretObjective('war-engine', {
      name 		: 	"War Engine" ,
      img		:	"/imperium/img/objective_card_1_template.png" ,
      text		:	"Have three spacedocks in play" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	let docks_in_play = 0;

	for (let i in imperium_self.game.planets) {
	  let planet = imperium_self.game.planets[i];
	  for (let ii = 0; ii < planet.units[player-1].length; ii++) {
	    if (planet.units[player-1][ii].type == "spacedock") {
	      docks_in_play++;
	    }
	  }
	}

	if (docks_in_play > 2) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });

  this.importSecretObjective('wormhole-administrator', {
      name 		: 	"Wormhole Administrator" ,
      text		:	"Have at least 1 ship in asystems containing alpha and beta wormholes respectively" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	let relevant_sectors = imperium_self.returnSectorsWithPlayerShips(player);
	let alpha = 0;
	let beta = 0;
	for (let i = 0; i < relevant_sectors.length; i++) {
	  if (imperium_self.game.sectors[relevant_sectors[i]].wormhole == 1) { alpha = 1; }
	  if (imperium_self.game.sectors[relevant_sectors[i]].wormhole == 2) { beta = 1; }
	}
	if (alpha == 1 && beta == 1) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('fleet-of-terror', {
      name 		: 	"Fleet of Terror" ,
      text		:	"Have five dreadnaughts in play" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	let dreadnaughts = 0;
	let relevant_sectors = imperium_self.returnSectorsWithPlayerShips(player);
	for (let i = 0; i < relevant_sectors.length; i++) {
	  for (let ii = 0; ii < imperium_self.game.sectors[relevant_sectors[i]].units[player-1].length; ii++) {
	    if (imperium_self.game.sectors[relevant_sectors[i]].units[player-1][ii].type === "dreadnaught") {
	      dreadnaughts++;
	    }
	  }
	}
	if (dreadnaughts >= 5) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });


  this.importSecretObjective('cultural-diplomacy', {
      name 		: 	"Cultural Diplomacy" ,
      text		:	"Control at least 4 cultural planets" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
        let cultural = 0;
        let planetcards = imperium_self.returnPlayerPlanetCards();
        for (let i = 0; i < planetcards.length; i++) { if (planetcards[i].type === "cultural")   { cultural++; } }
        if (cultural >= 4) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });


  this.importSecretObjective('act-of-espionage', {
      name 		: 	"Act of Espionage" ,
      text		:	"Discard 5 action cards from your hard" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	if (imperium_self.game.deck[1].hand.length >= 5) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	if (imperium_self.game.player == player) {
	  imperium_self.playerDiscardActionCards(5);
	}
	return 0;
      }
  });


  this.importSecretObjective('space-to-breathe', {
      name 		: 	"Space to Breathe" ,
      text		:	"Have at least 1 ship in 3 systems with no planets" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	let relevant_sectors = imperium_self.returnSectorsWithPlayerShips(player);
	let sectors_without_planets = 0;
	for (let i = 0; i < relevant_sectors.length; i++) {
	  if (imperium_self.game.sectors[relevant_sectors[i]].planets.length == 0) { sectors_without_planets++; }
	}
	if (sectors_without_planets >= 3) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });


  this.importSecretObjective('ascendant-technocracy', {
      name 		: 	"Ascendant Technocracy" ,
      text		:	"Research 4 tech upgrades on the same color path" , 
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {

        let techlist = imperium_self.game.players_info[player-1].tech;

        let greentech = 0;
        let bluetech = 0;
        let redtech = 0;
        let yellowtech = 0;

        for (let i = 0; i < techlist.length; i++) {
          if (imperium_self.tech[techlist[i]].color == "blue") { bluetech++; }
          if (imperium_self.tech[techlist[i]].color == "red") { redtech++; }
          if (imperium_self.tech[techlist[i]].color == "yellow") { yellowtech++; }
          if (imperium_self.tech[techlist[i]].color == "green") { greentech++; }
        }

        if (bluetech >= 4) { return 1; }
        if (yellowtech >= 4) { return 1; }
        if (redtech >= 4) { return 1; }
        if (greentech >= 4) { return 1; }

        return 0;
      },
      scoreObjective : function(imperium_self, player) {
        return 1;
      },
  });
  this.importSecretObjective('penal-colonies', {
      name 		: 	"Penal Colonies" ,
      text		:	"Control four planets with hazardous conditions" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
        let hazardous = 0;
        let planetcards = imperium_self.returnPlayerPlanetCards();
        for (let i = 0; i < planetcards.length; i++) { if (planetcards[i].type === "hazardous")   { hazardous++; } }
        if (hazardous >= 4) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('master-of-production', {
      name 		: 	"Master of Production" ,
      text		:	"Control four planets with industrial civilizations" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
        let industrial = 0;
        let planetcards = imperium_self.returnPlayerPlanetCards();
        for (let i = 0; i < planetcards.length; i++) { if (planetcards[i].type === "industrial")   { industrial++; } }
        if (industrial >= 4) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('faction-technologies', {
      name 		: 	"Faction Technologies" ,
      text		:	"Research 2 faction technologies" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
        let techlist = imperium_self.game.players_info[player-1].tech;
        let factiontech = 0;
        for (let i = 0; i < techlist.length; i++) {
          if (imperium_self.tech[techlist[i]].type == "normal" && techlist[i].indexOf("faction") == 0) { factiontech++; }
        }
        if (factiontech >= 2) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('occupy-new-byzantium', {
      name 		: 	"Occupy New Byzantium" ,
      text		:	"Control New Byzantium and have at least 3 ships protecting the sector" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	if (imperium_self.game.planets['new-byzantium'].owner == player) {
	  if (imperium_self.game.sectors['new-byzantium'].units[player-1].length >= 3) { return 1; }
	}
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('cast-a-long-shadow', {
      name 		: 	"Cast a Long Shadow" ,
      text		:	"Have at least 1 ship in a system adjacent to an opponent homeworld" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {

	let homeworlds = imperium_self.returnHomeworldSectors(imperium_self.game.players_info.length);
	let sectors = [];

	for (let i = 0; i < homeworlds.length; i++) {
	  if (homeworlds[i].tile != imperium_self.game.players_info[player-1].homeworld) {
	    sectors.push(imperium_self.game.board[homeworlds[i]].tile);
	  }
	}

	for (let i = 0; i < sectors.length; i++) {
	  if (imperium_self.isPlayerAdjacentToSector(player, sectors[i])) { return 1; }
	}
       
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });



/*****
  this.importSecretObjective('military-catastrophe', {
      name 		: 	"Military Catastrophe" ,
      text		:	"Destroy the flagship of another player" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('nuke-them-from-orbit', {
      name 		: 	"Nuke them from Orbit" ,
      text		:	"Destroy the last of a player's ground forces using bombardment" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('anti-imperialism', {
      name 		: 	"Anti-Imperialism" ,
      text		:	"Achieve victory in combat with a player with the most VP" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('close-the-trap', {
      name 		: 	"Close the Trap" ,
      text		:	"Destroy another player's last ship in a system using a PDS" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });
  this.importSecretObjective('flagship-dominance', {
      name 		: 	"" ,
      text		:	"Achieve victory in a space combat in a system containing your flagship. Your flagship must survive this combat" ,
      type		: 	"secret" ,
      canPlayerScoreVictoryPoints	: function(imperium_self, player) {
	return 0;
      },
      scoreObjective : function(imperium_self, player) { 
	return 1;
      }
  });

***/
  

  this.importStageIPublicObjective('manage-to-breathe', {
      name 	: 	"Deep Breathing" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Just score this for free..." ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
	return 1;
      },
      scoreObjective : function(imperium_self, player) {
	return 1;
      },
  });
  this.importStageIPublicObjective('planetary-unity', {
      name 	: 	"Planetary Unity" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Control four planets of the same planet type" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

	let hazardous = 0;
	let cultural = 0;
	let industrial = 0;

	let planetcards = imperium_self.returnPlayerPlanetCards();

	for (let i = 0; i < planetcards.length; i++) {
	  if (planetcards[i].type === "hazardous")  { hazardous++; }
	  if (planetcards[i].type === "industrial") { industrial++; }
	  if (planetcards[i].type === "cultural")   { cultural++; }
	}

	if (hazardous >= 4 || cultural >= 4 || industrial >= 4) { return 1; }

	return 0;
      },
      scoreObjective : function(imperium_self, player) {
	return 1;
      },
  });
  this.importStageIPublicObjective('forge-of-war', {
      name 	: 	"Forge of War" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Research 2 unit upgrade technologies" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
	let techlist = imperium_self.game.players_info[player-1].tech;
	let unit_upgrades = 0;
	for (let i = 0; i < techlist.length; i++) {
	  if (imperium_self.tech[techlist[i]].unit == 1) {
	    unit_upgrades++;
	  }
	}
	if (unit_upgrades >= 2) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) {
	return 1;
      },
  });
  this.importStageIPublicObjective('diversified-research', {
      name 	: 	"Diversified Research" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Research 2 technologies in two different color paths" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

	let techlist = imperium_self.game.players_info[player-1].tech;

	let greentech = 0;
	let bluetech = 0;
	let redtech = 0;
	let yellowtech = 0;

	for (let i = 0; i < techlist.length; i++) {
	  if (imperium_self.tech[techlist[i]].color == "blue") { bluetech++; }
	  if (imperium_self.tech[techlist[i]].color == "red") { redtech++; }
	  if (imperium_self.tech[techlist[i]].color == "yellow") { yellowtech++; }
	  if (imperium_self.tech[techlist[i]].color == "green") { greentech++; }
	}

	let achieve_two = 0;
	
	if (bluetech >= 2) { achieve_two++; }
	if (yellowtech >= 2) { achieve_two++; }
	if (redtech >= 2) { achieve_two++; }
	if (greentech >= 2) { achieve_two++; }

	if (achieve_two >= 2) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) {
	return 1;
      },
  });
  this.importStageIPublicObjective('mining-conglomerate', {
      name 	: 	"Mining Conglomerate" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Spend eight resources when scoring" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
	if (imperium_self.returnAvailableResources(player) >= 8) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) {
	if (imperium_self.game.player == player) {
          imperium_self.playerSelectResources(8, function(success) {
            if (success == 1) { imperium_self.endTurn(); }
          });
	}
	return 0;
      },
  });
  this.importStageIPublicObjective('conquest-of-science', {
      name 	: 	"Conquest of Science" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Control 3 planets with tech specialities" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

        let techbonuses = 0;
        let planetcards = imperium_self.returnPlayerPlanetCards();

        for (let i = 0; i < planetcards.length; i++) {
          if (planetcards[i].bonus == "red") { techbonuses++; }
          if (planetcards[i].bonus == "blue") { techbonuses++; }
          if (planetcards[i].bonus == "green") { techbonuses++; }
          if (planetcards[i].bonus == "yellow") { techbonuses++; }
        }

	if (techbonuses >= 3) { return 1; }

	return 0;
      },
      scoreObjective : function(imperium_self, player) {
	return 1;
      },
  });
  this.importStageIPublicObjective('colonization', {
      name 	: 	"Colonization" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Control six planets outside your home system" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

        let hazardous = 0;
        let cultural = 0;
        let industrial = 0;

        let planetcards = imperium_self.returnPlayerPlanetCards();

        for (let i = 0; i < planetcards.length; i++) {
          if (planetcards[i].type === "hazardous")  { hazardous++; }
          if (planetcards[i].type === "industrial") { industrial++; }
          if (planetcards[i].type === "cultural")   { cultural++; }
        }

        if ((cultural+hazardous+industrial) >= 6) { return 1; }

        return 0;
      },
      scoreObjective : function(imperium_self, player) {
	return 1;
      },
  });
  this.importStageIPublicObjective('grand-gesture', {
      name 	: 	"A Grand Gesture" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Spend 3 command or strategy tokens when scoring" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
	if ((imperium_self.game.players_info[player-1].strategy_tokens + imperium_self.game.players_info[player-1].command_tokens) >= 3) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) {
	if (imperium_self.game.player == player) {
          imperium_self.playerSelectStrategyAndCommandTokens(3, function(success) {
            if (success == 1) { imperium_self.endTurn(); }
          });
	}
	return 0;
      },
  });
  this.importStageIPublicObjective('establish-trade-outposts', {
      name 	: 	"Establish Trade Outposts" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Spend 5 trade goods when scoring" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
	if (imperium_self.returnAvailableTradeGoods(player) >= 5) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) {
        imperium_self.game.players_info[player-1].goods -= 5;
	return 1;
      },
  });
  this.importStageIPublicObjective('pecuniary-diplomacy', {
      name 	: 	"Pecuniary Diplomacy" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Spend 8 influence when scoring" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
	if (imperium_self.returnAvailableInfluence(player) >= 8) { return 1; }
	return 0;
      },
      scoreObjective : function(imperium_self, player) {
	if (imperium_self.game.player == player) {
          imperium_self.playerSelectInfluence(8, function(success) {
            if (success == 1) { imperium_self.endTurn(); }
          });
        }
	return 0;
      },
  });


  this.importStageIIPublicObjective('deep-breathing', {
      name 	: 	"Deep Breathing" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Just score this two VP for free..." ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
        return 1;
      },
      scoreObjective : function(imperium_self, player) {
        return 1;
      },
  });
  this.importStageIIPublicObjective('master-of-commerce', {
      name 	: 	"Master of Commerce" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Spend 10 trade goods when scoring" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
        if (imperium_self.returnAvailableTradeGoods(player) >= 10) { return 1; }
        return 0;
      },
      scoreObjective : function(imperium_self, player) {
        imperium_self.game.players_info[player-1].goods -= 10;
        return 1;
      },
  });
  this.importStageIIPublicObjective('display-of-dominance', {
      name 	: 	"Display of Dominance" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Control at least 1 planet in another player's home sector" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

	let homeworlds = [];
	let homeplanets = [];
	for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	  let home_sector = imperium_self.game.board[imperium_self.game.players_info[player-1].homeworld].tile;
	  let sys = imperium_self.returnSectorAndPlanets(home_sector);
	  for (let ii = 0; ii < sys.p.length; ii++) {
	    homeplanets.push(sys.p[ii].name);
	  }
	}

        let planetcards = imperium_self.returnPlayerPlanetCards();

	for (let i = 0; i < planetcards.length; i++) {
	  if (homeplanets.includes(planetcards[i].name)) { return 1; }
	}

        return 0;
      },
      scoreObjective : function(imperium_self, player) {
        return 1;
      },
  });
  this.importStageIIPublicObjective('technological-empire', {
      name 	: 	"Technological Empire" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Control 5 planets with tech bonuses" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

        let techbonuses = 0;
        let planetcards = imperium_self.returnPlayerPlanetCards();

        for (let i = 0; i < planetcards.length; i++) {
          if (planetcards[i].bonus == "red") { techbonuses++; }
          if (planetcards[i].bonus == "blue") { techbonuses++; }
          if (planetcards[i].bonus == "green") { techbonuses++; }
          if (planetcards[i].bonus == "yellow") { techbonuses++; }
        }

        if (techbonuses >= 3) { return 1; }

        return 0;
      },
      scoreObjective : function(imperium_self, player) {
        return 1;
      },
  });
  this.importStageIIPublicObjective('establish-galactic-currency', {
      name 	: 	"Establish Galactic Currency" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Spend 16 resources when scoring" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
        if (imperium_self.returnAvailableResources(player) >= 16) { return 1; }
        return 0;
      },
      scoreObjective : function(imperium_self, player) {
	if (imperium_self.game.player == player) {
          imperium_self.playerSelectResources(16, function(success) {
            if (success == 1) { imperium_self.endTurn(); }
          });
        }
        return 0;
      },
  });
  this.importStageIIPublicObjective('master-of-science', {
      name 	: 	"Master of Science" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Own 2 tech upgrades in each of 4 tech color paths" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

        let techlist = imperium_self.game.players_info[player-1].tech;

        let greentech = 0;
        let bluetech = 0;
        let redtech = 0;
        let yellowtech = 0;

        for (let i = 0; i < techlist.length; i++) {
          if (imperium_self.tech[techlist[i]].color == "blue") { bluetech++; }
          if (imperium_self.tech[techlist[i]].color == "red") { redtech++; }
          if (imperium_self.tech[techlist[i]].color == "yellow") { yellowtech++; }
          if (imperium_self.tech[techlist[i]].color == "green") { greentech++; }
        }

        let achieve_two = 0;

        if (bluetech >= 2) { achieve_two++; }
        if (yellowtech >= 2) { achieve_two++; }
        if (redtech >= 2) { achieve_two++; }
        if (greentech >= 2) { achieve_two++; }

        if (achieve_two >= 4) { return 1; }
        return 0;
      },
      scoreObjective : function(imperium_self, player) {
        return 1;
      },

  });
  this.importStageIIPublicObjective('imperial-unity', {
      name 	: 	"Imperial Unity" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Control 6 planets of the same planet type" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

        let hazardous = 0;
        let cultural = 0;
        let industrial = 0;

        let planetcards = imperium_self.returnPlayerPlanetCards();

        for (let i = 0; i < planetcards.length; i++) {
          if (planetcards[i].type === "hazardous")  { hazardous++; }
          if (planetcards[i].type === "industrial") { industrial++; }
          if (planetcards[i].type === "cultural")   { cultural++; }
        }

        if (hazardous >= 6 || cultural >= 6 || industrial >= 6) { return 1; }

        return 0;
      },
      scoreObjective : function(imperium_self, player) {
        return 1;
      },
  });
  this.importStageIIPublicObjective('advanced-technologies', {
      name 	: 	"Advanced Technologies" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Research 3 unit upgrade technologies" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
        let techlist = imperium_self.game.players_info[player-1].tech;
        let unit_upgrades = 0;
        for (let i = 0; i < techlist.length; i++) {
          if (imperium_self.tech[techlist[i]].unit == 1) {
            unit_upgrades++;
          }
        }
        if (unit_upgrades >= 3) { return 1; }
        return 0;
      },
      scoreObjective : function(imperium_self, player) {
        return 1;
      },
  });
  this.importStageIIPublicObjective('colonial-dominance', {
      name 	: 	"Colonial Dominance" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Control 11 planets outside your home system" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {

        let hazardous = 0;
        let cultural = 0;
        let industrial = 0;

        let planetcards = imperium_self.returnPlayerPlanetCards();

        for (let i = 0; i < planetcards.length; i++) {
          if (planetcards[i].type === "hazardous")  { hazardous++; }
          if (planetcards[i].type === "industrial") { industrial++; }
          if (planetcards[i].type === "cultural")   { cultural++; }
        }

        if ((cultural+hazardous+industrial) >= 11) { return 1; }

        return 0;
      },
      scoreObjective : function(imperium_self, player) {
        return 1;
      },
  });
  this.importStageIIPublicObjective('power-broker', {
      name 	: 	"Power Broker" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Spend 16 influence when scoring" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
        if (imperium_self.returnAvailableInfluence(player) >= 16) { return 1; }
        return 0;
      },
      scoreObjective : function(imperium_self, player) {
	if (imperium_self.game.player == player) {
          imperium_self.playerSelectInfluence(16, function(success) {
            if (success == 1) { imperium_self.endTurn(); }
          });
        }
        return 0;
      },
  });
  this.importStageIIPublicObjective('cultural-revolution', {
      name 	: 	"A Cultural Revolution" ,
      img	:	"/imperium/img/objective_card_1_template.png" ,
      text	:	"Spend 6 command or strategy tokens when scoring" ,
      canPlayerScoreVictoryPoints : function(imperium_self, player) {
        if ((imperium_self.game.players_info[player-1].strategy_tokens + imperium_self.game.players_info[player-1].command_tokens) >= 6) { return 1; }
        return 0;
      },
      scoreObjective : function(imperium_self, player) {
	if (imperium_self.game.player == player) {
          imperium_self.playerSelectStrategyAndCommandTokens(6, function(success) {
            if (success == 1) { imperium_self.endTurn(); }
          });
        }
        return 0;
      },
  });
  
  
  


  this.importAgendaCard('shard-of-the-throne', {
  	name : "Shard of the Throne" ,
  	type : "Law" ,
	elect : "player" ,
  	text : "Elect a Player to earn 1 VP. When this player loses a space combat to another player, they transfer the VP to that player" ,
        returnAgendaOptions : function(imperium_self) {
	  let options = [];
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    options.push(imperium_self.returnFaction(i+1));
	  }
	  return options;
	},
	onPass : function(imperium_self, winning_choice) {
	  imperium_self.game.state.shard_of_the_throne = 1;

	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    if (winning_choice === imperium_self.returnFaction((i+1))) {
	      imperium_self.game.state.shard_of_the_throne_player = i+1;
	    }
	  }

	  let law_to_push = {};
	      law_to_push.agenda = "shard-of-the-throne";
	      law_to_push.option = winning_choice;
	  imperium_self.game.state.laws.push(law_to_push);

          imperium_self.game.players_info[imperium_self.game.state.shard_of_the_throne_player-1].vp += 1;
	  imperium_self.updateLeaderboard();
	  imperium_self.updateLog(imperium_self.returnFaction(imperium_self.game.state.shard_of_the_throne_player) + " gains 1 VP from Holy Planet of Ixth");

	},
        spaceCombatRoundEnd : function(imperium_self, attacker, defender, sector) {
	  if (defender == imperium_self.game.state.shard_of_the_throne_player) {
	    if (!imperium_self.doesPlayerHaveShipsInSector(defender, sector)) {
	      imperium_self.game.state.shard_of_the_throne_player = attacker;
	      imperium_self.updateLog(imperium_self.returnFaction(imperium_self.game.state.shard_of_the_throne_player) + " gains the Shard of the Throne (1VP)");
	      imperium_self.game.players_info[attacker-1].vp += 1;
	      imperium_self.game.players_info[defender-1].vp -= 1;
	      imperium_self.updateLeaderboard();
	    }
	  }
	},
	groundCombatRoundEnd : function(imperium_self, attacker, defender, sector, planet_idx) {
	  if (defender == imperium_self.game.state.shard_of_the_throne_player) {
	    if (!imperium_self.doesPlayerHaveInfantryOnPlanet(defender, sector, planet_idx)) {
	      imperium_self.game.state.shard_of_the_throne_player = attacker;
	      imperium_self.updateLog(imperium_self.returnFaction(imperium_self.game.state.shard_of_the_throne_player) + " gains the Shard of the Throne (1VP)");
	      imperium_self.game.players_info[attacker-1].vp += 1;
	      imperium_self.game.players_info[defender-1].vp -= 1;
	      imperium_self.updateLeaderboard();
	    }
	  }
	},
  });


  this.importAgendaCard('homeland-defense-act', {
  	name : "Homeland Defense Act" ,
  	type : "Law" ,
  	text : "FOR: there is no limit to the number of PDS units on a planet. AGAINST: each player must destroy one PDS unit" ,
        returnAgendaOptions : function(imperium_self) { return ['for','against']; },
	onPass : function(imperium_self, winning_choice) {
	  imperium_self.game.state.homeland_defense_act = 1;
	  let law_to_push = {};
	      law_to_push.agenda = "homeland-defense-act";
	      law_to_push.option = winning_choice;
	  imperium_self.game.state.laws.push(law_to_push);

          if (winning_choice === "for") {
	    imperium_self.game.state.pds_limit_per_planet = 100;
	  }

          if (winning_choice === "against") {
	    for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	      if (imperium_self.doesPlayerHaveUnitOnBoard((i+1), "pds")) {
	        imperium_self.game.queue.push("destroy_a_pds\t"+(i+1));
	      }
	    }
	  }
	},
        handleGameLoop : function(imperium_self, qe, mv) {

          if (mv[0] == "destroy_a_pds") {

            let player = parseInt(mv[1]);
	    imperium_self.game.queue.splice(qe, 1);

	    if (imperium_self.game.player == player) {
              imperium_self.playerSelectUnitWithFilter(
                    "Select a PDS unit to destroy: ",
                    function(unit) {
		      if (unit == undefined) { return 0; }
                      if (unit.type == "pds") { return 1; }
                      return 0;
            	    },
                    function(unit_identifier) {

console.log("WOOT");
                      let sector        = unit_identifier.sector;
                      let planet_idx    = unit_identifier.planet_idx;
                      let unit_idx      = unit_identifier.unit_idx;
                      let unit          = unit_identifier.unit;

console.log(sector + " -- " + planet_idx + " -- " + unit_idx);

		      if (unit == null) {
                        imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player) + " has no PDS units to destroy");
		        imperium_self.endTurn();
			return 0;
		      }
                      imperium_self.addMove("destroy\t"+imperium_self.game.player+"\t"+imperium_self.game.player+"\t"+"ground"+"\t"+sector+"\t"+planet_idx+"\t"+unit_idx+"\t"+"1");
                      imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player) + " destroys a " + unit.name + " in " + imperium_self.game.sectors[sector].name);
		      imperium_self.endTurn();
                    }
              );
	    }

            return 0;
          }
          return 1;
        }
  });




  this.importAgendaCard('holy-planet-of-ixth', {
  	name : "Holy Planet of Ixth" ,
  	type : "Law" ,
	elect : "planet" ,
  	text : "Elect a cultural planet. The planet's controller gains 1 VP. Units cannot be landed, produced or placed on this planet" ,
        returnAgendaOptions : function(imperium_self) {
	  return imperium_self.returnPlanetsOnBoard(function(planet) {
	    if (planet.type === "cultural") { return 1; } return 0; 
	  });
	},
	onPass : function(imperium_self, winning_choice) {
	  imperium_self.game.state.holy_planet_of_ixth = 1;
	  imperium_self.game.state.holy_planet_of_ixth_planet = winning_choice;
	  let law_to_push = {};
	      law_to_push.agenda = "holy_planet_of_ixth";
	      law_to_push.option = winning_choice;
	  imperium_self.game.state.laws.push(law_to_push);

	  //
	  // lock the planet
	  //
	  imperium_self.game.planets[winning_choice].locked = 1;

	  //
	  // issue VP to controller
	  //
	  let owner = imperium_self.game.planets[winning_choice].owner;
	  if (owner != -1) {
	    imperium_self.game.players_info[owner-1].vp += 1;
	    imperium_self.updateLeaderboard();
	    imperium_self.updateLog(imperium_self.returnFaction(owner) + " gains 1 VP from Holy Planet of Ixth");
	  }

	}
  });



  this.importAgendaCard('research-team-biotic', {
        name : "Research Team: Biotic" ,
        type : "Law" ,
	elect : "planet" ,
        text : "Elect an industrial planet. The owner may exhaust this planet to ignore 1 green technology prerequisite the next time they research a technology" ,
        returnAgendaOptions : function(imperium_self) {
          return imperium_self.returnPlanetsOnBoard(function(planet) {
            if (planet.type === "industrial") { return 1; } return 0;
          });
        },
        onPass : function(imperium_self, winning_choice) {
          imperium_self.game.state.research_team_biotic = 1;
          imperium_self.game.state.research_team_biotic_planet = winning_choice;
          let law_to_push = {};
              law_to_push.agenda = "research_team_biotic";
              law_to_push.option = winning_choice;
          imperium_self.game.state.laws.push(law_to_push);
        },
        menuOption  :       function(imperium_self, menu, player) {
          if (menu == "main" && imperium_self.game.planets[imperium_self.game.state.research_team_biotic_planet].owner == player) {
            return { event : 'research_team_biotic', html : '<li class="option" id="research_team_biotic">use biotic (green) tech-skip</li>' };
	  }
	  return {};
        },
        menuOptionTriggers:  function(imperium_self, menu, player) {
          if (menu == "main") {
            if (imperium_self.game.planets[imperium_self.game.state.research_team_biotic_planet].owner == player) {
              if (imperium_self.game.planets[imperium_self.game.state.research_team_biotic_planet].exhausted == 0) {
                return 1;
              }
            }
          }
          return 0;
        },
        menuOptionActivated:  function(imperium_self, menu, player) {
          if (menu == "main") {
            imperium_self.game.players_info[player-1].temporary_green_tech_prerequisite++;
            imperium_self.game.planets[imperium_self.game.state.research_team_biotic_planet].exhausted = 1;
	  }
          return 0;
        }
  });


  this.importAgendaCard('research-team-cybernetic', {
        name : "Research Team: Cybernetic" ,
        type : "Law" ,
	elect : "planet" ,
        text : "Elect an industrial planet. The owner may exhaust this planet to ignore 1 yellow technology prerequisite the next time they research a technology" ,
        returnAgendaOptions : function(imperium_self) {
          return imperium_self.returnPlanetsOnBoard(function(planet) {
            if (planet.type === "industrial") { return 1; } return 0;
          });
        },
        onPass : function(imperium_self, winning_choice) {
          imperium_self.game.state.research_team_cybernetic = 1;
          imperium_self.game.state.research_team_cybernetic_planet = winning_choice;
          let law_to_push = {};
              law_to_push.agenda = "research_team_cybernetic";
              law_to_push.option = winning_choice;
          imperium_self.game.state.laws.push(law_to_push);
        },
        menuOption  :       function(imperium_self, menu, player) {
          if (menu == "main" && imperium_self.game.planets[imperium_self.game.state.research_team_cybernetic_planet].owner == player) {
            return { event : 'research_team_cybernetic', html : '<li class="option" id="research_team_cybernetic">use cybernetic (yellow) tech-skip</li>' };
	  }
	  return {};
        },
        menuOptionTriggers:  function(imperium_self, menu, player) {
          if (menu == "main") {
            if (imperium_self.game.planets[imperium_self.game.state.research_team_cybernetic_planet].owner == player) {
              if (imperium_self.game.planets[imperium_self.game.state.research_team_cybernetic_planet].exhausted == 0) {
                return 1;
              }
            }
          }
          return 0;
        },
        menuOptionActivated:  function(imperium_self, menu, player) {
          if (menu == "main") {
            imperium_self.game.players_info[player-1].temporary_yellow_tech_prerequisite++;
            imperium_self.game.planets[imperium_self.game.state.research_team_cybernetic_planet].exhausted = 1;
	  }
          return 0;
        }
  });


  this.importAgendaCard('research-team-propulsion', {
        name : "Research Team: Propulsion" ,
        type : "Law" ,
	elect : "planet" ,
        text : "Elect an industrial planet. The owner may exhaust this planet to ignore 1 blue technology prerequisite the next time they research a technology" ,
        returnAgendaOptions : function(imperium_self) {
          return imperium_self.returnPlanetsOnBoard(function(planet) {
            if (planet.type === "industrial") { return 1; } return 0;
          });
        },
        onPass : function(imperium_self, winning_choice) {
          imperium_self.game.state.research_team_propulsion = 1;
          imperium_self.game.state.research_team_propulsion_planet = winning_choice;
          let law_to_push = {};
              law_to_push.agenda = "research_team_propulsion";
              law_to_push.option = winning_choice;
          imperium_self.game.state.laws.push(law_to_push);
        },
        menuOption  :       function(imperium_self, menu, player) {
          if (menu == "main" && imperium_self.game.planets[imperium_self.game.state.research_team_propulsion_planet].owner == player) {
            return { event : 'research_team_propulsion', html : '<li class="option" id="research_team_propulsion">use propulsion (blue) tech-skip</li>' };
	  }
	  return {};
        },
        menuOptionTriggers:  function(imperium_self, menu, player) {
          if (menu == "main") {
            if (imperium_self.game.planets[imperium_self.game.state.research_team_propulsion_planet].owner == player) {
              if (imperium_self.game.planets[imperium_self.game.state.research_team_propulsion_planet].exhausted == 0) {
                return 1;
              }
            }
          }
          return 0;
        },
        menuOptionActivated:  function(imperium_self, menu, player) {
          if (menu == "main") {
            imperium_self.game.players_info[player-1].temporary_blue_tech_prerequisite++;
            imperium_self.game.planets[imperium_self.game.state.research_team_propulsion_planet].exhausted = 1;
	  }
          return 0;
        }
  });


  this.importAgendaCard('research-team-warfare', {
        name : "Research Team: Warfare" ,
        type : "Law" ,
	elect : "planet" ,
        text : "Elect an hazardous planet. The owner may exhaust this planet to ignore 1 red technology prerequisite the next time they research a technology" ,
        returnAgendaOptions : function(imperium_self) {
          return imperium_self.returnPlanetsOnBoard(function(planet) {
            if (planet.type === "industrial") { return 1; } return 0;
          });
        },
        onPass : function(imperium_self, winning_choice) {
          imperium_self.game.state.research_team_warfare = 1;
          imperium_self.game.state.research_team_warfare_planet = winning_choice;
          let law_to_push = {};
              law_to_push.agenda = "research_team_warfare";
              law_to_push.option = winning_choice;
          imperium_self.game.state.laws.push(law_to_push);
        },
        menuOption  :       function(imperium_self, menu, player) {
          if (menu == "main" && imperium_self.game.planets[imperium_self.game.state.research_team_warfare_planet].owner == player) {
            return { event : 'research_team_warfare', html : '<li class="option" id="research_team_warfare">use warfare (red) tech-skip</li>' };
	  }
	  return {};
        },
        menuOptionTriggers:  function(imperium_self, menu, player) {
          if (menu == "main") {
            if (imperium_self.game.planets[imperium_self.game.state.research_team_warfare_planet].owner == player) {
              if (imperium_self.game.planets[imperium_self.game.state.research_team_warfare_planet].exhausted == 0) {
                return 1;
              }
            }
          }
          return 0;
        },
        menuOptionActivated:  function(imperium_self, menu, player) {
          if (menu == "main") {
            imperium_self.game.players_info[player-1].temporary_red_tech_prerequisite++;
            imperium_self.game.planets[imperium_self.game.state.research_team_warfare_planet].exhausted = 1;
	  }
          return 0;
        }
  });



  this.importAgendaCard('demilitarized-zone', {
  	name : "Demilitarized Zone" ,
  	type : "Law" ,
	elect : "planet" ,
  	text : "Elect a cultural planet. All units are destroyed and cannot be landed, produced or placed on this planet" ,
        returnAgendaOptions : function(imperium_self) {
	  return imperium_self.returnPlanetsOnBoard(function(planet) {
	    if (planet.type === "cultural") { return 1; } return 0; 
	  });
	},
	onPass : function(imperium_self, winning_choice) {
	  imperium_self.game.state.demilitarized_zone = 1;
	  imperium_self.game.state.demilitarized_zone_planet = winning_choice;
	  let law_to_push = {};
	      law_to_push.agenda = "demilitarized-zone";
	      law_to_push.option = winning_choice;
	  imperium_self.game.state.laws.push(law_to_push);

	  //
	  // also - destroy the planet and increase its resource value
	  //
	  imperium_self.game.planets[winning_choice].units = []; 
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    imperium_self.game.planets[winning_choice].units = [];
	  }

	  imperium_self.game.planets[winning_choice].locked = 1;

	}
  });

  this.importAgendaCard('core-mining', {
  	name : "Core Mining" ,
  	type : "Law" ,
	elect : "planet" ,
  	text : "Elect a hazardous planet. Destroy half the infantry on that planet and increase its resource value by +2" ,
        returnAgendaOptions : function(imperium_self) {
	  return imperium_self.returnPlanetsOnBoard(function(planet) {
	    if (planet.type === "hazardous") { return 1; } return 0; 
	  });
	},
	onPass : function(imperium_self, winning_choice) {
	  imperium_self.game.state.core_mining = 1;
	  imperium_self.game.state.core_mining_planet = winning_choice;
	  let law_to_push = {};
	      law_to_push.agenda = "core-mining";
	      law_to_push.option = winning_choice;
	  imperium_self.game.state.laws.push(law_to_push);

	  //
	  // also - destroy the planet and increase its resource value
	  //
	  for (let i = 0; i < imperium_self.game.planets[winning_choice].units.length; i++) {
	    let destroy = 1;
	    for (let ii = 0; ii < imperium_self.game.planets[winning_choice].units[i].length; ii++) {
	      if (imperium_self.game.planets[winning_choice].units[i][ii].type == "infantry") {
	        if (destroy == 1) {
	          imperium_self.game.players[winning_choice].units[i].splice(ii, 1);
		  ii--;
		  destroy = 0;
		} else {
		  destroy = 1;
		}
	      }
	    }
	  }

	  imperium_self.game.planets[winning_choice].resources += 2;

	}
  });



  this.importAgendaCard('anti-intellectual-revolution', {
  	name : "Anti-Intellectual Revolution" ,
  	type : "Law" ,
  	text : "FOR: players must destroy a capital ship in order to research a technology using the Technology card. AGAINST: at the start of the next round, each player exhausts one planet for each technology they have." ,
        returnAgendaOptions : function(imperium_self) { return ['for','against']; },
	initialize : function(imperium_self, winning_choice) {

          if (winning_choice === "for") {

            let techcard = imperium_self.strategy_cards['technology'];
            let old_tech_func = techcard.strategyPrimaryEvent;
            let new_tech_func = function(imperium_self, player, strategy_card_player) {
              if (imperium_self.game.player == strategy_card_player) {
                imperium_self.playerAcknowledgeNotice("Anti-Intellectual Revolution is in play. Do you wish to destroy a capital ship to research technology?", function() {

                  imperium_self.playerSelectUnitWithFilter(
                    "Select a capital ship to destroy: ",
                    function(ship) {
                      if (ship.type == "destroyer") { return 1; }
                      if (ship.type == "cruiser") { return 1; }
                      if (ship.type == "carrier") { return 1; }
                      if (ship.type == "dreadnaught") { return 1; }
                      if (ship.type == "flagship") { return 1; }
                      if (ship.type == "warsun") { return 1; }
                      return 0;
                    },

                    function(unit_identifier) {

                      let sector        = unit_identifier.sector;
                      let planet_idx    = unit_identifier.planet_idx;
                      let unit_idx      = unit_identifier.unit_idx;
                      let unit          = unit_identifier.unit;

                      if (planet_idx == -1) {
                        imperium_self.addMove("destroy\t"+imperium_self.game.player+"\t"+imperium_self.game.player+"\t"+"space"+"\t"+sector+"\t"+planet_idx+"\t"+unit_idx+"\t"+"1");
                      } else {
                        imperium_self.addMove("destroy\t"+imperium_self.game.player+"\t"+imperium_self.game.player+"\t"+"ground"+"\t"+sector+"\t"+planet_idx+"\t"+unit_idx+"\t"+"1");
                      }
                      imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player) + " destroys a " + unit.name + " in " + imperium_self.game.sectors[sector].name);
                      old_tech_func(imperium_self, player, strategy_card_player);

                    }
                  );
                });
              }
            };
            techcard.strategyPrimaryEvent = new_tech_func;
          }

          if (winning_choice === "against") {
            // exhaust two planets
            for (let i = 0; i < imperium_self.game.players_info.length; i++) {
              imperium_self.game.players_info[i].must_exhaust_at_round_start.push("planet","planet");
            }
          }
	},
	onPass : function(imperium_self, winning_choice) {
	  imperium_self.game.state.anti_intellectual_revolution = 1;
	  let law_to_push = {};
	      law_to_push.agenda = "anti-intellectual-revolution";
	      law_to_push.option = winning_choice;
	  imperium_self.game.state.laws.push(law_to_push);
	}
  });



  this.importAgendaCard('unconventional-measures', {
  	name : "Unconventional Measures" ,
  	type : "Law" ,
  	text : "FOR: each player that votes 'for' draws 2 action cards. AGAINST: each player that votes 'against' discards their action cards." ,
        returnAgendaOptions : function(imperium_self) { return ['for','against']; },
	onPass : function(imperium_self, winning_choice) {

	  //
	  // gain two action cards
	  //
	  if (winning_choice === "for") {
	    for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	      if (imperium_self.game.state.how_voted_on_agenda[i] == winning_choice) {
                imperium_self.game.queue.push("gain\t2\t"+(i+2)+"\taction_cards"+"\t"+2);
                imperium_self.game.queue.push("DEAL\t2\t"+(i+1)+"\t2");
                imperium_self.game.queue.push("notify\tdealing two action cards to player "+(i+1));
	      }	      
	    }
	  }

	  //
	  // everyone who votes against discards action cards
	  //
	  if (winning_choice === "against") {
	    for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	      if (imperium_self.game.state.how_voted_on_agenda[i] == winning_choice) {
                if (imperium_self.game.player == (i+1)) {
		  imperium_self.game.players_info[i].action_cards_in_hand = 0;
		} else {
		  imperium_self.game.players_info[i].action_cards_in_hand = 0;
		  imperium_self.game.deck[1].hand = [];
	  let law_to_push = {};
	      law_to_push.agenda = "anti-intellectual-revolution";
	      law_to_push.option = "winning_choice";
	  imperium_self.game.state.laws.push(law_to_push);
		}
	      }	      
	    }
	  }

        }
  });


  this.importAgendaCard('seeds-of-an-empire', {
  	name : "Seeds of an Empire" ,
  	type : "Law" ,
  	text : "FOR: the player(s) with the most VP gain a VP. AGAINST: the players with the least VP gain a VP" ,
        returnAgendaOptions : function(imperium_self) { return ['for','against']; },
	onPass : function(imperium_self, winning_choice) {

	  let io = imperium_self.returnInitiativeOrder();
 
	  //
	  // highest VP
	  //
	  if (winning_choice === "for") {

	    let highest_vp = 0;
	    for (let i = 0; i < io.length; i++) {
	      if (highest_vp >= imperium_self.game.players_info[io[i]-1].vp) { highest_vp = imperium_self.game.players_info[io[i]-1].vp; }
	      imperium_self.game.state.seeds_of_an_empire = io[i];
	    }

	    for (let i = 0; i < io.length; i++) {
	      if (highest_vp == imperium_self.game.players_info[io[i]-1].vp) {
		imperium_self.game.players_info[io[i]-1].vp += 1;
		imperium_self.game.queue.push("notify\t"+imperium_self.returnFaction((io[i])) + " gains 1 VP from Seeds of an Empire");
	        imperium_self.game.state.seeds_of_an_empire = (io[i]);
		if (imperium_self.checkForVictory()) { return 0; }
	      }
	    }
	    
          }


	  //
	  // lowest VP
	  //
	  if (winning_choice === "against") {

	    let lowest_vp = 10000;
	    for (let i = 0; i < io.length; i++) {
	      if (lowest_vp <= imperium_self.game.players_info[io[i]-1].vp) { highest_vp = imperium_self.game.players_info[io[i]-1].vp; }
	    }

	    for (let i = 0; i < io.length; i++) {
	      if (lowest_vp == imperium_self.game.players_info[io[i]-1].vp) {
		imperium_self.game.players_info[io[i]-1].vp += 1;
		imperium_self.game.queue.push("notify\t"+imperium_self.returnFaction((io[i]+1)) + " gains 1 VP from Seeds of an Empire");
	        imperium_self.game.state.seeds_of_an_empire = (io[i]);
		if (imperium_self.checkForVictory()) { return 0; }

	      }
	    }
	    
          }

	  imperium_self.updateLeaderboard();

	  return 1;
        }
  });


  this.importAgendaCard('space-cadet', {
  	name : "Space Cadet" ,
  	type : "Law" ,
  	text : "Any player more than 3 VP behind the lead must henceforth be referred to as an Irrelevant Loser" ,
        returnAgendaOptions : function(imperium_self) { 
	  let options = [ 'for' , 'against' ];
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    options.push(imperium_self.returnFaction(i+1));
	  }
	  return options;
        },
	initialize : function(imperium_self, winning_choice) {
	  if (imperium_self.game.state.space_cadet == 1) {
	    imperium_self.returnFactionNamePreSpaceCadet = imperium_self.returnFactionName;
	    imperium_self.returnFactionName = function(imperium_self, player) {
	      let max_vp = 0;
	      for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	        if (max_vp > imperium_self.game.players_info[i].vp) {
		  max_vp = imperium_self.game.players_info[i].vp;
		}
	      }
              if (imperium_self.game.players_info[player-1].vp < (max_vp-3)) { return "Irrelevant Loser"; }
              return imperium_self.returnFactionNamePreSpaceCadet(imperium_self, player);
            };
	  }
	},
	onPass : function(imperium_self, winning_choice) {
	  if (winning_choice == 'for') {
	    imperium_self.game.state.space_cadet = 1;
	    let law_to_push = {};
	        law_to_push.agenda = "space-cadet";
	        law_to_push.option = winning_choice;
	    imperium_self.game.state.laws.push(law_to_push);
	    this.initialize(imperium_self);
	  }
	}
  });


  this.importAgendaCard('galactic-threat', {
  	name : "Galactic Threat" ,
  	type : "Law" ,
  	text : "Elect a player. They must henceforth be referred to as the Galatic Threat" ,
        returnAgendaOptions : function(imperium_self) { 
	  let options = [];
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    options.push(imperium_self.returnFaction(i+1));
	  }
	  return options;
        },
	initialize : function(imperium_self, winning_choice) {
	  if (imperium_self.game.state.galactic_threat == 1) {
	    imperium_self.returnFactionNamePreGalacticThreat = imperium_self.returnFactionName;
	    imperium_self.returnFactionName = function(imperium_self, player) {
    	      let factions = imperium_self.returnFactions();
              if (imperium_self.game.state.galactic_threat_player == player) { return "The Galactic Threat"; }
    	      return imperium_self.returnFactionNamePreGalacticThreat(imperium_self, player);
  	    }
	  }
	},
	onPass : function(imperium_self, winning_choice) {
	  imperium_self.game.state.galactic_threat = 1;

	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    if (winning_choice === imperium_self.returnFaction((i+1))) {
	      imperium_self.game.state.galactic_threat_player = i+1;
	    }
	  }

	  let law_to_push = {};
	      law_to_push.agenda = "galactic-threat";
	      law_to_push.option = winning_choice;
	  imperium_self.game.state.laws.push(law_to_push);
	  this.initialize(imperium_self);
	}
  });




  this.importAgendaCard('Committee Formation', {
  	name : "Committee Formation" ,
  	type : "Law" ,
	elect : "player" ,
  	text : "Elect a player. They may form a committee to choose a player to be elected in a future agenda, bypassing voting" ,
        returnAgendaOptions : function(imperium_self) { 
	  let options = [];
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    options.push(imperium_self.returnFaction(i+1));
	  }
	  return options;
        },
	preAgendaStageTriggers : function(imperium_self, player, agenda) {
	  if (imperium_self.game.state.committee_formation == 1 && imperium_self.game.state.committee_formation_player == player) { return 1; }
	  return 0;
	},
	preAgendaStageEvent : function(imperium_self, player, agenda) {

	  let html = "Do you wish to use Committee Formation to select the winner yourself? <ul>";
	      html += '<li class="textchoice" id="yes">assemble the committee</li>';
	      html += '<li class="textchoice" id="no">not this time</li>';
	      html += '</ul>';

	  imperium_self.updateStatus(html);

	  $('.textchoice').off();
	  $('.textchoice').on('click', function() {

	    let action = $(this).attr("id");

	    if (action == "no") { imperium_self.endTurn(); }

	    //
	    // works by "Assassinating all other representatives, so they don't / can't vote"
	    //
	    for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	      if (i != imperium_self.game.player-1) {
                imperium_self.addMove("rider\t"+player+"\tassassinate-representative\t-1");
	      }
	    }
            imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " forms a committee...");
	    

	  });

          return 0;

	},
	onPass : function(imperium_self, winning_choice) {
	  imperium_self.game.state.committee_formation = 1;

	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    if (winning_choice === imperium_self.returnFaction((i+1))) {
	      imperium_self.game.state.committee_formation_player = (i+1);
	    }
	  }

	  let law_to_push = {};
	      law_to_push.agenda = "committee_formation";
	      law_to_push.option = winning_choice;
	  imperium_self.game.state.laws.push(law_to_push);
	}
  });




  this.importAgendaCard('minister-of-policy', {
        name : "Minister of Policy" ,
        type : "Law" ,
	elect : "player" ,
        text : "Elect a player. They draw an extra action card at the start of each round" ,
        returnAgendaOptions : function(imperium_self) {
          let options = [];
          for (let i = 0; i < imperium_self.game.players_info.length; i++) {
            options.push(imperium_self.returnFaction(i+1));
          }
          return options;
        },
        onPass : function(imperium_self, winning_choice) {
          imperium_self.game.state.minister_of_policy = 1;
          imperium_self.game.state.minister_of_policy_player = winning_choice;
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    if (winning_choice === imperium_self.returnFaction((i+1))) {
	      imperium_self.game.state.minister_of_policy_player = i+1;
	    }
	  }
	  imperium_self.game.players_info[imperium_self.game.state.minister_of_policy_player].action_cards_bonus_when_issued++;
        }
  });



  this.importAgendaCard('regulated-bureaucracy', {
  	name : "Regulated Bureaucracy" ,
  	type : "Law" ,
  	text : "Players may have a maximum of 3 action cards in their hands at all times" ,
        returnAgendaOptions : function(imperium_self) { return ['support','oppose']; },
        onPass : function(imperium_self, winning_choice) {
	  if (this.returnAgendaOptions(imperium_self)[winning_choice] == "support") {
	    for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	      imperium_self.game.players_info[i].action_card_limit = 3;
	    }
	  }
	  return 1;
	},
  });

  this.importAgendaCard('fleet-limitations', {
  	name : "Fleet Limitations" ,
  	type : "Law" ,
  	text : "Players may have a maximum of four tokens in their fleet supply." ,
  	img : "/imperium/img/agenda_card_template.png" ,
        returnAgendaOptions : function(imperium_self) { return ['support','oppose']; },
        onPass : function(imperium_self, winning_choice) {
	  if (this.returnAgendaOptions(imperium_self)[winning_choice] == "support") {
	    for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	      imperium_self.game.players_info[i].fleet_supply_limit = 4;
	      if (imperium_self.game.players_info[i].fleet_supply >= 4) { imperium_self.game.players_info[i].fleet_supply = 4; }
	    }
	  }
	  return 1;
	},
  });


  this.importAgendaCard('restricted-conscription', {
  	name : "Restricted Conscription" ,
  	type : "Law" ,
  	text : "Production cost for infantry and fighters is 1 rather than 0.5 resources" ,
  	img : "/imperium/img/agenda_card_template.png" ,
        returnAgendaOptions : function(imperium_self) { return ['support','oppose']; },
        onPass : function(imperium_self, winning_choice) {
	  if (this.returnAgendaOptions(imperium_self)[winning_choice] == "support") {
	    imperium_self.units["infantry"].cost = 1;
	    imperium_self.units["fighter"].cost = 1;
	  }
	  return 1;
	},
  });
  this.importAgendaCard('wormhole-travel-ban', {
  	name : "Wormhole Travel Ban" ,
  	type : "Law" ,
  	text : "All wormholes are closed." ,
  	img : "/imperium/img/agenda_card_template.png" ,
        returnAgendaOptions : function(imperium_self) { return ['support','oppose']; },
        onPass : function(imperium_self, winning_choice) {
	  if (this.returnAgendaOptions(imperium_self)[winning_choice] == "support") {
	    imperium_self.game.state.wormholes_open = 0;
	  }
	  return 1;
	},
  });







/************************************
  
ACTION CARD - types

"action" -> main menu
"bombardment_attacker"
"bombardment_defender"
"combat"
"ground_combat"
"pds" -> before pds fire
"post_pds" -> after pds fire
"pre_agenda" --> before agenda voting
"post_agenda" --> after agenda voting
"space_combat"
"space_combat_victory"
"rider"


************************************/



    this.importActionCard('lost-star-chart', {
  	name : "Lost Star Chart" ,
  	type : "instant" ,
  	text : "During this turn, all wormholes are adjacent to each other" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  imperium_self.game.state.temporary_wormholes_adjacent = 1;
	  return 1;
	},
    });


    this.importActionCard('plague', {
  	name : "Plague" ,
  	type : "action" ,
  	text : "ACTION: Select a planet and destroy infantry on that planet. Roll a dice for each infantry, and destroy those with rolls of 6 or higher." ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlanetWithFilter(
	      "Select a planet to cripple with the plague:",
              function(planet) {
		return imperium_self.doesPlanetHaveInfantry(planet);
              },
	      function(planet) {
		imperium_self.addMove("plague\t"+imperium_self.game.player+"\t"+planet);
		imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " unleashes a plague on " + imperium_self.game.planets[planet].name);
		imperium_self.endTurn();
		return 0;
	      },
	      null
	    );
	  }
	  return 0;
	},
        handleGameLoop : function(imperium_self, qe, mv) {

          if (mv[0] == "plague") {

            let attacker = parseInt(mv[1]);
            let target = mv[2];
	    let sector = imperium_self.game.planets[target].sector;
	    let planet_idx = imperium_self.game.planets[target].idx;
	    let sys = imperium_self.returnSectorAndPlanets(sector);
	    let z = imperium_self.returnEventObjects();
	    let player = sys.p[planet_idx].owner;

            for (let i = 0; i < sys.p[planet_idx].units.length; i++) {
              for (let ii = 0; ii < sys.p[planet_idx].units[i].length; ii++) {
		let thisunit = sys.p[planet_idx].units[i][ii];

		if (thisunit.type == "infantry") {
		  let roll = imperium_self.rollDice(10);
		  if (roll > 6) {
		    thisunit.destroyed = 1;
		    for (z_index in z) {
		      thisunit = z[z_index].unitDestroyed(this, attacker, thisunit);
		    }
		  }
		}
	      }
            }

            imperium_self.eliminateDestroyedUnitsInSector(player, sector);
            imperium_self.saveSystemAndPlanets(sys);
            imperium_self.updateSectorGraphics(sector);
            imperium_self.game.queue.splice(qe, 1);

            return 1;
          }

	  return 1;
        }

    });



    this.importActionCard('repeal-law', {
  	name : "Repeal Law" ,
  	type : "action" ,
  	text : "ACTION: Repeal one law that is in effect." ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

          if (imperium_self.game.player == action_card_player) {
alert("requires implementation");
imperium_self.endTurn();
          }

	  return 0;
        }
    });

    this.importActionCard('veto', {
  	name : "Veto" ,
  	type : "action" ,
  	text : "ACTION: Select one agenda to remove from consideration and draw a replacement" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

          if (imperium_self.game.player == action_card_player) {

            let html = '';
            html += 'Select one agenda to quash in the Galactic Senate.<ul>';
            for (i = 0; i < 3; i++) {
              html += '<li class="option" id="'+imperium_self.game.state.agendas[i]+'">' + imperium_self.agenda_cards[imperium_self.game.state.agendas[i]].name + '</li>';
            }
            html += '</ul>';

            imperium_self.updateStatus(html);

            $('.option').off();
            $('.option').on('mouseenter', function() { let s = $(this).attr("id"); imperium_self.showAgendaCard(s); });
            $('.option').on('mouseleave', function() { let s = $(this).attr("id"); imperium_self.hideAgendaCard(s); });
            $('.option').on('click', function() {

              let agenda_to_quash = $(this).attr('id');

	      imperium_self.hideAgendaCard(agenda_to_quash);

              imperium_self.updateStatus("Quashing Agenda");
              imperium_self.addMove("quash\t"+agenda_to_quash+"\t"+"1"); // 1 = re-deal
              imperium_self.endTurn();
            });
          }

	  return 0;
        }
    });


    this.importActionCard('flank-speed', {
  	name : "Flank Speed" ,
  	type : "instant" ,
  	text : "Gain +1 movement on all ships moved this turn" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  imperium_self.game.players_info[action_card_player-1].temporary_fleet_move_bonus = 1;
	  return 1;
	}
    });



    this.importActionCard('propulsion-research', {
  	name : "Propulsion Research" ,
  	type : "instant" ,
  	text : "Gain +1 movement on a single ship moved this turn" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  imperium_self.game.players_info[action_card_player-1].temporary_ship_move_bonus = 1;
	  return 1;
	}
    });




    this.importActionCard('military-drills', {
  	name : "Military Drills" ,
  	type : "action" ,
  	text : "ACTION: Gain two new command tokens" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {
	    imperium_self.playerAllocateNewTokens(action_card_player, 2);
	  }
	  return 0;
	}
    });



    this.importActionCard('cripple-defenses', {
  	name : "Cripple Defenses" ,
  	type : "action" ,
  	text : "ACTION: Select a planet and destroy all PDS units on that planet" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlanetWithFilter(
	      "Select a planet to destroy all PDS units on that planet: ",
              function(planet) {
		return imperium_self.doesPlanetHavePDS(planet);
              },
	      function(planet) {

		planet = imperium_self.game.planets[planet];
		let sector = planet.sector;
		let tile = planet.tile;	        
		let planet_idx = planet.idx;
		let sys = imperium_self.returnSectorAndPlanets(sector);

		for (let b = 0; b < sys.p[planet_idx].units.length; b++) {
		  for (let bb = 0; bb < sys.p[planet_idx].units[b].length; bb++) {
		    if (sys.p[planet_idx].units[b][bb].type == "pds") {
		      imperium_self.addMove("destroy_unit\t"+imperium_self.game.player+"\t"+(b+1)+"\t"+"ground"+"\t"+sector+"\t"+planet_idx+"\t"+bb+"\t"+"1");
		    }
                  }
                }

		imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " destroys all PDS units destroyed on "+sys.p[planet_idx].name);
		imperium_self.endTurn();
		return 0;

	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });


    this.importActionCard('reactor-meltdown', {
  	name : "Reactor Meltdown" ,
  	type : "action" ,
  	text : "ACTION: Select a non-homeworld planet and destroy and destroy one Space Dock on that planet" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlanetWithFilter(
	      "Select a non-homeworld planet and destroy one Space Dock on that planet: " ,
              function(planet) {
		planet = imperium_self.game.planets[planet];
	        if (planet.hw == 0 && imperium_self.doesPlanetHaveSpaceDock(planet)) {
		  return 1;
		}
              },
	      function(planet) {

alert("H: " + planet);

		planet = imperium_self.game.planets[planet];
		let sector = planet.sector;
		let tile = planet.tile;	        
		let planet_idx = planet.idx;
		let sys = imperium_self.returnSectorAndPlanets(sector);

		for (let b = 0; b < sys.p[planet_idx].units.length; b++) {
		  for (let bb = 0; bb < sys.p[planet_idx].units[b].length; bb++) {
		    if (sys.p[planet_idx].units[b][bb].type == "spacedock") {
		      imperium_self.addMove("destroy_unit\t"+imperium_self.game.player+"\t"+(b+1)+"\t"+"ground"+"\t"+sector+"\t"+planet_idx+"\t"+bb+"\t"+"1");
		    }
                  }
                }

		imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " destroys all Space Docks on "+sys.p[planet_idx].name);
		imperium_self.endTurn();
		return 0;

	      },
	      // cancel -- no space dock available?
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });


    this.importActionCard('lost-mission', {
  	name : "Lost Mission" ,
  	type : "action" ,
  	text : "ACTION: Place 1 Destroyer in a system with no existing ships" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectSectorWithFilter(
	      "Select a sector with no existing ships in which to place a Destroyer: ",
              function(sector) {
		return !imperium_self.doesSectorContainShips(sector);
              },
	      function(sector) {

                imperium_self.addMove("produce\t"+imperium_self.game.player+"\t1\t-1\tdestroyer\t"+sector);
                imperium_self.addMove("notify\tAdding destroyer to gamebaord");
                imperium_self.endTurn();
		return 0;

	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });

    this.importActionCard('accidental-colonization', {
  	name : "Accidental Colonization" ,
  	type : "action" ,
  	text : "ACTION: Gain control of one planet not controlled by any player" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlanetWithFilter(
	      "Select a planet not controlled by another player: ",
              function(planet) {
		planet = imperium_self.game.planets[planet];
		if (planet.owner == -1) { return 1; } return 0;
              },
	      function(planet) {

		planet = imperium_self.game.planets[planet];
		let sector = planet.sector;
                imperium_self.addMove("gain_planet\t"+imperium_self.game.player+"\t"+sector+"\t"+planet.idx);
                imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " gains planet " + planet.name);
                imperium_self.endTurn();
		return 0;

	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });




    this.importActionCard('uprising', {
  	name : "Uprising" ,
  	type : "action" ,
  	text : "ACTION: Exhaust a non-home planet card held by another player. Gain trade goods equal to resource value." ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlanetWithFilter(
	      "Exhaust a non-homeworld planet card held by another player. Gain trade goods equal to resource value." ,
              function(planet) {
		planet = imperium_self.game.planets[planet];
		if (planet.owner != -1 && planet.owner != imperium_self.game.player && planet.exhausted == 0 && planet.hw == 0) { return 1; } return 0;
              },
	      function(planet) {

		planet = imperium_self.game.planets[planet];
		let goods = planet.resources;

                imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tgoods\t"+goods);
                imperium_self.addMove("expend\t"+imperium_self.game.player+"\tplanet\t"+planet);
                imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player) + " exhausting "+imperium_self.game.planets[planet].name + " and gaining " + goods + " trade goods");
                imperium_self.endTurn();
		return 0;

	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });



    this.importActionCard('diaspora-conflict', {
  	name : "Diaspora Conflict" ,
  	type : "action" ,
  	text : "ACTION: Exhaust a non-home planet card held by another player. Gain trade goods equal to resource value." ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlanetWithFilter(
	      "Exhaust a planet card held by another player. Gain trade goods equal to resource value." ,
              function(planet) {
		planet = imperium_self.game.planets[planet];
		if (planet.owner != -1 && planet.owner != imperium_self.game.player && planet.exhausted == 0 && planet.hw ==0) { return 1; } return 0;
              },
	      function(planet) {

		planet = imperium_self.game.planets[planet];
		let goods = planet.resources;

                imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tgoods\t"+goods);
                imperium_self.addMove("expend\t"+imperium_self.game.player+"\tplanet\t"+planet);
                imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player) + " exhausting "+planet.name + " and gaining " + goods + " trade goods");
                imperium_self.endTurn();
		return 0;

	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });



    this.importActionCard('economic-initiative', {
  	name : "Economic Initiative" ,
  	type : "action" ,
  	text : "ACTION: Ready each cultural planet in your control" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  for (let i in imperium_self.game.planets) {
	    if (imperium_self.game.planets[i].owner == action_card_player) {
	      if (imperium_self.game.planets[i].type == "cultural") {
		imperium_self.game.planets[i].exhausted = 0;
	      }
	    }
	  }
	  return 1;
	}
    });


    this.importActionCard('focused-research', {
  	name : "Focused Research" ,
  	type : "action" ,
  	text : "ACTION: Spend 4 Trade Goods to Research 1 Technology" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  let p = imperium_self.game.players_info[imperium_self.game.player-1];

	  if (p.goods < 4) {
	    imperium_self.updateLog("Player does not have enough trade goods to research a technology");
	    return 1;
	  }

	  //
	  // otherwise go for it
	  //
	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerResearchTechnology(function(tech) {
              imperium_self.addMove("purchase\t"+imperium_self.game.player+"\ttech\t"+tech);
              imperium_self.addMove("expend\t"+imperium_self.game.player+"\tgoods\t4");
              imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player) + " researches " + imperium_self.tech[tech].name);
              imperium_self.endTurn();
	    });

	  }
	  return 0;
	}
    });



    this.importActionCard('frontline-deployment', {
  	name : "Frontline Deployment" ,
  	type : "action" ,
  	text : "ACTION: Deploy three infantry on one planet you control" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

          if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlanetWithFilter(
              "Deploy three infantry to a planet you control: ",
              function(planet) {
                if (imperium_self.game.planets[planet].owner == imperium_self.game.player) { return 1; } return 0;
              },
              function(planet) {
		planet = imperium_self.game.planets[planet];
                imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+"1"+"\t"+planet.idx+"\t"+"infantry"+"\t"+planet.sector);
                imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+"1"+"\t"+planet.idx+"\t"+"infantry"+"\t"+planet.sector);
                imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+"1"+"\t"+planet.idx+"\t"+"infantry"+"\t"+planet.sector);
                imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " deploys three infantry to " + planet.name);
                imperium_self.endTurn();
                return 0;
              },
	      function() {
		imperium_self.playerTurn();
	      }
            );
          }
          return 0;
	}
    });



    this.importActionCard('ghost-ship', {
  	name : "Ghost Ship" ,
  	type : "action" ,
  	text : "ACTION: Place a destroyer in a sector with a wormhole and no enemy ships" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

          if (imperium_self.game.player == action_card_player) {

alert("select sector with filter");
            imperium_self.playerSelectSectorWithFilter(
              "Place a destroyer in a sector with a wormhole and no enemy ships: " ,
              function(sector) {
                if (imperium_self.doesSectorContainShips(sector) == 0 && imperium_self.game.sectors[sector].wormhole != 0) { return 1; } return 0;
              },
              function(sector) {
                imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+"1"+"\t"+"-1"+"\t"+"destroyer"+"\t"+sector);
                imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " deploys a destroyer to " + imperium_self.game.sectors[sector].name);
               imperium_self.endTurn();
                return 0;
              },
	      function() {
		imperium_self.playerTurn();
	      }
            );
          }
          return 0;
        }
    });



    this.importActionCard('war-effort', {
  	name : "War Effort" ,
  	type : "action" ,
  	text : "ACTION: Place a cruiser in a sector with one of your ships" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

          if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectSectorWithFilter(
              "Place a cruiser in a sector with one of your ships: " ,
              function(sector) {
                if (imperium_self.doesSectorContainPlayerShips(player, sector) == 1) { return 1; } return 0;
              },
              function(sector) {
                imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+"1"+"\t"+"-1"+"\t"+"cruiser"+"\t"+sector);
                imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " deploys a cruiser to " + imperium_self.game.sectors[sector].name);
                imperium_self.endTurn();
                return 0;
              },
	      function() {
		imperium_self.playerTurn();
	      }
            );
          }
          return 0;
        }
    });





    this.importActionCard('industrial-initiative', {
  	name : "Industrial Initiative" ,
  	type : "action" ,
  	text : "ACTION: Gain a trade good for each industrial planet you control" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  let trade_goods_to_gain = 0;

	  for (let i in imperium_self.game.planets) {
	    if (imperium_self.game.planets[i].owner == action_card_player) {
	      if (imperium_self.game.planets[i].type == "industrial") {
		trade_goods_to_gain++;
	      }
	    }
	  }

	  if (trade_goods_to_gain > 0 ) {
            imperium_self.game.queue.push("purchase\t"+imperium_self.game.player+"\tgoods\t"+goods);
	  }

	  return 1;
	}
    });




    this.importActionCard('Insubordination', {
  	name : "Insubordination" ,
  	type : "action" ,
  	text : "ACTION: Select a player and remove 1 token from their command pool" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlayerWithFilter(
	      "Select a player and remove one token from their command pool: " ,
              function(player) {
	        if (player != imperium_self.game.player) { return 1; } return 0;
              },
	      function(player) {
                imperium_self.addMove("expend\t"+player+"\tcommand\t"+"1");
		imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " loses one comand token");
		imperium_self.endTurn();
		return 0;
	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
        }
    });




    this.importActionCard('Lucky Shot', {
  	name : "Lucky Shot" ,
  	type : "action" ,
  	text : "ACTION: Destroy a destroyer, cruiser or dreadnaught in a sector with a planet you control" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectSectorWithFilter(
	      "Destroy a destroyer, cruiser or dreadnaught in a sector containing a planet you control: " ,
              function(sector) {
  		if (imperium_self.doesSectorContainPlanetOwnedByPlayer(sector, imperium_self.game.player)) {
  		  if (imperium_self.doesSectorContainUnit(sector, "destroyer") || imperium_self.doesSectorContainUnit(sector, "cruiser") || imperium_self.doesSectorContainUnit(sector, "dreadnaught")) {
		    return 1;
		  }
		}
		return 0;
              },
	      function(sector) {

                imperium_self.playerSelectUnitInSectorWithFilter(
	          "Select a ship in this sector to destroy: " ,
		  sector,
                  function(unit) {
		    if (unit.type == "destroyer") { return 1; }
		    if (unit.type == "cruiser") { return 1; }
		    if (unit.type == "dreadnaught") { return 1; }
		    return 0;
                  },
	          function(unit_info) {

		    let s = unit_info.sector;
		    let p = parseInt(unit_info.unit.owner);
		    let uidx = unit_info.unit_idx;

		    let sys = imperium_self.returnSectorAndPlanets(s);
		    let unit_to_destroy = unit_info.unit;

                    imperium_self.addMove("destroy_unit\t"+imperium_self.game.player+"\t"+unit_to_destroy.owner+"\t"+"space"+"\t"+s+"\t"+"-1"+"\t"+uidx+"\t"+"1");
		    imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " destroys a " + unit_to_destroy.name + " in " + sys.name);
		    imperium_self.endTurn();
		    return 0;
	          },
	          null
	        );
	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
        }
    });





    this.importActionCard('mining-initiative-ac', {
  	name : "Mining Initiative" ,
  	type : "action" ,
  	text : "ACTION: Gain trade goods equal to the highest resource value planet you control" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {

   	    let maximum_resources = 0;
	    for (let i in imperium_self.game.planets) {
	      if (imperium_self.game.planets[i].owner == action_card_player && imperium_self.game.planets[i].resources > maximum_resources) {
		maximum_resources = imperium_self.game.planets[i].resources;
	      }
	    }

            imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tgoods\t"+maximum_resources);
            imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player) + " gainst " + maximum_resources + " trade goods");
            imperium_self.endTurn();
	    return 0;

	  }
	  return 0;
	}
    });




    this.importActionCard('rise-of-a-messiah', {
  	name : "Rise of a Messiah" ,
  	type : "action" ,
  	text : "ACTION: Add one infantry to each planet player controls" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  for (let i in imperium_self.game.planets) {
	    if (imperium_self.game.planets[i].owner == action_card_player) {
	      imperium_self.updateLog(imperium_self.returnFaction(action_card_player) + " adds 1 infantry to " + imperium_self.game.planets[i].name);
	      imperium_self.addPlanetaryUnit(action_card_player, imperium_self.game.planets[i].sector, imperium_self.game.planets[i].idx, "infantry");
	    }
	  }
	  return 1;
	}
    });



    this.importActionCard('unstable-planet', {
  	name : "Unstable Planet" ,
  	type : "action" ,
  	text : "ACTION: Choose a hazardous planet and exhaust it. Destroy 3 infantry on that planet if they exist" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlanetWithFilter(
	      "Select a hazardous planet and exhaust it. Destroy 3 infantry on that planet if they exist" ,
              function(planet) {
		planet = imperium_self.game.planets[planet];
	        if (planet.type == "hazardous") { return 1; } return 0;
              },
	      function(planet) {
                imperium_self.addMove("expend\t"+player+"\tplanet\t"+planet);

		let planet_obj   = imperium_self.game.planets[planet];	
		let planet_owner = parseInt(planet_obj.owner);
		let planet_res   = parseInt(planet_obj.resources);

		let infantry_destroyed = 0;

		if (planet_owner >= 0) {
		  for (let i = 0; i < planet_obj.units[planet_owner-1].length; i++) {
		    if (infantry_destroyed > 3) {
		      if (planet_obj.units[planet_owner-1][i].type == "infantry") {
		        imperium_self.addMove("destroy\t"+action_card_player+"\t"+planet_owner+"\t"+"ground"+"\t"+planet_obj.sector+"\t"+planet_obj.idx+"\t"+"1");
		      }
		    }
		  }
		}
                imperium_self.addMove("purchase\t"+action_card_player+"\tgoods\t"+planet_res);
		imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " gains " + planet_res + " trade goods");
		imperium_self.endTurn();
		return 0;
	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });






    this.importActionCard('Covert Operation', {
  	name : "Covert Operation" ,
  	type : "action" ,
  	text : "ACTION: Choose a player. They give you one of their action cards, if possible" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectPlayerWithFilter(
	      "Select a player. They give you one of their action cards: ",
              function(player) {
	        if (player != imperium_self.game.player) { return 1; } return 0;
              },
	      function(player) {
                imperium_self.addMove("pull\t"+imperium_self.game.player+"\t"+player+"\t"+"action"+"\t"+"random");
		imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " pulls a random action card from " + imperium_self.returnFaction(player));
		imperium_self.endTurn();
		return 0;
	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });




    this.importActionCard('tactical-bombardment', {
  	name : "Tactical Bombardment" ,
  	type : "action" ,
  	text : "ACTION: Choose a sector in which you have ships with bombardment. Exhaust all planets in that sector" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectSectorWithFilter(
	      "Select a sector in which you have ships with bombardment. Exhaust all planets in that sector" ,
              function(sector) {
	        if (imperium_self.doesSectorContainPlayerUnit(player, sector, "dreadnaught") == 1) { return 1; }
	        if (imperium_self.doesSectorContainPlayerUnit(player, sector, "warsun") == 1) { return 1; }
		return 0;
              },

	      function(sector) {

		let planets_in_sector = imperium_self.game.sectors[sector].planets;
		for (let i = 0; i < planets_in_sector.length; i++) {
                  imperium_self.addMove("expend\t"+player+"\tplanet\t"+planets_in_sector[i]);
		  imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " exhausts " + imperium_self.game.planets[planets_in_sector[i]].name);
		}
		imperium_self.endTurn();
		return 0;
	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });




    this.importActionCard('signal-jamming', {
  	name : "Signal Jamming" ,
  	type : "action" ,
  	text : "ACTION: Choose a player. They must activate a system in or next to a system in which you have a ship" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectSectorWithFilter(
	      "Select a sector in which you have a ship or one adjacent to one: ",
              function(sector) {
	        if (imperium_self.isPlayerShipAdjacentToSector(action_card_player, sector)) {
		  return 1;
		}
	        return 0;
              },
	      function(sector) {

            	imperium_self.playerSelectPlayerWithFilter(
	          "Select a player to signal jam in that sector: " ,
                  function(p) {
	            if (p != imperium_self.game.player) { return 1; } return 0;
                  },
	          function(p) {
                    imperium_self.addMove("activate\t"+p+"\t"+sector);
		    imperium_self.addMove("notify\t" + imperium_self.returnFaction(p) + " suffers signal jamming in " + imperium_self.game.sectors[sector].name);
		    imperium_self.endTurn();
		    return 0;
	          },
	          null
	        );
	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });


    this.importActionCard('unexpected-action', {
  	name : "Unexpected Action" ,
  	type : "action" ,
  	text : "ACTION: Deactivate a stystem you have activated. Gain one command or strategy token: ", 
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectSectorWithFilter(
	      "Select a hazardous planet and exhaust it. Destroy 3 infantry on that planet if they exist" ,
              function(sector) {
		if (imperium_self.game.sectors[sector].activated[action_card_player-1] == 1) {
		  return 1;
		}
              },
	      function(planet) {
                imperium_self.addMove("purchase\t"+action_card_player+"\tcommand\t"+"1");
                imperium_self.addMove("deactivate\t"+action_card_player+"\t"+sector);
                imperium_self.addMove("notify\t"+imperium_self.returnFaction(action_card_player) + " deactivates " + imperium_self.game.sectors[sector].name);
		imperium_self.endTurn();
		return 0;
	      },
	      function() {
		imperium_self.playerTurn();
	      }
	    );
	  }
	  return 0;
	}
    });




    this.importActionCard('in-the-silence-of-space', {
  	name : "In the Silence of Space" ,
  	type : "instant" ,
  	text : "Your ships may move through sectors with other player ships this turn: " ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  imperium_self.game.players_info[action_card_player-1].temporary_move_through_sectors_with_opponent_ships = 1;
	  return 1;
	}
    });



    this.importActionCard('sabotage', {
  	name : "Sabotage" ,
  	type : "action_card" ,
  	text : "When another player plays an action card, you may cancel that action card" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  //
	  // this runs in actioncard post...
	  //
          if (imperium_self.game.player == action_card_player) {
	    // remove previous action card
	    imperium_self.addMove("resolve\t"+"action_card");
	    imperium_self.addMove("resolve\t"+"action_card_post");
	  }

	  return 0;
	}
    });


    this.importActionCard('bunker', {
  	name : "Bunker" ,
  	type : "bombardment_defender" ,
  	text : "During this bombardment, attacker gets -4 applied to each bombardment roll." ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    imperium_self.game.players_info[i].temporary_bombardment_combat_roll_modifier = -4;
	  }
	  return 1;
	}
    });


    this.importActionCard('thunder-from-the-heavens', {
  	name : "Thunder from the Heavens" ,
  	type : "bombardment_attacker" ,
  	text : "During this bombardment, attacker gets +2 applied to each bombardment roll." ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  for (let i = 0; i < imperium_self.game.players_info.length; i++) {
	    imperium_self.game.players_info[i].temporary_bombardment_combat_roll_modifier = 2;
	  }
	  return 1;
	}
    });



    this.importActionCard('fire-team', {
  	name : "Fire Team" ,
  	type : "ground_combat" ,
  	text : "Reroll up to 15 dice during this round of ground combat" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  imperium_self.game.players_info[action_card_player-1].combat_dice_reroll = 15; // 15 
	  return 1;

	}
    });


    this.importActionCard('parley', {
  	name : "Parley" ,
  	type : "ground_combat" ,
  	text : "Return invading infantry to space if player ships exist in the sector" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	
	  if (player == action_card_player) {

	    let sector = imperium_self.game.state.ground_combat_sector;
	    let planet_idx = imperium_self.game.state.ground_combat_planet_idx;
	    let attacker = imperium_self.game.state.ground_combat_attacker;

	    let sys = imperium_self.returnSectorAndPlanets(sector);

	    let attacker_infantry = sys.p[planet_idx].units[attacker-1];
	    sys.p[planet_idx].units[attacker-1] = [];;

	    for (let i = 0; i < sys.s.units[attacker-1].length; i++) {
	      while (imperium_self.returnRemainingCapacity(sys.s.units[attacker-1][i]) > 0 && attacker_infantry.length > 0) {
		imperium_self.loadUnitByJSONOntoShip(attacker, sector, i, JSON.stringify(attacker_infantry[0]));
	        attacker_infantry.splice(0, 1);
	      }
	    }

	  }

	  imperium_self.updateSectorGraphics(sector);
	  return 1;

	}

    });




    this.importActionCard('distinguished-councillor', {
  	name : "Distinguished Coucillor" ,
  	type : "post_agenda" ,
  	text : "After the speaker has cast his votes, cast an additional 5 votes" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

          imperium_self.game.state.votes_cast[action_card_player-1] += 5;
	  imperium_self.updateLog(imperium_self.returnFaction(action_card_player) + " casts an additional 5 votes with Distinguished Councillor");

	  return 1;

	}
    });


    this.importActionCard('bribery', {
  	name : "Bribery" ,
  	type : "post_agenda" ,
  	text : "After the speaker has cast his vote, spend any number of trade goods to purchase the same number of additional voutes" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {

	    let html  = '<div class="sf-readable">Spend any number of trade goods to purchase additional votes: </div><ul>';
	    for (let i = 0; i < imperium_self.game.players_info[action_card_player-1].goods+1; i++) {
	      if (i == 1) { html   += '<li class="textchoice">'+i+' vote</li>'; }
	      else { html   += '<li class="textchoice">'+i+' votes</li>'; }
	    }
	    html += '</ul>';

	    imperium_self.updateStatus(html);

	    $('.textchoice').off();
	    $('.textchoice').on('click', function() {

	      let action = $(this).attr("id");

	      imperium_self.addMove("bribery\t"+action_card_player+"\t"+action);
	      imperium_self.endTurn();
	    });

	  }

	  return 0;

	},

	handleGameLoop : function(imperium_self, qe, mv) {

	  if (mv[0] == "bribery") {

	    let bribing_player = parseInt(mv[1]);
	    let goods_spent = parseInt(mv[2]);
	    imperium_self.game.queue.splice(qe, 1);

	    imperium_self.game.state.votes_cast[bribing_player-1].votes += goods_spent;
	    imperium_self.game.players_info[bribing_player-1].goods -= goods_spent;
	    if (goods_spent == 1) {
	      imperium_self.updateLog(imperium_self.returnFaction(bribing_player) + " bribes the Council for " + goods_spent + " additional vote");
	    } else {
	      imperium_self.updateLog(imperium_self.returnFaction(bribing_player) + " bribes the Council for " + goods_spent + " additional votes");
	    }

	    return 1;
	  }

	  return 1;

	}
    });






    //
    // invisible and unwinnable rider attached to prevent voting
    //
    this.importActionCard('assassinate-representative', {
  	name : "Assassinate Representative" ,
  	type : "pre_agenda" ,
  	text : "Chose a player. That player cannot vote on the Agenda" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (action_card_player == imperium_self.game.player) {

            imperium_self.playerSelectPlayerWithFilter(
              "Select a player who will not be able to vote on this Agenda: " ,
              function(player) {
                if (player != imperium_self.game.player) { return 1; } return 0;
              },
              function(player) {
                imperium_self.addMove("rider\t"+player+"\tassassinate-representative\t-1");
                //imperium_self.addMove("assassinate_representative\t"+imperium_self.game.player+"\t"+player);
                imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " assassinates the voting representative of " + imperium_self.returnFaction(player));
                imperium_self.endTurn();
                return 0;
              },
              null,
            );
	  }
	  return 0;
        },
    });




    this.importActionCard('ancient-burial-sites', {
  	name : "Ancient Burial Sites" ,
  	type : "pre_agenda" ,
  	text : "Chose a player. That player loses a maximum of four votes on this agenda" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (action_card_player == imperium_self.game.player) {

            imperium_self.playerSelectPlayerWithFilter(
              "Select a player to lose 4 votes: " ,
              function(player) {
                if (player != imperium_self.game.player) { return 1; } return 0;
              },
              function(player) {
                imperium_self.addMove("ancient_burial\t"+imperium_self.game.player+"\t"+player);
                imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " finds soe dirt on the voting representative of " + imperium_self.returnFaction(player));
                imperium_self.endTurn();
                return 0;
              },
              null,
            );
	  }
	  return 0;
        },
        handleGameLoop : function(imperium_self, qe, mv) {

          if (mv[0] == "ancient_burial") {

            let player = parseInt(mv[1]);
            let target = parseInt(mv[2]);
            imperium_self.game.queue.splice(qe, 1);

            imperium_self.game.state.votes_available[target-1] -= 4;
            if (imperium_self.game.state.votes_available[target-1] < 0) { 
              imperium_self.game.state.votes_available[target-1] = 0;
            }

            return 1;
          }

	  return 1;
        }

    });







    this.importActionCard('leadership-rider', {
  	name : "Leadership Rider" ,
  	type : "rider" ,
  	text : "Gain two strategy tokens and 1 command token" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {
	    let active_agenda = imperium_self.returnActiveAgenda();
	    let choices = imperium_self.agenda_cards[active_agenda].returnAgendaOptions(imperium_self);
	    let elect = imperium_self.agenda_cards[active_agenda].elect;
            let msg  = 'On which choice do you wish to place your Leadership rider?';
	    imperium_self.playerSelectChoice(msg, choices, elect, function(choice) {
	      imperium_self.addMove("rider\t"+imperium_self.game.player+"\t"+"diplomacy-rider"+"\t"+choice);
	      imperium_self.addMove("notify\t"+imperium_self.game.player+" has placed a Leadership Rider on "+choice);
	      imperium_self.endTurn();
	    });
	  }
	  return 0;
	},
	playActionCardEvent : function(imperium_self, player, action_card_player, card) {
          imperium_self.game.players_info[action_card_player-1].strategy_tokens += 2;
          imperium_self.game.players_info[action_card_player-1].command_tokens += 1;
	  imperium_self.updateLog(imperium_self.returnFaction(action_card_player) + " gains 2 strategy tokens and 1 command token");
	  return 1;
	}
    });






    this.importActionCard('diplomacy-rider', {
  	name : "Diplomacy Rider" ,
  	type : "rider" ,
  	text : "Select a planet and destroy all PDS units on that planet" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

	    let active_agenda = imperium_self.returnActiveAgenda();
	    let choices = imperium_self.agenda_cards[active_agenda].returnAgendaOptions(imperium_self);
	    let elect = imperium_self.agenda_cards[active_agenda].elect;

            let msg  = 'On which choice do you wish to place your Diplomacy rider?';
	    imperium_self.playerSelectChoice(msg, choices, elect, function(choice) {
	      imperium_self.addMove("rider\t"+imperium_self.game.player+"\t"+"diplomacy-rider"+"\t"+choice);
	      imperium_self.addMove("notify\t"+imperium_self.game.player+" has placed a Diplomacy Rider on "+choice);
	      imperium_self.endTurn();
	    });
	  }
	  return 0;
	},
	playActionCardEvent : function(imperium_self, player, action_card_player, card) {

	  //
	  // rider is executed
	  //
	  if (action_card_player == imperium_self.game.player) {

            imperium_self.playerSelectSectorWithFilter(
              "Select a sector with a planet you control to mire in diplomatic conflict: ",
              function(sector) {
		for (let i = 0; i < imperium_self.game.sectors[sector].planets.length; i++) {
  		  if (imperium_self.game.planets[imperium_self.game.sectors[sector].planets[i]].owner == imperium_self.game.player) { return 1; } return 0;
                }
              },
              function(sector) {
                for (let b = 0; b < imperium_self.game.players_info.length; b++) {
                  imperium_self.addMove("activate\t"+(b+1)+"\t"+sector);
                }
                imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " uses Diplomacy Rider to protect " + sector);
                imperium_self.endTurn();
                return 0;
              },
              null
            );
	  }
	  return 0;
	}
    });





    this.importActionCard('politics-rider', {
  	name : "Politics Rider" ,
  	type : "rider" ,
  	text : "Gain three action cards and the speaker token" ,
        playActionCard : function(imperium_self, player, action_card_player, card) {
          if (imperium_self.game.player == action_card_player) {
            let active_agenda = imperium_self.returnActiveAgenda();
            let choices = imperium_self.agenda_cards[active_agenda].returnAgendaOptions(imperium_self);
            let elect = imperium_self.agenda_cards[active_agenda].elect;
            let msg  = 'On which choice do you wish to place your Politics rider?';
            imperium_self.playerSelectChoice(msg, choices, elect, function(choice) {
              imperium_self.addMove("rider\t"+imperium_self.game.player+"\t"+"politics-rider"+"\t"+choice);
              imperium_self.addMove("notify\t"+imperium_self.game.player+" has placed a Politics Rider on "+choice);
              imperium_self.endTurn();
            });
          }
          return 0;
        },
	playActionCardEvent : function(imperium_self, player, action_card_player, card) {
	
	  if (imperium_self.game.player == action_card_player) {

	    // three action cards
            imperium_self.addMove("gain\t"+imperium_self.game.player+"\taction_cards\t3");
            imperium_self.addMove("DEAL\t2\t"+imperium_self.game.player+"\t3");
            imperium_self.addMove("notify\tdealing two action cards to player "+player);

	    // and change speaker
	    let html = 'Make which player the speaker? <ul>';
            for (let i = 0; i < imperium_self.game.players_info.length; i++) {
              html += '<li class="textchoice" id="'+i+'">' + factions[imperium_self.game.players_info[i].faction].name + '</li>';
            }
            html += '</ul>';
            imperium_self.updateStatus(html);

            let chancellor = imperium_self.game.player;

            $('.textchoice').off();
            $('.textchoice').on('click', function() {
              let chancellor = (parseInt($(this).attr("id")) + 1);
	      imperium_self.addMove("change_speaker\t"+chancellor);
	      imperium_self.endTurn();
	    });
	  } 

 	  return 0;
	}
    });




    this.importActionCard('construction-rider', {
  	name : "Construction Rider" ,
  	type : "rider" ,
  	text : "Player gains 1 VP" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  if (action_card_player == imperium_self.game.player) {

            let active_agenda = imperium_self.returnActiveAgenda();
            let choices = imperium_self.agenda_cards[active_agenda].returnAgendaOptions(imperium_self);
            let elect = imperium_self.agenda_cards[active_agenda].elect;

            let msg = 'On which choice do you wish to place the Construction rider?';
            imperium_self.playerSelectChoice(msg, choices, elect, function(choice) {
              imperium_self.addMove("rider\t"+imperium_self.game.player+"\t"+"construction-rider"+"\t"+choice);
              imperium_self.addMove("notify\t"+imperium_self.game.player+" has placed a Construction Rider on "+choice);
              imperium_self.endTurn();
            });

	  }
	  return 0;
	},
	playActionCardEvent : function(imperium_self, player, action_card_player, card) {
	  if (action_card_player == imperium_self.game.player) {
            imperium_self.playerSelectPlanetWithFilter(
              "Select a planet you control without a Space Dock: ",
              function(planet) {
  		if (imperium_self.game.planets[planet].owner == imperium_self.game.player && imperium_self.doesPlanetHaveSpaceDock(planet) == 0) { return 1; } return 0;
              },
              function(planet) {
                imperium_self.addMove("produce\t"+imperium_self.game.player+"\t1\t"+imperium_self.game.planets[planet].idx+"\t"+"spacedock"+"\t"+imperium_self.game.planets[planet].sector);
                imperium_self.addMove("notify\t" + imperium_self.returnFaction(imperium_self.game.player) + " builds a Space Dock in " + imperium_self.game.sectors[imperium_self.game.planets[planet].sector].name);
                imperium_self.endTurn();
                return 0;
              },
              null
            );
	  }
	  return 0;
	}
    });



    this.importActionCard('trade-rider', {
  	name : "Trade Rider" ,
  	type : "rider" ,
  	text : "Select a planet and destroy all PDS units on that planet" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

	    let active_agenda = imperium_self.returnActiveAgenda();

            let html  = 'On which choice do you wish to place your Trade rider?';
	    let choices = imperium_self.agenda_cards[active_agenda].returnAgendaOptions(imperium_self);
	    let elect = imperium_self.agenda_cards[active_agenda].elect;
	    imperium_self.playerSelectChoice(html, choices, elect, function(choice) {
	      imperium_self.addMove("rider\t"+imperium_self.game.player+"\t"+"trade-rider"+"\t"+choice);
	      imperium_self.endTurn();
	    });
	  }
 
 	  return 0;
	},
	playActionCardEvent(imperium_self, player, action_card_player, card) {
	  imperium_self.game.queue.push("purchase\t"+action_card_player+"\t"+"goods"+"\t"+5);
	  imperium_self.game.queue.push(returnFaction(imperium_self.game.player) + " gains 5 Trade Goods through their Trade Rider");
	  return 1;
	}
    });




    this.importActionCard('warfare-rider', {
  	name : "Warfare Rider" ,
  	type : "rider" ,
  	text : "Place a dreadnaught in a system with one of your ships: " ,
        playActionCard : function(imperium_self, player, action_card_player, card) {

          if (imperium_self.game.player == action_card_player) {

            let active_agenda = imperium_self.returnActiveAgenda();

            let msg  = 'On which choice do you wish to place your Warfare Rider?';
            let choices = imperium_self.agenda_cards[active_agenda].returnAgendaOptions(imperium_self);
            let elect = imperium_self.agenda_cards[active_agenda].elect;
            imperium_self.playerSelectChoice(msg, choices, elect, function(choice) {
              imperium_self.addMove("rider\t"+imperium_self.game.player+"\t"+"warfare-rider"+"\t"+choice);
              imperium_self.endTurn();
            });
          }

          return 0;
        },
	playActionCardEvent : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

            imperium_self.playerSelectSectorWithFilter(
              "Select a sector which contains at least one of your ships: ",
              function(sector) {
                return imperium_self.doesSectorContainPlayerShips(action_card_player, sector);
              },
              function(sector) {

                imperium_self.addMove("produce\t"+imperium_self.game.player+"\t1\t-1\tdreadnaught\t"+sector);
                imperium_self.addMove("notify\tAdding dreadnaught to board");
                imperium_self.endTurn();
                return 0;

              },
              null
            );
          }
	  return 0;
	}
    });


    this.importActionCard('technology-rider', {
  	name : "Technology Rider" ,
  	type : "rider" ,
  	text : "Select a planet and destroy all PDS units on that planet" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

	    let active_agenda = imperium_self.returnActiveAgenda();

            let msg  = 'On which choice do you wish to place your Technology rider?';
	    let choices = imperium_self.agenda_cards[active_agenda].returnAgendaOptions(imperium_self);
	    let elect = imperium_self.agenda_cards[active_agenda].elect;
	    imperium_self.playerSelectChoice(msg, choices, elect, function(choice) {
	      imperium_self.addMove("rider\t"+imperium_self.game.player+"\t"+"technology-rider"+"\t"+choice);
	      imperium_self.endTurn();
	    });
	  }
 
 	  return 0;
	},
	playActionCardEvent : function(imperium_self, player, action_card_player, card) {
	  if (imperium_self.game.player == action_card_player) {
	    imperium_self.playerResearchTechnology(function(tech) {
	      imperium_self.endTurn();
	    });
	  } 
 	  return 0;
	}
    });


    this.importActionCard('imperial-rider', {
  	name : "Imperial Rider" ,
  	type : "rider" ,
  	text : "Player gains 1 VP" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player == action_card_player) {

	    let active_agenda = imperium_self.returnActiveAgenda();
	    let choices = imperium_self.agenda_cards[active_agenda].returnAgendaOptions(imperium_self);
	    let elect = imperium_self.agenda_cards[active_agenda].elect;

            let msg = 'On which choice do you wish to place the Imperial rider?';	
	    imperium_self.playerSelectChoice(msg, choices, elect, function(choice) {
	      imperium_self.addMove("rider\t"+imperium_self.game.player+"\t"+"imperial-rider"+"\t"+choice);
	      imperium_self.addMove("notify\t"+imperium_self.game.player+" has placed an Imperial Rider on "+choice);
	      imperium_self.endTurn();
	    });

	  }

	},
	playActionCardEvent : function(imperium_self, player, action_card_player, card) {
          imperium_self.game.players_info[action_card_player-1].vp += 1;
          imperium_self.game.players_info[action_card_player-1].objectives_scored.push("imperial-rider");
	  return 1;
	}
    });






    this.importActionCard('salvage', {
  	name : "Salvage" ,
  	type : "space_combat_victory" ,
  	text : "If you win a space combat, opponent gives you all their commodities" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (player == action_card_player) {

  	    let a = imperium_self.game.players_info[imperium_self.game.state.space_combat_attacker];
	    let d = imperium_self.game.players_info[imperium_self.game.state.space_combat_defender];


	    if (d.commodities > 0) {
	      a.goods += d.commodities;
	      imperium_self.updateLog(imperium_self.returnFaction(imperium_self.game.state.space_combat_attacker) + " takes " + d.commodities + " in trade goods from commodities lost in combat");
	      d.commodities = 0;
	    }
	  
	    return 1;
	  }
        }
    });



    this.importActionCard('shields-holding', {
  	name : "Shields Holding" ,
  	type : "space_combat" ,
  	text : "Cancel 2 hits in Space Combat" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  imperium_self.game.state.assign_hits_to_cancel+=2;
	  return 1;
	}
    });


    this.importActionCard('maneuvering-jets', {
  	name : "Maneuvering Jets" ,
  	type : "post_pds" ,
  	text : "Cancel 1 hit from a PDS firing upon your ships" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {
	  imperium_self.game.state.assign_hits_to_cancel++;
	  return 1;
	}
    });



    this.importActionCard('emergency-repairs', {
  	name : "Emergency Repairs" ,
  	type : "space_combat" ,
  	text : "Repair all damaged ships not at full strength" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  //
	  // repairs all non-full-strength units for the action_card_player
	  //
          let sys = imperium_self.returnSectorAndPlanets(imperium_self.game.state.space_combat_sector);
	  for (let i = 0; i < sys.s.units[action_card_player-1].length; i++) {
	    if (sys.s.units[action_card_player-1][i].strength < sys.s.units[action_card_player-1][i].max_strength) {
	      sys.s.units[action_card_player-1][i].strength = sys.s.units[action_card_player-1][i].max_strength;
	    }
	  }

	  return 1;

	}

    });

    this.importActionCard('direct-hit', {
  	name : "Direct Hit" ,
  	type : "space_combat" ,
  	text : "Destroy a ship that is damaged or not at full strength" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  //
	  // repairs all non-full-strenght units for the action_card_player
	  //
	  let z = imperium_self.returnEventObjects();
          let sys = imperium_self.returnSectorAndPlanets(imperium_self.game.state.space_combat_sector);
	  for (let p = 0; p < sys.s.units.length; p++) {
	    if (p != (action_card_player-1)) {

	      for (let i = 0; i < sys.s.units[p].length; i++) {

	        if (sys.s.units[p][i].strength < sys.s.units[action_card_player-1][i].max_strength) {

	          sys.s.units[p][i].strength = 0;
	          sys.s.units[p][i].strength = 0;

                  for (let z_index in z) {
                    z[z_index].unitDestroyed(imperium_self, attacker, sys.p.units[p][i]);
                  }

	          imperium_self.eliminateDestroyedUnitsInSector((p+1), sector);
        	  imperium_self.saveSystemAndPlanets(sys);
        	  imperium_self.updateSectorGraphics(sector);

		  i = sys.s.units[p].length+2;
	        }
	      }

	    }
	  }

	  return 1;

	}
    });

    this.importActionCard('experimental-fighter-prototype', {
  	name : "Experimental Fighter Prototype" ,
  	type : "space_combat" ,
  	text : "Your fighters get +2 on their combat rolls for a single round of space combat" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

          let sys = imperium_self.returnSectorAndPlanets(imperium_self.game.state.space_combat_sector);
	  for (let p = 0; p < sys.s.units[action_card_player-1].length; p++) {
            let unit = sys.s.units[action_card_player-1][p];
	    if (unit.type == "fighter") {
	      unit.temporary_combat_modifier += 2;
	    }
	  }

	  return 1;

	}

    });


    this.importActionCard('moral-boost', {
  	name : "Moral Boost" ,
  	type : "combat" ,
  	text : "Apply +1 to each of your units' combat rolls during this round of combat" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.state.space_combat_sector) {
            let sys = imperium_self.returnSectorAndPlanets(imperium_self.game.state.space_combat_sector);
	    for (let i = 0; i < sys.s.units[action_card_player-1].length; i++) {
              let unit = sys.s.units[action_card_player-1][i];
	      unit.temporary_combat_modifier += 1;
	    }
	  }

	  if (imperium_self.game.state.ground_combat_sector) {
	    if (imperium_self.game.state.ground_combat_planet_idx) {
              let sys = imperium_self.returnSectorAndPlanets(imperium_self.game.state.space_combat_sector);
	      for (let p = 0; i < sys.p.length; p++) {
	        for (let i = 0; i < sys.p[p].units[action_card_player-1].length; i++) {
                  let unit = sys.p[p].units[action_card_player-1][i];
	          unit.temporary_combat_modifier += 1;
	        }
	      }
	    }
	  }
	  return 1;
        }
    });







    this.importActionCard('skilled-retreat', {
  	name : "Skilled Retreat" ,
  	type : "space_combat" ,
  	text : "Apply +1 to each of your units' combat rolls during this round of combat" ,
	playActionCard : function(imperium_self, player, action_card_player, card) {

	  if (imperium_self.game.player != action_card_player) {

            let sector = imperium_self.game.state.space_combat_sector;
	    let adjacents = imperium_self.returnAdjacentSectors(sector);

            imperium_self.playerSelectSectorWithFilter(
              "Select an adjacent sector without opponent ships into which to retreat: " ,
              function(s) {
console.log("Sector to ask about: " + s + " --- " + sector);
	        if (imperium_self.areSectorsAdjacent(sector, s) && s != sector) {
	          if (!imperium_self.doesSectorContainNonPlayerShips(s)) { return 1; }
	        }
	        return 0; 
              },
              function(s) {
	        imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player) + " makes skilled retreat into " + imperium_self.game.sectors[s].name);
	        imperium_self.addMove("activate\t"+imperium_self.game.player+"\t"+s);
	        imperium_self.playerSelectUnitsToMove(s);
              },
	      function() {
		imperium_self.addMove("notify\tno suitable sectors available for skilled retreat");
		imperium_self.endTurn();
	      }
            );
          }
	  return 0;
        }
    });







  

  } // end initializeGameObjects



  initializeHTML(app) {
    super.initializeHTML(app);
    this.app.modules.respondTo("chat-manager").forEach(mod => {
      mod.respondTo('chat-manager').render(app, this);
      mod.respondTo('chat-manager').attachEvents(app, this);
    });
    $('.content').css('visibility', 'visible');
  }



  
  async initializeGame(game_id) {

    this.updateStatus("loading game...: " + game_id);
    this.loadGame(game_id);

    if (this.game.status != "") { this.updateStatus(this.game.status); }
    if (this.game.log != "") { 
      if (this.game.log.length > 0) {
        for (let i = this.game.log.length-1; i >= 0; i--) {
	  this.updateLog(this.game.log[i]);
        }
      }
    }
  
    //
    // specify players
    //
    this.totalPlayers = this.game.players.length;  


    //
    // initialize cross-game components
    //
    // this.tech
    // this.factions
    // this.units
    // this.strategy_cards
    // this.agenda_cards
    // this.action_cards
    // this.stage_i_objectives
    // this.stage_ii_objectives
    // this.secret_objectives
    //

    //
    // initialize game objects /w functions
    //
    //
    this.initializeGameObjects();

    //
    // put homeworlds on board
    //
    let hwsectors = this.returnHomeworldSectors(this.totalPlayers);


    //
    // IF THIS IS A NEW GAME
    //
    if (this.game.board == null) {
  
      //
      // dice
      //
      this.initializeDice();


      //
      // players first
      //
      this.game.players_info = this.returnPlayers(this.totalPlayers); // factions and player info


      //
      // initialize game state
      //
      // this.game.state
      // this.game.planets
      // this.game.sectors
      //
      this.game.state   = this.returnState();
      this.game.sectors = this.returnSectors();
      this.game.planets = this.returnPlanets();

      //
      // create the board
      //
      this.game.board = {};
      for (let i = 1, j = 4; i <= 7; i++) {
        for (let k = 1; k <= j; k++) {
          let slot      = i + "_" + k;
    	  this.game.board[slot] = { tile : "" };
        }
        if (i < 4) { j++; };
        if (i >= 4) { j--; };
      }


      //
      // some general-elements have game-specific elements
      //
      this.game.strategy_cards = [];
      for (let i in this.strategy_cards) {
        this.game.strategy_cards.push(i);
        this.game.state.strategy_cards_bonus.push(0); 
      }
 
 
      //
      // remove tiles in 3 player game
      //
      if (this.totalPlayers <= 3) {
        $('#1_3').attr('id', '');
        delete this.game.board["1_3"];
        $('#1_4').attr('id', '');
        delete this.game.board["1_4"];
        $('#2_5').attr('id', '');
        delete this.game.board["2_5"];
        $('#3_1').attr('id', '');
        delete this.game.board["3_1"];
        $('#4_1').attr('id', '');
        delete this.game.board["4_1"];
        $('#5_1').attr('id', '');
        delete this.game.board["5_1"];
        $('#6_5').attr('id', '');
        delete this.game.board["6_5"];
        $('#7_3').attr('id', '');
        delete this.game.board["7_3"];
        $('#7_4').attr('id', '');
        delete this.game.board["7_4"];
      }
  
  
      //
      // add other planet tiles
      //
      let tmp_sys = JSON.parse(JSON.stringify(this.returnSectors()));
      let seltil = [];
  
  
      //
      // empty space in board center
      //
      this.game.board["4_4"].tile = "new-byzantium";
  
      for (let i in this.game.board) {
        if (i != "4_4" && !hwsectors.includes(i)) {
          let oksel = 0;
          var keys = Object.keys(tmp_sys);
          while (oksel == 0) {
            let rp = keys[this.rollDice(keys.length)-1];
            if (this.game.sectors[rp].hw != 1 && seltil.includes(rp) != 1 && this.game.sectors[rp].mr != 1) {
              seltil.push(rp);
              delete tmp_sys[rp];
              this.game.board[i].tile = rp;
              oksel = 1;
            }
          }
        }
      }
 

      //
      // set homeworlds
      //
      for (let i = 0; i < this.game.players_info.length; i++) {
        this.game.players_info[i].homeworld = hwsectors[i];
        this.game.board[hwsectors[i]].tile = this.factions[this.game.players_info[i].faction].homeworld;
      }
  


      //
      // add starting units to player homewords
      //
      for (let i = 0; i < this.totalPlayers; i++) {
  
        let sys = this.returnSectorAndPlanets(hwsectors[i]); 
  
        let strongest_planet = 0;
        let strongest_planet_resources = 0;
        for (z = 0; z < sys.p.length; z++) {
  	  sys.p[z].owner = (i+1);
   	  if (sys.p[z].resources < strongest_planet_resources) {
  	    strongest_planet = z;
  	    strongest_planet_resources = sys.p[z].resources;
  	  }
        }


	//
	// assign starting units
	//
	for (let k = 0; k < this.factions[this.game.players_info[i].faction].space_units.length; k++) {
          this.addSpaceUnit(i + 1, hwsectors[i], this.factions[this.game.players_info[i].faction].space_units[k]);
	}
	for (let k = 0; k < this.factions[this.game.players_info[i].faction].ground_units.length; k++) {
          this.loadUnitOntoPlanet(i + 1, hwsectors[i], strongest_planet, this.factions[this.game.players_info[i].faction].ground_units[k]);
	}

	let technologies = this.returnTechnology();

	//
	// initialize all units / techs / powers (for all players)
	//
	let z = this.returnEventObjects();
        for (let i = 0; i < z.length; z++) {
	  for (let k = 0; k < this.game.players_info.length; k++) {
	    z[i].initialize(this, (k+1));
          }
        }


	//
	// assign starting technology
	//
	for (let k = 0; k < this.factions[this.game.players_info[i].faction].tech.length; k++) {
	  let free_tech = this.factions[this.game.players_info[i].faction].tech[k];
	  let player = i+1;
          this.game.players_info[i].tech.push(free_tech);
        }

        this.saveSystemAndPlanets(sys);
  
      }



      //
      // initialize game queue
      //
      if (this.game.queue.length == 0) {

        this.game.queue.push("turn");
        this.game.queue.push("newround"); 

        //
        // add cards to deck and shuffle as needed
        //
        for (let i = 0; i < this.game.players_info.length; i++) {
          this.game.queue.push("gain\t"+(i+1)+"\tsecret_objectives\t2");
          this.game.queue.push("DEAL\t6\t"+(i+1)+"\t2");
        }
        this.game.queue.push("SHUFFLE\t1");
        this.game.queue.push("SHUFFLE\t2");
        this.game.queue.push("SHUFFLE\t3");
        this.game.queue.push("SHUFFLE\t4");
        this.game.queue.push("SHUFFLE\t5");
        this.game.queue.push("SHUFFLE\t6");
        this.game.queue.push("POOL\t3");   // stage ii objectives
        this.game.queue.push("POOL\t2");   // stage i objectives
        this.game.queue.push("POOL\t1");   // agenda cards
        this.game.queue.push("DECK\t1\t"+JSON.stringify(this.returnStrategyCards()));
        this.game.queue.push("DECK\t2\t"+JSON.stringify(this.returnActionCards()));	
        this.game.queue.push("DECK\t3\t"+JSON.stringify(this.returnAgendaCards()));
        this.game.queue.push("DECK\t4\t"+JSON.stringify(this.returnStageIPublicObjectives()));
        this.game.queue.push("DECK\t5\t"+JSON.stringify(this.returnStageIIPublicObjectives()));
        this.game.queue.push("DECK\t6\t"+JSON.stringify(this.returnSecretObjectives()));
  
      }
    }


    //
    // update planets with tile / sector info
    //
    for (let i in this.game.board) {
      let sector = this.game.board[i].tile;
      let sys = this.returnSectorAndPlanets(sector);
      sys.s.sector = sector;
      sys.s.tile = i;
      if (sys.p != undefined) {
        for (let ii = 0; ii < sys.p.length; ii++) {
          sys.p[ii].sector = sector;
          sys.p[ii].tile = i;
          sys.p[ii].idx = ii;
	  sys.p[ii].hw = sys.s.hw;
	  sys.p[ii].planet = sys.s.planets[ii];
	  if (sys.s.hw == 1) { sys.p[ii].hw = 1; }
        }
      }
      this.saveSystemAndPlanets(sys);
    }



    //
    // initialize laws
    //
console.log("THIS LAW: " + JSON.stringify(this.game.state.laws));
    for (let k = 0; k < this.game.state.laws.length; k++) {
      let this_law = this.game.state.laws[k];
console.log(" 2THIS LAW: " + JSON.stringify(this_law));
      let agenda_name = this_law.agenda;
      let agenda_option = this_law.option;
      if (this.agenda_cards[this_law.agenda]) {
	this.agenda_cards[this_law.agenda].initialize(this, agenda_option);
      }
    }




    //
    // HIDE HUD LOG
    //
    $('.hud-body > .log').remove();
    $('.status').css('display','block');


    //
    // display board
    //
    for (let i in this.game.board) {
  
      // add html to index
      let boardslot = "#" + i;
      $(boardslot).html(
        ' \
          <div class="hexIn" id="hexIn_'+i+'"> \
            <div class="hexLink" id="hexLink_'+i+'"> \
              <div class="hex_bg" id="hex_bg_'+i+'"> \
                <img class="hex_img sector_graphics_background" id="hex_img_'+i+'" src="" /> \
                <img src="/imperium/img/frame/border_full_white.png" id="hex_img_faction_border_'+i+'" class="faction_border" /> \
                <img src="/imperium/img/frame/border_full_yellow.png" id="hex_img_hazard_border_'+i+'" class="hazard_border" /> \
                <div class="hex_activated" id="hex_activated_'+i+'"> \
              </div> \
                <div class="hex_space" id="hex_space_'+i+'"> \
              </div> \
                <div class="hex_ground" id="hex_ground_'+i+'"> \
              </div> \
              </div> \
            </div> \
          </div> \
        '
      );
  
      // insert planet
      let planet_div = "#hex_img_"+i;
      $(planet_div).attr("src", this.game.sectors[this.game.board[i].tile].img);
  
      this.updateSectorGraphics(i);
  
          
    }
  
  
    this.updateLeaderboard();
  

    //
    // prevent hangs
    //
    this.game.state.playing_strategy_card_secondary = 0;


    //
    // add events to board 
    //
    this.addEventsToBoard();
    this.addUIEvents();


console.log("INITIALIZE IS DONE: " + JSON.stringify(this.game.queue));

  }
  




  
  //
  // manually add arcade banner support
  //
  respondTo(type) {

    if (super.respondTo(type) != null) {
      return super.respondTo(type);
    }

    if (type == "arcade-carousel") {
      let obj = {};
      obj.background = "/imperium/img/arcade/arcade-banner-background.png";
      obj.title = "Red Imperium";
      return obj;
    }

    return null;

  }


  
  
  /////////////////
  /// HUD MENUS ///
  /////////////////
  menuItems() {
    return {
      'game.sectors': {
        name: 'Systems',
        callback: this.handleSystemsMenuItem.bind(this)
      },
      'game-player': {
        name: 'Laws',
        callback: this.handleLawsMenuItem.bind(this)
      },
    }
  }


  handleSystemsMenuItem() {
  
    let imperium_self = this;
    let factions = this.returnFactions();

    this.activated_systems_player++;

    if (this.activated_systems_player >= this.game.players_info.length) { this.activated_systems_player = 0; }

    let html = `Showing Systems Activated by ${factions[this.game.players_info[this.activated_systems_player].faction].name}`;
    $('.hud-menu-overlay').html(html);
    $('.hud-menu-overlay').show();
    $('.status').hide();
  

    $('.hex_activated').css('background-color', 'transparent');
    $('.hex_activated').css('opacity', '0.3');

    for (var i in this.game.board) {
      if (this.game.sectors[ this.game.board[i].tile ].activated[this.activated_systems_player] == 1) {
	let divpid = "#hex_activated_"+i;
        $(divpid).css('background-color', 'yellow');
        $(divpid).css('opacity', '0.3');
      }
    }
  }
  
  


  handlePlanetsMenuItem() {
  
    let imperium_self = this;
    let factions = this.returnFactions();
    let html =
    `
        <div style="margin-bottom: 1em">
          The Planetary Empires:
        </div>
        <ul>
     `;
    for (let i = 0; i < this.game.players_info.length; i++) {
      html += `  <li class="option" id="${i}">${factions[this.game.players_info[i].faction].name}</li>`;
    }
    html += `
        </ul>
    `
    $('.hud-menu-overlay').html(html);
    $('.hud-menu-overlay').show();
    $('.status').hide();
  
    //
    // leave action enabled on other panels
    //
    $('.option').on('click', function() {
  
      let player_action = parseInt($(this).attr("id"));

      let array_of_cards = imperium_self.returnPlayerPlanetCards(player_action+1); // all

      let html  = "<ul>";
      for (let z = 0; z < array_of_cards.length; z++) {
        if (imperium_self.game.planets[array_of_cards[z]].exhausted == 1) {
          html += '<li class="cardchoice exhausted" id="cardchoice_'+array_of_cards[z]+'">' + imperium_self.returnPlanetCard(array_of_cards[z]) + '</li>';
        } else {
          html += '<li class="cardchoice" id="cardchoice_'+array_of_cards[z]+'">' + imperium_self.returnPlanetCard(array_of_cards[z]) + '</li>';
        }
      }
      html += '</ul>';
  
      $('.hud-menu-overlay').html(html);
      $('.hud-menu-overlay').show();
  
    });
  }
  
  


 
  handleTechMenuItem() {
  
    let imperium_self = this;
    let factions = this.returnFactions();
    let html =
    `
        <div style="margin-bottom: 1em">
          The Technological Empires:
        </div>
        <ul>
     `;
    for (let i = 0; i < this.game.players_info.length; i++) {
    html += `  <li class="option" id="${i}">${factions[this.game.players_info[i].faction].name}</li>`;
    }
    html += `
        </ul>
    `
    $('.hud-menu-overlay').html(html);
    $('.hud-menu-overlay').show();
    $('.status').hide();
  
    //
    // leave action enabled on other panels
    //
    $('.option').on('click', function() {
  
      let p = $(this).attr("id");
      let tech = imperium_self.game.players_info[p].tech;
  
      let html  = "<ul>";
      for (let z = 0; z < tech.length; z++) {
        html += '<li class="cardchoice" id="">' + tech[z] + '</li>';
      }
      html += '</ul>';
  
      $('.hud-menu-overlay').html(html);
  
    });
  }
  




  
  handleLawsMenuItem() {
  
    let imperium_self = this;
    let laws = this.returnAgendaCards();
    let html = '';  

    if (this.game.state.laws.length > 0) {
      html += '<div style="margin-bottom: 1em">Galactic Laws Under Enforcement:</div>';
      html += '<p><ul>';
      for (let i = 0; i < this.game.state.laws.length; i++) {
        html += `  <li class="card option" id="${i}">${laws[this.game.state.laws[i]].name}</li>`;
      }
      html += '</ul>';
      html += '</p>';
    }
  
    if (this.game.state.agendas.length > 0) {
      html += '<div style="margin-bottom: 1em">Galactic Laws Under Consideration:</div>';
      html += '<ul>';
      for (let i = 0; i < this.game.state.agendas.length; i++) {
        html += `  <li class="card option" id="${i}">${laws[this.game.state.agendas[i]].name}</li>`;
      }
      html += '</ul>';
    }

    if (this.game.state.laws.length == 0 && this.game.state.agendas.length == 0) {
      html += 'There are no laws in force or agendas up for consideration at this time.';
    }
  
    $('.hud-menu-overlay').html(html);
    $('.hud-menu-overlay').show();

    $('.option').off();
    $('.option').on('mouseenter', function() { let s = $(this).attr("id"); imperium_self.showAgendaCard(imperium_self.game.state.agendas[s]); });
    $('.option').on('mouseleave', function() { let s = $(this).attr("id"); imperium_self.hideAgendaCard(imperium_self.game.state.agendas[s]); });
  
    $('.status').hide();
  
  }
  

  
  
  ////////////////////////////
  // Return Technology Tree //
  ////////////////////////////
  //
  // Technology Objects are expected to support the following
  //
  // name -> technology name
  // img -> card image
  // color -> color
  // faction -> is this restricted to a specific faction
  // prereqs -> array of colors needed
  // unit --> unit technology
  // 
  returnTechnology() {
    return this.tech;
  }
  
  importTech(name, obj) {

    if (obj.name == null) 	{ obj.name = "Unknown Technology"; }
    if (obj.img  == null) 	{ obj.img = "/imperium/img/card_template.jpg"; }
    if (obj.faction == null) 	{ obj.faction = "all"; }
    if (obj.prereqs == null) 	{ obj.prereqs = []; }
    if (obj.color == null)	{ obj.color = ""; }
    if (obj.type == null)	{ obj.type = "normal"; }
    if (obj.text == null)	{ obj.text = ""; }
    if (obj.unit == null)	{ obj.unit = 0; }

    obj = this.addEvents(obj);
    this.tech[name] = obj;

  }  

  doesPlayerHaveTech(player, tech) {

    for (let i = 0; i < this.game.players_info[player-1].tech.length; i++) {
      if (this.game.players_info[player-1].tech[i] == tech) { return 1; }
    }
    return 0;

  }



  
  
  returnUnits() {
    return this.units;
  }
  
  importUnit(name, obj) {

    if (obj.name == null) 		{ obj.name = "Unknown Unit"; }
    if (obj.owner == null)		{ obj.owner = -1; }			// who owns this unit
    if (obj.type == null) 		{ obj.type = ""; }			// infantry / fighter / etc.
    if (obj.storage  == null) 		{ obj.storage = []; }			// units this stores
    if (obj.space == null) 		{ obj.space = 1; }			// defaults to spaceship
    if (obj.ground == null) 		{ obj.ground = 0; }			// defaults to spaceship
    if (obj.cost == null) 		{ obj.cost = 1; }			// cost to product
    if (obj.capacity == null) 		{ obj.capacity = 0; }			// number of units we can store
    if (obj.capacity_required == null)	{ obj.capacity_required = 0; }		// number of units occupies
    if (obj.can_be_stored == null) 	{ obj.can_be_stored = 0; }		// can this be stored
    if (obj.strength == null) 		{ obj.strength = 0; }			// HP
    if (obj.max_strength == null) 	{ obj.max_strength = obj.strength; }	// restore to HP
    if (obj.combat == null) 		{ obj.combat = 0; }			// dice for hits
    if (obj.destroyed == null) 		{ obj.destroyed = 0; }			// when destroyed
    if (obj.move == null) 		{ obj.move = 0; }			// range to move
    if (obj.range == null) 		{ obj.range = 0; }			// firing range
    if (obj.last_round_damaged == null) { obj.last_round_damaged = 0; }		// last round in which hit (some techs care)
    if (obj.production == null) 	{ obj.production = 0; }			// can produce X units (production limit)
    if (obj.temporary_combat_modifier == null) { obj.temporary_combat_modifier = 0; } // some action cards manipulate
    if (obj.bombardment_rolls == null)  { obj.bombardment = 0; } // 0 means no bombardment abilities
    if (obj.bombardment_combat == null) { obj.bombardment = -1; } // hits on N


    obj = this.addEvents(obj);
    this.units[name] = obj;

  }  

  resetTemporaryModifiers(unit) {
    unit.temporary_combat_modifier = 0;
  }


  returnUnitsInStorage(unit) {
    let array_of_stored_units = [];
    for (let i = 0; i < unit.storage.length; i++) {
      array_of_stored_units.push(unit.storage[i]);
    }
    return array_of_stored_units;
  }

  
  
  addPlanetaryUnit(player, sector, planet_idx, unitname) {
    return this.loadUnitOntoPlanet(player, sector, planet_idx, unitname);
  };
  addPlanetaryUnitByJSON(player, sector, planet_idx, unitjson) {
    return this.loadUnitByJSONOntoPlanet(player, sector, planet_idx, unitname);
  };
  addSpaceUnit(player, sector, unitname) {
    let sys = this.returnSectorAndPlanets(sector);
    let unit_to_add = this.returnUnit(unitname, player);
    sys.s.units[player - 1].push(unit_to_add);
    this.saveSystemAndPlanets(sys);
    return JSON.stringify(unit_to_add);
  };
  addSpaceUnitByJSON(player, sector, unitjson) {
    let sys = this.returnSectorAndPlanets(sector);
    sys.s.units[player - 1].push(JSON.parse(unitjson));
    this.saveSystemAndPlanets(sys);
    return unitjson;
  };
  removeSpaceUnit(player, sector, unitname) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1].length; i++) {
      if (sys.s.units[player - 1][i].type === unitname) {
        let removedunit = sys.s.units[player - 1].splice(i, 1);
        this.saveSystemAndPlanets(sys);
        return JSON.stringify(removedunit[0]);
        ;
      }
    }
  };
  removeSpaceUnitByJSON(player, sector, unitjson) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1].length; i++) {
      if (JSON.stringify(sys.s.units[player - 1][i]) === unitjson) {
        sys.s.units[player - 1].splice(i, 1);
        this.saveSystemAndPlanets(sys);
        return unitjson;
      }
    }
  };
  loadUnitOntoPlanet(player, sector, planet_idx, unitname) {
    let sys = this.returnSectorAndPlanets(sector);
    let unit_to_add = this.returnUnit(unitname, player);
    sys.p[planet_idx].units[player - 1].push(unit_to_add);
    this.saveSystemAndPlanets(sys);
    return JSON.stringify(unit_to_add);
  };
  loadUnitByJSONOntoPlanet(player, sector, planet_idx, unitjson) {
    let sys = this.returnSectorAndPlanets(sector);
    sys.p[planet_idx].units[player - 1].push(JSON.parse(unitjson));
    this.saveSystemAndPlanets(sys);
    return unitjson;
  };
  loadUnitOntoShip(player, sector, ship_idx, unitname) {
    let sys = this.returnSectorAndPlanets(sector);
    let unit_to_add = this.returnUnit(unitname, player);
    sys.s.units[player - 1][ship_idx].storage.push(unit_to_add);
    this.saveSystemAndPlanets(sys);
    return JSON.stringify(unit_to_add);
  };
  loadUnitByJSONOntoShip(player, sector, ship_idx, unitjson) {
    let sys = this.returnSectorAndPlanets(sector);
    sys.s.units[player - 1][ship_idx].storage.push(JSON.parse(unitjson));
    this.saveSystemAndPlanets(sys);
    return unitjson;
  };
  loadUnitOntoShipByJSON(player, sector, shipjson, unitname) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1].length; i++) {
      if (JSON.stringify(sys.s.units[player - 1][i]) === shipjson) {
        let unit_to_add = this.returnUnit(unitname, player);
        sys.s.units[player - 1][i].storage.push(unit_to_add);
        this.saveSystemAndPlanets(sys);
        return JSON.stringify(unit_to_add);
      }
    }
    return "";
  };
  loadUnitByJSONOntoShipByJSON(player, sector, shipjson, unitjson) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1].length; i++) {
      if (JSON.stringify(sys.s.units[player - 1][i]) === shipjson) {
        sys.s.units[player - 1][i].storage.push(JSON.parse(unitjson));
        this.saveSystemAndPlanets(sys);
        return unitjson;
      }
    }
    return "";
  };
  loadUnitFromShip(player, sector, ship_idx, unitname) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1][ship_idx].storage.length; i++) {
      if (sys.s.units[player - 1][ship_idx].storage[i].type === unitname) {
        let unit_to_remove = sys.s.units[player - 1][ship_idx].storage[i];
        sys.s.units[player-1][ship_idx].storage.splice(i, 1);
        this.saveSystemAndPlanets(sys);
        return JSON.stringify(unit_to_remove);
      }
    }
    return "";
  };
  unloadUnitFromPlanet(player, sector, planet_idx, unitname) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.p[planet_idx].units[player - 1].length; i++) {
      if (sys.p[planet_idx].units[player - 1][i].type === unitname) {
        let unit_to_remove = sys.p[planet_idx].units[player - 1][i];
        sys.p[planet_idx].units[player-1].splice(i, 1);
        this.saveSystemAndPlanets(sys);
        return JSON.stringify(unit_to_remove);
      }
    }
    return "";
  };
  unloadUnitByJSONFromPlanet(player, sector, planet_idx, unitjson) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.p[planet_idx].units[player-1].length; i++) {
      if (JSON.stringify(sys.p[planet_idx].units[player - 1][i]) === unitjson) {
        let unit_to_remove = sys.p[planet_idx].units[player - 1][i];
        sys.p[planet_idx].units[player-1].splice(i, 1);
        this.saveSystemAndPlanets(sys);
        return JSON.stringify(unit_to_remove);
      }
    }
    return "";
  };
  unloadUnitByJSONFromShip(player, sector, ship_idx, unitjson) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1][ship_idx].storage.length; i++) {
      if (JSON.stringify(sys.s.units[player - 1][ship_idx].storage[i]) === unitjson) {
        sys.s.units[player-1][ship_idx].storage.splice(i, 1);
        this.saveSystemAndPlanets(sys);
        return unitjson;
      }
    }
    return "";
  };
  unloadUnitFromShipByJSON(player, sector, shipjson, unitname) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1].length; i++) {
      if (JSON.stringify(sys.s.units[player - 1][i]) === shipjson) {
        for (let j = 0; j < sys.s.units[player - 1][i].storage.length; j++) {
          if (sys.s.units[player - 1][i].storage[j].type === unitname) {
            sys.s.units[player-1][i].storage.splice(j, 1);
            this.saveSystemAndPlanets(sys);
            return unitjson;
          }
        }
      }
    }
    return "";
  };
  unloadUnitByJSONFromShipByJSON(player, sector, shipjson, unitjson) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1].length; i++) {
      if (JSON.stringify(sys.s.units[player - 1][i]) === shipjson) {
        for (let j = 0; j < sys.s.units[player - 1][i].storage.length; j++) {
          if (JSON.stringify(sys.s.units[player - 1][i].storage[j]) === unitjson) {
            sys.s.units[player-1][i].storage.splice(j, 1);
            this.saveSystemAndPlanets(sys);
            return unitjson;
          }
        }
      }
    }
    return "";
  };
  unloadStoredShipsIntoSector(player, sector) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units[player - 1].length; i++) {
      if (JSON.stringify(sys.s.units[player-1][i]) != "{}") {
        for (let j = 0; j < sys.s.units[player - 1][i].storage.length; j++) {
	  let unit = sys.s.units[player-1][i].storage[j];
	  let unitjson = JSON.stringify(unit);
          if (unit.type === "fighter") {
	    sys.s.units[player-1].push(unit);
            sys.s.units[player-1][i].storage.splice(j, 1);
	    j--;
  	  }
        }
      } else {
        sys.s.units[player-1].splice(i, 1);
	i--;
      }
    }
    this.updateSectorGraphics(sector);
    this.saveSystemAndPlanets(sys);
  }
  
  
  
  
  
  returnRemainingCapacity(unit) {
  
    let capacity = unit.capacity;
  
    for (let i = 0; i < unit.storage.length; i++) {
      if (unit.storage[i].can_be_stored != 0) {
        capacity -= unit.storage[i].capacity_required;
      }
    }
  
    if (capacity <= 0) { return 0; }
    return capacity;
  
  };





  returnPDSWithinRange(attacker, destination, sectors, distance) {
  
    let battery = [];
  
    for (let i = 0; i < sectors.length; i++) {
  
      let sys = this.returnSectorAndPlanets(sectors[i]);
  
      //
      // some sectors not playable in 3 player game
      //
      if (sys != null) {
  
        for (let j = 0; j < sys.p.length; j++) {
          for (let k = 0; k < sys.p[j].units.length; k++) {
  	  if (k != attacker-1) {
  	    for (let z = 0; z < sys.p[j].units[k].length; z++) {
  	      if (sys.p[j].units[k][z].type == "pds") {
  		if (sys.p[j].units[k][z].range <= distance[i]) {
  	          let pds = {};
  	              pds.combat = sys.p[j].units[k][z].combat;
  		      pds.owner = (k+1);
  		      pds.sector = sectors[i];
  
  	          battery.push(pds);
  		}
  	      }
  	    }
  	  }
          }
        }
      }
    }
  
    return battery;
  
  }
  



  returnShipsMovableToDestinationFromSectors(destination, sectors, distance) {
  
    let imperium_self = this;
    let ships_and_sectors = [];
    for (let i = 0; i < sectors.length; i++) {
  
      let sys = this.returnSectorAndPlanets(sectors[i]);
      
  
      //
      // some sectors not playable in 3 player game
      //
      if (sys != null) {
  
        let x = {};
        x.ships = [];
        x.ship_idxs = [];
        x.sector = null;
        x.distance = distance[i];
        x.adjusted_distance = [];
  
        //
        // only move from unactivated systems
        //
        if (sys.s.activated[imperium_self.game.player-1] == 0) {
  
          for (let k = 0; k < sys.s.units[this.game.player-1].length; k++) {
            let this_ship = sys.s.units[this.game.player-1][k];
            if (this_ship.move >= distance[i]) {
  	    x.adjusted_distance.push(distance[i]);
              x.ships.push(this_ship);
              x.ship_idxs.push(k);
              x.sector = sectors[i];
            }
          }
          if (x.sector != null) {
            ships_and_sectors.push(x);
          }
        }
  
      }
    }
  
    return ships_and_sectors;
  
  }
 

  
  returnNumberOfSpaceFleetInSector(player, sector) {
  
    let sys = this.returnSectorAndPlanets(sector);
    let num = 0;
  
    for (let z = 0; z < sys.s.units[player-1].length; z++) {
      if (sys.s.units[player-1][z].strength > 0 && sys.s.units[player-1][z].destroyed == 0) {
        num++;
      }
    }
  
    return num;
  }



  returnNumberOfGroundForcesOnPlanet(player, sector, planet_idx) {

    if (player <= 0) { return 0; }  

    let sys = this.returnSectorAndPlanets(sector);
    let num = 0;
  
    for (let z = 0; z < sys.p[planet_idx].units[player-1].length; z++) {
      if (sys.p[planet_idx].units[player-1][z].strength > 0 && sys.p[planet_idx].units[player-1][z].destroyed == 0) {
        num++;
      }
    }
  
    return num;
  }



  returnUnitCost(name, player) {
  
    let unit = this.returnUnit(name, player)
    if (unit.cost > 0) { return unit.cost; }
    return 1;
  
  }
  
  
  
  repairUnits() {
  
    for (let i in this.game.board) {
      let sys = this.returnSectorAndPlanets(i);
      for (let i = 0; i < sys.s.units.length; i++) {
        for (let ii = 0; ii < sys.s.units[i].length; ii++) {
	  if (sys.s.units[i][ii].max_strenth > sys.s.units[i][ii].strength) {
            sys.s.units[i][ii].strength = sys.s.units[i][ii].max_strength;
	  }
        }
      }
      for (let i = 0; i < sys.p.length; i++) {
        for (let ii = 0; ii < sys.p[i].units; ii++) {
          for (let iii = 0; iii < sys.p[i].units[ii].length; iii++) {
	    if (sys.p[i].units[ii][iii].max_strenth > sys.p[i].units[ii][iii].strength) {
              sys.p[i].units[ii][iii].strength = sys.p[i].units[ii][iii].max_strength;
            }
          }
        }
      }
      this.saveSystemAndPlanets(sys);
    }
  
  }
  
  
  returnUnit(type = "", player) {
    let unit = JSON.parse(JSON.stringify(this.units[type]));
    unit.owner = player;
    unit = this.upgradeUnit(unit, player);
    return unit;
  };
  
  
  
  upgradePlayerUnitsOnBoard(player) {

    for (var i in this.game.sectors) {
      for (let ii = 0; ii < this.game.sectors[i].units[player-1].length; ii++) {
        this.game.sectors[i].units[player-1][ii] = this.upgradeUnit(this.game.sectors[i].units[player-1][ii], player);
      }
    }
    for (var i in this.game.planets) {
      for (let ii = 0; ii < this.game.planets[i].units[player-1].length; ii++) {
        this.game.planets[i].units[player-1][ii] = this.upgradeUnit(this.game.planets[i].units[player-1][ii], player);
      }
    }

  }
  
  

  upgradeUnit(unit, player_to_upgrade) {

    let z = this.returnEventObjects();

    for (let z_index in z) {
      unit = z[z_index].upgradeUnit(this, player_to_upgrade, unit);
    }

    return unit;
  }
  
  
  
  doesSectorContainPlayerShips(player, sector) {

    let sys = this.returnSectorAndPlanets(sector);
    if (sys.s.units[player-1].length > 0) { return 1; }
    return 0;
 
  }

  doesSectorContainPlayerUnits(player, sector) {

    let sys = this.returnSectorAndPlanets(sector);
    if (sys.s.units[player-1].length > 0) { return 1; }
    for (let i = 0; i < sys.p.length; i++) {
      if (sys.p[i].units[player-1].length > 0) { return 1; }
    }
    return 0;
 
  }
  
  
  
  returnSecretObjectives() {
    return this.secret_objectives;
  }
  
  importSecretObjective(name, obj) {

    if (obj.name == null) 	{ obj.name = "Unknown Objective"; }
    if (obj.text == null)	{ obj.type = "Unclear Objective"; }
    if (obj.type == null)	{ obj.type = "normal"; }
    if (obj.img  == null) 	{ obj.img = "/imperium/img/secret_objective.jpg"; }

    obj = this.addEvents(obj);
    this.secret_objectives[name] = obj;

  }  




  returnStageIPublicObjectives() {
    return this.stage_i_objectives;
  }
  
  importStageIPublicObjective(name, obj) {

    if (obj.name == null) 	{ obj.name = "Unknown Objective"; }
    if (obj.text == null)	{ obj.type = "Unclear Objective"; }
    if (obj.type == null)	{ obj.type = "normal"; }
    if (obj.img  == null) 	{ obj.img = "/imperium/img/objective_card_1_template.png"; }

    obj = this.addEvents(obj);
    this.stage_i_objectives[name] = obj;

  }  


  returnStageIIPublicObjectives() {
    return this.stage_ii_objectives;
  }
  
  importStageIIPublicObjective(name, obj) {

    if (obj.name == null) 	{ obj.name = "Unknown Objective"; }
    if (obj.text == null)	{ obj.type = "Unclear Objective"; }
    if (obj.type == null)	{ obj.type = "normal"; }
    if (obj.img  == null) 	{ obj.img = "/imperium/img/objective_card_1_template.png"; }

    obj = this.addEvents(obj);
    this.stage_ii_objectives[name] = obj;

  }  


  
  
  returnFactions() {
    return this.factions;
  }
  
  importFaction(name, obj) {

    if (obj.name == null) 		{ obj.name = "Unknown Faction"; }
    if (obj.homeworld  == null) 	{ obj.homeworld = "sector32"; }
    if (obj.space_units == null) 	{ obj.space_units = []; }
    if (obj.ground_units == null) 	{ obj.ground_units = []; }
    if (obj.tech == null) 		{ obj.tech = []; }

    obj = this.addEvents(obj);
    this.factions[name] = obj;

  }  

  
  
  returnAgendaCards() {
    return this.agenda_cards;
  }

  
  importAgendaCard(name, obj) {

    if (obj.name == null) 	{ obj.name = "Unknown Agenda"; }
    if (obj.type == null)	{ obj.type = "Law"; }
    if (obj.text == null)	{ obj.text = "Unknown Document"; }
    if (obj.img  == null)	{ obj.img = "/imperium/img/agenda_card_template.png"; }
    if (obj.elect == null)	{ obj.elect = "other"; }

    obj = this.addEvents(obj);
    this.agenda_cards[name] = obj;

  }  


  
  
  returnActionCards(types=[]) {

    if (types.length == 0) { return this.action_cards; }
    else {

      let return_obj = {};
      for (let i in this.action_cards) {
	if (types.includes(this.action_cards[i].type)) {
	  return_obj[i] = this.action_cards[i];
	}
      }
      return return_obj;

    }
  }
  
  importActionCard(name, obj) {

    if (obj.name == null) 	{ obj.name = "Action Card"; }
    if (obj.type == null) 	{ obj.type = "instant"; }
    if (obj.text == null) 	{ obj.text = "Unknown Action"; }
    if (obj.img  == null) 	{ obj.img  = "/imperium/img/action_card_template.png"; }

    obj = this.addEvents(obj);
    this.action_cards[name] = obj;

  }  


  
  
  /////////////////////
  // Core Game Logic //
  /////////////////////
  handleGameLoop(msg=null) {
  
    let imperium_self = this;
    let z = imperium_self.returnEventObjects();

    if (this.game.queue.length > 0) {

console.log("QUEUE: " + JSON.stringify(this.game.queue));  

      imperium_self.saveGame(imperium_self.game.id);
  
      let qe = this.game.queue.length-1;
      let mv = this.game.queue[qe].split("\t");
      let shd_continue = 1;
  
      if (mv[0] === "gameover") {
  	if (imperium_self.browser_active == 1) {
  	  alert("Game Over");
  	}
  	imperium_self.game.over = 1;
  	imperium_self.saveGame(imperium_self.game.id);
  	return;
      }
  

      //
      // start of status phase, players must exhaust
      //
      if (mv[0] === "exhaust_at_round_start") { 

	let player = mv[1]; // state or players
        this.game.queue.splice(qe, 1);

  	return 0;

      }
  

      if (mv[0] === "setvar") { 

	let type = mv[1]; // state or players
	let num = parseInt(mv[2]); // 0 if state, player_number if players
	let valname = mv[3]; // a string
	let valtype = mv[4];
	let val = mv[5];
	if (valtype == "int") { val = parseInt(val); }

	if (type == "state") {
	  imperium_self.game.state[valname] = val;
	}

	if (type == "players") {
	  imperium_self.game.players_info[num-1][valname] = val;
	}

        this.game.queue.splice(qe, 1);

  	return 1;

      }
  


      //
      // resolve [action] [1] [publickey voting or 1 for agenda]
      //
      if (mv[0] === "resolve") {

        let le = this.game.queue.length-2;
        let lmv = [];
        if (le >= 0) {
	  lmv = this.game.queue[le].split("\t");
	}
console.log("RESOLVE");

	//
	// this overwrites secondaries, we need to clear manually
	// if we are playing the sceondary, we don't want to udpate status
	if (this.game.state.playing_strategy_card_secondary == 0) {
          this.updateStatus("Waiting for Opponent Move...");  
	}

	if (mv[1] == lmv[0]) {
  	  if (mv[2] != undefined) {

	    //
	    // June 24th removed
	    //
	    //if (mv[1] === "strategy") {
	    //  if (mv[2] === this.app.wallet.returnPublicKey()) {
	    //	this.game.state.playing_strategy_card_secondary = 0;
	    //  }
	    //}

	    if (this.game.confirms_received == undefined || this.game.confirms_received == null) { this.resetConfirmsNeeded(this.game.players_info.length); }


  	    this.game.confirms_received += parseInt(mv[2]);
  	    this.game.confirms_players.push(mv[3]);


  	    if (this.game.confirms_needed <= this.game.confirms_received) {
	      this.resetConfirmsNeeded(0);
    	      this.game.queue.splice(qe-1, 2);
  	      return 1;

  	    } else {

    	      this.game.queue.splice(qe, 1);

	      //
	      // we are waiting for a set number of confirmations
	      // but maybe we reloaded and still need to move
	      // in which case the instruction we need to run is 
	      // the last one.... 
	      //
	      if (mv[3] != undefined) {
	        if (!this.game.confirms_players.includes(this.app.wallet.returnPublicKey())) {
	  	  return 1;
	        }
                if (mv[1] == "agenda") {
		  return 1;
		}
	      }
console.log("cn : " + this.game.confirms_needed + " -- " + this.game.confirms_received);

	      if (this.game.confirms_needed < this.game.confirms_received) { return 1; }
console.log("stopping execution");
  	      return 0;
            }
  
            return 0;
  
  	  } else {
    	    this.game.queue.splice(qe-1, 2);
  	    return 1;
	  }
        } else {

          //
          // remove the event
          //
          this.game.queue.splice(qe, 1);

          //
          // go back through the queue and remove any event tht matches this one
          // and all events that follow....
          //
          for (let z = le, zz = 1; z >= 0 && zz == 1; z--) {
            let tmplmv = this.game.queue[z].split("\t");
            if (tmplmv.length > 0) {
              if (tmplmv[0] === mv[1]) {
                this.game.queue.splice(z);
                zz = 0;
              }
            }
          }
	}
      } 
 



      if (mv[0] === "rider") {
  
	let x = {};
	    x.player 	= mv[1];
	    x.rider 	= mv[2];
	    x.choice 	= mv[3];

	this.game.state.riders.push(x);  

  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }







      if (mv[0] === "repair") {  

  	let player       = parseInt(mv[1]);
        let type         = mv[2];
        let sector       = mv[3];
        let planet_idx   = parseInt(mv[4]);
        let unit_idx     = parseInt(mv[5]);

	let sys = this.returnSectorAndPlanets(sector);  

  	if (type == "space") {
	  sys.s.units[player-1][unit_idx].strength = sys.s.units[player-1][unit_idx].max_strength;
  	} else {
	  sys.p[planet_idx].units[player-1][unit_idx].strength = sys.p[planet_idx].units[player-1][unit_idx].max_strength;
        }
  
  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }



      if (mv[0] === "continue") {  

  	let player = mv[1];
  	let sector = mv[2];

        this.game.queue.splice(qe, 1);

  	//
  	// update sector
  	//
  	this.updateSectorGraphics(sector);

	if (this.game.player == player) {
  	  this.playerContinueTurn(player, sector);
	}

        return 0;

      }



      if (mv[0] === "produce") {
  
  	let player       = mv[1];
        let player_moves = parseInt(mv[2]);
        let planet_idx   = parseInt(mv[3]); // planet to build on
        let unitname     = mv[4];
        let sector       = mv[5];

  	let sys = this.returnSectorAndPlanets(sector);
 
  	if (planet_idx != -1) {
          this.addPlanetaryUnit(player, sector, planet_idx, unitname);
	  this.updateLog(this.returnFaction(player) + " produces " + this.returnUnit(unitname).name + " on " + sys.p[planet_idx].name);  
 	} else {
          this.addSpaceUnit(player, sector, unitname);
	  this.updateLog(this.returnFaction(player) + " produces " + this.returnUnit(unitname).name + " in " + sys.s.name);  
        }
  
  	//
  	// monitor fleet supply
  	//
        console.log("TODO - Fleet Supply check");

  	//
  	// update sector
  	//
  	this.updateSectorGraphics(sector);
  
  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }

      if (mv[0] === "continue") {  

  	let player = mv[1];
  	let sector = mv[2];

        this.game.queue.splice(qe, 1);

  	//
  	// update sector
  	//
  	this.updateSectorGraphics(sector);

	if (this.game.player == player) {
  	  this.playerContinueTurn(player, sector);
	}

        return 0;

      }


      if (mv[0] === "play") {

        this.updateTokenDisplay();
        this.updateLeaderboard();

    	let player = mv[1];
    	let contplay = 0;
	if (this.game.state.active_player_turn == player) { contplay = 1; }
	if (parseInt(mv[2]) == 1) { contplay = 1; }
	this.game.state.active_player_turn = player;

console.log(this.game.state.active_player_moved + " ---> " + this.game.state.active_player_turn);

//        this.game.queue.splice(qe, 1);

	try {
          document.documentElement.style.setProperty('--playing-color', `var(--p${player})`);
    	} catch (err) {}

        if (player == this.game.player) {

	  if (contplay == 0) {

	    //
	    // reset menu track vars
	    //
  	    this.game.tracker = this.returnPlayerTurnTracker();

	    //
	    // reset vars like "planets_conquered_this_turn"
	    //
	    this.resetTurnVariables(player);

	    //
	    // removed this July 1 when added splice above
	    //
  	    //this.addMove("resolve\tplay");

	  }

  	  this.playerTurn();

        } else {

	  this.addEventsToBoard();
  	  this.updateStatus("<div><p>" + this.returnFaction(parseInt(player)) + " is taking their turn.</p></div>");

  	}
  
  	return 0;
      }



      if (mv[0] === "strategy") {
  
	this.updateLeaderboard();
	this.updateTokenDisplay();

  	let card = mv[1];
  	let strategy_card_player = parseInt(mv[2]);
  	let stage = parseInt(mv[3]);  

	if (this.game.state.playing_strategy_card_secondary == 1) {
	  return 0;
	}

	if (strategy_card_player != -1) {
    	  imperium_self.game.players_info[strategy_card_player-1].strategy_cards_played.push(card);
	}

  	if (stage == 1) {
	  this.updateLog(this.returnFaction(strategy_card_player) + " plays " + this.strategy_cards[card].name);
  	  this.playStrategyCardPrimary(strategy_card_player, card);
	  return 0;
  	}
  	if (stage == 2) {
	  this.game.state.playing_strategy_card_secondary = 1;
  	  this.playStrategyCardSecondary(strategy_card_player, card);
	  return 0;
  	}
  
  	return 0;

      }

      if (mv[0] === "strategy_card_before") {

  	let card = mv[1];
  	let player = parseInt(mv[2]);
        let z = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

        for (let i = 0; i < speaker_order.length; i++) {
          for (let k = 0; k < z.length; k++) {
            if (z[k].strategyCardBeforeTriggers(this, (i+1), player, card) == 1) {
              this.game.queue.push("strategy_card_before_event\t"+card+"\t"+speaker_order[i]+"\t"+player+"\t"+k);
            }
          }
        }

        return 1;

      }
      if (mv[0] === "strategy_card_before_event") {
  
  	let card = mv[1];
  	let player = parseInt(mv[2]);
  	let strategy_card_player = parseInt(mv[3]);
  	let z_index = parseInt(mv[4]);
        let z = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

console.log("STRATEGY CARD BEFORE EVENT");

        return z[z_index].strategyCardBeforeEvent(this, player, strategy_card_player, card);

      }
  
      if (mv[0] === "strategy_card_after") {
  
  	let card = mv[1];
  	let player = parseInt(mv[2]);
        let z = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

        for (let i = 0; i < speaker_order.length; i++) {
          for (let k = 0; k < z.length; k++) {
            if (z[k].strategyCardAfterTriggers(this, speaker_order[i], player, card) == 1) {
              this.game.queue.push("strategy_card_after_event\t"+card+"\t"+speaker_order[i]+"\t"+player+"\t"+k);
            }
          }
        }

        this.game.state.playing_strategy_card_secondary = 0;

        return 1;
      }
      if (mv[0] === "strategy_card_after_event") {
  
  	let card = mv[1];
  	let player = parseInt(mv[2]);
  	let strategy_card_player = parseInt(mv[3]);
  	let z_index = parseInt(mv[4]);
        let z = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

console.log("executing "+z[z_index].name);

        return z[z_index].strategyCardAfterEvent(this, player, strategy_card_player, card);

      }
  

      if (mv[0] === "playerschoosestrategycards_before") {
  
  	let card = mv[1];
  	let player = parseInt(mv[2]);
  	let strategy_card_player = parseInt(mv[3]);
        let z = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

        for (let i = 0; i < speaker_order.length; i++) {
          for (let k = 0; k < z.length; k++) {
            if (z[k].playersChooseStrategyCardsBeforeTriggers(this, (i+1), speaker_order[i], card) == 1) {
              this.game.queue.push("playerschoosestrategycards_before_event"+"\t"+speaker_order[i]+"\t"+k);
            }
          }
        }
        return 1;
      }
      if (mv[0] === "playerschoosestrategycards_before_event") {
  
  	let player = parseInt(mv[1]);
  	let z_index = parseInt(mv[2]);
        let z = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

        return z[z_index].playersChooseStrategyCardsBeforeEvent(this, player);

      }
      if (mv[0] === "playerschoosestrategycards_after") {
  
  	let card = mv[1];
  	let player = parseInt(mv[2]);
  	let strategy_card_player = parseInt(mv[3]);
        let z = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

        for (let i = 0; i < speaker_order.length; i++) {
          for (let k = 0; k < z.length; k++) {
            if (z[k].playersChooseStrategyCardsAfterTriggers(this, (i+1), speaker_order[i], card) == 1) {
              this.game.queue.push("playerschoosestrategycards_after_event"+"\t"+speaker_order[i]+"\t"+k);
            }
          }
        }
        return 1;

      }
      if (mv[0] === "strategy_card_after_event") {

  	let player = parseInt(mv[1]);
  	let z_index = parseInt(mv[2]);
        let z = this.returnEventObjects();

        return z[z_index].playersChooseStrategyCardsAfterEvent(this, player);

      }
  



      if (mv[0] === "turn") {
  
  	this.game.state.turn++;

        this.game.state.active_player_moved = 0;
        this.game.state.active_player_turn = -1;

  	let new_round = 1;
        for (let i = 0; i < this.game.players_info.length; i++) {
  	  if (this.game.players_info[i].passed == 0) { new_round = 0; }
        }
  
  	//
  	// NEW TURN
  	//
  	if (new_round == 1) {
  	  this.game.queue.push("newround");
  	  this.game.queue.push("setinitiativeorder");
  	} else {
  	  this.game.queue.push("setinitiativeorder");
  	}
  
  	this.updateLeaderboard();
	return 1;
  
      }



      if (mv[0] === "discard") {

	let player   = mv[1];
	let target   = mv[2];
	let choice   = mv[3];
  	this.game.queue.splice(qe, 1);
 
	if (target == "agenda") {
          for (let z = 0; z < this.game.state.agendas.length; z++) {
	    if (this.game.state.agendas[z] == choice) {
	      this.game.state.agendas.splice(z, 1);
	      z--;
	    }
	  }
	}
	return 1; 
      }
     

      if (mv[0] === "quash") {

	let agenda_to_quash = parseInt(mv[1]);
	let redeal_new = parseInt(mv[2]);
  	this.game.queue.splice(qe, 1);

	this.game.state.agendas.splice(agenda_to_quash, 1);

	if (redeal_new == 1) {
  	  for (let i = 1; i <= this.game.players_info.length; i++) {
            this.game.queue.push("FLIPCARD\t3\t3\t1\t"+i); // deck card poolnum player
   	  }
	}

	return 1;

      }

      if (mv[0] === "resolve_agenda") {

	let laws = this.returnAgendaCards();
        let agenda = mv[1];
        let winning_choice = "";
	let winning_options = [];
  	this.game.queue.splice(qe, 1);

        for (let i = 0; i < this.game.state.choices.length; i++) {
          winning_options.push(0);
        }
        for (let i = 0; i < this.game.players.length; i++) {
          winning_options[this.game.state.how_voted_on_agenda[i]] += this.game.state.votes_cast[i];
        }


        //
	// speaker breaks ties
	//
	if (mv[2] === "speaker") {
	  // resolve_agenda	speaker	    winning_choice	
	  let winner = mv[3];
	  for (let i = 0; i < this.game.state.choices.length; i++) {
	    if (this.game.state.choices[i] === winner) {
	      winning_options[i] += 1;
	    }
	  }
	}

        //
        // determine winning option
        //
        let max_votes_options = -1;
        let max_votes_options_idx = 0;
        for (let i = 0; i < winning_options.length; i++) {
          if (winning_options[i] > max_votes_options) {
            max_votes_options = winning_options[i];
            max_votes_options_idx = i;
          }
          if (winning_options[i] > 0) {
            this.updateLog(this.game.state.choices[i] + " receives " + winning_options[i] + " votes");
          }
        }

        let total_options_at_winning_strength = 0;
	let tied_choices = [];
        for (let i = 0; i < winning_options.length; i++) {
          if (winning_options[i] == max_votes_options) {
	    total_options_at_winning_strength++; 
	    tied_choices.push(this.game.state.choices[i]);
	  }
        }


	//
	// more than one winner
	//
	if (total_options_at_winning_strength > 1) {
	  console.log("WE NEED THE SPEAKER TO INTERVENE: " + total_options_at_winning_strength);
	  if (this.game.player == this.game.state.speaker) {
	    imperium_self.playerResolveDeadlockedAgenda(agenda, tied_choices);
	  }
	  return 0;
	}


	//
	//
	//
	if (tied_choices.length == 1) { 
	  winning_choice = tied_choices[0]; 
	}

	//
	// single winner
	//
	if (total_options_at_winning_strength == 1) {

          let success = imperium_self.agenda_cards[agenda].onPass(imperium_self, winning_choice);

	  //
	  // handled differently
	  //
          //if (success == 1) {
	  //  imperium_self.game.state.laws.push(agenda);
	  //}

          //
          // resolve riders
          //
          for (let i = 0; i < this.game.state.riders.length; i++) {
            let x = this.game.state.riders[i];
            if (x.choice === winning_choice || x.choice === this.game.state.choices[winning_choice]) {
              this.game.queue.push("execute_rider\t"+x.player+"\t"+x.rider);
            }
          }

        }

	//
	// notify users of vote results
	//
	this.game.queue.push("acknowledge\tThe Galactic Senate has settled on '"+this.returnNameFromIndex(winning_choice)+"'");

      }





      if (mv[0] == "execute_rider") {

	let action_card_player = parseInt(mv[1]);
	let rider = mv[2];
  	this.game.queue.splice(qe, 1);

	return this.action_cards[rider].playActionCardEvent(this, this.game.player, action_card_player, rider);

      }



      if (mv[0] == "vote") {

	let laws = this.returnAgendaCards();
        let agenda_num = mv[1];
	let player = parseInt(mv[2]);
	let vote = mv[3];
	let votes = parseInt(mv[4]);

	this.game.state.votes_cast[player-1] = votes;
	this.game.state.votes_available[player-1] -= votes;
	this.game.state.voted_on_agenda[player-1][this.game.state.voting_on_agenda] = 1;
	this.game.state.how_voted_on_agenda[player-1] = vote;


        if (vote == "abstain") {
          this.updateLog(this.returnFaction(player) + " abstains");
	} else {

	  let is_planet = 0;
	  let is_sector = 0;

	  let elected_choice = this.game.state.choices[parseInt(vote)];

	  if (elected_choice.indexOf("planet") == 0 || elected_choice.indexOf("new-byzantium") == 0) { is_planet = 1; }
	  if (elected_choice.indexOf("sector") == 0) { is_sector = 1; }

	  if (is_planet == 1) {
            this.updateLog(this.returnFaction(player) + " spends " + votes + " on " + this.game.planets[this.game.state.choices[vote]].name);
	  }
	  if (is_sector == 1) {
            this.updateLog(this.returnFaction(player) + " spends " + votes + " on " + this.game.sectors[this.game.state.choices[vote]].sector);
	  }
	  if (is_planet == 0 && is_sector == 0) {
	    //
	    // player?
	    //
	    if (this.game.state.choices.length == this.game.players_info.length) {
              this.updateLog(this.returnFaction(player) + " spends " + votes + " on " + this.returnFaction(vote+1));
	    } else {
              this.updateLog(this.returnFaction(player) + " spends " + votes + " on " + vote);
	    }
	  }
        }



	let votes_finished = 0;
	for (let i = 0; i < this.game.players.length; i++) {
	  if (this.game.state.voted_on_agenda[i][this.game.state.voted_on_agenda.length-1] != 0) { votes_finished++; }
	}

	//
	// everyone has voted
	//
	if (votes_finished == this.game.players.length) {

	  let direction_of_vote = "tie";
 	  let players_in_favour = [];
	  let players_opposed = [];

	  let winning_options = [];
	  for (let i = 0; i < this.game.state.choices.length; i++) { 
	    winning_options.push(0);
	  }
	  for (let i = 0; i < this.game.players.length; i++) {
	    winning_options[this.game.state.how_voted_on_agenda[i]] += this.game.state.votes_cast[i];
	  }

	  //
	  // determine winning option
	  //
	  let max_votes_options = -1;
	  let max_votes_options_idx = 0;
	  for (let i = 0; i < winning_options.length; i++) {
	    if (winning_options[i] > max_votes_options) {
	      max_votes_options = winning_options[i];
	      max_votes_options_idx = i;
	    }
	    if (winning_options[i] > 0) {
	      this.updateLog(this.game.state.choices[i] + " receives " + winning_options[i] + " votes");
	    }
	  }
	  
	  let total_options_at_winning_strength = 0;
	  for (let i = 0; i < winning_options.length; i++) {
	    if (winning_options[i] == max_votes_options) { total_options_at_winning_strength++; }
	  }
	
	}

  	this.game.queue.splice(qe, 1);
  	return 1;

      }


      if (mv[0] == "agenda") {

console.log("start ofg agenda");

	//
	// we repeatedly hit "agenda"
	//
	let laws = imperium_self.returnAgendaCards();
        let agenda = mv[1];
        let agenda_num = parseInt(mv[2]);
	let agenda_name = this.agenda_cards[agenda].name;
	this.game.state.voting_on_agenda = agenda_num;

	//
	// voting happens in turns
	//
        let who_is_next = 0;
        for (let i = 0; i < this.game.players.length; i++) {
          if (this.game.state.voted_on_agenda[i][agenda_num] == 0) { 
	    who_is_next = i+1;
	    i = this.game.players.length; 
	  }
        }

	if (this.game.player != who_is_next) {

          let html  = '<div class="agenda_instructions">The following agenda has advanced for consideration in the Galactic Senate:</div>';
  	      html += '<div class="agenda_name">' + imperium_self.agenda_cards[agenda].name + '</div>';
	      html += '<div class="agenda_text">';
	      html += imperium_self.agenda_cards[agenda].text;
	      html += '</div>';
	      html += '<div class="agenda_status">'+this.returnFaction(who_is_next)+' is now voting.</div>';
	  this.updateStatus(html);

	} else {

	  //
	  // if the player has a rider, we skip the interactive voting and submit an abstention
	  //
	  if (imperium_self.doesPlayerHaveRider(this.game.player)) {
	    imperium_self.addMove("resolve\tagenda\t1\t"+imperium_self.app.wallet.returnPublicKey());
	    imperium_self.addMove("vote\t"+agenda_num+"\t"+imperium_self.game.player+"\t"+"abstain"+"\t"+"0");
	    imperium_self.endTurn();
	    return 0;
	  }

	  //
	  // otherwise we let them vote
	  //
    	  let is_planet = 0;
   	  let is_sector = 0;

          let html  = '<div class="agenda_instructions">The following agenda has advanced for consideration in the Galactic Senate:</div>';
  	      html += '<div class="agenda_name">' + imperium_self.agenda_cards[agenda].name + '</div>';
	      html += '<div class="agenda_text">';
	      html += imperium_self.agenda_cards[agenda].text;
	      html += '</div><ul>';
	  for (let i = 0; i < this.game.state.choices.length; i++) {

	      let to_print = this.game.state.choices[i];
	      if (to_print.indexOf("planet") == 0) { to_print = this.game.planets[to_print].name; }
	      if (to_print.indexOf("sector") == 0) { to_print = this.game.sectors[to_print].sector; }
	      if (to_print.indexOf("new-byzantium") == 0) { to_print = "New Byzantium"; }

              html += '<li class="option" id="'+i+'">' + to_print + '</li>';
	  }
              html += '<li class="option" id="abstain">abstain</li></ul></p>';
	  imperium_self.updateStatus(html);

          $('.option').off();
    	  $('.option').on('mouseenter', function() {
    	    let s = $(this).attr("id");
    	    if (imperium_self.game.state.choices[s].indexOf("planet") == 0) { is_planet = 1; }
    	    if (imperium_self.game.state.choices[s].indexOf("sector") == 0 || imperium_self.game.state.choices[s].indexOf("new-byzantium") == 0) { is_sector = 0; }
    	    if (is_planet == 1) {
    	      imperium_self.showPlanetCard(imperium_self.game.planets[imperium_self.game.state.choices[s]].tile, imperium_self.game.planets[imperium_self.game.state.choices[s]].idx);
    	      imperium_self.showSectorHighlight(imperium_self.game.planets[imperium_self.game.state.choices[s]].tile);
      	    }
    	  });
    	  $('.option').on('mouseleave', function() {
   	    let s = $(this).attr("id");
      	    if (imperium_self.game.state.choices[s].indexOf("planet") == 0) { is_planet = 1; }
     	    if (imperium_self.game.state.choices[s].indexOf("sector") == 0 || imperium_self.game.state.choices[s].indexOf("new-byzantium") == 0) { is_sector = 0; }
     	    if (is_planet == 1) {
     	      imperium_self.hidePlanetCard(imperium_self.game.planets[imperium_self.game.state.choices[s]].tile, imperium_self.game.planets[imperium_self.game.state.choices[s]].idx);
              imperium_self.hideSectorHighlight(imperium_self.game.planets[imperium_self.game.state.choices[s]].tile);
            }
          });
          $('.option').on('click', function() {

            let vote = $(this).attr("id");
	    let votes = 0;

	    if (is_planet == 1) {
  	      imperium_self.hidePlanetCard(imperium_self.game.planets[imperium_self.game.state.choices[vote]].tile, imperium_self.game.planets[imperium_self.game.state.choices[vote]].idx);
  	      imperium_self.hideSectorHighlight(imperium_self.game.planets[imperium_self.game.state.choices[vote]].tile);
	    }	

	    if (vote == "abstain") {

	      imperium_self.addMove("resolve\tagenda\t1\t"+imperium_self.app.wallet.returnPublicKey());
	      imperium_self.addMove("vote\t"+agenda_num+"\t"+imperium_self.game.player+"\t"+vote+"\t"+votes);
	      imperium_self.endTurn();
	      return 0;

	    }

            let html = '<p>How many votes do you wish to cast in the Galactic Senate:</p>';
	    for (let i = 0; i <= imperium_self.game.state.votes_available[imperium_self.game.player-1]; i++) {
              if (i == 1) {
	        html += '<li class="option" id="'+i+'">'+i+' vote</li>';
              } else {
	        html += '<li class="option" id="'+i+'">'+i+' votes</li>';
	      }
	    }
	    imperium_self.updateStatus(html);

            $('.option').off();
            $('.option').on('click', function() {

              votes = $(this).attr("id");
 
  	      imperium_self.addMove("resolve\tagenda\t1\t"+imperium_self.app.wallet.returnPublicKey());
	      imperium_self.addMove("vote\t"+agenda_num+"\t"+imperium_self.game.player+"\t"+vote+"\t"+votes);
	      imperium_self.endTurn();
	      return 0;

	    });
	  });
	}

  	return 0;

      }


      if (mv[0] == "change_speaker") {
  
  	this.game.state.speaker = parseInt(mv[1]);
  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }


      if (mv[0] == "setinitiativeorder") {

  	let initiative_order = this.returnInitiativeOrder();

  	this.game.queue.push("resolve\tsetinitiativeorder");

  	for (let i = initiative_order.length-1; i >= 0; i--) {
  	  if (this.game.players_info[initiative_order[i]-1].passed == 0) {
  	    this.game.queue.push("play\t"+initiative_order[i]);
  	  }
  	}
 
  	return 1;
  
      }
  
      //
      // resetconfirmsneeded [confirms_before_continuing] [array \t of \t pkeys]
      //
      if (mv[0] == "resetconfirmsneeded") {

	let confirms = 1;
	if (parseInt(mv[1]) > 1) { confirms = parseInt(mv[1]); }
 	this.resetConfirmsNeeded(confirms);
  	this.game.queue.splice(qe, 1);
  	return 1;

      }

      if (mv[0] == "tokenallocation") {
 	this.playerAllocateNewTokens(this.game.player, (this.game.players_info[this.game.player-1].new_tokens_per_round+this.game.players_info[this.game.player-1].new_token_bonus_when_issued), 1, 3);
  	return 0;
      }
  
  
      if (mv[0] === "newround") {

  	//
  	// SCORING
  	//
        if (this.game.state.round_scoring == 0 && this.game.state.round >= 1) {
          this.game.queue.push("strategy\t"+"imperial"+"\t"+"-1"+"\t2\t"+1);
	  this.game.state.playing_strategy_card_secondary = 0; // reset to 0 as we are kicking into secondary
          this.game.queue.push("resetconfirmsneeded\t" + imperium_self.game.players_info.length);
          this.game.queue.push("acknowledge\t"+"As the Imperial card was not played in the previous round, all players now have an opportunity to score Victory Points (in initiative order)");
  	  this.game.state.round_scoring = 0;
	  return 1;
  	} else {
  	  this.game.state.round_scoring = 0;
	  this.game.state.playing_strategy_card_secondary = 0; // reset to 0 as no secondary to run
  	}


        //
  	// game event triggers
  	//
	let z = this.returnEventObjects();
        for (let k in z) {
          for (let i = 0; i < this.game.players_info.length; i++) {
            z[k].onNewRound(this, (i+1));
  	  }
  	}

      	this.game.queue.push("resolve\tnewround");
    	this.game.state.round++;
    	this.updateLog("<div style='margin-top:10px;margin-bottom:10px;'>ROUND: " + this.game.state.round + '</div>');
  	this.updateStatus("Moving into Round " + this.game.state.round);


	//
	//
	//
	for (let i = 0; i < this.game.players_info.length; i++) {
	  if (this.game.players_info[i].must_exhaust_at_round_start.length > 0) {
	    this.game.queue.push("must_exhaust_at_round_start\t"+(i+1));
	  }
	}


	//
	// REFRESH PLANETS
	//
	for (let i = 0; i < this.game.players_info.length; i++) {
	  for (let ii in this.game.planets) {
	    this.game.planets[ii].exhausted = 0;
	  }
	}


  	//
  	// RESET USER ACCOUNTS
  	//
        for (let i = 0; i < this.game.players_info.length; i++) {
  	  this.game.players_info[i].passed = 0;
	  this.game.players_info[i].strategy_cards_played = [];
  	  this.game.players_info[i].strategy = [];
  	  this.game.players_info[i].must_exhaust_at_round_start = [];
  	  this.game.players_info[i].objectives_scored_this_round = [];
        }


  	//
  	// REPAIR UNITS
  	//
  	this.repairUnits();

  
  	//
  	// SET INITIATIVE ORDER
  	//
        this.game.queue.push("setinitiativeorder");

  
  	//
  	// STRATEGY CARDS
  	//
        this.game.queue.push("playerschoosestrategycards_after");
        this.game.queue.push("playerschoosestrategycards");
        this.game.queue.push("playerschoosestrategycards_before");
        if (this.game.state.round == 1) {
          this.game.queue.push("acknowledge\t"+"<center><p style='font-weight:bold'>The Republic has fallen!</p><p style='font-size:0.95em;margin-top:10px;'>As the Galactic Senate collapses into factional squabbling, the ascendant powers on the outer rim plot to seize New Byzantium...</p><p style='font-size:0.95em;margin-top:10px'>Take the lead by moving your fleet to capture New Byzantium, or establish a power-base to displace the leader and impose your will on your peers.</p></center>");
 	}



  	//
  	// ACTION CARDS
  	//
  	for (let i = 1; i <= this.game.players_info.length; i++) {
          this.game.queue.push("gain\t"+i+'\t'+"action_cards"+"\t"+(this.game.players_info[this.game.player-1].action_cards_per_round+this.game.players_info[this.game.player-1].action_cards_bonus_when_issued));
          this.game.queue.push("DEAL\t2\t"+i+'\t'+(this.game.players_info[this.game.player-1].action_cards_per_round+this.game.players_info[this.game.player-1].action_cards_bonus_when_issued));
  	}
  	
  
  	//
  	// READY (arcade can let us in!)
  	//	  
  	if (this.game.initializing == 1) {
          this.game.queue.push("READY");
  	} else {
  	  //
  	  // ALLOCATE TOKENS
  	  //
          this.game.queue.push("tokenallocation\t"+this.game.players_info.length);
          this.game.queue.push("resetconfirmsneeded\t"+this.game.players_info.length);
	}
  

  	//
  	// FLIP NEW AGENDA CARDS
  	//
        this.game.queue.push("revealagendas");
        this.game.queue.push("notify\tFLIPCARD is completed!");
  	for (let i = 1; i <= this.game.players_info.length; i++) {
          this.game.queue.push("FLIPCARD\t3\t3\t1\t"+i); // deck card poolnum player
  	}


	//
	// DE-ACTIVATE SYSTEMS
	//
        this.deactivateSectors();
        this.unhighlightSectors();	


  	//
  	// FLIP NEW OBJECTIVES
  	//
        if (this.game.state.round == 1) {
          this.game.queue.push("revealobjectives");
  	  for (let i = 1; i <= this.game.players_info.length; i++) {
            this.game.queue.push("FLIPCARD\t4\t2\t2\t"+i); // deck card poolnum player
  	  }
/***
  	  for (let i = 1; i <= this.game.players_info.length; i++) {
            this.game.queue.push("FLIPCARD\t5\t2\t2\t"+i); // deck card poolnum player
  	  }
***/
        } else {

          if (this.game.state.round < 4) {
            this.game.queue.push("revealobjectives");
  	    for (let i = 1; i <= this.game.players_info.length; i++) {
console.log("HERE: " + i);
              this.game.queue.push("FLIPCARD\t4\t1\t2\t"+i); // deck card poolnum player
console.log("HERE 2: " + i);
  	    }
	  }

          if (this.game.state.round >= 4) {
            this.game.queue.push("revealobjectives");
  	    for (let i = 1; i <= this.game.players_info.length; i++) {
              this.game.queue.push("FLIPCARD\t5\t1\t3\t"+i); // deck card poolnum player
  	    }
	  }

	}
console.log("DONE HERE!");
    	return 1;
      }
 

      if (mv[0] === "revealagendas") {

	let updateonly = mv[1];

  	this.updateLog("revealing upcoming agendas...");
  
  	//
  	// reset agendas
  	//
	if (!updateonly) {
    	  this.game.state.agendas = [];
    	  this.game.state.agendas_voting_information = [];
        }
        for (i = 0; i < this.game.pool[0].hand.length; i++) {
          this.game.state.agendas.push(this.game.pool[0].hand[i]);	
          this.game.state.agendas_voting_information.push({});
  	}
  
  	//
  	// reset pool
  	//
  	this.game.pool = [];
  	this.updateLeaderboard();
  	this.game.queue.splice(qe, 1);

  	return 1;
      }
  

      if (mv[0] === "revealobjectives") {
  
  	this.updateLog("revealing upcoming objectives...");

console.log("A");
  
  	//
  	// reset agendas
  	//
        this.game.state.stage_i_objectives = [];
        this.game.state.stage_ii_objectives = [];
        this.game.state.secret_objectives = [];

console.log("POOLS: " + this.game.pool.length);;
console.log(JSON.stringify(this.game.pool));


	if (this.game.pool.length > 1) {
          for (i = 0; i < this.game.pool[1].hand.length; i++) {
  	    if (!this.game.state.stage_i_objectives.includes(this.game.pool[1].hand[i])) {
              this.game.state.stage_i_objectives.push(this.game.pool[1].hand[i]);	
	    }
  	  }
	}
console.log("do we have a pool 2?");
	if (this.game.pool.length > 2) {
          for (i = 0; i < this.game.pool[2].hand.length; i++) {
	    if (!this.game.state.stage_ii_objectives.includes(this.game.pool[2].hand[i])) {
              this.game.state.stage_ii_objectives.push(this.game.pool[2].hand[i]);	
  	    }
  	  }
  	}
  
  	this.game.queue.splice(qe, 1);
  	return 1;
      }
  


      if (mv[0] === "score") {
  
  	let player       = parseInt(mv[1]);
  	let vp 		 = parseInt(mv[2]);
  	let objective    = mv[3];
  
  	this.updateLog(this.returnFaction(player)+" scores "+vp+" VP");

  	this.game.players_info[player-1].vp += vp;
  	this.game.players_info[player-1].objectives_scored.push(objective);

	//
	// end game
	//
	if (this.checkForVictory() == 1) {
	  this.updateStatus("Game Over: " + this.returnFaction(player-1) + " has reached 14 VP");
	  return 0;
	}

  	this.game.queue.splice(qe, 1);

        if (this.stage_i_objectives[objective] != undefined) {
	  return this.stage_i_objectives[objective].scoreObjective(this, player);
	}
        if (this.stage_ii_objectives[objective] != undefined) {
	  return this.stage_ii_objectives[objective].scoreObjective(this, player);
	}
        if (this.secret_objectives[objective] != undefined) {
	  return this.secret_objectives[objective].scoreObjective(this, player);
	}

  	return 1;

      }
  
  
      if (mv[0] === "playerschoosestrategycards") {
  
  	this.updateLog("Players selecting strategy cards, starting from " + this.returnSpeaker());
  	this.updateStatus("Players selecting strategy cards, starting from " + this.returnSpeaker());
  
  	//
  	// all strategy cards on table again
  	//
  	this.game.state.strategy_cards = [];
  	let x = this.returnStrategyCards();
  
  	for (let z in x) {
    	  if (!this.game.state.strategy_cards.includes(z)) {
  	    this.game.state.strategy_cards.push(z);
  	    this.game.state.strategy_cards_bonus.push(0);
          }
  	}
  
  	if (this.game.player == this.game.state.speaker) {
  
  	  this.addMove("resolve\tplayerschoosestrategycards");
  	  this.addMove("addbonustounselectedstrategycards");
  
  	  let cards_to_select = 1;
  	  if (this.game.players_info.length == 2) { cards_to_select = 3; }
  	  if (this.game.players_info.length == 3) { cards_to_select = 2; }
  	  if (this.game.players_info.length == 4) { cards_to_select = 2; }
  	  if (this.game.players_info.length >= 5) { cards_to_select = 1; }
  
  	  //
  	  // TODO -- pick appropriate card number
  	  //
  	  //cards_to_select = 1;
  
  	  for (cts = 0; cts < cards_to_select; cts++) {
            for (let i = 0; i < this.game.players_info.length; i++) {
  	      let this_player = this.game.state.speaker+i;
  	      if (this_player > this.game.players_info.length) { this_player -= this.game.players_info.length; }
  	      this.rmoves.push("pickstrategy\t"+this_player);
            }
  	  }
  
  	  this.endTurn();
  	}

 	return 0;
      }
  
      if (mv[0] === "addbonustounselectedstrategycards") {
  
        for (let i = 0; i < this.game.state.strategy_cards.length; i++) {
          this.game.state.strategy_cards_bonus[i] += 1;
  	}
  
        this.game.queue.splice(qe, 1);
  	return 1;
  
      }


      if (mv[0] === "pickstrategy") {
  
  	let player       = parseInt(mv[1]);

console.log("HERE WE ARE: " + player);
  
  	if (this.game.player == player) {
  	  this.playerSelectStrategyCards(function(card) {
  	    imperium_self.addMove("resolve\tpickstrategy");
  	    imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tstrategycard\t"+card);
  	    imperium_self.endTurn();
  	  });
  	  return 0;
  	} else {
  	  this.updateStatus(this.returnFaction(player) + " is picking a strategy card");
  	}
  	return 0;
      }
  

      if (mv[0] === "land") {

  	let player       = mv[1];
  	let player_moves = mv[2];
        let sector       = mv[3];
        let source       = mv[4];   // planet ship
        let source_idx   = mv[5];   // planet_idx or ship_idx
        let planet_idx   = mv[6];
        let unitjson     = mv[7];

        let sys = this.returnSectorAndPlanets(sector);

  	if (this.game.player != player || player_moves == 1) {
          if (source == "planet") {
            this.unloadUnitByJSONFromPlanet(player, sector, source_idx, unitjson);
            this.loadUnitByJSONOntoPlanet(player, sector, planet_idx, unitjson);
          } else {
            if (source == "ship") {
              this.unloadUnitByJSONFromShip(player, sector, source_idx, unitjson);
              this.loadUnitByJSONOntoPlanet(player, sector, planet_idx, unitjson);
            } else {
              this.loadUnitByJSONOntoPlanet(player, sector, planet_idx, unitjson);
            }
          }
        }


        if (this.game.queue.length > 1) {
	  if (this.game.queue[this.game.queue.length-2].indexOf("land") != 0) {
            let player_forces = this.returnNumberOfGroundForcesOnPlanet(player, sector, planet_idx);
	    this.updateLog(this.returnFaction(player) + " lands " + player_forces + " infantry on " + sys.p[parseInt(planet_idx)].name);  
	  } else {
	    let lmv = this.game.queue[this.game.queue.length-2].split("\t");
	    let lplanet_idx = lmv[6];
	    if (lplanet_idx != planet_idx) {
              let player_forces = this.returnNumberOfGroundForcesOnPlanet(player, sector, planet_idx);
	      this.updateLog(this.returnFaction(player) + " lands " + player_forces + " infantry on " + sys.p[parseInt(planet_idx)].name);  
	    }
	  }
	}

        this.saveSystemAndPlanets(sys);
        this.updateSectorGraphics(sector);
        this.game.queue.splice(qe, 1);
        return 1;
  
      }
  
      if (mv[0] === "load") {
  
  	let player       = mv[1];
  	let player_moves = mv[2];
        let sector       = mv[3];
        let source       = mv[4];   // planet ship
        let source_idx   = mv[5];   // planet_idx or ship_idx
        let unitjson     = mv[6];
        let shipjson     = mv[7];

//        let sys = this.returnSectorAndPlanets(sector);
  
  	if (this.game.player != player || player_moves == 1) {
          if (source == "planet") {
            this.unloadUnitByJSONFromPlanet(player, sector, source_idx, unitjson);
            this.loadUnitByJSONOntoShipByJSON(player, sector, shipjson, unitjson);
          } else {
            if (source == "ship") {
	      if (source_idx != "") {
                this.unloadUnitByJSONFromShip(player, sector, source_idx, unitjson);
                this.loadUnitByJSONOntoShipByJSON(player, sector, shipjson, unitjson);
	      } else {

 		this.removeSpaceUnitByJSON(player, sector, unitjson);
                this.loadUnitByJSONOntoShipByJSON(player, sector, shipjson, unitjson);

	      }
            } else {
              this.loadUnitByJSONOntoShipByJSON(player, sector, shipjson, unitjson);
            }
          }
        }

        let sys = this.returnSectorAndPlanets(sector);
  
//        this.saveSystemAndPlanets(sys);
        this.updateSectorGraphics(sector);
        this.game.queue.splice(qe, 1);
        return 1;
  
      }


      if (mv[0] === "notify") {
  
  	this.updateLog(mv[1]);
  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }


      if (mv[0] === "acknowledge") {  

	let imperium_self = this;
	let notice = mv[1];
  	//this.game.queue.splice(qe, 1);
	this.game.halted = 1;
	//this.saveGame(this.game.id);

	let my_specific_game_id = this.game.id;

  	this.playerAcknowledgeNotice(notice, function() {

	  imperium_self.game = imperium_self.loadGame(my_specific_game_id);

	  imperium_self.updateStatus(" acknowledged...");

  	  imperium_self.game.queue.splice(qe, 1);
	  // we have stopped queue execution, so need to restart at the lowest level
	  imperium_self.game.halted = 0;

//
// and save so we continue from AFTER this point...
//
imperium_self.saveGame(imperium_self.game.id);
  	  console.log("CONTINUING EXECUTION FROM HERE");
	  console.log(imperium_self.game.queue);
//console.log("STARTING WITH RUN QUEUE");

	  console.log("DO WE HAVE FUTURE MOVES? " + JSON.stringify(imperium_self.game.future));
	  imperium_self.runQueue();
	  return 0;

	});

	return 0;
      }


      if (mv[0] === "annex") {
  
  	let player 	= parseInt(mv[1]);
  	let sector	= mv[2];
  	let planet_idx	= parseInt(mv[3]);
  	this.game.queue.splice(qe, 1);

	let sys = this.returnSectorAndPlanets(sector);
	let planet = sys.p[planet_idx];

	if (planet) {
	  planet.units[planet.owner-1] = [];
	  this.updatePlanetOwner(sector, planet_idx, player);
	}

  	return 1;
  
      }


      if (mv[0] === "give") {
  
  	let giver       = parseInt(mv[1]);
        let recipient    = parseInt(mv[2]);
        let type         = mv[3];
        let details      = mv[4];
  	this.game.queue.splice(qe, 1);

        if (type == "action") {
	  if (this.game.player == recipient) {
	    this.game.deck[1].hand.push(details);
	    if (this.game.deck[1].hand.length > this.game.players_info[this.game.player-1].action_card_limit) {
	      this.playerDiscardActionCard(1);
	      return 0;
	    } else {
	    }
	    this.endTurn();
	  }
        }
  
  	return 0;  

      }


      if (mv[0] === "adjacency") {
  
  	let type       	= mv[1];
  	let sector1	= mv[2];
  	let sector2	= mv[3];
  	this.game.queue.splice(qe, 1);

	this.game.state.temporary_adjacency.push([sector1, sector2]);
  	return 1;

      }


      if (mv[0] === "pull") {
  
  	let puller       = parseInt(mv[1]);
        let pullee       = parseInt(mv[2]);
        let type         = mv[3];
        let details      = mv[4];
  	this.game.queue.splice(qe, 1);

        if (type == "action") {
	  if (details === "random") {
	    if (this.game.player == pullee) {
	      let roll = this.rollDice(this.game.deck[1].hand.length);
	      let action_card = this.game.deck[1].hand[roll-1];
	      this.game.deck[1].hand.splice((roll-1), 1);
	      this.addMove("give\t"+pullee+"\t"+puller+"\t"+"action"+"\t"+action_card);
	      this.addMove("notify\t" + this.returnFaction(puller) + " pulls " + this.action_cards[action_card].name);
	      this.endTurn();
	    } else {
	      let roll = this.rollDice();
	    }
	  }
  	}
  
  	return 0;  

      }


      if (mv[0] === "expend") {
  
  	let player       = parseInt(mv[1]);
        let type         = mv[2];
        let details      = mv[3];
  
        if (type == "command") {
  	  this.game.players_info[player-1].command_tokens -= parseInt(details);
  	}
        if (type == "strategy") {
  	  this.game.players_info[player-1].strategy_tokens -= parseInt(details);
  	}
        if (type == "goods") {
  	  this.game.players_info[player-1].goods -= parseInt(details);
  	}
        if (type == "trade") {
  	  this.game.players_info[player-1].goods -= parseInt(details);
  	}
        if (type == "planet") {
  	  this.game.planets[details].exhausted = 1;
  	}
  

	this.updateTokenDisplay();
	this.updateLeaderboard();

  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }



      if (mv[0] === "unexhaust") {
  
  	let player       = parseInt(mv[1]);
        let type	 = mv[2];
        let name	 = mv[3];
  
  	if (type == "planet") { this.unexhaustPlanet(name); }
  
  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }

      if (mv[0] === "offer") {

	let offering_faction = parseInt(mv[1]);
	let faction_to_consider = parseInt(mv[2]);
	let stuff_on_offer = JSON.parse(mv[3]);
	let stuff_in_return = JSON.parse(mv[4]);
  	this.game.queue.splice(qe, 1);

	this.updateLog(this.returnFaction(offering_faction) + " makes a trade offer to " + this.returnFaction(faction_to_consider));
	if (this.game.player == faction_to_consider) {
	  this.playerHandleTradeOffer(offering_faction, stuff_on_offer, stuff_in_return);
	}

        return 0;
      }
      


      if (mv[0] === "refuse_offer") {

	let refusing_faction = parseInt(mv[1]);
	let faction_that_offered = parseInt(mv[2]);
  	this.game.queue.splice(qe, 1);

        this.game.players_info[refusing_faction-1].traded_this_turn = 1;
        this.game.players_info[faction_that_offered-1].traded_this_turn = 1;

	if (offering_faction == this.game.player) {
	  this.game.queue.push("acknowledge\tYour trade offer has been spurned by "+this.returnFaction(faction_responding));
	}

	this.updateLog(this.returnFaction(refusing_faction) + " spurns a trade offered by " + this.returnFaction(faction_that_offered));
        return 1;

      }
      


      if (mv[0] === "trade") {
  
  	let offering_faction      = parseInt(mv[1]);
  	let faction_responding    = parseInt(mv[2]);
        let offer	 	  = JSON.parse(mv[3]);
  	let response	 	  = JSON.parse(mv[4]);

  	this.game.queue.splice(qe, 1);

	if (offering_faction == this.game.player) {
	  this.game.queue.push("acknowledge\tYour trade offer has been accepted by "+this.returnFaction(faction_responding));
	}

        this.game.players_info[offering_faction-1].traded_this_turn = 1;
        this.game.players_info[faction_responding-1].traded_this_turn = 1;

  	this.game.players_info[offering_faction-1].commodities -= parseInt(offer.goods);
  	this.game.players_info[faction_responding-1].commodities -= parseInt(response.goods);

  	this.game.players_info[offering_faction-1].goods += parseInt(response.goods);
  	this.game.players_info[faction_responding-1].goods += parseInt(offer.goods);

	if (this.game.players_info[offering_faction-1].commodities < 0) {
	  this.game.players_info[offering_faction-1].goods += parseInt(this.game.players_info[offering_faction-1].commodities);
	  this.game.players_info[offering_faction-1].commodities = 0;
	}

	if (this.game.players_info[faction_responding-1].commodities < 0) {
	  this.game.players_info[faction_responding-1].goods += parseInt(this.game.players_info[faction_responding-1].commodities);
	  this.game.players_info[faction_responding-1].commodities = 0;
	}

  	return 1;
  	
      }



      
      //
      // can be used for passive activation that does not spend
      // tokens or trigger events, like activating in diplomacy
      //
      if (mv[0] === "activate") {

        let z		 = this.returnEventObjects();
  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];

        sys = this.returnSectorAndPlanets(sector);
  	sys.s.activated[player-1] = 1;
  	this.saveSystemAndPlanets(sys);
        this.updateSectorGraphics(sector);

  	this.game.queue.splice(qe, 1);

  	return 1;
      }



      if (mv[0] === "deactivate") {
  
  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
  
        sys = this.returnSectorAndPlanets(sector);
  	sys.s.activated[player-1] = 0;
        this.updateSectorGraphics(sector);
  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }



      //
      // used to track cards
      //
      if (mv[0] === "lose") {

  	let player       = parseInt(mv[1]);
        let type         = mv[2];
        let amount       = parseInt(mv[3]);
	let z            = this.returnEventObjects();

	if (type == "action_cards") {
	  this.game.players_info[player-1].action_cards_in_hand -= amount;
	  if (this.game.players_info[player-1].action_cards_in_hand > 0) {
	    this.game.players_info[player-1].action_cards_in_hand = 0;
	  }
	}
	if (type == "secret_objectives") {
	  this.game.players_info[player-1].secret_objectives_in_hand -= amount;
	  if (this.game.players_info[player-1].secret_objectives_in_hand > 0) {
	    this.game.players_info[player-1].secret_objectives_in_hand = 0;
	  }
	}

  	this.game.queue.splice(qe, 1);
  	return 1;

      }
      //
      // used to track cards
      //
      if (mv[0] === "gain") {

  	let player       = parseInt(mv[1]);
        let type         = mv[2];
        let amount       = parseInt(mv[3]);
	let z            = this.returnEventObjects();

	if (type == "action_cards") {
	  this.game.players_info[player-1].action_cards_in_hand += amount;
	}
	if (type == "secret_objectives") {
	  this.game.players_info[player-1].secret_objectives_in_hand += amount;
	}

	this.updateTokenDisplay();
	this.updateLeaderboard();

  	this.game.queue.splice(qe, 1);
  	return 1;

      }
  

      if (mv[0] === "purchase") {
  
  	let player       = parseInt(mv[1]);
        let item         = mv[2];
        let amount       = parseInt(mv[3]);
	let z            = this.returnEventObjects();
  
        if (item == "strategycard") {
  
  	  this.updateLog(this.returnFaction(player) + " takes " + this.strategy_cards[mv[3]].name);

	  let strategy_card = mv[3];  
	  for (let z_index in z) {
            strategy_card = z[z_index].gainStrategyCard(imperium_self, player, strategy_card);
          }

  	  this.game.players_info[player-1].strategy.push(mv[3]);
  	  for (let i = 0; i < this.game.state.strategy_cards.length; i++) {
  	    if (this.game.state.strategy_cards[i] === mv[3]) {
  	      this.game.players_info[player-1].goods += this.game.state.strategy_cards_bonus[i];
  	      this.game.state.strategy_cards.splice(i, 1);
  	      this.game.state.strategy_cards_bonus.splice(i, 1);
  	      i = this.game.state.strategy_cards.length+2;
  	    }
  	  }
  	}

        if (item == "tech" && item == "technology") {

  	  this.updateLog(this.returnFaction(player) + " gains " + this.tech[mv[3]].name);
  	  if (!this.game.players_info[player-1].tech.includes(mv[3])) {
	    this.game.players_info[player-1].tech.push(mv[3]);
	  }
	  for (let z_index in z) {
  	    z[z_index].gainTechnology(imperium_self, player, mv[3]);
  	  }
	  this.upgradePlayerUnitsOnBoard(player);
  	}
        if (item == "goods") {
  	  this.updateLog(this.returnFaction(player) + " gains " + amount + " trade goods");
	  for (let z_index in z) {
  	    amount = z[z_index].gainTradeGoods(imperium_self, player, amount);
  	  }
	  this.game.players_info[player-1].goods += amount;
  	}

        if (item == "commodities") {
  	  this.updateLog(this.returnFaction(player) + " gains " + mv[3] + " commodities");
	  for (let z_index in z) {
  	    amount = z[z_index].gainCommodities(imperium_self, player, amount);
  	  }
  	  this.game.players_info[player-1].commodities += amount;
  	}

        if (item == "command") {
  	  this.updateLog(this.returnFaction(player) + " gains " + mv[3] + " command tokens");
	  for (let z_index in z) {
  	    amount = z[z_index].gainCommandTokens(imperium_self, player, amount);
  	  }
  	  this.game.players_info[player-1].command_tokens += amount;
  	}
        if (item == "strategy") {
  	  this.updateLog(this.returnFaction(player) + " gains " + mv[3] + " strategy tokens");
	  for (let z_index in z) {
  	    amount = z[z_index].gainStrategyTokens(imperium_self, player, amount);
  	  }
  	  this.game.players_info[player-1].strategy_tokens += amount;
  	}

        if (item == "fleetsupply") {
	  for (let z_index in z) {
  	    amount = z[z_index].gainFleetSupply(imperium_self, player, amount);
  	  }
  	  this.game.players_info[player-1].fleet_supply += amount;
  	  this.updateLog(this.returnFaction(player) + " increases fleet supply to " + this.game.players_info[player-1].fleet_supply);
  	}
  

	this.updateTokenDisplay();
	this.updateLeaderboard();

  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }


      if (mv[0] === "pass") {
  	let player       = parseInt(mv[1]);
  	this.game.players_info[player-1].passed = 1;
  	this.game.queue.splice(qe, 1);
  	return 1;  
      }


      if (mv[0] === "add_infantry_to_planet") {
 
  	let player       = mv[1];
        let planet       = mv[2];
        let player_moves = parseInt(mv[3]);
  
 	if (player_moves == 0 && this.game.player == player) {
	}
	else {
	  this.game.planets[planet].units[player-1].push(this.returnUnit("infantry", player)); 
	}

  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }


      if (mv[0] === "remove_infantry_from_planet") {
 
  	let player       = mv[1];
        let planet_n       = mv[2];
        let player_moves = parseInt(mv[3]); 
 
 	if (player_moves == 0 && this.game.player == player) {
	}
	else {
	
	  let planet = this.game.planets[planet_n];
console.log("P: " + JSON.stringify(planet));
	  let planetunits = planet.units[player-1].length;

	  for (let i = 0; i < planetunits; i++) {
	    let thisunit = planet.units[player-1][i];
	    if (thisunit.type == "infantry") {
	      planet.units[player-1].splice(i, 1);
	      i = planetunits+2;
	    }
	  }

	}

  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }

      if (mv[0] === "move") {
 
  	let player       = mv[1];
        let player_moves = parseInt(mv[2]);
        let sector_from  = mv[3];
        let sector_to    = mv[4];
        let shipjson     = mv[5];
  
  	//
  	// move any ships
  	//
  	if (this.game.player != player || player_moves == 1) {
  	  let sys = this.returnSectorAndPlanets(sector_from);
  	  let sys2 = this.returnSectorAndPlanets(sector_to);
	  let obj = JSON.parse(shipjson);
	  let storage = "";
	  let units_in_storage = this.returnUnitsInStorage(obj); 
console.log("UNITS IN STORAGE: " + units_in_storage);
          if (units_in_storage.length > 0 ) {
	    storage += ' (';
	    for (let i = 0; i < units_in_storage.length; i++) {
	      if (i > 0) { storage += ", "; }
	      storage += units_in_storage[i].name;
	    }
	    storage += ')';
          }
	  this.updateLog(this.returnFaction(player) + " moves " + obj.name + " into " + sys2.s.name + storage);
  	  this.removeSpaceUnitByJSON(player, sector_from, shipjson);
          this.addSpaceUnitByJSON(player, sector_to, shipjson);
  	}
  
  	this.updateSectorGraphics(sector_to);
  	this.updateSectorGraphics(sector_from);

  	this.game.queue.splice(qe, 1);
  	return 1;
  
      }



      /////////////////
      // END OF TURN //
      /////////////////
      if (mv[0] === "player_end_turn") {

  	let player = parseInt(mv[1]);
	let z = this.returnEventObjects();

        this.game.state.active_player_moved = 0;
        this.game.state.active_player_turn = -1;
  	this.game.queue.splice(qe, 1);

	let speaker_order = this.returnSpeakerOrder();
  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if ( z[i].playerEndTurnTriggers(this, speaker_order[i]) == 1 ) {
	      this.game.queue.push("player_end_turn_event\t"+speaker_order[i]+"\t"+k);
	    }
	  }
	}
  	return 1;
      }
      if (mv[0] === "player_end_turn_event") {  
  	let player = parseInt(mv[1]);
  	let z_index = parseInt(mv[2]);
	let z = this.returnEventObjects();
  	this.game.queue.splice(qe, 1);
	return z[z_index].playerEndTurnEvent(this, player);
      }




      /////////////////////
      // ACTIVATE SYSTEM //
      /////////////////////
      if (mv[0] === "activate_system") {
  
  	let activating_player       = parseInt(mv[1]);
        let sector	 = mv[2];
	let player_to_continue = mv[3];  
        let z = this.returnEventObjects();

        sys = this.returnSectorAndPlanets(sector);
  	sys.s.activated[player_to_continue-1] = 1;
  	this.saveSystemAndPlanets(sys);
        this.updateSectorGraphics(sector);

	this.updateLog(this.returnFaction(activating_player) + " activates " + this.returnSectorName(sector));

  	this.game.queue.splice(qe, 1);

	let speaker_order = this.returnSpeakerOrder();

  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].activateSystemTriggers(this, activating_player, speaker_order[i], sector) == 1) {
	      this.game.queue.push("activate_system_event\t"+activating_player+"\t"+speaker_order[i]+"\t"+sector+"\t"+k);
	    }
          }
        }
  	return 1;
      }

      if (mv[0] === "activate_system_event") {
        let z		 = this.returnEventObjects();
  	let activating_player = parseInt(mv[1]);
  	let player       = parseInt(mv[2]);
        let sector	 = mv[3];
        let z_index	 = parseInt(mv[4]);
  	this.game.queue.splice(qe, 1);
	return z[z_index].activateSystemEvent(this, activating_player, player, sector);

      }

      if (mv[0] === "activate_system_post") {
  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
  	this.game.queue.splice(qe, 1);
        this.updateSectorGraphics(sector);
	// control returns to original player
        if (this.game.player == player) { this.playerPostActivateSystem(sector); }
	return 0;

      }



      ///////////////////
      // AGENDA VOTING //
      ///////////////////
      if (mv[0] === "pre_agenda_stage") {
  
        let z = this.returnEventObjects();
	let agenda = mv[1];

  	this.game.queue.splice(qe, 1);

	//
	// clear all riders
	//
	this.game.state.riders = [];
	this.game.state.choices = [];

	let speaker_order = this.returnSpeakerOrder();
  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].preAgendaStageTriggers(this, speaker_order[i], agenda) == 1) {
	      this.game.queue.push("pre_agenda_stage_event\t"+speaker_order[i]+"\t"+agenda+"\t"+k);
	    }
          }
        }
  	return 1;
      }
      if (mv[0] === "pre_agenda_stage_event") {
        let z		 = this.returnEventObjects();
  	let player       = parseInt(mv[1]);
  	let agenda       = mv[2];
        let z_index	 = parseInt(mv[3]);
  	this.game.queue.splice(qe, 1);
	return z[z_index].preAgendaStageEvent(this, player);
      }
      if (mv[0] === "pre_agenda_stage_post") {
        let agenda	 = mv[1];
        let imperium_self = this;
  	this.game.queue.splice(qe, 1);

	//
	// determine which choices the agenda is voting on
	//
console.log("AGENDA IS: " + agenda);
console.log("X: " +JSON.stringify(this.agenda_cards[agenda]));
	this.game.state.choices = this.agenda_cards[agenda].returnAgendaOptions(imperium_self);
console.log("CHOICES: " +this.game.state.choices);


        let speaker_order = this.returnSpeakerOrder();
  	for (let i = 0; i < speaker_order.length; i++) {
	  this.game.queue.push("pre_agenda_stage_player_menu\t"+speaker_order[i]+"\t"+agenda);
        }
	return 1;
      }
      if (mv[0] === "pre_agenda_stage_player_menu") {
        let player       = parseInt(mv[1]);
        let agenda       = mv[2];
        this.game.queue.splice(qe, 1);
	this.updateLog(this.returnFaction(player) + " is considering agenda options");

console.log("WHICH PLAYER? " + player + " -- " + this.game.player);

	if (this.game.player == player) {
          this.playerPlayPreAgendaStage(player, agenda);        
	}
        return 0;
      }





      if (mv[0] === "post_agenda_stage") {
        let z = this.returnEventObjects();
	let agenda = mv[1];
  	this.game.queue.splice(qe, 1);
	let speaker_order = this.returnSpeakerOrder();
  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].postAgendaStageTriggers(this, speaker_order[i], agenda) == 1) {
	      this.game.queue.push("post_agenda_stage_event\t"+speaker_order[i]+"\t"+agenda+"\t"+k);
	    }
          }
        }
  	return 1;
      }
      if (mv[0] === "post_agenda_stage_event") {
        let z		 = this.returnEventObjects();
  	let player       = parseInt(mv[1]);
  	let agenda       = mv[2];
        let z_index	 = parseInt(mv[3]);
  	this.game.queue.splice(qe, 1);
	return z[z_index].postAgendaStageEvent(this, player);
      }
      if (mv[0] === "post_agenda_stage_post") {
        let agenda	 = mv[1];
  	this.game.queue.splice(qe, 1);
        let speaker_order = this.returnSpeakerOrder();
  	for (let i = 0; i < speaker_order.length; i++) {
	  this.game.queue.push("post_agenda_stage_player_menu\t"+speaker_order[i]+"\t"+agenda);
        }
	return 1;
      }
      if (mv[0] === "post_agenda_stage_player_menu") {
        let player       = parseInt(mv[1]);
        let agenda       = mv[2];
        this.game.queue.splice(qe, 1);
	this.updateLog(this.returnFaction(player) + " is considering agenda options");
	if (this.game.player == player) {

          let winning_choice = "";
          let winning_options = [];

          for (let i = 0; i < this.game.state.choices.length; i++) {
            winning_options.push(0);
          }
          for (let i = 0; i < this.game.players.length; i++) {
            winning_options[this.game.state.how_voted_on_agenda[i]] += this.game.state.votes_cast[i];
          }

          //
          // determine winning option
          //
          let max_votes_options = -1;
          let max_votes_options_idx = 0;
          for (let i = 0; i < winning_options.length; i++) {
            if (winning_options[i] > max_votes_options) {
              max_votes_options = winning_options[i];
              max_votes_options_idx = i;
            }
          }

          let total_options_at_winning_strength = 0;
	  let tied_choices = [];
          for (let i = 0; i < winning_options.length; i++) {
            if (winning_options[i] == max_votes_options) {
	      total_options_at_winning_strength++; 
	      tied_choices.push(this.game.state.choices[i]);
	    }
          }

          this.playerPlayPostAgendaStage(player, agenda, tied_choices); 
	}
        return 0;
      }






      ///////////////////////
      // PDS SPACE DEFENSE //
      ///////////////////////
      if (mv[0] === "pds_space_defense") {
  
  	let attacker       = mv[1];
        let sector       = mv[2];
	let z		 = this.returnEventObjects();

  	this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

	//
	// reset 
	//
	this.resetTargetUnits();

  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].pdsSpaceDefenseTriggers(this, attacker, speaker_order[i], sector) == 1) {
	      this.game.queue.push("pds_space_defense_event\t"+speaker_order[i]+"\t"+attacker+"\t"+sector+"\t"+k);
            }
          }
        }
  	return 1;
      }


      if (mv[0] === "pds_space_defense_event") {
  
        let z 	 	 = this.returnEventObjects();
  	let player       = parseInt(mv[1]);
  	let attacker       = parseInt(mv[2]);
        let sector	 = mv[3];
        let z_index	 = parseInt(mv[4]);
  	this.game.queue.splice(qe, 1);

	//
	// opportunity to add action cards / graviton / etc.
	//
	return z[z_index].pdsSpaceDefenseEvent(this, attacker, player, sector);

      }


      if (mv[0] === "pds_space_defense_post") {

  	let attacker     = parseInt(mv[1]);
        let sector	 = mv[2];
  	this.game.queue.splice(qe, 1);

        this.updateSectorGraphics(sector);

	//
	// all pds units have been identified and have chosen to fire at this point
        // this is taken care of by the event above. so we should calculate hits and 
	// process re-rolls.
	//
        let speaker_order = this.returnSpeakerOrder();

  	for (let i = 0; i < speaker_order.length; i++) {
	  if (this.doesPlayerHavePDSUnitsWithinRange(attacker, speaker_order[i], sector) == 1) {
	    this.game.queue.push("pds_space_defense_player_menu\t"+speaker_order[i]+"\t"+attacker+"\t"+sector);
          }
        }

  	return 1;

      }



      if (mv[0] === "pds_space_defense_player_menu") {

        let player       = parseInt(mv[1]);
        let attacker     = parseInt(mv[2]);
        let sector       = mv[3];
        this.game.queue.splice(qe, 1);

        this.updateSectorGraphics(sector);

	this.updateLog(this.returnFaction(player) + " is preparing to fire PDS shots");

	if (this.game.player == player) {
          this.playerPlayPDSDefense(player, attacker, sector);        
	}

        return 0;
      }






      //
      // assigns one hit to one unit
      //
      if (mv[0] === "destroy_unit") {

        let destroyer    = parseInt(mv[1]);
        let destroyee    = parseInt(mv[2]);
        let type 	 = mv[3]; // space // ground
        let sector 	 = mv[4];
        let planet_idx 	 = mv[5];
        let unit_idx 	 = parseInt(mv[6]); // ship // ground
        let player_moves = parseInt(mv[7]); // does player also do this?

	let sys = this.returnSectorAndPlanets(sector);
	let z = this.returnEventObjects();

	if (type == "space") {
	  sys.s.units[destroyee-1][unit_idx].strength = 0;
	  sys.s.units[destroyee-1][unit_idx].destroyed = 1;
	}
	if (type == "ground") {
	  sys.p[planet_idx].units[destroyee-1][unit_idx].strength = 0;
	  sys.p[planet_idx].units[destroyee-1][unit_idx].destroyed = 1;
	}

	//
	// re-display sector
	//
        this.eliminateDestroyedUnitsInSector(destroyee, sector);
	this.saveSystemAndPlanets(sys);
	this.updateSectorGraphics(sector);
        this.game.queue.splice(qe, 1);

	return 1;

      }



      //
      // assigns one hit to one unit
      //
      if (mv[0] === "destroy_infantry_on_planet") {

        let attacker     = parseInt(mv[1]);
        let sector 	 = mv[2];
        let planet_idx 	 = parseInt(mv[3]);
        let destroy 	 = parseInt(mv[4]);

	let sys = this.returnSectorAndPlanets(sector);
	let z = this.returnEventObjects();
	let planet = sys.p[planet_idx];

	for (let i = 0; i < planet.units.length; i++) {

	  if (planet.units[i].length > 0) {

	    if ((i+1) != attacker) {

	      let units_destroyed = 0;

	      for (let ii = 0; ii < planet.units[i].length && units_destroyed < destroy; ii++) {
		let unit = planet.units[i][ii];

		if (unit.type == "infantry") {

		  unit.strength = 0;
		  unit.destroyed = 1;
		  units_destroyed++;

   	          for (let z_index in z) {
	            z[z_index].unitDestroyed(imperium_self, attacker, planet.units[i][ii]);
	          } 

        	  imperium_self.eliminateDestroyedUnitsInSector(planet.owner, sector);

	        }
	      }
	    }
	  }
	}

  	this.saveSystemAndPlanets(sys);
	this.updateSectorGraphics(sector);
        this.game.queue.splice(qe, 1);

	return 1;

      }



      //
      // assigns one hit to one unit
      //
      if (mv[0] === "assign_hit") {

        let attacker     = parseInt(mv[1]);
        let defender     = parseInt(mv[2]);
        let player       = parseInt(mv[3]);
        let type 	 = mv[4]; // ship // ground
        let sector 	 = mv[5]; // ship // ground
        let unit_idx 	 = parseInt(mv[6]); // ship // ground
        let player_moves = parseInt(mv[7]); // does player also do this?

	let sys = this.returnSectorAndPlanets(sector);
	let z = this.returnEventObjects();

	if (type == "ship") {

	  try {
	  sys.s.units[player-1][unit_idx].last_round_damaged = this.game.state.space_combat_round;
	  if ((player_moves == 1 && imperium_self.game.player == player) || imperium_self.game.player != player) {
	    sys.s.units[player-1][unit_idx].strength--;
	  }
	  if (sys.s.units[player-1][unit_idx].strength <= 0) {
	    this.updateLog(this.returnFaction(player) + " assigns hit to " + sys.s.units[player-1][unit_idx].name + " (destroyed)");
	    sys.s.units[player-1][unit_idx].destroyed = 1;
	    for (let z_index in z) {
	      z[z_index].unitDestroyed(imperium_self, attacker, sys.s.units[player-1][unit_idx]);
	    } 
	  } else {
	    this.updateLog(this.returnFaction(player) + " assigns hit to " + sys.s.units[player-1][unit_idx].name);
	  }
	  } catch (err) {
	    console.log("Error? Not all hits assigned");
	  }


	  //
	  // HACK
	  //
          let attacker_forces = this.doesPlayerHaveShipsInSector(attacker, sector);
          let defender_forces = this.doesPlayerHaveShipsInSector(defender, sector);

          if (attacker_forces > 0 && defender_forces == 0) {
            this.updateLog(this.returnFaction(attacker) + " wins the space combat");
          }
          if (attacker_forces == 0 && defender_forces == 0) {
            this.updateLog(this.returnFaction(attacker) + " and " + this.returnFaction(defender) + " are obliterated in space combat");
          }

	}


	//
	// re-display sector
	//
        this.eliminateDestroyedUnitsInSector(player, sector);
	this.saveSystemAndPlanets(sys);
	this.updateSectorGraphics(sector);
        this.game.queue.splice(qe, 1);

	return 1;

      }



      //
      // triggers menu for user to choose how to assign hits
      //
      if (mv[0] === "assign_hits") {

	//
	// we need to permit both sides to play action cards before they fire and start destroying units
	// so we check to make sure that "space_combat_player_menu" does not immediately precede us... if
	// it does we swap out the instructions, so that both players can pick...
	//
        let le = this.game.queue.length-2;
        let lmv = [];
        if (le >= 0) {
	  lmv = this.game.queue[le].split("\t");
	  if (lmv[0] === "ships_fire" || lmv[0] == "infantry_fire" || lmv[0] == "pds_fire") {
	    let tmple = this.game.queue[le];
	    let tmple1 = this.game.queue[le+1];
	    this.game.queue[le]   = tmple1;
	    this.game.queue[le+1] = tmple;
	    //
	    // 
	    //
	    return 1;
	  }
	}


        let attacker       = parseInt(mv[1]);
        let defender       = parseInt(mv[2]);
        let type           = mv[3]; // space // infantry
	let sector	   = mv[4];
	let planet_idx	   = mv[5]; // "pds" for pds shots
	if (planet_idx != "pds") { planet_idx = parseInt(planet_idx); }
	let total_hits     = parseInt(mv[6]);
	let source	   = mv[7]; // pds // bombardment // space_combat // ground_combat
        let sys 	   = this.returnSectorAndPlanets(sector);

        this.game.state.assign_hits_queue_instruction = this.game.queue[this.game.queue.length-1];

        this.game.queue.splice(qe, 1);

	if (total_hits > 0 ) {
          this.updateStatus(this.returnFaction(defender) + " is assigning hits to units ... ");
	}

	if (planet_idx == "pds") {
	  if (total_hits > 0) {
	    if (this.game.player == defender) {
  	      this.playerAssignHits(attacker, defender, type, sector, planet_idx, total_hits, source);
	    } else {
              this.updateStatus(this.returnFaction(defender) + " assigning hits to units ... ");
	    }
	    return 0;
	  } else {
	    return 1;
	  }
	}

	if (type == "space") {
	  if (total_hits > 0) {
	    if (this.game.player == defender) {
  	      this.playerAssignHits(attacker, defender, type, sector, planet_idx, total_hits, source);
	    } else {
              this.updateStatus(this.returnFaction(defender) + " assigning hits to units ... ");
	    }
	    return 0;
	  } else {
	    return 1;
	  }
	}

        if (type == "ground") {
          if (total_hits > 0) {

	    //
	    // Ground Combat is Automated
	    //
            this.assignHitsToGroundForces(attacker, defender, sector, planet_idx, total_hits);
    	    this.eliminateDestroyedUnitsInSector(defender, sector);
    	    this.eliminateDestroyedUnitsInSector(attacker, sector);
	    this.updateSectorGraphics(sector);

            let attacker_forces = this.returnNumberOfGroundForcesOnPlanet(attacker, sector, planet_idx);
            let defender_forces = this.returnNumberOfGroundForcesOnPlanet(defender, sector, planet_idx);

            //
            // evaluate if planet has changed hands
            //
            if (attacker_forces >= 0 && attacker_forces > defender_forces && defender_forces <= 0) {

              //
              // destroy all units belonging to defender (pds, spacedocks)
              //
              if (defender != -1) {
                sys.p[planet_idx].units[defender-1] = [];
              }

              //
              // notify and change ownership (if needed)
              //
	      if (sys.p[planet_idx].owner == attacker) {

                let survivors = imperium_self.returnNumberOfGroundForcesOnPlanet(attacker, sector, planet_idx);
                if (survivors == 1) {
                  this.updateLog(sys.p[planet_idx].name + " defended by " + this.returnFaction(attacker) + " (" + survivors + " infantry)");
                } else {
                  this.updateLog(sys.p[planet_idx].name + " defended by " + this.returnFaction(attacker) + " (" + survivors + " infantry)");
                }

	      } else {

                let survivors = imperium_self.returnNumberOfGroundForcesOnPlanet(attacker, sector, planet_idx);
                if (survivors == 1) {
                  this.updateLog(sys.p[planet_idx].name + " conquered by " + this.returnFaction(attacker) + " (" + survivors + " infantry)");
                } else {
                  this.updateLog(sys.p[planet_idx].name + " conquered by " + this.returnFaction(attacker) + " (" + survivors + " infantry)");
                }

                //
                // planet changes ownership
                //
                this.updatePlanetOwner(sector, planet_idx, attacker);
              }

            }

	    return 1;
          }
        }
      }



      //
      // update ownership of planet
      //
      if (mv[0] === "gain_planet") {

        let gainer	   = parseInt(mv[1]);
	let sector	   = mv[2];
	let planet_idx	   = parseInt(mv[3]);

        this.game.queue.splice(qe, 1);

        this.updatePlanetOwner(sector, planet_idx, gainer);

      }





      //
      // triggers menu for user to choose how to assign hits
      //
      if (mv[0] === "destroy_ships") {

        let player	   = parseInt(mv[1]);
	let total          = parseInt(mv[2]);
	let sector	   = mv[3];

        this.game.queue.splice(qe, 1);

	if (this.game.player == player) {
  	  this.playerDestroyShips(player, total, sector);
	  return 0;
	}

	if (destroy == 1) {
  	  this.updateStatus("Opponent is destroying "+total+" ship");
	} else { 
	  this.updateStatus("Opponent is destroying "+total+" ships");
	}
	return 0;

      }




      if (mv[0] === "pds_fire") {

        let player       = parseInt(mv[1]);
        let attacker     = parseInt(mv[2]);
        let sector       = mv[3];

        this.game.queue.splice(qe, 1);

	//
	// sanity check
	//
	if (this.doesPlayerHavePDSUnitsWithinRange(attacker, player, sector) == 1) {	  

          //
          // get pds units within range
          //
          let battery = this.returnPDSWithinRangeOfSector(attacker, player, sector);

	  let total_shots = 0;
	  let hits_on = [];
	  let hits_or_misses = [];
	  let total_hits  = 0;
	  let z = this.returnEventObjects();

	  for (let i = 0; i < battery.length; i++) {
	    if (battery[i].owner == player) {
 	      total_shots++;
	      hits_on.push(battery[i].combat);
	    }
	  }

	  total_shots += this.game.players_info[player-1].pds_combat_roll_bonus_shots;

          this.updateLog(this.returnFaction(player) + " has " + total_shots + " PDS shots");


	  for (let s = 0; s < total_shots; s++) {
	    let roll = this.rollDice(10);
	    for (let z_index in z) {
	      roll = z[z_index].modifyCombatRoll(this, player, attacker, player, "pds", roll);
	      imperium_self.game.players_info[attacker-1].target_units = z[z_index].modifyTargets(this, attacker, player, imperium_self.game.player, "pds", imperium_self.game.players_info[attacker-1].target_units);
	    }

	    roll += this.game.players_info[player-1].pds_combat_roll_modifier;
	    roll += this.game.players_info[player-1].temporary_pds_combat_roll_modifier;
	    if (roll >= hits_on[s]) {
	      total_hits++;
	      hits_or_misses.push(1);
	    } else {
	      hits_or_misses.push(0);
	    }
	  }

	  //this.updateLog(this.returnFaction(player) + " has " + total_hits + " hits");

	  //
 	  // handle rerolls
	  //
	  if (total_hits < total_shots) {

	    let max_rerolls = total_shots - total_hits;
	    let available_rerolls = this.game.players_info[player-1].combat_dice_reroll + this.game.players_info[player-1].pds_combat_dice_reroll;

	    for (let z_index in z) {
	      available_rerolls = z[z_index].modifyCombatRerolls(this, player, attacker, player, "pds", available_rerolls);
	      imperium_self.game.players_info[player-1].target_units = z[z_index].modifyTargets(this, attacker, player, imperium_self.game.player, "pds", imperium_self.game.players_info[player-1].target_units);
	    }

	    let attacker_rerolls = available_rerolls;
	    if (max_rerolls < available_rerolls) {
	      attacker_rerolls = max_rerolls;
	    }

	    for (let i = 0; i < attacker_rerolls; i++) {

	      let lowest_combat_hit = 11;
	      let lowest_combat_idx = 11;

	      for (let n = 0; n < hits_to_misses.length; n++) {
	        if (hits_on[n] < lowest_combat_hit && hits_or_misses[n] == 0) {
		  lowest_combat_idx = n;
		  lowest_combat_hit = hits_on[n];
		}
	      }
	     
	      let roll = this.rollDice(10);
 
	      for (let z_index in z) {
	        roll =  z[z_index].modifyCombatRerolls(this, player, attacker, player, "pds", roll);
	        imperium_self.game.players_info[player-1].target_units = z[z_index].modifyTargets(this, attacker, player, imperium_self.game.player, "pds", imperium_self.game.players_info[player-1].target_units);
	      }

	      roll += this.game.players_info[player-1].pds_combat_roll_modifier;
	      roll += this.game.players_info[player-1].temporary_pds_combat_roll_modifier;
	      if (roll >= hits_on[lowest_combat_idx]) {
	        total_hits++;
		hits_or_misses[lowest_combat_idx] = 1;
	      } else {
		hits_or_misses[lowest_combat_idx] = -1;
	      }
	    }

	  }

	  if (total_hits == 1) {
	    this.updateLog(this.returnFaction(attacker) + " takes " + total_hits + " hit");
	  } else {
	    this.updateLog(this.returnFaction(attacker) + " takes " + total_hits + " hits");
	  }


	  //
	  // total hits to assign
	  //
	  let restrictions = [];

	  this.game.queue.push("assign_hits\t"+player+"\t"+attacker+"\tspace\t"+sector+"\tpds\t"+total_hits+"\tpds");

        }

        return 1;

      }






      if (mv[0] === "bombard") {

	let imperium_self = this;
        let attacker     = parseInt(mv[1]);
        let sector       = mv[2];
        let planet_idx   = mv[3];
	let z 		 = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

	//
	// sanity check
	//
	if (this.doesPlayerHaveShipsInSector(attacker, sector) == 1) {	  

	  let sys = this.returnSectorAndPlanets(sector);
	  let defender = sys.p[planet_idx].owner;
	  let hits_to_assign = 0;
	  let total_shots = 0;
	  let hits_or_misses = [];
	  let hits_on = [];

	  let bonus_shots = 0;

	  for (let i = 0; i < sys.p[planet_idx].units[attacker-1].length; i++) {
	    if (sys.p[planet_idx].units[attacker-1][i].bombardment_rolls > 0) {
	      for (let b = 0; b < sys.p[planet_idx].units[attacker-1][i].bombardment_rolls; b++) {

	        let roll = this.rollDice(10);
      	        for (z_index in z) { roll = z[z_index].modifyCombatRoll(imperium_self, attacker, sys.p[planet_idx].owner, this.game.player, "bombardment", roll); }

  	        roll += this.game.players_info[attacker-1].bombardment_roll_modifier;
	        roll += this.game.players_info[attacker-1].temporary_bombardment_roll_modifier;
	        roll += this.game.players_info[attacker-1].combat_roll_modifier;
	        roll += sys.s.units[attacker-1][i].temporary_combat_modifier;

	        if (roll >= sys.p[planet_idx].units[attacker-1][i].bombardment_combat) {
		  hits_to_assign++;
		  hits_or_misses.push(1);
		  hits_on.push(sys.p[planet_idx].units[attacker-1][i].bombardment_combat);
	        } else {
		  hits_or_misses.push(0);
		  hits_on.push(sys.p[planet_idx].units[attacker-1][i].bombardment_combat);
	        }
	      }
	    }
	  }

	  //
	  // bonus hits on is lowest attacking unit
	  //
	  let bonus_hits_on = 10;
	  for (let i = 0; i < hits_on.length; i++) {
	    if (hits_on[i] < bonus_hits_on) {
	      bonus_hits_on = hits_on[i];
	    }
	  }

	  bonus_shots += this.game.players_info[attacker-1].bombardment_combat_roll_bonus_shots;
	  for (let i = hits_or_misses.length; i < hits_or_misses.length+bonus_shots; i++) {
	 
	    let roll = this.rollDice(10);
      	    for (z_index in z) { roll = z[z_index].modifyCombatRoll(imperium_self, attacker, sys.p[planet_idx].owner, this.game.player, "bombardment", roll); }

  	    roll += this.game.players_info[attacker-1].bombardment_roll_modifier;
	    roll += this.game.players_info[attacker-1].temporary_bombardment_roll_modifier;
	    roll += this.game.players_info[attacker-1].combat_roll_modifier;
	    roll += sys.s.units[attacker-1][i].temporary_combat_modifier;

	    if (roll >= bonus_hits_on) {
	      hits_to_assign++;
	      hits_or_misses.push(1);
	      hits_on.push(sys.p[planet_idx].units[attacker-1][i].bombardment_combat);
	    } else {
	      hits_or_misses.push(0);
	      hits_on.push(bonus_hits_on);
	    }
	  }




	  //
 	  // handle rerolls
	  //
	  if (hits_to_assign < total_shots) {

	    let max_rerolls = hits_to_assign - total_hits;
	    let available_rerolls = this.game.players_info[attacker-1].combat_dice_reroll + this.game.players_info[attacker-1].bombardment_combat_dice_reroll;

	    for (let z_index in z) {
	      available_rerolls = z[z_index].modifyCombatRerolls(this, attacker, defender, player, "bombardment", available_rerolls);
	    }

	    let attacker_rerolls = available_rerolls;
	    if (max_rerolls < available_rerolls) {
	      attacker_rerolls = max_rerolls;
	    }

	    for (let i = 0; i < attacker_rerolls; i++) {

	      let lowest_combat_hit = 11;
	      let lowest_combat_idx = 11;

	      for (let n = 0; n < hits_to_misses.length; n++) {
	        if (hits_on[n] < lowest_combat_hit && hits_or_misses[n] == 0) {
		  lowest_combat_idx = n;
		  lowest_combat_hit = hits_on[n];
		}
	      }
	     
	      let roll = this.rollDice(10);
 
	      for (let z_index in z) {
	        roll =  z[z_index].modifyCombatRerolls(this, player, attacker, player, "space", roll);
	        imperium_self.game.players_info[defender-1].target_units = z[z_index].modifyTargets(this, attacker, defender, imperium_self.game.player, "space", imperium_self.game.players_info[defender-1].target_units);
	      }

      	      for (z_index in z) { roll = z[z_index].modifyCombatRoll(imperium_self, attacker, sys.p[planet_idx].owner, this.game.player, "bombardment", roll); }
  	      roll += this.game.players_info[attacker-1].bombardment_roll_modifier;
	      roll += this.game.players_info[attacker-1].temporary_bombardment_roll_modifier;
	      roll += this.game.players_info[attacker-1].combat_roll_modifier;
	      roll += sys.s.units[attacker-1][lowest_combat_idx].temporary_combat_modifier;

	      if (roll >= hits_on[lowest_combat_idx]) {
	        hits_to_assign++;
		hits_or_misses[lowest_combat_idx] = 1;
	      } else {
		hits_or_misses[lowest_combat_idx] = -1;
	      }
	    }
	  }


	  if (hits_to_assign == 1) {
	    this.updateLog("Bombardment produces " + hits_to_assign + " hit");
	  } else {
	    this.updateLog("Bombardment produces " + hits_to_assign + " hits");
	  }

          this.game.queue.push("assign_hits\t"+attacker+"\t"+sys.p[planet_idx].owner+"\tground\t"+sector+"\t"+planet_idx+"\t"+hits_to_assign+"\tbombardment");

        }

        return 1;

      }







      if (mv[0] === "ships_fire") {

	//
	// we need to permit both sides to play action cards before they fire and start destroying units
	// so we check to make sure that "space_combat_player_menu" does not immediately precede us... if
	// it does we swap out the instructions, so that both players can pick...
	//
        let le = this.game.queue.length-2;
        let lmv = [];
        if (le >= 0) {
	  lmv = this.game.queue[le].split("\t");
	  if (lmv[0] === "space_combat_player_menu") {
	    let tmple = this.game.queue[le];
	    let tmple1 = this.game.queue[le+1];
	    this.game.queue[le]   = tmple1;
	    this.game.queue[le+1] = tmple;
	    //
	    // 
	    //
	    return 1;
	  }
	}

	let player 	 = imperium_self.game.player;
        let attacker     = parseInt(mv[1]);
        let defender     = parseInt(mv[2]);
        let sector       = mv[3];
	let sys 	 = this.returnSectorAndPlanets(sector);
	let z 		 = this.returnEventObjects();

        this.game.queue.splice(qe, 1);

	//
	// sanity check
	//
	if (this.doesPlayerHaveShipsInSector(attacker, sector) == 1) {	  

	  //
	  // barrage against fighters fires first
	  //


	  let total_shots = 0;
	  let total_hits = 0;
	  let hits_or_misses = [];
	  let hits_on = [];

	  //
	  // then the rest
	  //
	  for (let i = 0; i < sys.s.units[attacker-1].length; i++) {

	    let roll = this.rollDice(10);

	    for (let z_index in z) {
	      roll = z[z_index].modifyCombatRoll(this, attacker, defender, attacker, "space", roll);
	      imperium_self.game.players_info[defender-1].target_units = z[z_index].modifyTargets(this, attacker, defender, imperium_self.game.player, "space", imperium_self.game.players_info[defender-1].target_units);
	    }

	    roll += this.game.players_info[attacker-1].space_combat_roll_modifier;
	    roll += this.game.players_info[attacker-1].temporary_space_combat_roll_modifier;
	    roll += sys.s.units[attacker-1][i].temporary_combat_modifier;

	    if (roll >= sys.s.units[attacker-1][i].combat) {
	      total_hits++;
	      total_shots++;
	      hits_on.push(sys.s.units[attacker-1][i].combat);
	      hits_or_misses.push(1);
	    } else {
	      total_shots++;
	      hits_or_misses.push(0);
	      hits_on.push(sys.s.units[attacker-1][i].combat);
	    }

	  }


	  //
 	  // handle rerolls
	  //
	  if (total_hits < total_shots) {

	    let max_rerolls = total_shots - total_hits;
	    let available_rerolls = this.game.players_info[attacker-1].combat_dice_reroll + this.game.players_info[attacker-1].space_combat_dice_reroll;

	    for (let z_index in z) {
	      available_rerolls = z[z_index].modifyCombatRerolls(this, player, attacker, player, "space", available_rerolls);
	      imperium_self.game.players_info[defender-1].target_units = z[z_index].modifyTargets(this, attacker, defender, imperium_self.game.player, "space", imperium_self.game.players_info[defender-1].target_units);
	    }

	    let attacker_rerolls = available_rerolls;
	    if (max_rerolls < available_rerolls) {
	      attacker_rerolls = max_rerolls;
	    }

	    for (let i = 0; i < attacker_rerolls; i++) {

	      let lowest_combat_hit = 11;
	      let lowest_combat_idx = 11;

	      for (let n = 0; n < hits_to_misses.length; n++) {
	        if (hits_on[n] < lowest_combat_hit && hits_or_misses[n] == 0) {
		  lowest_combat_idx = n;
		  lowest_combat_hit = hits_on[n];
		}
	      }
	     
	      let roll = this.rollDice(10);
 
	      for (let z_index in z) {
	        roll =  z[z_index].modifyCombatRerolls(this, player, attacker, player, "space", roll);
	        imperium_self.game.players_info[defender-1].target_units = z[z_index].modifyTargets(this, attacker, defender, imperium_self.game.player, "space", imperium_self.game.players_info[defender-1].target_units);
	      }

	      roll += this.game.players_info[player-1].space_combat_roll_modifier;
	      roll += this.game.players_info[player-1].temporary_space_combat_roll_modifier;
	      roll += sys.s.units[attacker-1][lowest_combat_idx].temporary_combat_modifier;

	      if (roll >= hits_on[lowest_combat_idx]) {
	        total_hits++;
		hits_or_misses[lowest_combat_idx] = 1;
	      } else {
		hits_or_misses[lowest_combat_idx] = -1;
	      }
	    }

	  }

	  //
	  // total hits to assign
	  //
	  let restrictions = [];

	  if (total_hits == 1) {
  	    this.updateLog(this.returnFaction(attacker) + ":  " + total_hits + " hit");
	  } else {
  	    this.updateLog(this.returnFaction(attacker) + ":  " + total_hits + " hits");
	  }
	  this.game.queue.push("assign_hits\t"+attacker+"\t"+defender+"\tspace\t"+sector+"\tspace\t"+total_hits+"\tspace_combat");

        }

        return 1;

      }





      if (mv[0] === "infantry_fire") {

	//
	// we need to permit both sides to play action cards before they fire and start destroying units
	// so we check to make sure that "ground_combat_player_menu" does not immediately precede us... if
	// it does we swap out the instructions, so that both players can pick...
	//
        let le = this.game.queue.length-2;
        let lmv = [];
        if (le >= 0) {
	  lmv = this.game.queue[le].split("\t");
	  if (lmv[0] === "ground_combat_player_menu") {
	    let tmple = this.game.queue[le];
	    let tmple1 = this.game.queue[le+1];
	    this.game.queue[le]   = tmple1;
	    this.game.queue[le+1] = tmple;
	    //
	    // 
	    //
	    return 1;
	  }
	}

	let player 	 = imperium_self.game.player;
        let attacker     = parseInt(mv[1]);
        let defender     = parseInt(mv[2]);
        let sector       = mv[3];
        let planet_idx   = mv[4];
	let sys 	 = this.returnSectorAndPlanets(sector);
	let z 		 = this.returnEventObjects();

        this.game.queue.splice(qe, 1);


	//
	// sanity check
	//
	if (this.doesPlayerHaveInfantryOnPlanet(attacker, sector, planet_idx) == 1) {	  

	  let total_shots = 0;
	  let total_hits = 0;
	  let hits_or_misses = [];
	  let hits_on = [];

	  //
	  // then the rest
	  //
	  for (let i = 0; i < sys.p[planet_idx].units[attacker-1].length; i++) {
	    if (sys.p[planet_idx].units[attacker-1][i].type == "infantry" ) {

	      let roll = this.rollDice(10);


	      for (let z_index in z) {
	        roll = z[z_index].modifyCombatRoll(this, attacker, defender, attacker, "ground", roll);
	        imperium_self.game.players_info[defender-1].target_units = z[z_index].modifyTargets(this, attacker, defender, imperium_self.game.player, "ground", imperium_self.game.players_info[defender-1].target_units);
	      }

	      roll += this.game.players_info[attacker-1].ground_combat_roll_modifier;
	      roll += this.game.players_info[attacker-1].temporary_ground_combat_roll_modifier;
	      roll += sys.p[planet_idx].units[attacker-1][i].temporary_combat_modifier;

console.log(this.returnFaction(attacker) + " rolls a " + roll);

	      if (roll >= sys.p[planet_idx].units[attacker-1][i].combat) {
	        total_hits++;
	        total_shots++;
	        hits_or_misses.push(1);
	        hits_on.push(sys.p[planet_idx].units[attacker-1][i].combat);
	      } else {
	        total_shots++;
	        hits_or_misses.push(0);
	        hits_on.push(sys.p[planet_idx].units[attacker-1][i].combat);
	      }

	    }
	  }


	  //
 	  // handle rerolls
	  //
	  if (total_hits < total_shots) {


	    let max_rerolls = total_shots - total_hits;
	    let available_rerolls = this.game.players_info[attacker-1].combat_dice_reroll + this.game.players_info[attacker-1].ground_combat_dice_reroll;

	    for (let z_index in z) {
	      available_rerolls = z[z_index].modifyCombatRerolls(this, player, attacker, player, "ground", available_rerolls);
	      imperium_self.game.players_info[defender-1].target_units = z[z_index].modifyTargets(this, attacker, defender, imperium_self.game.player, "ground", imperium_self.game.players_info[defender-1].target_units);
	    }

	    let attacker_rerolls = available_rerolls;
	    if (max_rerolls < available_rerolls) {
	      attacker_rerolls = max_rerolls;
	    }

	    for (let i = 0; i < attacker_rerolls; i++) {

	      let lowest_combat_hit = 11;
	      let lowest_combat_idx = 11;

	      for (let n = 0; n < hits_to_misses.length; n++) {
	        if (hits_on[n] < lowest_combat_hit && hits_or_misses[n] == 0) {
		  lowest_combat_idx = n;
		  lowest_combat_hit = hits_on[n];
		}
	      }
	     
	      let roll = this.rollDice(10);
 
	      for (let z_index in z) {
	        roll =  z[z_index].modifyCombatRerolls(this, player, attacker, player, "ground", roll);
	        imperium_self.game.players_info[defender-1].target_units = z[z_index].modifyTargets(this, attacker, defender, imperium_self.game.player, "ground", imperium_self.game.players_info[defender-1].target_units);
	      }

	      roll += this.game.players_info[player-1].ground_combat_roll_modifier;
	      roll += this.game.players_info[player-1].temporary_ground_combat_roll_modifier;
	      roll += sys.p[planet_idx].units[attacker-1][lowest_combat_idx].temporary_combat_modifier;

	      if (roll >= hits_on[lowest_combat_idx]) {
	        total_hits++;
		hits_or_misses[lowest_combat_idx] = 1;
	      } else {
		hits_or_misses[lowest_combat_idx] = -1;
	      }
	    }

	  }

	  //
	  // total hits to assign
	  //
	  let restrictions = [];

	  if (total_hits == 1) {
  	    this.updateLog(this.returnFaction(attacker) + ":  " + total_hits + " hit");
	  } else {
  	    this.updateLog(this.returnFaction(attacker) + ":  " + total_hits + " hits");
	  }
	  this.game.queue.push("assign_hits\t"+attacker+"\t"+defender+"\tground\t"+sector+"\t"+planet_idx+"\t"+total_hits+"\tground_combat");


        }

        return 1;

      }






      //////////////////
      // SPACE COMBAT //
      //////////////////
      if (mv[0] === "space_invasion") {
  
  	let player = mv[1];
  	let sector = mv[2];
        this.game.queue.splice(qe, 1);

        this.game.state.space_combat_sector = sector;

	//
	// unpack space ships
	//
	this.unloadStoredShipsIntoSector(player, sector);

	//
	// initialize variables for 
	//
	this.game.state.space_combat_round = 0;
	this.game.state.space_combat_ships_destroyed_attacker = 0;
	this.game.state.space_combat_ships_destroyed_defender = 0;
	

  	if (player == this.game.player) {
	  this.addMove("continue\t"+player+"\t"+sector);
	  this.addMove("space_combat_end\t"+player+"\t"+sector);
	  this.addMove("space_combat_post\t"+player+"\t"+sector);
	  this.addMove("space_combat\t"+player+"\t"+sector);
	  this.addMove("space_combat_start\t"+player+"\t"+sector);
	  this.addMove("pds_space_defense_post\t"+player+"\t"+sector);
	  this.addMove("pds_space_defense\t"+player+"\t"+sector);
	  this.endTurn();
	}

        return 0;

      }
      if (mv[0] === "space_combat_start") {

  	let player       = mv[1];
        let sector       = mv[2];
        let planet_idx   = mv[3];
  	this.game.queue.splice(qe, 1);

	//
	// reset 
	//
	this.resetTargetUnits();
        this.game.state.space_combat_attacker = -1;
        this.game.state.space_combat_defender = -1;

  	return 1;
      }
      if (mv[0] === "space_combat_end") {

  	let player       = mv[1];
        let sector       = mv[2];
        let planet_idx   = mv[3];

	if (this.game.state.space_combat_defender != -1) {
	  let z = this.returnEventObjects();
	  for (let z_index in z) {
	    z[z_index].spaceCombatRoundEnd(this, this.game.state.space_combat_attacker, this.game.state.space_combat_defender, sector);
	  }
	}
console.log("AAAA");

  	if (this.hasUnresolvedSpaceCombat(player, sector) == 1) {
console.log("AAAA 1");
	  if (this.game.player == player) {
	    this.addMove("space_combat_post\t"+player+"\t"+sector);
	    this.addMove("space_combat\t"+player+"\t"+sector);
	    this.endTurn();
	    return 0;
	  } else {
	    return 0;
	  }
	} else {

console.log("AAAA 2 - " + sector);

	  let sys = this.returnSectorAndPlanets(sector);
console.log("AAAA 3");
console.log(JSON.stringify(sys.s.units));
	  if (sys.s.units[player-1].length > 0) {
	    this.updateLog(this.returnFaction(player) + " succeeds in capturing the sector");
	  } else {
	    this.updateLog(this.returnFaction(player) + " fails to capture the sector");
	  }
console.log("AAAA 4");

	  if (this.game_space_combat_defender == 1) {
            this.game.queue.push("space_combat_over_player_menu\t"+this.game.state.space_combat_defender+"\t"+sector);
 	  } else {
            this.game.queue.push("space_combat_over_player_menu\t"+this.game.state.space_combat_attacker+"\t"+sector);
	  }
console.log("AAAA 5");

 	  this.game.queue.splice(qe, 1);
	  return 1;
	}

  	return 1;
      }
      if (mv[0] === "space_combat") {
  
  	let player       = mv[1];
        let sector       = mv[2];
	let z 		 = this.returnEventObjects();

  	this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].spaceCombatTriggers(this, player, sector) == 1) {
	      this.game.queue.push("space_combat_event\t"+speaker_order[i]+"\t"+sector+"\t"+k);
            }
          }
        }
  	return 1;
      }
      if (mv[0] === "space_combat_event") {
  
        let z		 = this.returnEventObjects();
  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
        let z_index      = parseInt(mv[3]);
  	this.game.queue.splice(qe, 1);

	return z[z_index].spaceCombatEvent(this, player, sector);

      }

      if (mv[0] === "space_combat_post") {

  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
        this.updateSectorGraphics(sector);
  	this.game.queue.splice(qe, 1);

	//
	// have a round of space combat
	//
	this.game.state.space_combat_round++;
	this.game.state.assign_hits_to_cancel = 0;

	//
	// who is the defender?
	//
	let defender = this.returnDefender(player, sector);

	//
	// if there is no defender, end this charade
	//
	if (defender == -1) {
	  return 1;
	}

	//
	// space units combat temporary modifiers set to 0
	//
        this.resetSpaceUnitTemporaryModifiers(sector);


	this.game.state.space_combat_attacker = player;
	this.game.state.space_combat_defender = defender;


	//
	// otherwise, process combat
	//
	this.updateLog("Space Combat: round " + this.game.state.space_combat_round);

	this.game.queue.push("space_combat_player_menu\t"+defender+"\t"+player+"\t"+sector);
	this.game.queue.push("space_combat_player_menu\t"+player+"\t"+defender+"\t"+sector);

        return 1;

      }

      if (mv[0] === "space_combat_over_player_menu") {

	let player	 = parseInt(mv[1]);
	let sector 	 = mv[2];
        this.game.queue.splice(qe, 1);

	if (this.game.player == player) {
          this.playerPlaySpaceCombatOver(player, sector);
	}

	return 1;

      }


      if (mv[0] === "space_combat_player_menu") {

        let attacker     = parseInt(mv[1]);
        let defender     = parseInt(mv[2]);
        let sector       = mv[3];
        this.game.queue.splice(qe, 1);

        this.updateSectorGraphics(sector);

	if (this.game.player == attacker) {
          this.playerPlaySpaceCombat(attacker, defender, sector);        
	}

        return 0;
      }



      if (mv[0] === "ground_combat_over_player_menu") {

	let player	 = parseInt(mv[1]);
	let sector 	 = mv[2];
	let planet_idx 	 = parseInt(mv[3]);

        this.game.queue.splice(qe, 1);

	if (this.game.player == player) {
          this.playerPlayGroundCombatOver(player, sector, planet_idx);
	}

	return 1;

      }


      if (mv[0] === "ground_combat_player_menu") {

        let attacker     = parseInt(mv[1]);
        let defender     = parseInt(mv[2]);
        let sector       = mv[3];
        let planet_idx   = mv[4];
        this.game.queue.splice(qe, 1);

        this.updateSectorGraphics(sector);

	if (this.game.player == attacker) {
          this.playerPlayGroundCombat(attacker, defender, sector, planet_idx);
	}

        return 0;
      }








      /////////////////
      // BOMBARDMENT //
      /////////////////
      if (mv[0] === "bombardment") {
  
  	let player       = mv[1];
        let sector       = mv[2];
        let planet_idx   = mv[3];
	let z		 = this.returnEventObjects();

  	this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].bombardmentTriggers(this, speaker_order[i], player, sector, planet_idx) == 1) {
	      this.game.queue.push("bombardment_event\t"+speaker_order[i]+"\t"+player+"\t"+sector+"\t"+planet_idx+"\t"+k);
            }
          }
        }
  	return 1;
      }
      if (mv[0] === "bombardment_event") {
  
        let z		 = this.returnEventObjects();
  	let player       = parseInt(mv[1]);
  	let bombarding_player = parseInt(mv[1]);
        let sector	 = mv[2];
        let planet_idx	 = mv[3];
        let z_index	 = parseInt(mv[4]);

  	this.game.queue.splice(qe, 1);

	return z[z_index].bombardmentEvent(this, player, bombarding_player, sector, planet_idx);

      }
      if (mv[0] === "bombardment_post") {

  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
	let planet_idx   = mv[3];

        this.updateSectorGraphics(sector);
  	this.game.queue.splice(qe, 1);

        let sys = this.returnSectorAndPlanets(sector);
	let planet_owner = sys.p[planet_idx].owner;

	if (planet_owner == -1 ) {
	  return 1;
	}

	//
	// defense
	//
	if (planet_owner == player) {
	  this.playerPlayBombardment(player, sector, planet_idx);
	  return 0;
	}

	if (this.doesSectorContainPlayerUnit(player, sector, "dreadnaught") || this.doesSectorContainPlayerUnit(player, sector, "warsun")) {
	  this.playerPlayBombardment(player, sector, planet_idx);
	  return 0;
        }

	return 1;

      }



      ///////////////////////
      // PLANETARY DEFENSE //
      ///////////////////////
      if (mv[0] === "planetary_defense") {
  
  	let player       = mv[1];
        let sector       = mv[2];
        let planet_idx   = mv[3];
	let z		 = this.returnEventObjects();

  	this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].planetaryDefenseTriggers(this, player, sector) == 1) {
              this.game.queue.push("planetary_defense_event\t"+speaker_order[i]+"\t"+sector+"\t"+planet_idx+"\t"+k);
            }
          }
        }
  	return 1;
      }
      if (mv[0] === "planetary_defense_event") {
  
        let z		 = this.returnEventObjects();
  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
        let planet_idx	 = mv[3];
        let z_index	 = parseInt(mv[4]);

  	this.game.queue.splice(qe, 1);
	return z[z_index].planetaryDefenseEvent(this, player, sector, planet_idx);

      }
      if (mv[0] === "planetary_defense_post") {

  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
	let planet_idx   = mv[3];

        this.updateSectorGraphics(sector);
  	this.game.queue.splice(qe, 1);

	return 1;

      }





      ///////////////////
      // GROUND COMBAT //
      ///////////////////
      if (mv[0] === "ground_combat_start") {

  	let player       = mv[1];
        let sector       = mv[2];
        let planet_idx   = mv[3];
  	this.game.queue.splice(qe, 1);

	//
	// reset the combat round
        //
        this.game.state.ground_combat_round = 0;
        this.game.state.ground_combat_sector = sector;
        this.game.state.ground_combat_planet_idx = planet_idx;
        this.game.state.ground_combat_infantry_destroyed_attacker = 0;
        this.game.state.ground_combat_infantry_destroyed_defender = 0;
        this.game.state.ground_combat_attacker = -1;
        this.game.state.ground_combat_defender = -1;

  	return 1;

      }
      if (mv[0] === "ground_combat_end") {

  	let player       = mv[1];
        let sector       = mv[2];
        let planet_idx   = mv[3];
  	this.game.queue.splice(qe, 1);

	if (this.game.state.ground_combat_defender != -1) {
	  let z = this.returnEventObjects();
	  for (let z_index in z) {
	    z[z_index].groundCombatRoundEnd(this, this.game.state.ground_combat_attacker, this.game.state.ground_combat_defender, sector, planet_idx);
	  }
	}

        if (this.hasUnresolvedGroundCombat(player, sector, planet_idx) == 1) {
          if (this.game.player == player) {
            this.addMove("ground_combat_post\t"+player+"\t"+sector+"\t"+planet_idx);
            this.addMove("ground_combat\t"+player+"\t"+sector+"\t"+planet_idx);
            this.endTurn();
            return 0;
          } else {
            return 0;
          }
        } else {

	  if (this.game_ground_combat_defender == 1) {
            this.game.queue.push("ground_combat_over_player_menu\t"+this.game.state.ground_combat_defender+"\t"+sector+"\t"+planet_idx);
 	  } else {
            this.game.queue.push("ground_combat_over_player_menu\t"+this.game.state.ground_combat_attacker+"\t"+sector+"\t"+planet_idx);
	  }

 	  this.game.queue.splice(qe, 1);
	  return 1;
        }

  	return 1;
      }
      if (mv[0] === "ground_combat") {
  
  	let player       = mv[1];
        let sector       = mv[2];
        let planet_idx   = mv[3];
	let z		 = this.returnEventObjects();

  	this.game.queue.splice(qe, 1);


        let speaker_order = this.returnSpeakerOrder();

  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].groundCombatTriggers(this, player, sector, planet_idx) == 1) {
              this.game.queue.push("ground_combat_event\t"+speaker_order[i]+"\t"+sector+"\t"+planet_idx+"\t"+k);
            }
          }
        }
  	return 1;
      }
      if (mv[0] === "ground_combat_event") {
  
        let z		 = this.returnEventObjects();
  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
        let planet_idx 	 = mv[3];
        let z_index	 = parseInt(mv[4]);
  	this.game.queue.splice(qe, 1);

	return z[z_index].groundCombatEvent(this, player, sector, planet_idx);

      }
      if (mv[0] === "ground_combat_post") {

  	let player       = parseInt(mv[1]);
        let sector	 = mv[2];
        let planet_idx	 = parseInt(mv[3]);
	let sys 	 = this.returnSectorAndPlanets(sector);

  	this.game.queue.splice(qe, 1);
	this.game.state.assign_hits_to_cancel = 0;

        //
        // have a round of ground combat
        //
        this.game.state.ground_combat_round++;


        //
        // who is the defender?
        //
        let defender = this.returnDefender(player, sector, planet_idx);


        //
        // if there is no defender, end this charade
        //
        if (defender == -1) {
	  if (sys.p[planet_idx].owner != player) {
            this.updateLog(this.returnFaction(player) + " seizes " + sys.p[planet_idx].name);
	    this.updatePlanetOwner(sector, planet_idx, player);
	  }
          return 1;
        }

	//
	// reset temporary combat modifiers
	//
	this.resetGroundUnitTemporaryModifiers(sector, planet_idx);

	this.game.state.ground_combat_attacker = player;
	this.game.state.ground_combat_defender = defender;

	//
	// otherwise, have a round of ground combat
	//
        if (this.game.state.ground_combat_round == 1) {
          this.updateLog(this.returnFaction(player) + " invades " + sys.p[planet_idx].name);
	}

        this.updateLog("GROUND COMBAT: round " + this.game.state.ground_combat_round);

        this.game.queue.push("ground_combat_player_menu\t"+defender+"\t"+player+"\t"+sector+"\t"+planet_idx);
        this.game.queue.push("ground_combat_player_menu\t"+player+"\t"+defender+"\t"+sector+"\t"+planet_idx);

	return 1;

      }




      /////////////////
      // ACTION CARD //
      /////////////////
      if (mv[0] === "action_card") {
 
  	let player = parseInt(mv[1]);
  	let card = mv[2];
	let z = this.returnEventObjects();

        if (this.action_cards[card].type == "action") {
	  this.game.state.active_player_moved = 1;
	}

	this.updateLog(this.returnFaction(player) + " plays " + this.action_cards[card].name + "<p></p><div style='width:80%;font-size:1.0em;margin-left:auto;margin-right:auto;margin-top:15px;margin-bottom:15px'>" + this.action_cards[card].text +'</div>');

	let cards = this.returnActionCards();
	let played_card = cards[card];

  	this.game.queue.splice(qe, 1);

        let speaker_order = this.returnSpeakerOrder();

	this.game.players_info[this.game.player-1].can_intervene_in_action_card = 0;

	//
	// allow players to respond to their action cards, EVENT always triggers
	//
  	for (let i = 0; i < speaker_order.length; i++) {
	  for (let k = 0; k < z.length; k++) {
	    if (z[k].playActionCardTriggers(this, speaker_order[i], player, card) == 1) {
              this.game.queue.push("action_card_event\t"+speaker_order[i]+"\t"+player+"\t"+card+"\t"+k);
            }
          }
	  if ((i+1) != player) {
            this.game.queue.push("action_card_player_menu\t"+speaker_order[i]+"\t"+player+"\t"+card);
          }
        }


	return 1;

      }
      if (mv[0] === "action_card_player_menu") { 

	let player = parseInt(mv[1]);
	let action_card_player = parseInt(mv[2]);
	let action_card = mv[3];
  	this.game.queue.splice(qe, 1);

	//
	// the person who played the action card cannot respond to it
	//
	if (player == action_card_player) {
	  return 1;
	}

	if (this.game.player == player) {
	  this.playerPlayActionCardMenu(action_card_player, action_card);
	}
	return 0;

      } 
      if (mv[0] === "action_card_event") {  
    
	let z = this.returnEventObjects();

        let player       = parseInt(mv[1]);
        let action_card_player = mv[2];
        let card   	 = mv[3];
        let z_index	= parseInt(mv[4]);
        
  	this.game.queue.splice(qe, 1);

        return z[z_index].playActionCardEvent(this, player, action_card_player, card); 

      }
      if (mv[0] === "action_card_post") {  

  	let action_card_player = parseInt(mv[1]);
  	let card = mv[2];
	let cards = this.returnActionCards();

	let played_card = cards[card];
  	this.game.queue.splice(qe, 1);

	//
	// this is where we execute the card
	//
console.log("EXECUTING CARD: " + card);
	return played_card.playActionCard(this, this.game.player, action_card_player, card);

      }




      for (let i in z) {
        if (!z[i].handleGameLoop(imperium_self, qe, mv)) { return 0; }
      }











  
      //
      // avoid infinite loops
      //
      if (shd_continue == 0) {
        return 0;
      }  
    }
  
    return 1;
  
  }
  


  
  
  //
  // utility function to convert sector32 to 3_2 or whatever
  //
  convertSectorToSectorname(sectorN) {

    for (let i in this.game.board) {
      if (this.game.board[i].tile == sectorN) {
	return i;
      }
    }

    return "";

  }  


  convertPlanetIdentifierToSector(planet_identifier) {

    for (let i in this.game.board) {
      let sector = this.game.board[i].tile;
      let this_sector = this.game.sectors[sector];

      for (let z = 0; z < this_sector.planets.length; z++) {
	if (this_sector.planets[z] == planet_identifier) { return sector; }
      }
    }

    return null;

  }


  returnPlanetIdxOfPlanetIdentifierInSector(planet_identifier, sector) {

    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.p.length; i++) {
      for (let z in this.game.planets) {
	if (z == planet_identifier) {
          if (sys.p[i] == this.game.planets[z]) { return i; }
	}
      }
    }

    return -1;

  }


  
  
  /////////////////////////
  // Return Turn Tracker //
  /////////////////////////
  returnPlayerTurnTracker() {
    let tracker = {};
    tracker.activate_system = 0;
    tracker.production = 0;
    tracker.invasion = 0;
    tracker.action_card = 0;
    tracker.trade = 0;
    return tracker;
  };
  
  
  
  ///////////////////////
  // Imperium Specific //
  ///////////////////////
  addMove(mv) {
    this.moves.push(mv);
  };
  prependMove(mv) {
    this.moves.unshift(mv);
  };
  
  endTurn(nextTarget = 0) {

    for (let i = this.rmoves.length - 1; i >= 0; i--) {
      this.moves.push(this.rmoves[i]);
    }

    this.updateStatus("Waiting for information from peers....");
  
    if (nextTarget != 0) {
      extra.target = nextTarget;
    }
  
    this.game.turn = this.moves;
    this.moves = [];
    this.rmoves = [];
    this.sendMessage("game", {});
  };

  
  endGame(winner, method) {
    this.game.over = 1;
  
    if (this.active_browser == 1) {
      alert("The Game is Over!");
    }
  };
  
  
  
  resetConfirmsNeeded(num) {
    this.game.confirms_needed   = num;
    this.game.confirms_received = 0;
    this.game.confirms_players  = [];
  }





  returnPlayers(num=0) {
  
    var players = [];

    let factions = JSON.parse(JSON.stringify(this.returnFactions()));

    for (let i = 0; i < num; i++) {
  
      if (i == 0) { col = "color1"; }
      if (i == 1) { col = "color2"; }
      if (i == 2) { col = "color3"; }
      if (i == 3) { col = "color4"; }
      if (i == 4) { col = "color5"; }
      if (i == 5) { col = "color6"; }
  
      var keys = Object.keys(factions);
      let rf = keys[this.rollDice(keys.length)-1];
      delete factions[rf];
  
      players[i] = {};
      players[i].can_intervene_in_action_card 	= 0;
      players[i].secret_objectives_in_hand     	= 0;
      players[i].action_cards_in_hand         	= 0;
      players[i].action_cards_per_round       	= 2;
      players[i].new_tokens_per_round 	 	= 2;
      players[i].command_tokens  		= 3;
      players[i].strategy_tokens 		= 2;
      players[i].fleet_supply    		= 3;
      players[i].fleet_supply_limit    		= 16;
      players[i].faction 			= rf;
      players[i].homeworld			= "";
      players[i].color   			= col;
      players[i].goods				= 0;
      players[i].commodities			= 0;
      players[i].commodity_limit		= 3;
      players[i].vp				= 0;
      players[i].passed				= 0;
      players[i].action_card_limit      	= 7;
      players[i].strategy_cards_played 		= [];
      players[i].action_cards_played 		= [];


      players[i].traded_this_turn = 0;  


      //
      // gameplay modifiers (action cards + tech)
      //
      players[i].new_token_bonus_when_issued 	= 0;
      players[i].action_cards_bonus_when_issued = 0;
      players[i].new_tokens_bonus_when_issued 	= 0;
      players[i].fleet_move_bonus 		= 0;
      players[i].temporary_fleet_move_bonus 	= 0;
      players[i].ship_move_bonus 		= 0;
      players[i].temporary_ship_move_bonus 	= 0;
      players[i].fly_through_asteroids = 0;
      players[i].reinforce_infantry_after_successful_ground_combat = 0;
      players[i].bacterial_weapon = 0;
      players[i].evasive_bonus_on_pds_shots = 0;
      players[i].perform_two_actions = 0;
      players[i].move_through_sectors_with_opponent_ships = 0;
      players[i].temporary_move_through_sectors_with_opponent_ships = 0;
      players[i].assign_pds_hits_to_non_fighters = 0;
      players[i].reallocate_four_infantry_per_round = 0;
      players[i].may_produce_after_gaining_planet = 0;
      players[i].extra_roll_on_bombardment_or_pds = 0;
      players[i].stasis_on_opponent_combat_first_round = 0;
      players[i].may_repair_damaged_ships_after_space_combat = 0;
      players[i].may_assign_first_round_combat_shot = 0;
      players[i].production_bonus = 0;
      players[i].may_player_produce_without_spacedock = 0;
      players[i].may_player_produce_without_spacedock_production_limit = 0;
      players[i].may_player_produce_without_spacedock_cost_limit = 0;

      //
      // must target certain units when assigning hits, if possible
      //
      players[i].target_units = [];
      players[i].planets_conquered_this_turn = [];
      players[i].objectives_scored_this_round = [];
      players[i].must_exhaust_at_round_start = [];


      //
      // faction-inspired gameplay modifiers 
      //
      players[i].deep_space_conduits = 0; // treat all systems adjacent to activated system
      players[i].resupply_stations = 0; // gain trade goods on system activation if contains ships 
      players[i].turn_nullification = 0; // after player activates system with ships, can end turn ...
 
      //
      // roll modifiers
      //
      players[i].space_combat_roll_modifier 		= 0;
      players[i].ground_combat_roll_modifier 		= 0;
      players[i].pds_combat_roll_modifier 		= 0;
      players[i].bombardment_combat_roll_modifier 	= 0;
      players[i].space_combat_roll_bonus_shots 		= 0;
      players[i].ground_combat_roll_bonus_shots		= 0;
      players[i].pds_combat_roll_bonus_shots 		= 0;
      players[i].bombardment_combat_roll_bonus_shots 	= 0;

      players[i].ground_combat_dice_reroll      	= 0;
      players[i].space_combat_dice_reroll       	= 0;
      players[i].pds_combat_dice_reroll			= 0;
      players[i].bombardment_combat_dice_reroll 	= 0;
      players[i].combat_dice_reroll	 		= 0;

      players[i].temporary_space_combat_roll_modifier 	= 0;
      players[i].temporary_ground_combat_roll_modifier 	= 0;
      players[i].temporary_pds_combat_roll_modifier 	= 0;
      players[i].temporary_bombardment_combat_roll_modifier 	= 0;


      //
      // tech upgrades
      //
      players[i].temporary_green_tech_prerequisite = 0;
      players[i].temporary_yellow_tech_prerequisite = 0;
      players[i].temporary_red_tech_prerequisite = 0;
      players[i].temporary_blue_tech_prerequisite = 0;
      players[i].permanent_green_tech_prerequisite = 0;
      players[i].permanent_yellow_tech_prerequisite = 0;
      players[i].permanent_red_tech_prerequisite = 0;
      players[i].permanent_blue_tech_prerequisite = 0;
      players[i].temporary_ignore_number_of_tech_prerequisites_on_nonunit_upgrade = 0;
      players[i].permanent_ignore_number_of_tech_prerequisites_on_nonunit_upgrade = 0;

      if (i == 1) { players[i].color   = "yellow"; }
      if (i == 2) { players[i].color   = "green"; }
      if (i == 3) { players[i].color   = "blue"; }
      if (i == 4) { players[i].color   = "purple"; }
      if (i == 5) { players[i].color   = "black"; }
  
      players[i].planets = [];		
      players[i].tech = [];
      players[i].tech_exhausted_this_turn = [];
      players[i].upgrades = [];
      players[i].strategy = [];		// strategy cards  

      // scored objectives
      players[i].objectives_scored = [];
  
    }
  
    return players;
  
  }
  
  
  





  playerTurn(stage="main") {
  
    let html = '';
    let imperium_self = this;
    let technologies = this.returnTechnology();
    let relevant_action_cards = ["action","main","instant"];
    let ac = this.returnPlayerActionCards(imperium_self.game.player, relevant_action_cards);

    if (stage == "main") {

      this.updateLeaderboard();
      this.updateTokenDisplay();  

      let playercol = "player_color_"+this.game.player;
  
      let html  = '<div class="terminal_header sf-readable">[command: '+this.game.players_info[this.game.player-1].command_tokens+'] [strategy: '+this.game.players_info[this.game.player-1].strategy_tokens+'] [fleet: '+this.game.players_info[this.game.player-1].fleet_supply+']</div>';
          html  += '<p style="margin-top:20px"></p>';
          html  += '<div class="terminal_header2 sf-readable"><div class="player_color_box '+playercol+'"></div>' + this.returnFaction(this.game.player) + ":</div><p><ul class='terminal_header3'>";
      if (this.game.players_info[this.game.player-1].command_tokens > 0) {
	if (this.game.state.active_player_moved == 0) {
          html += '<li class="option" id="activate">activate system</li>';
        }
      }
      if (this.canPlayerPlayStrategyCard(this.game.player) == 1) {
	if (this.game.state.active_player_moved == 0) {
          html += '<li class="option" id="select_strategy_card">play strategy card</li>';
        }
      }
      if (ac.length > 0 && this.game.tracker.action_card == 0 && this.canPlayerPlayActionCard(this.game.player) == 1) {
	if (this.game.state.active_player_moved == 0) {
          html += '<li class="option" id="action">play action card</li>';
        }
      }
      if (this.game.tracker.trade == 0 && this.canPlayerTrade(this.game.player) == 1) {
        html += '<li class="option" id="trade">trade</li>';
      }

      //
      // add tech and factional abilities
      //
      let tech_attach_menu_events = 0;
      let tech_attach_menu_triggers = [];
      let tech_attach_menu_index = [];


      let z = this.returnEventObjects();
      for (let i = 0; i < z.length; i++) {
	if (z[i].menuOptionTriggers(this, "main", this.game.player) == 1) {
          let x = z[i].menuOption(this, "main", this.game.player);
	  html += x.html;
	  tech_attach_menu_index.push(i);
	  tech_attach_menu_triggers.push(x.event);
	  tech_attach_menu_events = 1;
	}
      }
  
      if (this.canPlayerPass(this.game.player) == 1) {
	if (this.game.state.active_player_moved == 1) {
	  //
	  // if we have already moved, we end turn rather than pass
	  //
          html += '<li class="option" id="endturn">end turn</li>';
	} else {
	  //
	  // otherwise we pass
  	  //
          html += '<li class="option" id="pass">pass</li>';
        }
      } else {
	if (this.game.state.active_player_moved == 1) {
	  //
	  // if we have already moved, we end turn rather than pass
	  //
          html += '<li class="option" id="endturn">end turn</li>';
        }
      }

      html += '</ul></p>';
  
      this.updateStatus(html);
  
      $('.option').on('click', function() {
  
        let action2 = $(this).attr("id");

        //
        // respond to tech and factional abilities
        //
        if (tech_attach_menu_events == 1) {
	  for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	    if (action2 == tech_attach_menu_triggers[i]) {
              $(this).remove();
	      imperium_self.game.state.active_player_moved = 1;
              z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "main", imperium_self.game.player);
	      return;
	    }
	  }
        }

        if (action2 == "activate") {
          imperium_self.playerActivateSystem();
        }

        if (action2 == "select_strategy_card") {
          imperium_self.playerSelectStrategyCard(function(success) {
	    imperium_self.game.state.active_player_moved = 1;
  	    imperium_self.addMove("strategy_card_after\t"+success+"\t"+imperium_self.game.player+"\t1");
  	    imperium_self.addMove("strategy\t"+success+"\t"+imperium_self.game.player+"\t1");
  	    imperium_self.addMove("strategy_card_before\t"+success+"\t"+imperium_self.game.player+"\t1");
  	    imperium_self.endTurn();
          });
        }
        if (action2 == "action") {
          imperium_self.playerSelectActionCard(function(card) {
	    if (imperium_self.action_cards[card].type == "action") { imperium_self.game.state.active_player_moved = 1; }
  	    imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	    imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	    imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
  	    imperium_self.endTurn();
          }, function() { imperium_self.playerTurn(); }, 
	    relevant_action_cards);
        }
        if (action2 == "trade") {
          imperium_self.playerTrade();
	  return 0;
        }
        if (action2 == "pass") {
  	  imperium_self.addMove("resolve\tplay");
  	  imperium_self.addMove("player_end_turn\t"+imperium_self.game.player);
          imperium_self.addMove("pass\t"+imperium_self.game.player);
          imperium_self.addMove("setvar\tstate\t0\tactive_player_moved\t"+"int"+"\t"+"0");
  	  imperium_self.endTurn();
        }
        if (action2 == "endturn") {
  	  imperium_self.addMove("resolve\tplay");
  	  imperium_self.addMove("player_end_turn\t"+imperium_self.game.player);
          imperium_self.addMove("setvar\tstate\t0\tactive_player_moved\t"+"int"+"\t"+"0");
          imperium_self.endTurn();
        }
      });
    }
  }




  playerPlayActionCardMenu(action_card_player, card, action_cards_played=[]) {

    let imperium_self = this;

    for (let i = 0; i < this.game.deck[1].hand.length; i++) {
      if (this.game.deck[1].hand[i].indexOf("sabotage") > -1) {
	this.game.players_info[this.game.player-1].can_intervene_in_action_card = 1;
      }
    }

    if (this.game.players_info[this.game.player-1].can_intervene_in_action_card) {

      html = '<div class="sf-readable">Do you wish to play an action card to counter? </div><ul>';

      let ac = this.returnPlayerActionCards(this.game.player, ["action_cards"])
      if (ac.length > 0) {
        html += '<li class="option" id="cont">continue</li>';
        html += '<li class="option" id="action">play action card</li>';
      } else {
        html += '<li class="option" id="cont">continue</li>';
      }

      let tech_attach_menu_events = 0;
      let tech_attach_menu_triggers = [];
      let tech_attach_menu_index = [];

      let z = this.returnEventObjects();
      for (let i = 0; i < z.length; i++) {
        if (z[i].menuOptionTriggers(this, "action_card", this.game.player) == 1) {
          let x = z[i].menuOption(this, "action_card", this.game.player);
          html += x.html;
  	  tech_attach_menu_index.push(i);
	  tech_attach_menu_triggers.push(x.event);
	  tech_attach_menu_events = 1;
        }
      }
      html += '</ul>';

      this.updateStatus(html);
  
      $('.option').on('click', function() {
  
        let action2 = $(this).attr("id");

        //
        // respond to tech and factional abilities
        //
        if (tech_attach_menu_events == 1) {
  	  for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	    if (action2 == tech_attach_menu_triggers[i]) {
	      $(this).remove();
	      z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "action_card", imperium_self.game.player);
            }
          }
        }

        if (action2 == "action") {
          imperium_self.playerSelectActionCard(function(card) {
            imperium_self.game.players_info[this.game.player-1].action_cards_played.push(card);
    	    imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	    imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	    imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	    imperium_self.playerPlayActionCardMenu(action_card_player, card);
          }, function() {
	    imperium_self.playerPlayActionCardMenu(action_card_player, card);
	  }, ["action"]);
        }

        if (action2 == "cont") {
          imperium_self.endTurn();
        }
        return 0;
      });

    } else {
      this.playerAcknowledgeNotice(this.returnFaction(action_card_player) + " plays " + this.action_cards[card].name, function() {
	imperium_self.endTurn();
      });
      return 0;
    }
    
  }
  



  
  playerPlayBombardment(attacker, sector, planet_idx) {

    let imperium_self = this;

    this.game.state.bombardment_sector = sector;
    this.game.state.bombardment_planet_idx = planet_idx;

    let sys = imperium_self.returnSectorAndPlanets(sector);

    //
    // if player is planet owner, this is secondary which should
    // happen afterwards -- parlay, etc. ?
    //
    if (sys.p[planet_idx].owner == imperium_self.game.player) {
      imperium_self.endTurn();
      return 0;
    }


    html = '<div class="sf-readable">Do you wish to bombard '+sys.p[planet_idx].name+'? </div><ul>';

    let ac = this.returnPlayerActionCards(this.game.player, ["pre_bombardment"]);
    if (ac.length > 0) {
      html += '<li class="option" id="bombard">bombard planet</li>';
      html += '<li class="option" id="action">play action card</li>';
      html += '<li class="option" id="skip">skip bombardment</li>';
    } else {
      html += '<li class="option" id="bombard">bombard planet</li>';
      html += '<li class="option" id="skip">skip bombardment</li>';
    }

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "pre_bombardment", this.game.player) == 1) {
        let x = z[i].menuOption(this, "pre_bombardment", this.game.player);
        html += x.html;
        tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
        for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
	    $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "pre_bombardment", imperium_self.game.player);
          }
        }
      }

      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
          imperium_self.game.players_info[this.game.player-1].action_cards_played.push(card);
    	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.playerPlayActionCardMenu(action_card_player, card);
        }, function() {
	  imperium_self.playerPlayActionCardMenu(action_card_player, card);
	}, ["pre_bombardment"]);
      }

      if (action2 == "bombard") {
        imperium_self.addMove("bombard\t"+imperium_self.game.player+"\t"+sector+"\t"+planet_idx);
        imperium_self.endTurn();
      }
      if (action2 == "skip") {
        imperium_self.endTurn();
      }
      return 0;
    });


  }
  
  
  playerAcknowledgeNotice(msg, mycallback) {

    let html  = '<div class="sf-readable">' + msg + "</div><ul>";
        html += '<li class="textchoice" id="confirmit">I understand...</li>';
        html += '</ul></p>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('click', function() { mycallback(); });

    return 0;

  }


  //
  // assign hits to my forces
  //
  playerAssignHits(attacker, defender, type, sector, details, total_hits, source="") {

    let imperium_self = this;
    let hits_assigned = 0;
    let maximum_assignable_hits = 0;
    let relevant_action_cards = ["post_pds","damage_control","space_combat"];

    html = '<div class="sf-readable">You must assign '+total_hits+' to your fleet:</div><ul>';

    let ac = this.returnPlayerActionCards(imperium_self.game.player, relevant_action_cards);
    if (ac.length > 0) {
      html += '<li class="option" id="assign">continue</li>';
      html += '<li class="option" id="action">play action card</li>';
    } else {
      html += '<li class="option" id="assign">continue</li>';
    }

    let menu_type = "";
    if (details == "pds") { menu_type = "assign_hits_pds"; }
    if (menu_type == "" && type == "space") { menu_type = "assign_hits_space"; }
    if (type == "ground") { menu_type = "assign_hits_ground"; }

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, menu_type, this.game.player) == 1) {
        let x = z[i].menuOption(this, menu_type, this.game.player);
        html += x.html;
	tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';


    this.updateStatus(html);
  
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
	for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
   	    let mytech = this.tech[imperium_self.game.players_info[imperium_self.game.player-1].tech[tech_attach_menu_index]];
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, menu_type, imperium_self.game.player);
          }
        }
      }


      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
	  imperium_self.addMove(imperium_self.game.state.assign_hits_queue_instruction);
  	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.endTurn();
	  imperium_self.updateStatus("playing action card before hits assignment");
        }, function() {
          imperium_self.playerAssignHits(attacker, defender, type, sector, details, total_hits, source);
	}, relevant_action_cards);
      }

      if (action2 == "assign") {

	if (imperium_self.game.state.assign_hits_to_cancel > 0) {
	  total_hits -= imperium_self.game.state.assign_hits_to_cancel;
	  if (total_hits < 0) { total_hits = 0; }
	  if (total_hits == 0) {
	    imperium_self.updateLog("notify\t"+imperium_self.returnFaction(imperium_self.game.player)+" does not take any hits");
	    imperium_self.endTurn();
	    return 0;
	  }
	}

	let sys = imperium_self.returnSectorAndPlanets(sector);

	let html = '';
	html += '<div class="sf-readable">Assign <div style="display:inline" id="total_hits_to_assign">'+total_hits+'</div> hits:</div>';
	html += '<ul>';

	let total_targetted_units = 0;
	let targetted_units = imperium_self.game.players_info[imperium_self.game.player-1].target_units;
	
        for (let i = 0; i < sys.s.units[imperium_self.game.player-1].length; i++) {
  
	  let unit = sys.s.units[imperium_self.game.player-1][i];
	  maximum_assignable_hits++;
	  if (targetted_units.includes(unit.type)) { total_targetted_units++; }
	  html += '<li class="textchoice player_ship_'+i+'" id="'+i+'">'+unit.name;
	  if (unit.strength > 1) { 
	    html += ' <div style="display:inline" id="player_ship_'+i+'_hits">(';
	    for (let bb = 1; bb < unit.strength; bb++) { html += '*'; }
	    html += ')</div>'
	  }
	  html += '</li>';

	}
	html += '</ul>';
  
	if (maximum_assignable_hits == 0) {
console.log("ERROR: you had no hits left to assign, bug?");
	  imperium_self.endTurn();
	  return 0;
	}

	imperium_self.updateStatus(html);
	
	$('.textchoice').off();
	$('.textchoice').on('click', function() {

	  let ship_idx = $(this).attr("id");
	  let selected_unit = sys.s.units[imperium_self.game.player-1][ship_idx];

	  if (total_targetted_units > 0) {
	    if (!targetted_units.includes(selected_unit.type)) {
	      alert("You must first assign hits to the required unit types");
	      return;
	    } else {
	      total_targetted_units--;
	    }
	  }

	  imperium_self.addMove("assign_hit\t"+attacker+"\t"+defender+"\t"+imperium_self.game.player+"\tship\t"+sector+"\t"+ship_idx+"\t0"); // last argument --> player should not assign again 


	  total_hits--;
	  hits_assigned++;

	  $('#total_hits_to_assign').innerHTML = total_hits;

	  if (selected_unit.strength > 1) {	  
	    selected_unit.strength--;

	    let ship_to_reduce = "#player_ship_"+ship_idx+'_hits';
	    let rhtml = '';
	    if (selected_unit.strength > 1) {
	      html += '(';
	      for (let bb = 1; bb < selected_unit.strength; bb++) {
	        rhtml += '*';
	      }
	      rhtml += ')';
	    }
	    $(ship_to_reduce).html(rhtml);
	  } else {
	    selected_unit.strength = 0;
	    selected_unit.destroyed = 0;
	    $(this).remove();
	  }

	  if (total_hits == 0 || hits_assigned >= maximum_assignable_hits) {
	    imperium_self.updateStatus("Notifying players of hits assignment...");
	    imperium_self.endTurn();
	  }

	});
      }

    });
  }





  //
  // destroy units
  //
  playerDestroyShips(player, total, sector) {

    let imperium_self = this;
    let total_hits = total;
    let hits_assigned = 0;
    let maximum_assignable_hits = 0;
    let sys = imperium_self.returnSectorAndPlanets(sector);

    html = '<div class="sf-readable">You must destroy '+total+' ships in your fleet:</div><ul>';

    let total_targetted_units = 0;;
    let targetted_units = imperium_self.game.players_info[imperium_self.game.player-1].target_units;

    for (let i = 0; i < sys.s.units[imperium_self.game.player-1].length; i++) {
      let unit = sys.s.units[imperium_self.game.player-1][i];
      maximum_assignable_hits++;
      if (targetted_units.includes(unit.type)) { total_targetted_units++; }
      html += '<li class="textchoice player_ship_'+i+'" id="'+i+'">'+unit.name+'</li>';
    }
    html += '</ul>';
  
    if (maximum_assignable_hits == 0) {
      this.addMove("notify\t" + this.returnFaction(player) + " has no ships to destroy");
      this.endTurn();
      return 0;
    }


    imperium_self.updateStatus(html);
	
    $('.textchoice').off();
    $('.textchoice').on('click', function() {

      let ship_idx = $(this).attr("id");
      let selected_unit = sys.s.units[imperium_self.game.player-1][ship_idx];

      if (total_targetted_units > 0) {
        if (!targetted_units.includes(selected_unit.type)) {
          alert("You must first destroy the required unit types");
          return;
	} else {
	  total_targetted_units--;
	}
      }

      imperium_self.addMove("destroy_unit\t"+player+"\t"+player+"\t"+"space\t"+sector+"\t"+"0"+"\t"+ship_idx+"\t1");

      selected_unit.strength = 0;;
      selected_unit.destroyed = 0;
      $(this).remove();

      total_hits--;
      hits_assigned++;

      if (total_hits == 0 || hits_assigned >= maximum_assignable_hits) {
        imperium_self.updateStatus("Notifying players of hits assignment...");
        imperium_self.endTurn();
      }

    });
  }








  //
  // reaching this implies that the player can choose to fire / not-fire
  //
  playerPlaySpaceCombat(attacker, defender, sector) {
 
    let imperium_self = this;
    let sys = this.returnSectorAndPlanets(sector);
    let html = '';
    let relevant_action_cards = ["combat", "space_combat"];

    this.game.state.space_combat_sector = sector;

    html = '<div class="sf-readable">Space Combat: round ' + this.game.state.space_combat_round + ':<p></p>'+this.returnFaction(attacker)+" attacks with "+this.returnPlayerFleetInSector(attacker, sector) + ". " + this.returnFaction(defender) + " defends with " + this.returnPlayerFleetInSector(defender, sector) + "</div><ul>";

    let ac = this.returnPlayerActionCards(this.game.player, relevant_action_cards)
    if (ac.length > 0) {
      html += '<li class="option" id="attack">continue</li>';
      html += '<li class="option" id="action">play action card</li>';
    } else {
      html += '<li class="option" id="attack">continue</li>';
    }

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "space_combat", this.game.player) == 1) {
        let x = z[i].menuOption(this, "space_combat", this.game.player);
        html += x.html;
	tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
	for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
	    $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "space_combat", imperium_self.game.player);
          }
        }
      }

      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
  	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.playerPlaySpaceCombat(attacker, defender, sector);
        }, function() {
	  imperium_self.playerPlaySpaceCombat(attacker, defender, sector);
	}, relevant_action_cards);
      }

      if (action2 == "attack") {
	// prepend so it happens after the modifiers
	//
	// ships_fire needs to make sure it permits any opponents to fire...
	//
        imperium_self.prependMove("ships_fire\t"+attacker+"\t"+defender+"\t"+sector);
	imperium_self.endTurn();
      }

    });
  }




  //
  // ground combat is over -- provide options for scoring cards, action cards
  //
  playerPlayGroundCombatOver(player, sector) { 

    let imperium_self = this;
    let sys = this.returnSectorAndPlanets(sector);
    let relevant_action_cards = ["ground_combat_victory","ground_combat_over","ground_combat_loss"];
    let ac = this.returnPlayerActionCards(this.game.player, relevant_action_cards);

    let html = '';
    let win = 0;

    if (player == sys.p[planet_idx].owner) {
      html = '<div class="sf-readable">Ground Combat is Over (you win): </div><ul>';
      win = 1;
    } else {
      html = '<div class="sf-readable">Space Combat is Over (you lose): </div><ul>';
    }

    if (ac.length > 0) {
      html += '<li class="option" id="ok">acknowledge</li>';
      html += '<li class="option" id="action">action card</li>';
    } else {
      html += '<li class="option" id="ok">acknowledge</li>';
    }

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "ground_combat_over", this.game.player) == 1) {
        let x = z[i].menuOption(this, "ground_combat_over", this.game.player);
        html += x.html;
	tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
	for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
	    $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "space_combat", imperium_self.game.player);
          }
        }
      }

      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
  	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.playerPlayGroundCombatOver(player, sector, planet_idx);
        }, function() {
	  imperium_self.playerPlayGroundCombatOver(player, sector, planet_idx);
	});
      }

      if (action2 === "ok") {
	// prepend so it happens after the modifiers
	//
	// ships_fire needs to make sure it permits any opponents to fire...
	//
	imperium_self.endTurn();
      }

    });
  }




  //
  // space combat is over -- provide options for scoring cards, action cards
  //
  playerPlaySpaceCombatOver(player, sector) { 

    let imperium_self = this;
    let sys = this.returnSectorAndPlanets(sector);
    let relevant_action_cards = ["space_combat_victory","space_combat_over","space_combat_loss"];
    let ac = this.returnPlayerActionCards(this.game.player, relevant_action_cards);
    let html = '';
    let win = 0;

    if (this.doesPlayerHaveShipsInSector(player, sector)) {
      html = '<div class="sf-readable">Space Combat is Over (you win): </div><ul>';
      win = 1;
    } else {
      html = '<div class="sf-readable">Space Combat is Over (you lose): </div><ul>';
    }

    if (ac.length > 0) {
      html += '<li class="option" id="ok">acknowledge</li>';
      html += '<li class="option" id="action">action card</li>';
    } else {
      html += '<li class="option" id="ok">acknowledge</li>';
    }

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "space_combat_over", this.game.player) == 1) {
        let x = z[i].menuOption(this, "space_combat_over", this.game.player);
        html += x.html;
	tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
	for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
	    $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "space_combat_over", imperium_self.game.player);
          }
        }
      }

      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
  	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.playerPlaySpaceCombatOver(player, sector, planet_idx);
        }, function() {
	  imperium_self.playerPlaySpaceCombatOver(player, sector, planet_idx);
	});
      }

      if (action2 === "ok") {
	// prepend so it happens after the modifiers
	//
	// ships_fire needs to make sure it permits any opponents to fire...
	//
	imperium_self.endTurn();
      }

    });
  }







  //
  // reaching this implies that the player can choose to fire / not-fire
  //
  playerPlayGroundCombat(attacker, defender, sector, planet_idx) { 

    let imperium_self = this;
    let sys = this.returnSectorAndPlanets(sector);
    let html = '';

    this.game.state.ground_combat_sector = sector;
    this.game.state.ground_combat_planet_idx = planet_idx;


    let attacker_forces = this.returnNumberOfGroundForcesOnPlanet(attacker, sector, planet_idx);
    let defender_forces = this.returnNumberOfGroundForcesOnPlanet(defender, sector, planet_idx);

    if (this.game.player == attacker) {
      html = '<div class="sf-readable">You are invading ' + sys.p[planet_idx].name + ' with ' + attacker_forces + ' infantry. ' +this.returnFaction(defender) + ' has ' + defender_forces + ' infanty remaining. This is round ' + this.game.state.ground_combat_round + ' of ground combat. </div><ul>';
    } else {
      html = '<div class="sf-readable">' + this.returnFaction(attacker) + ' has invaded ' + sys.p[planet_idx].name + ' with ' + attacker_forces + ' infantry. You have ' + defender_forces + ' infantry remaining. This is round ' + this.game.state.ground_combat_round + ' of ground combat. </div><ul>';
    }

    let ac = this.returnPlayerActionCards(this.game.player, ["combat","ground_combat"])
    if (ac.length > 0) {
      html += '<li class="option" id="attack">continue</li>';
      html += '<li class="option" id="action">play action card</li>';
    } else {
      html += '<li class="option" id="attack">continue</li>';
    }


    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "ground_combat", this.game.player) == 1) {
        let x = z[i].menuOption(this, "ground_combat", this.game.player);
        html += x.html;
	tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
	for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
	    $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "ground_combat", imperium_self.game.player);
          }
        }
      }

      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
  	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.playerPlayGroundCombat(attacker, defender, sector, planet_idx);
        }, function() {
	  imperium_self.playerPlayGroundCombat(attacker, defender, sector, planet_idx);
	});
      }

      if (action2 == "attack") {
	// prepend so it happens after the modifiers
	//
	// ships_fire needs to make sure it permits any opponents to fire...
	//
        imperium_self.prependMove("infantry_fire\t"+attacker+"\t"+defender+"\t"+sector+"\t"+planet_idx);
	imperium_self.endTurn();
      }

    });
  }







  //
  // reaching this implies that the player can choose to fire / not-fire
  //
  playerPlayPDSDefense(player, attacker, sector) {

    let imperium_self = this;
    let html = '';
    let relevant_action_cards = ["pre_pds"];

    html = '<div class="sf-readable">Do you wish to fire your PDS?</div><ul>';

    let ac = this.returnPlayerActionCards(player, relevant_action_cards);
    if (1 == 1) {
      html += '<li class="option" id="skip">skip PDS</li>';
    }
    if (1 == 1) {
      html += '<li class="option" id="fire">fire PDS</li>';
    }
    if (ac.length > 0) {
      html += '<li class="option" id="action">play action card</li>';
    }

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "pds", this.game.player) == 1) {
        let x = z[i].menuOption(this, "pds", this.game.player);
        html += x.html;
	tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
	for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
	    $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "pds", imperium_self.game.player);
          }
        }
      }


      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
  	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.playerPlayPDSDefense(player, attacker, sector);
        }, function() {
	  imperium_self.playerPlayPDSDefense(player, attacker, sector);
	}, relevant_action_cards);
      }

      if (action2 == "skip") {
	imperium_self.endTurn();
      }

      if (action2 == "fire") {
	// prepend so it happens after the modifiers
        imperium_self.prependMove("pds_fire\t"+imperium_self.game.player+"\t"+attacker+"\t"+sector);
	imperium_self.endTurn();
      };

    });

  }


  //
  // reaching this implies that the player can choose to fire / not-fire
  //
  playerResolveDeadlockedAgenda(agenda, choices) {

    let imperium_self = this;
    let html = '';

    html = '<div class="sf-readable">The agenda has become deadlocked in the Senate. You - the Speaker - must resolve it: </div><ul>';
    for (let i = 0; i < choices.length; i++) {
      html += '<li class="option" id="'+i+'">'+this.returnNameFromIndex(choices[i])+'</li>';
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').off();
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      imperium_self.addMove("resolve_agenda\t"+agenda+"\tspeaker\t"+choices[action2]);
      imperium_self.endTurn();
      return 0;

    });
  }




  //
  // reaching this implies that the player can choose to fire / not-fire
  //
  playerPlayPreAgendaStage(player, agenda, agenda_idx) {

    let imperium_self = this;
    let html = '';
    let relevant_action_cards = ["pre_agenda"];
    let ac = this.returnPlayerActionCards(relevant_action_cards);

    if (this.doesPlayerHaveRider(imperium_self.game.player)) {
      html = '<div class="sf-readable">With your Rider depending on how the other players vote, your emissaries track the mood in the Senate closely...:</div><ul>';
    } else {
      html = '<div class="sf-readable">As the Senators gather to vote on '+this.agenda_cards[agenda].name+', your emissaries nervously tally the votes in their head:</div><ul>';
    }

    if (1 == 1) {
      html += '<li class="option" id="skip">proceed into Senate</li>';
    }
    if (ac.length > 0) {
      html += '<li class="option" id="action">action card</li>';
    }

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "agenda", this.game.player) == 1) {
        let x = z[i].menuOption(this, "agenda", this.game.player);
        html += x.html;
	tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').off();
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
	for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
	    $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "agenda", imperium_self.game.player);
          }
        }
      }

      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
  	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.playerPlayPreAgendaStage(player, agenda, agenda_idx);
        }, function() {
	  imperium_self.playerPlayPreAgendaStage(player, agenda, agenda_idx);
	}, ["rider"]);
      }

      if (action2 == "skip") {
	imperium_self.endTurn();
      }

    });

  }
  playerPlayPostAgendaStage(player, agenda, array_of_winning_options) {

    let imperium_self = this;
    let html = '';
    let relevant_action_cards = ["post_agenda"];
    let ac = this.returnPlayerActionCards(imperium_self.game.player, relevant_action_cards);

    html = '<div class="sf-readable">The Senate has apparently voted for "'+this.returnNameFromIndex(array_of_winning_options[0])+'". As the Speaker confirms the final tally, you get the feeling the issue may not be fully settled:</div><ul>';
    if (array_of_winning_options.length > 1) {
      html = '<div class="sf-readable">The voting has concluded in deadlock. As you leave the council, you see the Speaker smile and crumple a small note into his pocket:</div><ul>';
    }

    if (1 == 1) {
      html += '<li class="option" id="skip">await results</li>';
    }
    if (ac.length > 0) {
      html += '<li class="option" id="action">action card</li>';
    }

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "post_agenda", this.game.player) == 1) {
        let x = z[i].menuOption(this, "post_agenda", this.game.player);
        html += x.html;
	tech_attach_menu_index.push(i);
	tech_attach_menu_triggers.push(x.event);
	tech_attach_menu_events = 1;
      }
    }
    html += '</ul>';

    this.updateStatus(html);
  
    $('.option').off();
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
	for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
	  if (action2 == tech_attach_menu_triggers[i]) {
	    $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "post_agenda", imperium_self.game.player);
          }
        }
      }

      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
  	  imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
	  imperium_self.playerPlayPostAgendaStage(player, agenda, array_of_winning_options);
        }, function() {
	  imperium_self.playerPlayPostAgendaStage(player, agenda, array_of_winning_options);
	}, relevant_action_cards);
      }

      if (action2 == "skip") {
	imperium_self.endTurn();
      }

    });

  }



  playerContinueTurn(player, sector) {

    let imperium_self = this;
    let options_available = 0;

    if (this.game.tracker.invasion == undefined) { this.game.tracker = this.returnPlayerTurnTracker(); this.game.tracker.activate_system = 1; }

    //
    // check to see if any ships survived....
    //
    let playercol = "player_color_"+this.game.player;
    let html  = "<div class='sf-readable'><div class='player_color_box "+playercol+"'></div>" + this.returnFaction(player) + ": </div><ul>";

    if (this.canPlayerProduceInSector(player, sector) && this.game.tracker.production == 0) {
      html += '<li class="option" id="produce">produce units</li>';
      options_available++;
    }
    if (this.canPlayerInvadePlanet(player, sector) && this.game.tracker.invasion == 0) {
      html += '<li class="option" id="invade">invade planet</li>';
      options_available++;
    }
    //if (this.canPlayerPlayActionCard(player) && this.game.tracker.action_card == 0) {
    //  html += '<li class="option" id="action">action card</li>';
    //  options_available++;
    //}

    let tech_attach_menu_events = 0;
    let tech_attach_menu_triggers = [];
    let tech_attach_menu_index = [];

    let z = this.returnEventObjects();
    for (let i = 0; i < z.length; i++) {
      if (z[i].menuOptionTriggers(this, "continue", this.game.player) == 1) {
        let x = z[i].menuOption(this, "continue", this.game.player);
        html += x.html;
        tech_attach_menu_index.push(i);
        tech_attach_menu_triggers.push(x.event);
        tech_attach_menu_events = 1;
      }
    }

    html += '<li class="option" id="endturn">end turn</li>';
    html += '</ul>';
   
    this.updateStatus(html);
    $('.option').on('click', function() {

      let action2 = $(this).attr("id");

      //
      // respond to tech and factional abilities
      //
      if (tech_attach_menu_events == 1) {
        for (let i = 0; i < tech_attach_menu_triggers.length; i++) {
          if (action2 == tech_attach_menu_triggers[i]) {
            $(this).remove();
	    z[tech_attach_menu_index[i]].menuOptionActivated(imperium_self, "continue", imperium_self.game.player);
          }
        }
      }

      if (action2 == "endturn") {
        imperium_self.addMove("resolve\tplay");
        imperium_self.addMove("setvar\tstate\t0\tactive_player_moved\t"+"int"+"\t"+"0");
        imperium_self.endTurn();
      }

      if (action2 == "produce") {
        imperium_self.addMove("continue\t"+player+"\t"+sector);
        imperium_self.playerProduceUnits(sector);
      }  

      if (action2 == "invade") {
        imperium_self.game.tracker.invasion = 1;
        imperium_self.playerInvadePlanet(player, sector);
      }

      if (action2 == "action") {
        imperium_self.playerSelectActionCard(function(card) {
          imperium_self.game.tracker.action_card = 1;
          imperium_self.addMove("continue\t"+player+"\t"+sector);
          imperium_self.addMove("action_card_post\t"+imperium_self.game.player+"\t"+card);
          imperium_self.addMove("action_card\t"+imperium_self.game.player+"\t"+card);
  	  imperium_self.addMove("lose\t"+imperium_self.game.player+"\taction_cards\t1");
          imperium_self.endTurn();
        }, function() {
          imperium_self.playerContinueTurn(player, sector);
          return;
	});
      }

    });

  }



  
  
  ////////////////
  // Production //
  ////////////////
  playerBuyTokens(stage=0) {  

    let imperium_self = this;

    if (this.returnAvailableInfluence(this.game.player) <= 2) {
      this.updateLog("You skip the initiative secondary, as you lack adequate influence...");
      this.updateStatus("Skipping purchase of tokens as insufficient influence...");
      this.endTurn();
      return 0;
    }

    let html = '<div class="sf-readable">Do you wish to purchase any command or strategy tokens, or increase your fleet supply?</div><ul>';
    if (stage == 2) {
        html = '<div class="sf-readable">The Leadership strategy card has been played. Do you wish to purchase any additional command or strategy tokens, or increase your fleet supply?</div><ul>';
    }
    html += '<li class="buildchoice textchoice" id="skip">Do Not Purchase</li>';
    html += '<li class="buildchoice textchoice" id="command">Command Tokens  +<span class="command_total">0</span></li>';
    html += '<li class="buildchoice textchoice" id="strategy">Strategy Tokens +<span class="strategy_total">0</span></li>';
    html += '<li class="buildchoice textchoice" id="fleet">Fleet Supply  +<span class="fleet_total">0</span></li>';
    html += '</ul></p>';
    html += '';
    html += '<div id="buildcost" class="buildcost"><span class="buildcost_total">0</span> influence</div>';
    html += '<div id="confirm" class="buildchoice">click here to finish</div>';
  
    this.updateStatus(html);
  

    let command_tokens = 0;
    let strategy_tokens = 0;
    let fleet_supply = 0;
    let total_cost = 0;
  
    $('.buildchoice').off();
    $('.buildchoice').on('click', function() {
  
      let id = $(this).attr("id");
  
      if (id == "skip") {
  	imperium_self.endTurn();
	return;
      }

      if (id == "confirm") {
  
        total_cost = 3 * (fleet_supply + command_tokens + strategy_tokens);
        imperium_self.playerSelectInfluence(total_cost, function(success) {
  
  	  if (success == 1) {
            imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tcommand\t"+command_tokens);
            imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tcommand\t"+strategy_tokens);
            imperium_self.addMove("purchase\t"+imperium_self.game.player+"\tfleetsupply\t"+fleet_supply);
            imperium_self.endTurn();
            return;
  	  } else {
  	    alert("failure to find appropriate influence");
  	  }
        });
      };
  
      //
      //  figure out if we need to load infantry / fighters
      //
      if (id == "command") 	{ command_tokens++; }
      if (id == "strategy")	{ strategy_tokens++; }
      if (id == "fleet")	{ fleet_supply++; }
  
      let divtotal = "." + id + "_total";
      let x = parseInt($(divtotal).html());
      x++;
      $(divtotal).html(x);
  
  
      total_cost = 3 * (command_tokens + strategy_tokens + fleet_supply);
      $('.buildcost_total').html(total_cost);
  
    });
  
  
  }
  
  
  
  
  
  playerBuyActionCards(stage=0) {  

    let imperium_self = this;
  
    let html = '<div class="sf-readable">Do you wish to spend 1 strategy token to purchase 2 action cards?</div><ul>';
    if (stage == 2) {
        html = '<div class="sf-readable">Politics has been played: do you wish to spend 1 strategy token to purchase 2 action cards?</div><ul>';
    }
    html += '<li class="buildchoice textchoice" id="yes">Purchase Action Cards</li>';
    html += '<li class="buildchoice textchoice" id="no">Do Not Purchase Action Cards</li>';
    html += '</ul>';
  
    this.updateStatus(html);
  
    $('.buildchoice').off();
    $('.buildchoice').on('click', function() {
  
      let id = $(this).attr("id");
  
      if (id == "yes") {
  
        imperium_self.addMove("gain\t"+imperium_self.game.player+"\taction_cards\t2");
        imperium_self.addMove("DEAL\t2\t"+imperium_self.game.player+"\t2");
        imperium_self.addMove("expend\t"+imperium_self.game.player+"\tstrategy\t1");
        imperium_self.endTurn();
        return;
  
      } else {
  
        imperium_self.endTurn();
        return;
  
      }
    });
  
  }
  
  



  playerResearchTechnology(mycallback) {
  
    let imperium_self = this;
    let html = '<div class="sf-readable">You are eligible to upgrade to the following technologies: </div><ul>';
  
    for (var i in this.tech) {
      if (this.canPlayerResearchTechnology(i)) {
        html += '<li class="option" id="'+i+'">'+this.tech[i].name+'</li>';
      }
    }
    html += '</ul>';
  
    this.updateStatus(html);
    
    $('.option').off();
    $('.option').on('click', function() {

      //
      // handle prerequisites
      //
      imperium_self.exhaustPlayerResearchTechnologyPrerequisites(i);
      mycallback($(this).attr("id"));

    });
  
  
  }
  



  canPlayerScoreVictoryPoints(player, card="", deck=1) {
  
    if (card == "") { return 0; }
  
    let imperium_self = this;
  
    // deck 1 = primary
    // deck 2 = secondary
    // deck 3 = secret

    if (deck == 1) {
      let objectives = this.returnStageIPublicObjectives();
      if (objectives[card] != "") {
        if (objectives[card].canPlayerScoreVictoryPoints(imperium_self, player) == 1) { return 1; }
      }
    }
  
    if (deck == 2) {
      let objectives = this.returnStageIIPublicObjectives();
      if (objectives[card] != "") {
        if (objectives[card].canPlayerScoreVictoryPoints(imperium_self, player) == 1) { return 1; }
      }
    }
  
    if (deck == 3) {
      let objectives = this.returnSecretObjectives();
      if (objectives[card] != "") {
        if (objectives[card].canPlayerScoreVictoryPoints(imperium_self, player) == 1) { return 1; }
      }
    }
  
    return 0;
  
  }




  playerScoreSecretObjective(imperium_self, mycallback, stage=0) {

    let html = '';  
    let can_score = 0;

    html += '<div class="sf-readable">Do you wish to score any Secret Objectives? </div><ul>';
  
    // Secret Objectives
    for (let i = 0 ; i < imperium_self.game.deck[5].hand.length; i++) {
      if (!imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored.includes(imperium_self.game.deck[5].hand[i])) {
        if (imperium_self.canPlayerScoreVictoryPoints(imperium_self.game.player, imperium_self.game.deck[5].hand[i], 3)) {
	  if (!imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored_this_round.includes(imperium_self.game.deck[5].hand[i])) {
	    can_score = 1;
            html += '1 VP Secret Objective: <li class="option secret3" id="'+imperium_self.game.deck[5].hand[i]+'">'+imperium_self.game.deck[5].cards[imperium_self.game.deck[5].hand[i]].name+'</li>';
          }
        }
      }
    }
  
    html += '<li class="option" id="no">I choose not to score...</li>';
    html += '</ul>';
  
    imperium_self.updateStatus(html);
    
    $('.option').off();
    $('.option').on('click', function() {
  
      let action = $(this).attr("id");
      if (action == "no") {
        mycallback(imperium_self, 0, "");
      } else {
        let vp = 2;
        let objective = action;
        mycallback(imperium_self, vp, objective);
      }
    });
  }
  
  playerScoreVictoryPoints(imperium_self, mycallback, stage=0) {  

    let html = '';  
    html += '<div class="sf-readable">Do you wish to score any victory points? </div><ul>';
  
    // Stage I Public Objectives
    for (let i = 0; i < imperium_self.game.state.stage_i_objectives.length; i++) {
console.log(i);
console.log("2 --> " + imperium_self.game.player);
	    console.log("3 -> " + JSON.stringify(imperium_self.game.players_info[imperium_self.game.player-1]));
	    console.log("4 -> " + JSON.stringify(imperium_self.game.state.stage_i_objectives));

	    if (!imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored.includes(imperium_self.game.state.stage_i_objectives[i])) {
console.log(5);
		    if (imperium_self.canPlayerScoreVictoryPoints(imperium_self.game.player, imperium_self.game.state.stage_i_objectives[i], 1)) {
console.log(6);
	  if (!imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored_this_round.includes(imperium_self.game.stage_i_objectives[i])) {
console.log(7);
            html += '1 VP Public Objective: <li class="option stage1" id="'+imperium_self.game.state.stage_i_objectives[i]+'">'+imperium_self.game.deck[3].cards[imperium_self.game.state.stage_i_objectives[i]].name+'</li>';
          }
        }
      }
    }
  
    // Stage II Public Objectives
    for (let i = 0; i < imperium_self.game.state.stage_ii_objectives.length; i++) {
      if (!imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored.includes(imperium_self.game.state.stage_ii_objectives[i])) {
        if (imperium_self.canPlayerScoreVictoryPoints(imperium_self.game.player, imperium_self.game.state.stage_ii_objectives[i], 2)) {
	  if (!imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored_this_round.includes(imperium_self.game.stage_ii_objectives[i])) {
            html += '2 VP Public Objective: <li class="option stage2" id="'+imperium_self.game.state.stage_ii_objectives[i]+'">'+imperium_self.game.deck[4].cards[imperium_self.game.state.stage_ii_objectives[i]].name+'</li>';
          }
        }
      }
    }
  
    // Secret Objectives
    for (let i = 0 ; i < imperium_self.game.deck[5].hand.length; i++) {
      if (!imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored.includes(imperium_self.game.deck[5].hand[i])) {
        if (imperium_self.canPlayerScoreVictoryPoints(imperium_self.game.player, imperium_self.game.deck[5].hand[i], 3)) {
	  if (!imperium_self.game.players_info[imperium_self.game.player-1].objectives_scored_this_round.includes(imperium_self.game.deck[5].hand[i])) {
            html += '1 VP Secret Objective: <li class="option secret3" id="'+imperium_self.game.deck[5].hand[i]+'">'+imperium_self.game.deck[5].cards[imperium_self.game.deck[5].hand[i]].name+'</li>';
          }
        }
      }
    }
  
    html += '<li class="option" id="no">I choose not to score...</li>';
    html += '</ul>';
  
    imperium_self.updateStatus(html);
    
    $('.option').off();
    $('.option').on('click', function() {
  
      let action = $(this).attr("id");
      let objective_type = 3;
  
      if ($(this).hasClass("stage1")) { objective_type = 1; }
      if ($(this).hasClass("stage2")) { objective_type = 2; }
      if ($(this).hasClass("secret3")) { objective_type = 3; }
  
      if (action == "no") {
  
        mycallback(imperium_self, 0, "");
  
      } else {

        let vp = 2;
        let objective = action;
        mycallback(imperium_self, vp, objective);
  
      }
    });
  }
  


  
  playerBuildInfrastructure(mycallback, stage=1) {   

    let imperium_self = this;
  
    let html = '';

    if (stage == 1) { html += "<div class='sf-readable'>Which would you like to build: </div><ul>"; }
    else { html += "<div class='sf_readable'>You may also build an additional PDS: </div><ul>"; }

    html += '<li class="buildchoice" id="pds">Planetary Defense System</li>';
    if (stage == 1) {
      html += '<li class="buildchoice" id="spacedock">Space Dock</li>';
    }
    html += '</ul>';
  
    this.updateStatus(html);
  
    let stuff_to_build = [];  
  
    $('.buildchoice').off();
    $('.buildchoice').on('click', function() {
  
      let id = $(this).attr("id");
  
      imperium_self.playerSelectPlanetWithFilter(
              "Select a planet on which to build: ",
              function(planet) {
                if (imperium_self.game.planets[planet].owner == imperium_self.game.player) { return 1; } return 0;
              },
              function(planet) {
                if (id == "pds") {
                  imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+1+"\t"+imperium_self.game.planets[planet].idx+"\tpds\t"+imperium_self.game.planets[planet].sector);
                  mycallback();
                }
                if (id == "spacedock") {
                  imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+1+"\t"+imperium_self.game.planets[planet].idx+"\tspacedock\t"+imperium_self.game.planets[planet].sector);
                  mycallback();
                }
              },
              null
      );
    });
  
  }
  
  
  playerProduceUnits(sector, production_limit=0, cost_limit=0, stage=0) { 
  
    let imperium_self = this;

    //
    // determine production_limit from sector
    //
    let sys = this.returnSectorAndPlanets(sector);
    let calculated_production_limit = 0;
    for (let i = 0; i < sys.s.units[this.game.player-1].length; i++) {
      calculated_production_limit += sys.s.units[this.game.player-1][i].production;
    }
    for (let p = 0; p < sys.p.length; p++) {
      for (let i = 0; i < sys.p[p].units[this.game.player-1].length; i++) {
        calculated_production_limit += sys.p[p].units[this.game.player-1][i].production;
      }
    }

    if (this.game.players_info[this.game.player-1].may_player_produce_without_spacedock == 1) {
      if (production_limit == 0 && this.game.players_info[this.game.player-1].may_player_produce_without_spacedock_production_limit >= 0) { production_limit = this.game.players_info[this.game.player-1].may_player_produce_without_spacedock_production_limit; }
      if (cost_limit == 0 && this.game.players_info[this.game.player-1].may_player_produce_without_spacedock_cost_limit >= 0) { cost_limit = this.game.players_info[this.game.player-1].may_player_produce_without_spacedock_cost_limit; }
    };

    if (calculated_production_limit > production_limit) { production_limit = calculated_production_limit; }


    let html = '<div class="sf-readable">Produce Units in this Sector: ';
    if (production_limit != 0) { html += '('+production_limit+' units max)'; }
    if (cost_limit != 0) { html += '('+cost_limit+' cost max)'; }
    html += '</div><ul>';
    html += '<li class="buildchoice" id="infantry">Infantry - <span class="infantry_total">0</span></li>';
    html += '<li class="buildchoice" id="fighter">Fighter - <span class="fighter_total">0</span></li>';
    html += '<li class="buildchoice" id="destroyer">Destroyer - <span class="destroyer_total">0</span></li>';
    html += '<li class="buildchoice" id="carrier">Carrier - <span class="carrier_total">0</span></li>';
    html += '<li class="buildchoice" id="cruiser">Cruiser - <span class="cruiser_total">0</span></li>';
    html += '<li class="buildchoice" id="dreadnaught">Dreadnaught - <span class="dreadnaught_total">0</span></li>';
    html += '<li class="buildchoice" id="flagship">Flagship - <span class="flagship_total">0</span></li>';
    html += '<li class="buildchoice" id="warsun">War Sun - <span class="warsun_total">0</span></li>';
    html += '</ul>';
    html += '</p>';
    html += '<div id="buildcost" class="buildcost"><span class="buildcost_total">0 resources</span></div>';
    html += '<div id="confirm" class="buildchoice">click here to build</div>';
  
    this.updateStatus(html);
  
    let stuff_to_build = [];  
  
    $('.buildchoice').off();
    $('.buildchoice').on('click', function() {
  
      let id = $(this).attr("id");

      //
      // submit when done
      //
      if (id == "confirm") {
  
        let total_cost = 0;
        for (let i = 0; i < stuff_to_build.length; i++) {
  	  total_cost += imperium_self.returnUnitCost(stuff_to_build[i], imperium_self.game.player);
        }
  
        if (imperium_self.game.players_info[imperium_self.game.player-1].production_bonus > 0) {
          total_cost -= imperium_self.game.players_info[imperium_self.game.player-1].production_bonus;
        }

        imperium_self.playerSelectResources(total_cost, function(success) {

  	  if (success == 1) {
            imperium_self.addMove("resolve\tplay");
            imperium_self.addMove("continue\t"+imperium_self.game.player+"\t"+sector);
            for (let y = 0; y < stuff_to_build.length; y++) {
  	      let planet_idx = imperium_self.returnPlayersLeastDefendedPlanetInSector(imperium_self.game.player, sector);
  	      if (stuff_to_build[y] != "infantry") { planet_idx = -1; }
  	      imperium_self.addMove("produce\t"+imperium_self.game.player+"\t"+1+"\t"+planet_idx+"\t"+stuff_to_build[y]+"\t"+sector);
	      imperium_self.game.tracker.production = 1;
            }
            imperium_self.endTurn();
            return;
  	  } else {
  	    alert("failure to find appropriate influence");
  	  }
        });

	return;  
      };
  


      //
      // build stuff
      //
      let calculated_total_cost = 0;
      for (let i = 0; i < stuff_to_build.length; i++) {
        calculated_total_cost += imperium_self.returnUnitCost(stuff_to_build[i], imperium_self.game.player);
      }
      calculated_total_cost += imperium_self.returnUnitCost(id, imperium_self.game.player);
  
      //
      // reduce production costs if needed
      //
      if (imperium_self.game.players_info[imperium_self.game.player-1].production_bonus > 0) {
        calculated_total_cost -= imperium_self.game.players_info[imperium_self.game.player-1].production_bonus;
      }
  
      if (calculated_total_cost > imperium_self.returnAvailableResources(imperium_self.game.player)) {
        alert("You cannot build more than you have available to pay for it.");
        return;
      }

      //
      // respect production / cost limits
      //
      if (production_limit < stuff_to_build.length && production_limit > 0) {
        alert("You cannot build more units than your production limit");
        return;
      }
      if (cost_limit < calculated_total_cost && cost_limit > 0) {
        alert("You cannot build units that cost more than your cost limit");
        return;
      }
  
  
      //
      //  figure out if we need to load infantry / fighters
      //
      stuff_to_build.push(id);
  
      let total_cost = 0;
      for (let i = 0; i < stuff_to_build.length; i++) {
        total_cost += imperium_self.returnUnitCost(stuff_to_build[i], imperium_self.game.player);
      }
  
      let divtotal = "." + id + "_total";
      let x = parseInt($(divtotal).html());
      x++;
      $(divtotal).html(x);
  
      //
      // reduce production costs if needed
      //
      if (imperium_self.game.players_info[imperium_self.game.player-1].production_bonus > 0) {
        total_cost -= imperium_self.game.players_info[imperium_self.game.player-1].production_bonus;
        imperium_self.updateLog("Production Costs reduced by 1");
      }
  
      let resourcetxt = " resources";
      if (total_cost == 1) { resourcetxt = " resource"; }
      $('.buildcost_total').html(total_cost + resourcetxt);
  
    });
  
  }
  

  playerHandleTradeOffer(faction_offering, their_offer, my_offer) {

    let imperium_self = this;

    let html = '<div class="sf-readable">You have received a trade offer from ' + imperium_self.returnFaction(faction_offering) + '. They offer '+their_offer.goods+' trade goods in exchange for '+my_offer.goods+' trade goods or commodities: </div><ul>';
        html += `  <li class="option" id="yes">accept trade</li>`;
        html += `  <li class="option" id="no">refuse trade</li>`;
    html += '</ul>';
  
    this.updateStatus(html);
  
    $('.option').off();
    $('.option').on('click', function() {
  
      let action = $(this).attr("id");

      if (action == "no") {
  	imperium_self.addMove("refuse_offer\t"+imperium_self.game.player+"\t"+faction_offering);
  	imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player)+ " refuses trade offer from " + imperium_self.returnFaction(faction_offering));
	imperium_self.endTurn();
	return 0;
      }

      if (action == "yes") { 
 	imperium_self.addMove("trade\t"+faction_offering+"\t"+imperium_self.game.player+"\t"+JSON.stringify(their_offer)+"\t"+JSON.stringify(my_offer));
  	imperium_self.addMove("notify\t"+imperium_self.returnFaction(imperium_self.game.player)+ " accepts trade offer from " + imperium_self.returnFaction(faction_offering));
	imperium_self.endTurn();
	return 0;
      }

    });

  }


  playerTrade() {
  
    let imperium_self = this;
    let factions = this.returnFactions();
  
    let html = '<div class="sf-readable">Make Trade Offer to Faction: </div><ul>';
    for (let i = 0; i < this.game.players_info.length; i++) {
      if (this.game.players_info[i].traded_this_turn == 0 && (i+1) != this.game.player) {
	if (this.arePlayersAdjacent(this.game.player, (i+1))) {
          html += `  <li class="option" id="${i}">${factions[this.game.players_info[i].faction].name}</li>`;
	}
      }
    }
    html += `  <li class="option" id="cancel">cancel</li>`;
    html += '</ul>';
  
    this.updateStatus(html);
  
    $('.option').off();
    $('.option').on('click', function() {
  
      let faction = $(this).attr("id");

      if (faction == "cancel") {
	imperium_self.playerTurn();
        return 0;
      }


      let offer_selected = 0;
      let receive_selected = 0;

      let max_offer = imperium_self.game.players_info[imperium_self.game.player-1].commodities + imperium_self.game.players_info[imperium_self.game.player-1].goods;
      let max_receipt = imperium_self.game.players_info[parseInt(faction)].commodities + imperium_self.game.players_info[parseInt(faction)].goods;
  
      let html = "<div class='sf-readable'>Make an Offer: </div><ul>";
      html += '<li id="to_offer" class="option">you give <span class="offer_total">0</span> commodities/goods</li>';
      html += '<li id="to_receive" class="option">you receive <span class="receive_total">0</span> trade goods</li>';
      html += '<li id="confirm" class="option">submit offer</li>';
      html += '</ul>';
  
      imperium_self.updateStatus(html);
  
      $('.option').off();
      $('.option').on('click', function() {
  
        let selected = $(this).attr("id");
  
        if (selected == "to_offer") { offer_selected++; if (offer_selected > max_offer) { offer_selected = 0; } }
        if (selected == "to_receive") { receive_selected++; if (receive_selected > max_receipt) { receive_selected = 0; } }

        if (selected == "confirm") {

	  let my_offer = {};
	      my_offer.goods = $('.offer_total').html();
	  let my_receive = {};
	      my_receive.goods = $('.receive_total').html();

  	  imperium_self.addMove("offer\t"+imperium_self.game.player+"\t"+(parseInt(faction)+1)+"\t" + JSON.stringify(my_offer) + "\t" + JSON.stringify(my_receive));
	  imperium_self.updateStatus("trade offer submitted");
	  imperium_self.endTurn();

  	}

        $('.offer_total').html(offer_selected);
        $('.receive_total').html(receive_selected);
 
      });
    });
  }
  
  

  
  playerSelectSector(mycallback, mode=0) { 
  
    //
    // mode
    //
    // 0 = any sector
    // 1 = activated actor
    //
  
    let imperium_self = this;
  
    $('.sector').on('click', function() {
      let pid = $(this).attr("id");
      mycallback(pid);
    });
  
  }
  
  
  

  playerSelectPlanet(mycallback, mode=0) { 
  
    //
    // mode
    //
    // 0 = in any sector
    // 1 = in unactivated actor
    // 2 = controlled by me
    //
  
    let imperium_self = this;
  
    let html  = "Select a system in which to select a planet: ";
    this.updateStatus(html);
  
    $('.sector').on('click', function() {
  
      let sector = $(this).attr("id");
      let sys = imperium_self.returnSectorAndPlanets(sector);

      //
      // exit if no planets are controlled
      //
      if (mode == 2) {
	let exist_controlled_planets = 0;
        for (let i = 0; i < sys.p.length; i++) {
	  if (sys.p[i].owner == imperium_self.game.player) {
	    exist_controlled_planets = 1;
	  }
        }
	if (exist_controlled_planets == 0) {
	  alert("Invalid Choice: you do not control planets in that sector");
	  return;
	}
      }

  
      html = '<div class="sf-readable">Select a planet in this system: </div><ul>';
      for (let i = 0; i < sys.p.length; i++) {
	if (mode == 0) {
          html += '<li class="option" id="' + i + '">' + sys.p[i].name + ' - <span class="invadeplanet_'+i+'">0</span></li>';
	}
	if (mode == 1) {
          html += '<li class="option" id="' + i + '">' + sys.p[i].name + ' - <span class="invadeplanet_'+i+'">0</span></li>';
	}
	if (mode == 2 && sys.p[i].owner == imperium_self.game.player) {
          html += '<li class="option" id="' + i + '">' + sys.p[i].name + '</li>';
	}
      }
      html += '</ul>';
  

      imperium_self.updateStatus(html);
  
      $('.option').off();
      $('.option').on('mouseenter', function() { let s = $(this).attr("id"); imperium_self.showPlanetCard(sector, s); imperium_self.showSectorHighlight(sector); });
      $('.option').on('mouseleave', function() { let s = $(this).attr("id"); imperium_self.hidePlanetCard(sector, s); imperium_self.hideSectorHighlight(sector); });
      $('.option').on('click', function() {
	let pid = $(this).attr("id");
	imperium_self.hidePlanetCard(sector, pid);
        mycallback(sector, pid);
      });
  
    });
  
  }
  
  
  
  playerSelectInfluence(cost, mycallback) {
  
    if (cost == 0) { mycallback(1); return; }  

    let imperium_self = this;
    let array_of_cards = this.returnPlayerUnexhaustedPlanetCards(this.game.player); // unexhausted
    let array_of_cards_to_exhaust = [];
    let selected_cost = 0;
    let total_trade_goods = imperium_self.game.players_info[imperium_self.game.player-1].goods;


    let html  = "<div class='sf-readable'>Select "+cost+" in influence: </div><ul>";
    for (let z = 0; z < array_of_cards.length; z++) {
      html += '<li class="cardchoice" id="cardchoice_'+array_of_cards[z]+'">' + this.returnPlanetCard(array_of_cards[z]) + '</li>';
    }
    if (1 == imperium_self.game.players_info[imperium_self.game.player-1].goods) {
      html += '<li class="textchoice" id="trade_goods">' + imperium_self.game.players_info[imperium_self.game.player-1].goods + ' trade good</li>';
    } else {
      html += '<li class="textchoice" id="trade_goods">' + imperium_self.game.players_info[imperium_self.game.player-1].goods + ' trade goods</li>';
    }
    html += '</ul>';

  
    this.updateStatus(html);
    $('.cardchoice , .textchoice').on('click', function() {
  
      let action2 = $(this).attr("id");
      let tmpx = action2.split("_");
      
      let divid = "#"+action2;
      let y = tmpx[1];
      let idx = 0;
      for (let i = 0; i < array_of_cards.length; i++) {
        if (array_of_cards[i] === y) {
          idx = i;
        } 
      }
  


      //
      // handle spending trade goods
      //
      if (action2 == "trade_goods") {
        if (total_trade_goods > 0) {
          imperium_self.addMove("expend\t"+imperium_self.game.player+"\tgoods\t1");
          total_trade_goods--;
          selected_cost += 1;

          if (1 == total_trade_goods) {
            $('#trade_goods').html(('' + total_trade_goods+' trade good'));
          } else {
            $('#trade_goods').html(('' + total_trade_goods+' trade goods'));
          }
        }
      } else {
        imperium_self.addMove("expend\t"+imperium_self.game.player+"\tplanet\t"+array_of_cards[idx]);
        array_of_cards_to_exhaust.push(array_of_cards[idx]);
        $(divid).off();
        $(divid).css('opacity','0.3');
        selected_cost += imperium_self.game.planets[array_of_cards[idx]].resources;
      }  

      if (cost <= selected_cost) { mycallback(1); }
  
    });
  }
  





  playerSelectStrategyAndCommandTokens(cost, mycallback) {
 
    if (cost == 0) { mycallback(1); }
 
    let imperium_self = this;
    let selected_cost = 0;
 
    let html  = "<div class='sf-readable'>Select "+cost+" in Strategy and Command Tokens: </div><ul>";
    html += '<li class="textchoice" id="strategy">strategy tokens</li>';
    html += '<li class="textchoice" id="command">command tokens</li>';
    html += '</ul>';
 
    this.updateStatus(html);
    $('.textchoice').on('click', function() {
 
      let action2 = $(this).attr("id");

      selected_cost++;
  
      if (action2 == "strategy") {
        imperium_self.addMove("expend\t"+imperium_self.game.player+"\tstrategy\t1");
      }
      if (action2 == "command") {
        imperium_self.addMove("expend\t"+imperium_self.game.player+"\tcommand\t1");
      }

      if (cost <= selected_cost) { mycallback(1); }

    });

  }



  playerSelectResources(cost, mycallback) {
 
    if (cost == 0) { mycallback(1); return; }
 
    let imperium_self = this;
    let array_of_cards = this.returnPlayerUnexhaustedPlanetCards(this.game.player); // unexhausted
    let array_of_cards_to_exhaust = [];
    let selected_cost = 0;
    let total_trade_goods = imperium_self.game.players_info[imperium_self.game.player-1].goods; 

    let html  = "<div class='sf-readable'>Select "+cost+" in resources: </div><ul>";
    for (let z = 0; z < array_of_cards.length; z++) {
      html += '<li class="cardchoice" id="cardchoice_'+array_of_cards[z]+'">' + this.returnPlanetCard(array_of_cards[z]) + '</li>';
    }
    if (1 == imperium_self.game.players_info[imperium_self.game.player-1].goods) {
      html += '<li class="textchoice" id="trade_goods">' + imperium_self.game.players_info[imperium_self.game.player-1].goods + ' trade good</li>';
    } else {
      html += '<li class="textchoice" id="trade_goods">' + imperium_self.game.players_info[imperium_self.game.player-1].goods + ' trade goods</li>';
    }
    html += '</ul>';
 
    this.updateStatus(html);
    $('.cardchoice , .textchoice').on('click', function() {
 
      let action2 = $(this).attr("id");
      let tmpx = action2.split("_");
  
      let divid = "#"+action2;
      let y = tmpx[1];
      let idx = 0;
      for (let i = 0; i < array_of_cards.length; i++) {
        if (array_of_cards[i] === y) {
          idx = i;
        }
      }

      //
      // handle spending trade goods
      //
      if (action2 == "trade_goods") {
	if (total_trade_goods > 0) { 
          imperium_self.addMove("expend\t"+imperium_self.game.player+"\tgoods\t1");
	  total_trade_goods--;
          selected_cost += 1;

          if (1 == total_trade_goods) {
	    $('#trade_goods').html(('' + total_trade_goods+' trade good'));
          } else {
	    $('#trade_goods').html(('' + total_trade_goods+' trade goods'));
          }
	}
      } else {
        imperium_self.addMove("expend\t"+imperium_self.game.player+"\tplanet\t"+array_of_cards[idx]);
        array_of_cards_to_exhaust.push(array_of_cards[idx]);
        $(divid).off();
        $(divid).css('opacity','0.3');
        selected_cost += imperium_self.game.planets[array_of_cards[idx]].resources;
      }

      if (cost <= selected_cost) { mycallback(1); }

    });

  }







  
  playerSelectActionCard(mycallback, cancel_callback, types=[]) {  

    let imperium_self = this;
    let array_of_cards = this.returnPlayerActionCards(this.game.player, types);
    if (array_of_cards.length == 0) {
      this.playerAcknowledgeNotice("You do not have any action cards that can be played now", function() {
	if (cancel_callback != null) { cancel_callback(); return 0; }
        imperium_self.playerTurn();
        return 0;
      });
      return 0;
    }

    let html = '';

    html += "<div class='sf-readable'>Select an action card: </div><ul>";
    for (let z = 0; z < array_of_cards.length; z++) {
      if (!this.game.players_info[this.game.player-1].action_cards_played.includes(array_of_cards[z])) {
        let thiscard = imperium_self.action_cards[array_of_cards[z]];
        html += '<li class="textchoice pointer" id="'+array_of_cards[z]+'">' + thiscard.name + '</li>';
      }
    }
    html += '<li class="textchoice pointer" id="cancel">cancel</li>';
    html += '</ul>';
  
    this.updateStatus(html);
    $('.textchoice').off();
    $('.textchoice').on('mouseenter', function() { let s = $(this).attr("id"); if (s != "cancel") { imperium_self.showActionCard(s); } });
    $('.textchoice').on('mouseleave', function() { let s = $(this).attr("id"); if (s != "cancel") { imperium_self.hideActionCard(s); } });
    $('.textchoice').on('click', function() {

      let action2 = $(this).attr("id");

      if (action2 != "cancel") { imperium_self.hideActionCard(action2); }
      if (action2 === "cancel") { cancel_callback(); return 0; }

      if (imperium_self.game.tracker) { imperium_self.game.tracker.action_card = 1; }
      if (imperium_self.action_cards[action2].type == "action") { imperium_self.game.state.active_player_moved = 1; }

      imperium_self.game.players_info[imperium_self.game.player-1].action_cards_played.push(action2);

      mycallback(action2);

    });
  
  }
  
  
  //
  // this is when players are choosing to play the cards that they have 
  // already chosen.
  //
  playerSelectStrategyCard(mycallback, mode=0) {

    let array_of_cards = this.game.players_info[this.game.player-1].strategy;
    let strategy_cards = this.returnStrategyCards();
    let imperium_self = this;  

    let html = "";

    html += "<div class='sf-readable'>Select a strategy card: </div><ul>";
    for (let z in array_of_cards) {
      if (!this.game.players_info[this.game.player-1].strategy_cards_played.includes(array_of_cards[z])) {
        html += '<li class="textchoice" id="'+array_of_cards[z]+'">' + strategy_cards[array_of_cards[z]].name + '</li>';
      }
    }
    html += '<li class="textchoice pointer" id="cancel">cancel</li>';
    html += '</ul>';
  
    this.updateStatus(html);
    $('.textchoice').on('mouseenter', function() { let s = $(this).attr("id"); if (s != "cancel") { imperium_self.showStrategyCard(s); } });
    $('.textchoice').on('mouseleave', function() { let s = $(this).attr("id"); if (s != "cancel") { imperium_self.hideStrategyCard(s); } });
    $('.textchoice').on('click', function() {

      let action2 = $(this).attr("id");

      if (action2 != "cancel") { imperium_self.hideStrategyCard(action2); }

      if (action2 === "cancel") {
	imperium_self.playerTurn();
	return;
      }

      mycallback(action2);

    });
  }
  


  
  //
  // this is when players select at the begining of the round, not when they 
  // are chosing to play the cards that they have already selected
  //
  playerSelectStrategyCards(mycallback) {

    let imperium_self = this;
    let cards = this.returnStrategyCards();
    let playercol = "player_color_"+this.game.player;
          
    let html  = "<div class='terminal_header'><div class='player_color_box "+playercol+"'></div>" + this.returnFaction(this.game.player) + ": select your strategy card:</div><ul>";
    if (this.game.state.round > 1) {
      html  = "<div class='terminal_header'>"+this.returnFaction(this.game.player) + ": select your strategy card:</div><ul>";
    }
    let scards = [];

    for (let z in this.strategy_cards) {
      scards.push("");
    }


    for (let z = 0; z < this.game.state.strategy_cards.length; z++) {
      let rank = parseInt(this.strategy_cards[this.game.state.strategy_cards[z]].rank);
      while (scards[rank-1] != "") { rank++; }
      scards[rank-1] = '<li class="textchoice" id="'+this.game.state.strategy_cards[z]+'">' + cards[this.game.state.strategy_cards[z]].name + '</li>';
    }

    for (let z = 0; z < scards.length; z++) {
      if (scards[z] != "") {
        html += scards[z];
      }
    }
    
    html += '</ul></p>';
  
    this.updateStatus(html);
    $('.textchoice').off();
    $('.textchoice').on('mouseenter', function() { let s = $(this).attr("id"); if (s != "cancel") { imperium_self.showStrategyCard(s); } });
    $('.textchoice').on('mouseleave', function() { let s = $(this).attr("id"); if (s != "cancel") { imperium_self.hideStrategyCard(s); } });
    $('.textchoice').on('click', function() {
      let action2 = $(this).attr("id");
      imperium_self.hideStrategyCard(action2);
      mycallback(action2);
    });
  
  }
  
  

  playerRemoveInfantryFromPlanets(player, total=1, mycallback) {

    let imperium_self = this;

    let html =  '';
        html += '<div class="sf-readable">Remove '+total+' infantry from planets you control:</div>';
	html += '<ul>'; 

    let infantry_to_remove = [];

    for (let s in this.game.planets) {
      let planet = this.game.planets[s];
      if (planet.owner == player) {
        let infantry_available_here = 0;
	for (let ss = 0; ss < planet.units[player-1].length; ss++) {
	  if (planet.units[player-1][ss].type == "infantry") { infantry_available_here++; }
	}
	if (infantry_available_here > 0) {
	  html += '<li class="option textchoice" id="'+s+'">' + planet.name + ' - <div style="display:inline" id="'+s+'_infantry">'+infantry_available_here+'</div></li>';
	}
      }
    }
    html += '<li class="option textchoice" id="end"></li>';
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('click', function() {

      let action2 = $(this).attr("id");

      if (action2 == "end") {

	for (let i = 0; i < infantry_to_remove.length; i++) {

	  let planet_in_question = imperium_self.game.planets[infantry_to_remove[i].planet];
	  
	  let total_units_on_planet = planet_in_question.units[player-1].length;
	  for (let ii = 0; ii < total_units_on_planet; ii++) {
	    let thisunit = planet_in_question.units[player-1][ii];
	    if (thisunit.type == "infantry") {
	      planet_in_question.units[player-1].splice(ii, 1);
	      ii = total_units_on_planet+2; // 0 as player_moves below because we have removed above
	      imperium_self.addMove("remove_infantry_from_planet\t"+player+"\t"+infantry_to_remove[i].planet+"\t"+"0");
	      imperium_self.addMove("notify\tREMOVING INFANTRY FROM PLANET: " + infantry_to_remove[i].planet);
console.log("PLANET HAS LEFT: " + JSON.stringify(planet_in_question));
	    }
	  }
	}
	mycallback(infantry_to_remove.length);
	return;
      }

      infantry_to_remove.push({ infantry : 1, planet : action2 });
      let divname = "#" + action2 + "_infantry";
      let existing_infantry = $(divname).html();
      let updated_infantry = parseInt(existing_infantry)-1;
      if (updated_infantry < 0) { updated_infantry = 0; }

      $(divname).html(updated_infantry);

      if (updated_infantry == 0) {
	$(this).remove();
      }

      if (infantry_to_remove.length >= total) {
	$('#end').click();
      }

    });

  }

  playerAddInfantryToPlanets(player, total=1, mycallback) {

    let imperium_self = this;

    let html =  '';
        html += '<div class="sf-readable">Add '+total+' infantry to planets you control:</div>';
	html += '<ul>'; 

    let infantry_to_add = [];

    for (let s in this.game.planets) {
      let planet = this.game.planets[s];
      if (planet.owner == player) {
        let infantry_available_here = 0;
	for (let ss = 0; ss < planet.units[player-1].length; ss++) {
	  if (planet.units[player-1][ss].type == "infantry") { infantry_available_here++; }
	}
	html += '<li class="option textchoice" id="'+s+'">' + planet.name + ' - <div style="display:inline" id="'+s+'_infantry">'+infantry_available_here+'</div></li>';
      }
    }
    html += '<li class="option textchoice" id="end"></li>';
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('click', function() {

      let action2 = $(this).attr("id");

      if (action2 == "end") {
	for (let i = 0; i < infantry_to_add.length; i++) {
	  imperium_self.addMove("add_infantry_to_planet\t"+player+"\t"+infantry_to_add[i].planet+"\t"+"1");
	}
	mycallback(infantry_to_add.length);
	return;
      }

      infantry_to_add.push({ infantry : 1, planet : action2 });
      let divname = "#" + action2 + "_infantry";
      let existing_infantry = $(divname).html();
      let updated_infantry = parseInt(existing_infantry)+1;

      $(divname).html(updated_infantry);

      if (infantry_to_add.length >= total) {
	$('#end').click();
      }

    });

  }
  
  
  //////////////////////////
  // Select Units to Move //
  //////////////////////////
  playerSelectUnitsToMove(destination) {
  
    let imperium_self = this;
    let html = '';
    let hops = 3;
    let sectors = [];
    let distance = [];
    let fighters_loaded = 0; 
    let infantry_loaded = 0;
 
    let obj = {};
        obj.max_hops = 2;
        obj.ship_move_bonus = this.game.players_info[this.game.player-1].ship_move_bonus + this.game.players_info[this.game.player-1].temporary_ship_move_bonus;
        obj.fleet_move_bonus = this.game.players_info[this.game.player-1].fleet_move_bonus + this.game.players_info[this.game.player-1].temporary_fleet_move_bonus;
        obj.ships_and_sectors = [];
        obj.stuff_to_move = [];  
        obj.stuff_to_load = [];  
        obj.distance_adjustment = 0;
  
        obj.max_hops += obj.ship_move_bonus;
        obj.max_hops += obj.fleet_move_bonus;
  
    let x = imperium_self.returnSectorsWithinHopDistance(destination, obj.max_hops, imperium_self.game.player);
    sectors = x.sectors; 
    distance = x.distance;
  
    for (let i = 0; i < distance.length; i++) {
      if (obj.ship_move_bonus > 0) {
        distance[i]--;
      }
      if (obj.fleet_move_bonus > 0) {
        distance[i]--;
      }
    }
  
    if (obj.ship_move_bonus > 0) {
      obj.distance_adjustment += obj.ship_move_bonus;
    }
    if (obj.fleet_move_bonus > 0) {
      obj.distance_adjustment += obj.fleet_move_bonus;
    }
  
   console.log("SECTORS: " + JSON.stringify(sectors));
 
   obj.ships_and_sectors = imperium_self.returnShipsMovableToDestinationFromSectors(destination, sectors, distance);

    let updateInterface = function(imperium_self, obj, updateInterface) {

      let subjective_distance_adjustment = 0;
      if (obj.ship_move_bonus > 0) {
        subjective_distance_adjustment += obj.ship_move_bonus;
      }
      if (obj.fleet_move_bonus > 0) {
        subjective_distance_adjustment += obj.fleet_move_bonus;
      }
      let spent_distance_boost = (obj.distance_adjustment - subjective_distance_adjustment);
 
      let playercol = "player_color_"+imperium_self.game.player;
      let html = "<div class='player_color_box "+playercol+"'></div> "+imperium_self.returnFaction(imperium_self.game.player)+': select ships to move<ul>';  

      //
      // select ships
      //
      for (let i = 0; i < obj.ships_and_sectors.length; i++) {
  
        let sys = imperium_self.returnSectorAndPlanets(obj.ships_and_sectors[i].sector);
        html += '<b class="sector_name" id="'+obj.ships_and_sectors[i].sector+'" style="margin-top:10px">'+sys.s.name+'</b>';
        html += '<ul>';
        for (let ii = 0; ii < obj.ships_and_sectors[i].ships.length; ii++) {
  
    	  //
    	  // figure out if we can still move this ship
  	  //
  	  let already_moved = 0;
  	  for (let z = 0; z < obj.stuff_to_move.length; z++) {
  	    if (obj.stuff_to_move[z].already_moved == 1) {
 	      already_moved = 1;
	    }
  	    if (obj.stuff_to_move[z].sector == obj.ships_and_sectors[i].sector) {
  	      if (obj.stuff_to_move[z].i == i) {
  	        if (obj.stuff_to_move[z].ii == ii) {
  	          already_moved = 1;
  	        }
  	      }
  	    }
  	  }	

  	  if (already_moved == 1) {
            html += '<li id="sector_'+i+'_'+ii+'" class=""><b>'+obj.ships_and_sectors[i].ships[ii].name+'</b></li>';
    	  } else {
  	    if (obj.ships_and_sectors[i].ships[ii].move - (obj.ships_and_sectors[i].adjusted_distance[ii] + spent_distance_boost) >= 0) {
              html += '<li id="sector_'+i+'_'+ii+'" class="option">'+obj.ships_and_sectors[i].ships[ii].name+'</li>';
  	    }
  	  }
        }

        html += '</ul>';
      }
      html += '</p>';
      html += '<div id="confirm" class="option">click here to move</div>';
      imperium_self.updateStatus(html);
 
      //
      // add hover / mouseover to sector names
      //
      let adddiv = ".sector_name";
      $(adddiv).on('mouseenter', function() { let s = $(this).attr("id"); imperium_self.addSectorHighlight(s); });
      $(adddiv).on('mouseleave', function() { let s = $(this).attr("id"); imperium_self.removeSectorHighlight(s); });



      $('.option').off();
      $('.option').on('click', function() {
  
        let id = $(this).attr("id");
  
        //
        // submit when done
        //
        if (id == "confirm") {
  
          imperium_self.addMove("resolve\tplay");
          imperium_self.addMove("space_invasion\t"+imperium_self.game.player+"\t"+destination);
          for (let y = 0; y < obj.stuff_to_move.length; y++) { 
            imperium_self.addMove("move\t"+imperium_self.game.player+"\t"+1+"\t"+obj.ships_and_sectors[obj.stuff_to_move[y].i].sector+"\t"+destination+"\t"+JSON.stringify(obj.ships_and_sectors[obj.stuff_to_move[y].i].ships[obj.stuff_to_move[y].ii])); 
          }
          for (let y = obj.stuff_to_load.length-1; y >= 0; y--) {
            imperium_self.addMove("load\t"+imperium_self.game.player+"\t"+0+"\t"+obj.stuff_to_load[y].sector+"\t"+obj.stuff_to_load[y].source+"\t"+obj.stuff_to_load[y].source_idx+"\t"+obj.stuff_to_load[y].unitjson+"\t"+obj.stuff_to_load[y].shipjson); 
          }
          imperium_self.endTurn();
          return;
        };
 

        //
        // highlight ship on menu
        //
        $(this).css("font-weight", "bold");
  
        //
        //  figure out if we need to load infantry / fighters
        //
        let tmpx = id.split("_");
        let i  = tmpx[1]; 
        let ii = tmpx[2];
        let calcdist = obj.ships_and_sectors[i].distance;
        let sector = obj.ships_and_sectors[i].sector;
        let sys = imperium_self.returnSectorAndPlanets(sector);
        let ship = obj.ships_and_sectors[i].ships[ii];
        let total_ship_capacity = imperium_self.returnRemainingCapacity(ship);
        let x = { i : i , ii : ii , sector : sector };


        //
        // calculate actual distance
        //
        let real_distance = calcdist + obj.distance_adjustment;
        let free_distance = ship.move + obj.fleet_move_bonus;
  
        if (real_distance > free_distance) {
  	  //
  	  // 
  	  //
  	  obj.ship_move_bonus--;
        }
 

        //
        // if this is a fighter, remove it from the underlying
        // list of units we can move, so that it is not double-added
	//
	if (ship.type == "fighter") {
	  obj.ships_and_sectors[i].ships[ii].already_moved = 1;
	}



  
        obj.stuff_to_move.push(x);
        updateInterface(imperium_self, obj, updateInterface);
 

        //
        // is there stuff left to move?
        //
	let stuff_available_to_move = 0;
        for (let i = 0; i < sys.p.length; i++) {
          let planetary_units = sys.p[i].units[imperium_self.game.player-1];
          for (let k = 0; k < planetary_units.length; k++) {
            if (planetary_units[k].type == "infantry") {
              stuff_available_to_move++;
            }
          }
        }
        for (let i = 0; i < sys.s.units[imperium_self.game.player-1].length; i++) {
          if (sys.s.units[imperium_self.game.player-1][i].type == "fighter") {
    	    stuff_available_to_move++;
          }
        }


	//
	// remove already-moved fighters from stuff-available-to-move
	// 
        let fighters_available_to_move = 0;
        for (let iii = 0; iii < sys.s.units[imperium_self.game.player-1].length; iii++) {
          if (sys.s.units[imperium_self.game.player-1][iii].type == "fighter") {
            let fighter_already_moved = 0;
            for (let z = 0; z < obj.stuff_to_move.length; z++) {
              if (obj.stuff_to_move[z].sector == sector) {
                if (obj.stuff_to_move[z].ii == iii) {
                  fighter_already_moved = 1;
                }
              }
            }  
            if (fighter_already_moved == 1) {
              stuff_available_to_move--;
            }
          }
        }


        if (total_ship_capacity > 0 && stuff_available_to_move > 0) {
          let remove_what_capacity = 0;
          for (let z = 0; z < obj.stuff_to_load.length; z++) {
    	    let x = obj.stuff_to_load[z];
  	    if (x.i == i && x.ii == ii) {
  	      let thisunit = JSON.parse(obj.stuff_to_load[z].unitjson);
  	      remove_what_capacity += thisunit.capacity_required;
  	    }
          }


          let user_message = `<div class="sf-readable">This ship has <span class="capacity_remaining">${total_ship_capacity}</span> capacity to carry fighters / infantry. Do you wish to add them? </div><ul>`;
  
          for (let i = 0; i < sys.p.length; i++) {
            let planetary_units = sys.p[i].units[imperium_self.game.player-1];
            let infantry_available_to_move = 0;
            for (let k = 0; k < planetary_units.length; k++) {
              if (planetary_units[k].type == "infantry") {
                infantry_available_to_move++;
              }
            }
            if (infantry_available_to_move > 0) {
              user_message += '<li class="option textchoice" id="addinfantry_p_'+i+'">add infantry from '+sys.p[i].name+' - <span class="add_infantry_remaining_'+i+'">'+infantry_available_to_move+'</span></li>';
            }
          }
  
          let fighters_available_to_move = 0;
          for (let iii = 0; iii < sys.s.units[imperium_self.game.player-1].length; iii++) {
            if (sys.s.units[imperium_self.game.player-1][iii].type == "fighter") {
	      let fighter_already_moved = 0;
  	      for (let z = 0; z < obj.stuff_to_move.length; z++) {
 	        if (obj.stuff_to_move[z].sector == sector) {
  	          if (obj.stuff_to_move[z].ii == iii) {
  	            fighter_already_moved = 1;
  	          }
  	        }
  	      }	
	      if (fighter_already_moved == 0) {
    	        fighters_available_to_move++;
	      }
            }
          }
          user_message += '<li class="option textchoice" id="addfighter_s_s">add fighter - <span class="add_fighters_remaining">'+fighters_available_to_move+'</span></li>';
          user_message += '<li class="option textchoice" id="skip">finish</li>';
          user_message += '</ul></div>';
  

          //
          // choice
          //
          $('.hud-menu-overlay').html(user_message);
          $('.hud-menu-overlay').show();
          $('.status').hide();
          $('.textchoice').off();
  
	  //
	  // add hover / mouseover to message
	  //
          for (let i = 0; i < sys.p.length; i++) {
	    adddiv = "#addinfantry_p_"+i;
	    $(adddiv).on('mouseenter', function() { imperium_self.addPlanetHighlight(sector, i); });
	    $(adddiv).on('mouseleave', function() { imperium_self.removePlanetHighlight(sector, i); });
	  }
	  adddiv = "#addfighter_s_s";
	  $(adddiv).on('mouseenter', function() { imperium_self.addSectorHighlight(sector); });
	  $(adddiv).on('mouseleave', function() { imperium_self.removeSectorHighlight(sector); });

  
          // leave action enabled on other panels
          $('.textchoice').on('click', function() {
  
            let id = $(this).attr("id");
            let tmpx = id.split("_");
            let action2 = tmpx[0];
 
    	  if (total_ship_capacity > 0) {

            if (action2 === "addinfantry") {
  
              let planet_idx = tmpx[2];
    	      let irdiv = '.add_infantry_remaining_'+planet_idx;
              let ir = parseInt($(irdiv).html());
              let ic = parseInt($('.capacity_remaining').html());
  
  	      //
  	      // we have to load prematurely. so JSON will be accurate when we move the ship, so player_move is 0 for load
  	      //
  	      let unitjson = imperium_self.unloadUnitFromPlanet(imperium_self.game.player, sector, planet_idx, "infantry");
  	      let shipjson_preload = JSON.stringify(sys.s.units[imperium_self.game.player-1][obj.ships_and_sectors[i].ship_idxs[ii]]);  


              imperium_self.loadUnitByJSONOntoShip(imperium_self.game.player, sector, obj.ships_and_sectors[i].ship_idxs[ii], unitjson);
  	  
  	      $(irdiv).html((ir-1));
  	      $('.capacity_remaining').html((ic-1));
  
  	      let loading = {};
  	          loading.sector = sector;
  	          loading.source = "planet";
  	          loading.source_idx = planet_idx;
  	          loading.unitjson = unitjson;
  	          loading.ship_idx = obj.ships_and_sectors[i].ship_idxs[ii];
  	          loading.shipjson = shipjson_preload;
  	          loading.i = i;
  	          loading.ii = ii;
  
  	      total_ship_capacity--;
  
  	      obj.stuff_to_load.push(loading);
  
  	      if (ic === 1 && total_ship_capacity == 0) {
                  $('.status').show();
                  $('.hud-menu-overlay').hide();
  	      }
  
            }
  
  
            if (action2 === "addfighter") {

		if (fighters_available_to_move <= 0) { return; }  

                let ir = parseInt($('.add_fighters_remaining').html());
                let ic = parseInt($('.capacity_remaining').html());
    	        $('.add_fighters_remaining').html((ir-1));
		fighters_available_to_move--;
  	        $('.capacity_remaining').html((ic-1));

		//
		// remove this fighter ...
		//
		let secs_to_check = obj.ships_and_sectors.length;
		for (let sec = 0; sec < obj.ships_and_sectors.length; sec++) {
		  if (obj.ships_and_sectors[sec].sector === sector) {
		    let ships_to_check = obj.ships_and_sectors[sec].ships.length;
		    for (let f = 0; f < ships_to_check; f++) {
		      if (obj.ships_and_sectors[sec].ships[f].already_moved == 1) {} else {
		        if (obj.ships_and_sectors[sec].ships[f].type == "fighter") {

			  // remove fighter from status menu
			  let status_div = '#sector_'+sec+'_'+f;
			  $(status_div).remove();

			  // remove from arrays (as loaded)
			  // removed fri june 12
		          //obj.ships_and_sectors[sec].ships.splice(f, 1);
		          //obj.ships_and_sectors[sec].adjusted_distance.splice(f, 1);
		          obj.ships_and_sectors[sec].ships[f] = {};
		          obj.ships_and_sectors[sec].adjusted_distance[f] = 0;
			  f = ships_to_check+2;
			  sec = secs_to_check+2;

		        }
		      }
		    }
		  }
	        }

  	        let unitjson = imperium_self.removeSpaceUnit(imperium_self.game.player, sector, "fighter");
  	        let shipjson_preload = JSON.stringify(sys.s.units[imperium_self.game.player-1][obj.ships_and_sectors[i].ship_idxs[ii]]);  

                imperium_self.loadUnitByJSONOntoShip(imperium_self.game.player, sector, obj.ships_and_sectors[i].ship_idxs[ii], unitjson);
  
  	        let loading = {};
    	        obj.stuff_to_load.push(loading);
  
  	        loading.sector = sector;
  	        loading.source = "ship";
  	        loading.source_idx = "";
  	        loading.unitjson = unitjson;
  	        loading.ship_idx = obj.ships_and_sectors[i].ship_idxs[ii];
  	        loading.shipjson = shipjson_preload;
  	        loading.i = i;
  	        loading.ii = ii;
  
  	        total_ship_capacity--;
  
  	        if (ic == 1 && total_ship_capacity == 0) {
                  $('.status').show();
                  $('.hud-menu-overlay').hide();
                }
              }
   	    } // total ship capacity
  
            if (action2 === "skip") {
              $('.hud-menu-overlay').hide();
              $('.status').show();
            }
  
          });
        }
      });
    };
  
    updateInterface(imperium_self, obj, updateInterface);
  
    return;
  
  }
  
  
  
  playerInvadePlanet(player, sector) {
  
    let imperium_self = this;
    let sys = this.returnSectorAndPlanets(sector);
  
    let total_available_infantry = 0;
    let space_transport_available = 0;
    let space_transport_used = 0;
  
    let landing_forces = [];
    let planets_invaded = [];
  
    html = '<div class="sf-readable">Which planet(s) do you invade: </div><ul>';
    for (let i = 0; i < sys.p.length; i++) {
      if (sys.p[i].owner != player) {
        html += '<li class="option sector_name" id="' + i + '">' + sys.p[i].name + ' - <span class="invadeplanet_'+i+'">0</span></li>'; 
      }
    }
    html += '<li class="option" id="confirm">launch invasion(s)</li>'; 
    html += '</ul>';
    this.updateStatus(html);
  
    let populated_planet_forces = 0;
    let populated_ship_forces = 0;
    let forces_on_planets = [];
    let forces_on_ships = [];
  
    $('.option').off();
    let adiv = ".sector_name";
    $(adiv).on('mouseenter', function() { let s = $(this).attr("id"); imperium_self.addPlanetHighlight(sector, s); });
    $(adiv).on('mouseleave', function() { let s = $(this).attr("id"); imperium_self.removePlanetHighlight(sector, s); });
    $('.option').on('click', function () {
  
      let planet_idx = $(this).attr('id');
  
      if (planet_idx == "confirm") {

	for (let i = 0; i < planets_invaded.length; i++) {

	  let owner = sys.p[planets_invaded[i]].owner;

          imperium_self.prependMove("bombardment\t"+imperium_self.game.player+"\t"+sector+"\t"+planets_invaded[i]);
          imperium_self.prependMove("bombardment_post\t"+imperium_self.game.player+"\t"+sector+"\t"+planets_invaded[i]);
          imperium_self.prependMove("bombardment_post\t"+owner+"\t"+sector+"\t"+planets_invaded[i]);
    	  imperium_self.prependMove("planetary_defense\t"+imperium_self.game.player+"\t"+sector+"\t"+planets_invaded[i]);
    	  imperium_self.prependMove("planetary_defense_post\t"+imperium_self.game.player+"\t"+sector+"\t"+planets_invaded[i]);
    	  imperium_self.prependMove("ground_combat_start\t"+imperium_self.game.player+"\t"+sector+"\t"+planets_invaded[i]);
    	  imperium_self.prependMove("ground_combat\t"+imperium_self.game.player+"\t"+sector+"\t"+planets_invaded[i]);
    	  imperium_self.prependMove("ground_combat_post\t"+imperium_self.game.player+"\t"+sector+"\t"+planets_invaded[i]);
    	  imperium_self.prependMove("ground_combat_end\t"+imperium_self.game.player+"\t"+sector+"\t"+planets_invaded[i]);
	}

    	imperium_self.prependMove("continue\t" + imperium_self.game.player + "\t" + sector);
        imperium_self.endTurn();
        return;
      }

      //
      // looks like we have selected a planet for invasion
      //
      if (!planets_invaded.includes(planet_idx)) {
        planets_invaded.push(planet_idx);
      }

      //
      // figure out available infantry and ships capacity
      //
      for (let i = 0; i < sys.s.units[player - 1].length; i++) {
        let unit = sys.s.units[player-1][i];
        for (let k = 0; k < unit.storage.length; k++) {
  	if (unit.storage[k].type == "infantry") {
            if (populated_ship_forces == 0) {
              total_available_infantry += 1;
  	  }
  	}
        }
        if (sys.s.units[player - 1][i].capacity > 0) {
          if (populated_ship_forces == 0) {
            space_transport_available += sys.s.units[player - 1][i].capacity;
          }
        }
      }
  
      html = '<div class="sf-readable">Select Ground Forces for Invasion of '+sys.p[planet_idx].name+': </div><ul>';
  
      //
      // other planets in system
      //
      for (let i = 0; i < sys.p.length; i++) {
        forces_on_planets.push(0);
        if (space_transport_available > 0 && sys.p[i].units[player - 1].length > 0) {
          for (let j = 0; j < sys.p[i].units[player - 1].length; j++) {
            if (sys.p[i].units[player - 1][j].type == "infantry") {
              if (populated_planet_forces == 0) {
                forces_on_planets[i]++;;
  	      }
            }
          }
          html += '<li class="invadechoice textchoice option" id="invasion_planet_'+i+'">'+sys.p[i].name+' - <span class="planet_'+i+'_infantry">'+forces_on_planets[i]+'</span></li>';
        }
      }
      populated_planet_forces = 1;
  
  
  
      //
      // ships in system
      //
      for (let i = 0; i < sys.s.units[player-1].length; i++) {
        let ship = sys.s.units[player-1][i];
        forces_on_ships.push(0);
        for (let j = 0; j < ship.storage.length; j++) {
  	  if (ship.storage[j].type === "infantry") {
            if (populated_ship_forces == 0) {
              forces_on_ships[i]++;
  	    }
  	  }
        }
        if (forces_on_ships[i] > 0) {
          html += '<li class="invadechoice textchoice" id="invasion_ship_'+i+'">'+ship.name+' - <span class="ship_'+i+'_infantry">'+forces_on_ships[i]+'</span></li>';
        }
      }
      populated_ship_forces = 1;
      html += '<li class="invadechoice textchoice" id="finished_0_0">finish selecting</li>';
      html += '</ul></p>';
  
  
      //
      // choice
      //
      $('.hud-menu-overlay').html(html);
      $('.status').hide();
      $('.hud-menu-overlay').show();
  
  
      $('.invadechoice').off();
      $('.invadechoice').on('click', function() {

        let id = $(this).attr("id");
        let tmpx = id.split("_");
  
        let action2 = tmpx[0];
        let source = tmpx[1];
        let source_idx = tmpx[2];
        let counter_div = "." + source + "_"+source_idx+"_infantry";
        let counter = parseInt($(counter_div).html());
  
        if (action2 == "invasion") {
  
          if (source == "planet") {
     	    if (space_transport_available <= 0) { alert("Invalid Choice! No space transport available!"); return; }
  	    forces_on_planets[source_idx]--;
          } else {
  	    forces_on_ships[source_idx]--;
          }
          if (counter == 0) { 
   	    alert("You cannot attack with forces you do not have available."); return;
          }
 
    	  let unitjson = JSON.stringify(imperium_self.returnUnit("infantry", imperium_self.game.player));
  
          let landing = {};
              landing.sector = sector;
              landing.source = source;
              landing.source_idx = source_idx;
              landing.planet_idx = planet_idx;
              landing.unitjson = unitjson;
 
          landing_forces.push(landing);
  
          let planet_counter = ".invadeplanet_"+planet_idx;
          let planet_forces = parseInt($(planet_counter).html());
  
          planet_forces++;
          $(planet_counter).html(planet_forces);
  
          counter--;
          $(counter_div).html(counter);
  
        }
  
        if (action2 === "finished") {
  
          for (let y = 0; y < landing_forces.length; y++) {
    	    imperium_self.addMove("land\t"+imperium_self.game.player+"\t"+1+"\t"+landing_forces[y].sector+"\t"+landing_forces[y].source+"\t"+landing_forces[y].source_idx+"\t"+landing_forces[y].planet_idx+"\t"+landing_forces[y].unitjson);
          };
	  landing_forces = [];  

          $('.status').show();
          $('.hud-menu-overlay').hide();
  
          return;
        }
      });
    });
  }
  
  

  playerActivateSystem() {
  
    let imperium_self = this;
    let html  = "Select a sector to activate: ";
    let activated_once = 0;
  
    imperium_self.updateStatus(html);
  
    $('.sector').off();
    $('.sector').on('click', function() {

      //
      // only allowed 1 at a time
      //
      if (activated_once == 1) { return; }

      let pid = $(this).attr("id");
  
      if (imperium_self.canPlayerActivateSystem(pid) == 0) {
  
        alert("You cannot activate that system: " + pid);
  
      } else {
  
        activated_once = 1;
        let sys = imperium_self.returnSectorAndPlanets(pid);
        let divpid = '#'+pid;
  
        $(divpid).find('.hex_activated').css('background-color', 'yellow');
        $(divpid).find('.hex_activated').css('opacity', '0.3');
  
        let c = confirm("Activate this system?");
        if (c) {
          sys.s.activated[imperium_self.game.player-1] = 1;
          imperium_self.addMove("activate_system_post\t"+imperium_self.game.player+"\t"+pid);
          imperium_self.addMove("activate_system\t"+imperium_self.game.player+"\t"+pid);
          imperium_self.addMove("expend\t"+imperium_self.game.player+"\t"+"command"+"\t"+1);
          imperium_self.addMove("setvar\tstate\t0\tactive_player_moved\t"+"int"+"\t"+"1");
	  imperium_self.endTurn();

        } else {

          activated_once = 0;
          $(divpid).find('.hex_activated').css('background-color', 'transparent');
          $(divpid).find('.hex_activated').css('opacity', '1');

	}
      }
  
    });
  }
  
  
  //
  // if we have arrived here, we are ready to continue with our options post
  // systems activation, which are move / pds combat / space combat / bombardment
  // planetary invasion / ground combat
  //
  playerPostActivateSystem(sector) {
  
    let imperium_self = this;

    let html  = "<div class='sf-readable'>" + this.returnFaction(this.game.player) + ": </div><ul>";
        html += '<li class="option" id="move">move into sector</li>';
    if (this.canPlayerProduceInSector(this.game.player, sector)) {
        html += '<li class="option" id="produce">produce units</li>';
    }
        html += '<li class="option" id="finish">finish turn</li>';
        html += '</ul>';
  
    imperium_self.updateStatus(html);
  
    $('.option').on('click', function() {
  
      let action2 = $(this).attr("id");
  
      if (action2 == "move") {
        imperium_self.playerSelectUnitsToMove(sector);
      }
      if (action2 == "produce") {
        imperium_self.playerProduceUnits(sector);
      }
      if (action2 == "finish") {
        imperium_self.addMove("resolve\tplay");
        imperium_self.endTurn();
      }
    });
  }
  
  
  
  
  
  
  playerAllocateNewTokens(player, tokens, resolve_needed=1, stage=0) {  

    let imperium_self = this;
  
    if (this.game.player == player) {
  
      let obj = {};
          obj.current_command = this.game.players_info[player-1].command_tokens;
          obj.current_strategy = this.game.players_info[player-1].strategy_tokens;
          obj.current_fleet = this.game.players_info[player-1].fleet_supply;
          obj.new_command = 0;
          obj.new_strategy = 0;
          obj.new_fleet = 0;
          obj.new_tokens = tokens;
  
      let updateInterface = function(imperium_self, obj, updateInterface) {
  
        let html = '<div class="sf-readable">You have '+obj.new_tokens+' tokens to allocate. How do you want to allocate them? </div><ul>';

	if (stage == 1) {
          html = '<div class="sf-readable">The Leadership card gives you '+obj.new_tokens+' tokens to allocate. How do you wish to allocate them? </div><ul>';
	}
	if (stage == 2) {
          html = '<div class="sf-readable">Leadership has been played and you have purchased '+obj.new_tokens+' additional tokens. How do you wish to allocate them? </div><ul>';
	}
	if (stage == 3) {
          html = '<div class="sf-readable">It is the start of a new round. You have '+obj.new_tokens+' new tokens to allocate. But how?</div><ul>';
	}

            html += '<li class="option" id="command">Command Token - '+ (parseInt(obj.current_command)+parseInt(obj.new_command)) + '</li>';
            html += '<li class="option" id="strategy">Strategy Token - '+ (parseInt(obj.current_strategy)+parseInt(obj.new_strategy)) + '</li>';
            html += '<li class="option" id="fleet">Fleet Supply - '+ (parseInt(obj.current_fleet)+parseInt(obj.new_fleet)) + '</li>';
            html += '</ul>';
  
        imperium_self.updateStatus(html);
  
        $('.option').off();
        $('.option').on('click', function() {
  
  	let id = $(this).attr("id");

 
        if (id == "strategy") {
          obj.new_strategy++;
          obj.new_tokens--;
        }

        if (id == "command") {
          obj.new_command++;
          obj.new_tokens--;
        }

        if (id == "fleet") {
          obj.new_fleet++;
          obj.new_tokens--;
        }

        if (obj.new_tokens == 0) {
	    if (resolve_needed == 1) {
              if (imperium_self.game.confirms_needed > 0) {
                imperium_self.addMove("resolve\ttokenallocation\t1\t"+imperium_self.app.wallet.returnPublicKey());
	      } else {
                imperium_self.addMove("resolve\ttokenallocation");
	      }
	    }
            imperium_self.addMove("purchase\t"+player+"\tstrategy\t"+obj.new_strategy);
            imperium_self.addMove("purchase\t"+player+"\tcommand\t"+obj.new_command);
            imperium_self.addMove("purchase\t"+player+"\tfleetsupply\t"+obj.new_fleet);
            imperium_self.endTurn();
          } else {
          updateInterface(imperium_self, obj, updateInterface);
        }

        });

      };

      updateInterface(imperium_self, obj, updateInterface);

    }

    return 0;
  }





  playerSelectPlayerWithFilter(msg, filter_func, mycallback=null, cancel_func=null) {

    let imperium_self = this;

    let html  = '<div class="sf-readable">' + msg + '</div>';
        html += '<ul>';

    for (let i = 0; i < this.game.players_info.length; i++) {
      if (filter_func(this.game.players_info[i]) == 1) {
        html += '<li class="textchoice" id="'+(i+1)+'">'+this.returnFaction((i+1))+'</li>';
      }
    }
    if (cancel_func != null) {
      html += '<li class="textchoice" id="cancel">cancel</li>';
    }
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('click', function() {
       
      let action = $(this).attr("id");
                
      if (action == "cancel") {
        cancel_func();
        return 0;
      }

      mycallback(action);

    });
  }



  playerSelectSectorWithFilter(msg, filter_func, mycallback=null, cancel_func=null) {

    let imperium_self = this;

    let html  = '<div class="sf-readable">' + msg + '</div>';
        html += '<ul>';

    for (let i in this.game.board) {
      if (filter_func(this.game.board[i].tile) == 1) {
        html += '<li class="textchoice" id="'+i+'">'+this.game.sectors[this.game.board[i].tile].name+'</li>';
      }
    }
    if (cancel_func != null) {
      html += '<li class="textchoice" id="cancel">cancel</li>';
    }
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('mouseenter', function() { 
      let s = $(this).attr("id"); 
      if (s != "cancel") {
        imperium_self.showSectorHighlight(s);
      }
    });
    $('.textchoice').on('mouseleave', function() { 
      let s = $(this).attr("id");
      if (s != "cancel") {
        imperium_self.hideSectorHighlight(s);
      }
    });
    $('.textchoice').on('click', function() {
       
      let action = $(this).attr("id");
                
      if (action != "cancel") {
        imperium_self.hideSectorHighlight(action);
      }

      if (action == "cancel") {
        cancel_func();
        return 0;
      }

      imperium_self.updateStatus("");
      mycallback(imperium_self.game.board[action].tile);

    });
  }





  playerSelectChoice(msg, choices, elect="other", mycallback=null) {

    let imperium_self = this;

    let html  = '<div class="sf-readable">' + msg + '</div>';
        html += '<ul>';

    for (let i = 0; i < choices.length; i++) {
      if (elect == "player") {
        html += '<li class="textchoice" id="'+choices[i]+'">'+this.returnFaction(choices[i])+'</li>';
      }
      if (elect == "planet") {
        html += '<li class="textchoice" id="'+choices[i]+'">'+this.game.planets[choices[i]].name+'</li>';
      }
      if (elect == "sector") {
        html += '<li class="textchoice" id="'+choices[i]+'">'+this.game.sectors[this.game.board[choices[i]].tile].name+'</li>';
      }
      if (elect == "other") {
        html += '<li class="textchoice" id="'+i+'">' + choices[i] + '</li>';
      }
    }
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('click', function() {

      let action = $(this).attr("id");
      mycallback(action);

    });

  }










  playerSelectPlanetWithFilter(msg, filter_func, mycallback=null, cancel_func=null) {

    let imperium_self = this;

    let html  = '<div class="sf-readable">' + msg + '</div>';
        html += '<ul>';

    for (let i in this.game.planets) {
      if (this.game.planets[i].tile != "") {
        if (filter_func(i) == 1) {
          html += '<li class="textchoice" id="'+i+'">'+this.game.planets[i].name+'</li>';
        }
      }
    }
    if (cancel_func != null) {
      html += '<li class="textchoice" id="cancel">cancel</li>';
    }
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('mouseenter', function() { 
      let s = $(this).attr("id"); 
      if (s != "cancel") {
        imperium_self.showPlanetCard(imperium_self.game.planets[s].tile, imperium_self.game.planets[s].idx); 
        imperium_self.showSectorHighlight(imperium_self.game.planets[s].tile);
      }
    });
    $('.textchoice').on('mouseleave', function() { 
      let s = $(this).attr("id");
      if (s != "cancel") {
        imperium_self.hidePlanetCard(imperium_self.game.planets[s].tile, imperium_self.game.planets[s].idx); 
        imperium_self.hideSectorHighlight(imperium_self.game.planets[s].tile);
      }
    });
    $('.textchoice').on('click', function() {

      let action = $(this).attr("id");
      if (action != "cancel") {
        imperium_self.hidePlanetCard(imperium_self.game.planets[action].tile, imperium_self.game.planets[action].idx); 
        imperium_self.hideSectorHighlight(imperium_self.game.planets[action].tile);
      }

      if (action == "cancel") {
        cancel_func();
        imperium_self.hideSectorHighlight(action);
        return 0;
      }

      imperium_self.updateStatus("");
      imperium_self.hideSectorHighlight(action);
      mycallback(action);

    });
  }




  playerSelectUnitInSectorWithFilter(msg, sector, filter_func, mycallback=null, cancel_func=null) {

    let imperium_self = this;
    let unit_array = [];
    let sector_array = [];
    let planet_array = [];
    let unit_idx = [];
    let exists_unit = 0;

    let html  = '<div class="sf-readable">' + msg + '</div>';
        html += '<ul>';

    let sys = this.returnSectorAndPlanets(sector);

    for (let k = 0; k < sys.s.units[imperium_self.game.player-1].length; k++) {
      if (filter_func(sys.s.units[imperium_self.game.player-1][k])) {
	unit_array.push(sys.s.units[imperium_self.game.player-1][k]);
	sector_array.push(sector);
	planet_array.push(-1);
	unit_idx.push(k);
        exists_unit = 1;
        html += '<li class="textchoice" id="'+(unit_array.length-1)+'">'+sys.s.name+' - ' + unit_array[unit_array.length-1].name + '</li>';
      }
    }

    for (let p = 0; p < sys.p.length; p++) {
      for (let k = 0; k < sys.p[p].units[imperium_self.game.player-1].length; k++) {
	if (filter_func(sys.p[p].units[imperium_self.game.player-1][k])) {
	  unit_array.push(sys.p[p].units[imperium_self.game.player-1][k]);
	  sector_array.push(sector);
	  planet_array.push(p);
	  unit_idx.push(k);
          exists_unit = 1;
          html += '<li class="textchoice" id="'+(unit_array.length-1)+'">' + sys.s.sector + ' / ' + sys.p[p].name + " - " + unit_array[unit_array.length-1].name + '</li>';
	}
      }
    }

    if (exists_unit == 0) {
      html += '<li class="textchoice" id="none">no unit available</li>';
    }
    if (cancel_func != null) {
      html += '<li class="textchoice" id="cancel">cancel</li>';
    }
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
//    $('.textchoice').on('mouseenter', function() { 
//      let s = $(this).attr("id"); 
//      imperium_self.showPlanetCard(imperium_self.game.planets[s].tile, imperium_self.game.planets[s].idx); 
//      imperium_self.showSectorHighlight(imperium_self.game.planets[s].tile);
//    });
//    $('.textchoice').on('mouseleave', function() { 
//      let s = $(this).attr("id");
//      imperium_self.hidePlanetCard(imperium_self.game.planets[s].tile, imperium_self.game.planets[s].idx); 
//      imperium_self.hideSectorHighlight(imperium_self.game.planets[s].tile);
//    });
    $('.textchoice').on('click', function() {

      let action = $(this).attr("id");
//      imperium_self.hidePlanetCard(imperium_self.game.planets[action].tile, imperium_self.game.planets[action].idx); 
//      imperium_self.hideSectorHighlight(imperium_self.game.planets[action].tile);

      if (action === "cancel") {
        cancel_func();
        imperium_self.hideSectorHighlight(action);
        return 0;
      }
      if (action === "none") {
        let unit_to_return = { sector : "" , planet_idx : "" , unit_idx : -1 , unit : null }
        mycallback(unit_to_return);
	return;
      }

      let unit_to_return = { sector : sector_array[action] , planet_idx : planet_array[action] , unit_idx : unit_idx[action] , unit : unit_array[action] }
//      imperium_self.hideSectorHighlight(action);

      imperium_self.updateStatus("");
      mycallback(unit_to_return);

    });
  }






  playerSelectUnitWithFilter(msg, filter_func, mycallback=null, cancel_func=null) {

    let imperium_self = this;
    let unit_array = [];
    let sector_array = [];
    let planet_array = [];
    let unit_idx = [];
    let exists_unit = 0;

    let html  = '<div class="sf-readable">' + msg + '</div>';
        html += '<ul>';

    for (let i in this.game.sectors) {

      let sys = this.returnSectorAndPlanets(i);
      let sector = i;

      for (let k = 0; k < sys.s.units[imperium_self.game.player-1].length; k++) {
	if (filter_func(sys.s.units[imperium_self.game.player-1][k])) {
	  unit_array.push(sys.s.units[imperium_self.game.player-1][k]);
	  sector_array.push(sector);
	  planet_array.push(-1);
	  unit_idx.push(k);
          exists_unit = 1;
          html += '<li class="textchoice" id="'+(unit_array.length-1)+'">'+sys.s.name+' - ' + unit_array[unit_array.length-1].name + '</li>';
	}
      }

      for (let p = 0; p < sys.p.length; p++) {
        for (let k = 0; k < sys.p[p].units[imperium_self.game.player-1].length; k++) {
	  if (filter_func(sys.p[p].units[imperium_self.game.player-1][k])) {
	    unit_array.push(sys.p[p].units[imperium_self.game.player-1][k]);
	    sector_array.push(sector);
	    planet_array.push(p);
	    unit_idx.push(k);
            exists_unit = 1;
            html += '<li class="textchoice" id="'+(unit_array.length-1)+'">' + sys.s.sector + ' / ' + sys.p[p].name + " - " + unit_array[unit_array.length-1].name + '</li>';
	  }
	}
      }

    }
    if (exists_unit == 0) {
      html += '<li class="textchoice" id="none">no unit available</li>';
    }
    if (cancel_func != null) {
      html += '<li class="textchoice" id="cancel">cancel</li>';
    }
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
//    $('.textchoice').on('mouseenter', function() { 
//      let s = $(this).attr("id"); 
//      imperium_self.showPlanetCard(imperium_self.game.planets[s].tile, imperium_self.game.planets[s].idx); 
//      imperium_self.showSectorHighlight(imperium_self.game.planets[s].tile);
//    });
//    $('.textchoice').on('mouseleave', function() { 
//      let s = $(this).attr("id");
//      imperium_self.hidePlanetCard(imperium_self.game.planets[s].tile, imperium_self.game.planets[s].idx); 
//      imperium_self.hideSectorHighlight(imperium_self.game.planets[s].tile);
//    });
    $('.textchoice').on('click', function() {

      let action = $(this).attr("id");
//      imperium_self.hidePlanetCard(imperium_self.game.planets[action].tile, imperium_self.game.planets[action].idx); 
//      imperium_self.hideSectorHighlight(imperium_self.game.planets[action].tile);

      if (action === "cancel") {
        cancel_func();
        imperium_self.hideSectorHighlight(action);
        return 0;
      }
      if (action === "none") {
console.log("NONE!");
        let unit_to_return = { sector : "" , planet_idx : "" , unit_idx : -1 , unit : null }
        mycallback(unit_to_return);
	return;
      }

      let unit_to_return = { sector : sector_array[action] , planet_idx : planet_array[action] , unit_idx : unit_idx[action] , unit : unit_array[action] }
//      imperium_self.hideSectorHighlight(action);

      imperium_self.updateStatus("");
      mycallback(unit_to_return);

    });
  }





  playerSelectUnitInSectorFilter(msg, sector, filter_func, mycallback=null, cancel_func=null) {

    let imperium_self = this;
    let sys = this.returnSectorAndPlanets(sector);

    let html  = '<div class="sf-readable">'+msg+'</div>';
        html += '<ul>';

    for (let i = 0; i < this.game.players_info.length; i++) {
      for (let ii = 0; ii < sys.s.units[i].length; ii++) {
        if (filter_func(sys.s.units[i][ii]) == 1) {
          html += '<li class="textchoice" id="'+sector+'_'+i+'_'+i+'">' + this.returnFaction((i+1)) + " - " + sys.s.units[i][ii].name + '</li>';
        }
      }
    }
    if (cancel_func != null) {
      html += '<li class="textchoice" id="cancel">cancel</li>';
    }
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('click', function() {

      let action = $(this).attr("id");

      if (action == "cancel") {
        cancel_func();
        return 0;
      }

      let tmpar = action.split("_");

      let s       = tmpar[0];
      let p       = tmpar[1];
      let unitidx = tmpar[2];

      mycallback({ sector : s , player : p , unitidx : unitidx });

    });
  }



  playerDiscardActionCards(num) {

    let imperium_self = this;

    let html  = "<div class='sf-readable'>You must discard <div style='display:inline' class='totalnum' id='totalnum'>"+num+"</div> action card"; if (num > 1) { html += 's'; }; html += ':</div>';
        html += '<ul>';
    for (let i = 0; i < this.game.geck[1].hand.length; i++) {
      html += '<li class="textchoice" id="'+i+'">' + this.action_cards[this.game.deck[1].hand[i]].name+'</li>';
    }
    html += '</ul>';

    this.updateStatus(html);

    $('.textchoice').off();
    $('.textchoice').on('click', function() {

      let action2 = $(this).attr("id");

      num--; 

      $('.totalnum').html(num);
      $(this).remove();
      imperium_self.game.players_info[imperium_self.game.player-1].action_cards_played.push(action2);

      if (num == 0) {
	imperium_self.endTurn();
      }

    });

  }




 
  ////////////////////
  // Return Planets //
  ////////////////////
  returnPlanets() {
  
    var planets = {};
  
    // regular planets
    planets['planet1']  = { type : "hazardous" , img : "/imperium/img/planets/CRYSTALIS" , name : "Crystalis" , resources : 3 , influence : 0 , bonus : ""  }
    planets['planet2']  = { type : "hazardous" , img : "/imperium/img/planets/TROTH.png" , name : "Troth" , resources : 2 , influence : 0 , bonus : ""  }
    planets['planet3']  = { type : "industrial" , img : "/imperium/img/planets/LONDRAK.png" , name : "Londrak" , resources : 1 , influence : 2 , bonus : ""  }
    planets['planet4']  = { type : "hazardous" , img : "/imperium/img/planets/CITADEL.png" , name : "Citadel" , resources : 0 , influence : 4 , bonus : "red"  }
    planets['planet5']  = { type : "industrial" , img : "/imperium/img/planets/BELVEDYR.png" , name : "Belvedyr" , resources : 1 , influence : 2 , bonus : ""  }
    planets['planet6']  = { type : "industrial" , img : "/imperium/img/planets/SHRIVA.png" , name : "Shriva" , resources : 2 , influence : 1 , bonus : ""  }
    planets['planet7']  = { type : "hazardous" , img : "/imperium/img/planets/ZONDOR.png" , name : "Zondor" , resources : 3 , influence : 1 , bonus : ""  }
    planets['planet8']  = { type : "hazardous" , img : "/imperium/img/planets/CALTHREX.png" , name : "Calthrex" , resources : 2 , influence : 3 , bonus : ""  }
    planets['planet9']  = { type : "cultural" , img : "/imperium/img/planets/SOUNDRA-IV.png" , name : "Soundra IV" , resources : 1 , influence : 3 , bonus : ""  }
    planets['planet10'] = { type : "industrial" , img : "/imperium/img/planets/UDON-I.png" , name : "Udon I" , resources : 1 , influence : 1 , bonus : "blue"  }
    planets['planet11'] = { type : "cultural" , img : "/imperium/img/planets/UDON-II.png" , name : "Udon II" , resources : 1 , influence : 2 , bonus : ""  }
    planets['planet12'] = { type : "cultural" , img : "/imperium/img/planets/NEW-JYLANX.png" , name : "New Jylanx" , resources : 2 , influence : 0 , bonus : ""  }
    planets['planet13'] = { type : "cultural" , img : "/imperium/img/planets/TERRA-CORE.png" , name : "Terra Core" , resources : 0 , influence : 2 , bonus : ""  }
    planets['planet14'] = { type : "cultural" , img : "/imperium/img/planets/OLYMPIA.png" , name : "Olympia" , resources : 1 , influence : 2 , bonus : ""  }
    planets['planet15'] = { type : "industrial" , img : "/imperium/img/planets/GRANTON-MEX.png" , name : "Granton Mex" , resources : 1 , influence : 0 , bonus : "yellow"  }
    planets['planet16'] = { type : "hazardous" , img : "/imperium/img/planets/HARKON-CALEDONIA.png" , name : "Harkon Caledonia" , resources : 2 , influence : 1 , bonus : ""  }
    planets['planet17'] = { type : "cultural" , img : "/imperium/img/planets/NEW-ILLIA.png" , name : "New Illia" , resources : 3 , influence : 1 , bonus : ""  }
    planets['planet18'] = { type : "hazardous" , img : "/imperium/img/planets/LAZAKS-CURSE.png" , name : "Lazak's Curse" , resources : 1 , influence : 3 , bonus : "red"  }
    planets['planet19'] = { type : "cultural" , img : "/imperium/img/planets/VOLUNTRA.png" , name : "Voluntra" , resources : 0 , influence : 2 , bonus : ""  }
    planets['planet20'] = { type : "hazardous" , img : "/imperium/img/planets/XERXES-IV.png" , name : "Xerxes IV" , resources : 3 , influence : 1 , bonus : ""  }
    planets['planet21'] = { type : "industrial" , img : "/imperium/img/planets/SIRENS-END.png" , name : "Siren's End" , resources : 1 , influence : 1 , bonus : "green"  }
    planets['planet22'] = { type : "hazardous" , img : "/imperium/img/planets/RIFTVIEW.png" , name : "Riftview" , resources : 2 , influence : 1 , bonus : ""  }
    planets['planet23'] = { type : "cultural" , img : "/imperium/img/planets/BROUGHTON.png" , name : "Broughton" , resources : 1 , influence : 2 , bonus : ""  }
    planets['planet24'] = { type : "industrial" , img : "/imperium/img/planets/FJORDRA.png" , name : "Fjordra" , resources : 0 , influence : 3 , bonus : ""  }
    planets['planet25'] = { type : "cultural" , img : "/imperium/img/planets/SINGHARTA.png" , name : "Singharta" , resources : 1 , influence : 1 , bonus : ""  }
    planets['planet26'] = { type : "industrial" , img : "/imperium/img/planets/NOVA-KLONDIKE.png" , name : "Nova Klondike" , resources : 2 , influence : 2 , bonus : ""  }
    planets['planet27'] = { type : "industrial" , img : "/imperium/img/planets/CONTOURI-I.png" , name : "Contouri I" , resources : 1 , influence : 1 , bonus : "green"  }
    planets['planet28'] = { type : "hazardous" , img : "/imperium/img/planets/CONTOURI-II.png" , name : "Contouri II" , resources : 2 , influence : 0 , bonus : ""  }
    planets['planet29'] = { type : "cultural" , img : "/imperium/img/planets/HOTH.png" , name : "Hoth" , resources : 2 , influence : 2 , bonus : ""  }
    planets['planet30'] = { type : "industrial" , img : "/imperium/img/planets/UNSULLA.png" , name : "Unsulla" , resources : 1 , influence : 2 , bonus : ""  }
    planets['planet31'] = { type : "industrial" , img : "/imperium/img/planets/GROX-TOWERS.png" , name : "Grox Towers" , resources : 1 , influence : 1 , bonus : "blue"  }
    planets['planet32'] = { type : "hazardous" , img : "/imperium/img/planets/GRAVITYS-EDGE.png" , name : "Gravity's Edge" , resources : 2 , influence : 1 , bonus : ""  }
    planets['planet33'] = { type : "industrial" , img : "/imperium/img/planets/POPULAX.png" , name : "Populax" , resources : 3 , influence : 2 , bonus : "yellow"  }
    planets['planet34'] = { type : "cultural" , img : "/imperium/img/planets/OLD-MOLTOUR.png" , name : "Old Moltour" , resources : 2 , influence : 0 , bonus : ""  }
    planets['new-byzantium'] = { type : "diplomatic" , img : "/imperium/img/planets/NEW-BYZANTIUM.png" , name : "New Byzantium" , resources : 1 , influence : 6 , bonus : ""  }
    planets['planet36'] = { type : "cultural" , img : "/imperium/img/planets/OUTERANT.png" , name : "Outerant" , resources : 1 , influence : 3 , bonus : ""  }
    planets['planet37'] = { type : "industrial" , img : "/imperium/img/planets/VESPAR.png" , name : "Vespar" , resources : 2 , influence : 2 , bonus : ""  }
    planets['planet38'] = { type : "hazardous" , img : "/imperium/img/planets/CRAW-POPULI.png" , name : "Craw Populi" , resources : 1 , influence : 2 , bonus : ""  }
    planets['planet41'] = { type : "industrial" , img : "/imperium/img/planets/LORSTRUCK.png" , name : "Lorstruck" , resources : 1 , influence : 0 , bonus : ""  }
    planets['planet42'] = { type : "hazardous" , img : "/imperium/img/planets/INDUSTRYL.png" , name : "Industryl" , resources : 3 , influence : 1 , bonus : ""  }
    planets['planet43'] = { type : "cultural" , img : "/imperium/img/planets/MECHANEX.png" , name : "Mechanex" , resources : 1 , influence : 0 , bonus : ""  }
    planets['planet44'] = { type : "industrial" , img : "/imperium/img/planets/HEARTHSLOUGH.png" , name : "Hearthslough" , resources : 3 , influence : 0 , bonus : ""  }
    planets['planet45'] = { type : "hazardous" , img : "/imperium/img/planets/INCARTH.png" , name : "Incarth" , resources : 2 , influence : 0 , bonus : ""  }
    planets['planet46'] = { type : "cultural" , img : "/imperium/img/planets/AANDOR.png" , name : "Aandor" , resources : 2 , influence : 1 , bonus : ""  }
    planets['planet39'] = { type : "cultural" , img : "/imperium/img/planets/YSSARI-II.png" , name : "Yssari II" , resources : 0 , influence : 1 , bonus : ""  }
    planets['planet40'] = { type : "industrial" , img : "/imperium/img/planets/HOPES-LURE.png" , name : "Hope's Lure" , resources : 3 , influence : 2 , bonus : ""  }
    planets['planet47'] = { type : "hazardous" , img : "/imperium/img/planets/QUANDAM.png" , name : "Quandam" , resources : 1 , influence : 1 , bonus : ""  }
    planets['planet48'] = { type : "cultural" , img : "/imperium/img/planets/BREST.png" , name : "Brest" , resources : 3 , influence : 1 , bonus : ""  }
    planets['planet49'] = { type : "hazardous" , img : "/imperium/img/planets/HIRAETH.png" , name : "Hiraeth" , resources : 1 , influence : 1 , bonus : ""  }
    planets['planet50'] = { type : "cultural" , img : "/imperium/img/planets/FIREHOLE.png" , name : "Firehole" , resources : 3 , influence : 0 , bonus : ""  }
    planets['planet51'] = { type : "industrial" , img : "/imperium/img/planets/QUARTIL.png" , name : "Quartil" , resources : 3 , influence : 1 , bonus : ""  } // wormhole A system planet
    planets['planet52'] = { type : "hazardous" , img : "/imperium/img/planets/YODERUX.png" , name : "Yoderux" , resources : 3 , influence : 0 , bonus : ""  } // wormhole B system planet
    planets['planet53'] = { type : "homeworld" , img : "/imperium/img/planets/JOL.png" , name : "Jol" , resources : 1 , influence : 2 , bonus : ""  }
    planets['planet54'] = { type : "homeworld" , img : "/imperium/img/planets/NAR.png" , name : "Nar" , resources : 2 , influence : 3 , bonus : ""  }
    planets['planet55'] = { type : "homeworld" , img : "/imperium/img/planets/ARCHION-REX.png" , name : "Archion Rex" , resources : 2 , influence : 3 , bonus : ""  }
    planets['planet56'] = { type : "homeworld" , img : "/imperium/img/planets/ARCHION-TAO.png" , name : "Archion Tao" , resources : 1 , influence : 1 , bonus : ""  }
    planets['planet57'] = { type : "homeworld" , img : "/imperium/img/planets/EARTH.png" , name : "Earth" , resources : 4 , influence : 2 , bonus : ""  }
    planets['planet58'] = { type : "homeworld" , img : "/imperium/img/planets/ARTIZZ.png" , name : "Artizz" , resources : 4 , influence : 1 , bonus : ""  }
    planets['planet59'] = { type : "cultural" , img : "/imperium/img/planets/STARTIDE.png" , name : "Startide" , resources : 2 , influence : 0 , bonus : ""  }   	// sector 58
    planets['planet60'] = { type : "industrial" , img : "/imperium/img/planets/GIANTS-DRINK.png" , name : "Giant's Drink" , resources : 1 , influence : 1 , bonus : ""  }	// sector 59
    planets['planet61'] = { type : "hazardous" , img : "/imperium/img/planets/MIRANDA.png" , name : "Miranda" , resources : 0 , influence : 2 , bonus : ""  }		// sector 60
    planets['planet62'] = { type : "industrial" , img : "/imperium/img/planets/EBERBACH.png" , name : "Eberbach" , resources : 2 , influence : 1 , bonus : ""  }		// sector 61
    planets['planet63'] = { type : "hazardous" , img : "/imperium/img/planets/OTHO.png" , name : "Otho" , resources : 1 , influence : 2 , bonus : ""  }			// sector 62
    planets['planet64'] = { type : "hazardous" , img : "/imperium/img/planets/PERTINAX.png" , name : "Pertinax" , resources : 2 , influence : 2 , bonus : ""  }		// sector 63
    planets['planet65'] = { type : "cotillard" , img : "/imperium/img/planets/COTILLARD.png" , name : "Cotillard" , resources : 2 , influence : 2 , bonus : ""  }	// sector 64
    planets['planet66'] = { type : "cultural" , img : "/imperium/img/planets/DOMINIC.png" , name : "Dominic" , resources : 3 , influence : 1 , bonus : ""  }		// sector 65
    planets['planet67'] = { type : "industrial" , img : "/imperium/img/planets/PESTULON.png" , name : "Pestulon" , resources : 1 , influence : 1 , bonus : "yellow"  }	// sector 66
    planets['planet68'] = { type : "hazardous" , img : "/imperium/img/planets/XIAO-ZUOR.png" , name : "Xiao Zuor" , resources : 1 , influence : 3 , bonus : ""  }	// sector 67
    planets['planet69'] = { type : "hazardous" , img : "/imperium/img/planets/KROEBER.png" , name : "Kroeber" , resources : 2 , influence : 0 , bonus : ""  }		// sector 68
    planets['planet70'] = { type : "hazardous" , img : "/imperium/img/planets/LEGUIN.png" , name : "Leguin" , resources : 0 , influence : 1 , bonus : ""  }		// sector 69
    planets['planet71'] = { type : "cultural" , img : "/imperium/img/planets/SIGURDS-CRADLE.png" , name : "Sigurd's Cradle" , resources : 1 , influence : 3 , bonus : ""  }	// sector 70
    planets['planet72'] = { type : "cultural" , img : "/imperium/img/planets/KLENCORY.png" , name : "Klencory" , resources : 2 , influence : 2 , bonus : ""  }		// sector 71

    for (var i in planets) {

      planets[i].exhausted = 0;
      planets[i].locked = 0; // units cannot be placed, produced or landed
      planets[i].owner = -1;
      planets[i].units = [this.totalPlayers]; // array to store units
      planets[i].sector = ""; // "sector43" <--- fleshed in by initialize
      planets[i].tile = ""; // "4_5" <--- fleshed in by initialize
      planets[i].idx = -1; // 0 - n // <--- fleshed in by initialize
      planets[i].planet = ""; // name in planets array
      planets[i].hw = 0;

      for (let j = 0; j < this.totalPlayers; j++) {
        planets[i].units[j] = [];


	if (j == 1) {
//	  planets[i].units[j].push(this.returnUnit("infantry", 1));
//	  planets[i].units[j].push(this.returnUnit("infantry", 1));
//	  planets[i].units[j].push(this.returnUnit("infantry", 1));
//	  planets[i].units[j].push(this.returnUnit("pds", 1));
//	  planets[i].units[j].push(this.returnUnit("pds", 1));
//	  planets[i].units[j].push(this.returnUnit("spacedock", 1));
	}

      }
    }
  
    return planets;
  }
  
  
  
  ////////////////////
  // Return Planets //
  ////////////////////
  returnSectors() {

    var sectors = {};

    sectors['sector3']         = { img : "/imperium/img/sectors/sector3.png" , 	   	   name : "Sector 3" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector4']         = { img : "/imperium/img/sectors/sector4.png" , 	   	   name : "Sector 4" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector5']         = { img : "/imperium/img/sectors/sector5.png" , 	   	   name : "Sector 5" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector6']         = { img : "/imperium/img/sectors/sector6.png" , 	   	   name : "Sector 6" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector1']         = { img : "/imperium/img/sectors/sector1.png" , 	   	   name : "Sector 1" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector2']         = { img : "/imperium/img/sectors/sector2.png" , 	   	   name : "Sector 2" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector7']         = { img : "/imperium/img/sectors/sector7.png" , 	   	   name : "Sector 7" , type : 1 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    //sectors['sector33']        = { img : "/imperium/img/sectors/sector33.png" , 	   name : "Sector 33" , type : 2 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector72']         = { img : "/imperium/img/sectors/sector72.png" , 	   name : "Sector 72" , type : 2 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector34']        = { img : "/imperium/img/sectors/sector34.png" , 	   name : "Sector 34" , type : 3 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector35']        = { img : "/imperium/img/sectors/sector35.png" , 	   name : "Sector 35" , type : 3 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    //sectors['sector36']        = { img : "/imperium/img/sectors/sector36.png" , 	   name : "Sector 36" , type : 4 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector71']        = { img : "/imperium/img/sectors/sector71.png" , 	   name : "Sector 71" , type : 4 , hw : 0 , wormhole : 0, mr : 0 , planets : [] }
    sectors['sector54']        = { img : "/imperium/img/sectors/sector54.png" , 	   name : "Sector 48" , type : 0 , hw : 0 , wormhole : 1, mr : 0 , planets : [] } 		// wormhole a
    sectors['sector56']        = { img : "/imperium/img/sectors/sector56.png" , 	   name : "Sector 49" , type : 0 , hw : 0 , wormhole : 2, mr : 0 , planets : [] } 		// wormhole b

    sectors['sector55']        = { img : "/imperium/img/sectors/sector55.png" , 	   name : "Sector 47" , type : 0 , hw : 0 , wormhole : 1, mr : 0 , planets : ['planet51'] } 	// wormhole a
    sectors['sector57']        = { img : "/imperium/img/sectors/sector57.png" , 	   name : "Sector 46" , type : 0 , hw : 0 , wormhole : 2, mr : 0 , planets : ['planet52'] } 	// wormhole b

    sectors['sector8']         = { img : "/imperium/img/sectors/sector8.png" , 	   	   name : "Sector 8" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet1','planet2'] }
    sectors['sector9']         = { img : "/imperium/img/sectors/sector9.png" , 	   	   name : "Sector 9" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet3','planet4'] }
    sectors['sector10']        = { img : "/imperium/img/sectors/sector10.png" , 	   name : "Sector 10" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet5','planet6'] }
    sectors['sector11']        = { img : "/imperium/img/sectors/sector11.png" , 	   name : "Sector 11" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet7','planet8'] }
    sectors['sector12']        = { img : "/imperium/img/sectors/sector12.png" , 	   name : "Sector 12" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet9','planet10'] }
    sectors['sector15']        = { img : "/imperium/img/sectors/sector15.png" , 	   name : "Sector 15" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet15','planet16'] }
    sectors['sector16']        = { img : "/imperium/img/sectors/sector16.png" , 	   name : "Sector 16" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet17','planet18'] }
    sectors['sector18']        = { img : "/imperium/img/sectors/sector18.png" , 	   name : "Sector 18" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet21','planet22'] }
    sectors['sector19']        = { img : "/imperium/img/sectors/sector19.png" , 	   name : "Sector 19" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet23','planet24'] }
    sectors['sector20']        = { img : "/imperium/img/sectors/sector20.png" , 	   name : "Sector 20" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet25','planet26'] }
    sectors['sector22']        = { img : "/imperium/img/sectors/sector22.png" , 	   name : "Sector 22" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet29'] }
    sectors['sector25']        = { img : "/imperium/img/sectors/sector25.png" , 	   name : "Sector 25" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet32'] }
    sectors['sector26']        = { img : "/imperium/img/sectors/sector26.png" , 	   name : "Sector 26" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet33'] }
    sectors['sector27']        = { img : "/imperium/img/sectors/sector27.png" , 	   name : "Sector 27" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet34'] } 
    sectors['new-byzantium']   = { img : "/imperium/img/sectors/sector28.png" , 	   name : "New Byzantium" , type : 0 , hw : 0 , wormhole : 0, mr : 1 , planets : ['new-byzantium'] }
    sectors['sector29']        = { img : "/imperium/img/sectors/sector29.png" , 	   name : "Sector 29" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet36'] }
    sectors['sector31']        = { img : "/imperium/img/sectors/sector31.png" , 	   name : "Sector 31" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet38'] }
    sectors['sector32']        = { img : "/imperium/img/sectors/sector32.png" , 	   name : "Sector 32" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet39'] }
    sectors['sector38']        = { img : "/imperium/img/sectors/sector38.png" , 	   name : "Sector 30" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet41','planet42'] }
    sectors['sector39']        = { img : "/imperium/img/sectors/sector39.png" , 	   name : "Sector 31" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet43','planet44'] }
    sectors['sector40']        = { img : "/imperium/img/sectors/sector40.png" , 	   name : "Sector 32" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet45','planet46'] }
    sectors['sector41']        = { img : "/imperium/img/sectors/sector41.png" , 	   name : "Sector 41" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet40'] }
    sectors['sector42']        = { img : "/imperium/img/sectors/sector42.png" , 	   name : "Sector 42" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet47'] }
    sectors['sector43']        = { img : "/imperium/img/sectors/sector43.png" , 	   name : "Sector 43" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet48'] }
    sectors['sector44']        = { img : "/imperium/img/sectors/sector44.png" , 	   name : "Sector 44" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet49'] }
    sectors['sector58']        = { img : "/imperium/img/sectors/sector58.png" , 	   name : "Sector 58" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet59'] }
    sectors['sector59']        = { img : "/imperium/img/sectors/sector59.png" , 	   name : "Sector 59" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet60'] }
    sectors['sector60']        = { img : "/imperium/img/sectors/sector60.png" , 	   name : "Sector 60" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet61'] }
    sectors['sector62']        = { img : "/imperium/img/sectors/sector62.png" , 	   name : "Sector 62" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet63'] }
    sectors['sector65']        = { img : "/imperium/img/sectors/sector65.png" , 	   name : "Sector 65" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet66'] }
    sectors['sector67']        = { img : "/imperium/img/sectors/sector67.png" , 	   name : "Sector 67" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet68'] }
    sectors['sector69']        = { img : "/imperium/img/sectors/sector69.png" , 	   name : "Sector 69" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet71'] }

    //sectors['sector13']        = { img : "/imperium/img/sectors/sector13.png" , 	   name : "Sector 13" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet11','planet12'] }
    //sectors['sector14']        = { img : "/imperium/img/sectors/sector14.png" , 	   name : "Sector 14" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet13','planet14'] }
    //sectors['sector17']        = { img : "/imperium/img/sectors/sector17.png" , 	   name : "Sector 17" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet19','planet20'] }
    //sectors['sector21']        = { img : "/imperium/img/sectors/sector21.png" , 	   name : "Sector 21" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet27','planet28'] }
    //sectors['sector23']        = { img : "/imperium/img/sectors/sector23.png" , 	   name : "Sector 23" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet30'] }
    //sectors['sector24']        = { img : "/imperium/img/sectors/sector24.png" , 	   name : "Sector 24" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet31'] }
    //sectors['sector30']        = { img : "/imperium/img/sectors/sector30.png" , 	   name : "Sector 30" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet37'] }
    //sectors['sector45']        = { img : "/imperium/img/sectors/sector45.png" , 	   name : "Sector 45" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet50'] } 
    //sectors['sector61']        = { img : "/imperium/img/sectors/sector61.png" , 	   name : "Sector 61" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet62'] } // weird ring
    //sectors['sector63']        = { img : "/imperium/img/sectors/sector63.png" , 	   name : "Sector 63" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet64'] }
    //sectors['sector64']        = { img : "/imperium/img/sectors/sector64.png" , 	   name : "Sector 64" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet65'] }
    //sectors['sector66']        = { img : "/imperium/img/sectors/sector66.png" , 	   name : "Sector 66" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet67'] }
    //sectors['sector68']        = { img : "/imperium/img/sectors/sector68.png" , 	   name : "Sector 68" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet69','planet70'] }
    //sectors['sector70']        = { img : "/imperium/img/sectors/sector70.png" , 	   name : "Sector 70" , type : 0 , hw : 0 , wormhole : 0, mr : 0 , planets : ['planet72'] }

    sectors['sector50']        = { img : "/imperium/img/sectors/sector50.png" , 	   name : "Jol Nar Homeworld" , hw : 1 , wormhole : 0 , mr : 0 , planets : ['planet53','planet54'] }
    sectors['sector51']        = { img : "/imperium/img/sectors/sector51.png" , 	   name : "XXCha Homeworld" , hw : 1 , wormhole : 0 , mr : 0 , planets : ['planet55','planet56'] }
    sectors['sector52']        = { img : "/imperium/img/sectors/sector52.png" , 	   name : "Sol Homeworld" , hw : 1 , wormhole : 0 , mr : 0 , planets : ['planet57'] }
    sectors['sector53']        = { img : "/imperium/img/sectors/sector53.png" , 	   name : "Mentak Homeworld" , hw : 1 , wormhole: 0 , mr : 0 , planets : ['planet58'] }

    for (var i in sectors) {

      sectors[i].units = [this.totalPlayers]; // array to store units
      sectors[i].activated = [this.totalPlayers]; // array to store units
      sectors[i].sector = "";  // sector reference
      sectors[i].tile = "";  // tile on board

      for (let j = 0; j < this.totalPlayers; j++) {
        sectors[i].units[j] = []; // array of united
        sectors[i].activated[j] = 0; // is this activated by the player
      }

      
//      sectors[i].units[1] = [];
//      sectors[i].units[1].push(this.returnUnit("fighter", 1));  
//      sectors[i].units[1].push(this.returnUnit("fighter", 1));  


    }
    return sectors;
  };
  
  
  addWormholesToBoardTiles(tiles) {

    let wormholes = [];

    for (let i in this.game.sectors) {
      if (this.game.sectors[i].wormhole != 0) { wormholes.push(i); }
    }    

    for (let i in tiles) {
      if (this.game.board[i]) {
        let sector = this.game.board[i].tile;
        if (this.game.sectors[sector].wormhole != 0) {
	  for (let z = 0; z < wormholes.length; z++) {

	    //
	    // wormholes are all adjacent
	    //
	    if (this.game.state.wormholes_adjacent || this.game.state.temporary_wormholes_adjacent) {

	      if (wormholes[z] != sector && this.game.sectors[sector].wormhole != 0 && this.game.sectors[wormholes[z]].wormhole != 0) {
	        let tile_with_partner_wormhole = "";
	        for (let b in tiles) {
	          if (this.game.board[b]) {
	            if (this.game.board[b].tile == wormholes[z]) {
	              if (!tiles[i].neighbours.includes(b)) {
	  	        tiles[i].neighbours.push(b);
	  	      }
	            }
	          }
	        }
	      }

	    //
	    // wormholes are not adjacent
	    //
	    } else {

	      if (wormholes[z] != sector && this.game.sectors[sector].wormhole == this.game.sectors[wormholes[z]].wormhole) {
	        let tile_with_partner_wormhole = "";
	        for (let b in tiles) {
	          if (this.game.board[b]) {
	            if (this.game.board[b].tile == wormholes[z]) {
	              if (!tiles[i].neighbours.includes(b)) {
console.log("ADDING A WORMHOLE RELATIONSHIP: " + i + " -- " + b);
	  	        tiles[i].neighbours.push(b);
	  	      }
	            }
	          }
	        }
	      }
  	    }

  	  }
        }
      }
    }

    return tiles;
  }


  
  returnBoardTiles() {
    var slot = {};
    slot['1_1'] = {
      neighbours: ["1_2", "2_1", "2_2"]
    };
    slot['1_2'] = {
      neighbours: ["1_1", "1_3", "2_2", "2_3"]
    };
    slot['1_3'] = {
      neighbours: ["1_2", "1_4", "2_3", "2_4"]
    };
    slot['1_4'] = {
      neighbours: ["1_3", "2_4", "2_5"]
    };
    slot['2_1'] = {
      neighbours: ["1_1", "2_2", "3_1", "3_2"]
    };
    slot['2_2'] = {
      neighbours: ["1_1", "1_2", "2_1", "2_3", "3_2", "3_3"]
    };
    slot['2_3'] = {
      neighbours: ["1_2", "1_3", "2_2", "2_4", "3_3", "3_4"]
    };
    slot['2_4'] = {
      neighbours: ["1_3", "1_4", "2_3", "2_5", "3_4", "3_5"]
    };
    slot['2_5'] = {
      neighbours: ["1_4", "2_4", "3_5", "3_6"]
    };
    slot['3_1'] = {
      neighbours: ["2_1", "3_2", "4_1", "4_2"]
    };
    slot['3_2'] = {
      neighbours: ["2_1", "2_2", "3_1", "3_3", "4_2", "4_3"]
    };
    slot['3_3'] = {
      neighbours: ["2_2", "2_3", "3_2", "3_4", "4_3", "4_4"]
    };
    slot['3_4'] = {
      neighbours: ["2_3", "2_4", "3_3", "3_5", "4_4", "4_5"]
    };
    slot['3_5'] = {
      neighbours: ["2_4", "3_4", "3_6", "4_5", "4_6"]
    };
    slot['3_6'] = {
      neighbours: ["2_5", "3_5", "4_6", "4_7"]
    };
    slot['4_1'] = {
      neighbours: ["3_1", "4_2", "5_1"]
    };
    slot['4_2'] = {
      neighbours: ["3_1", "3_2", "4_1", "4_3", "5_1", "5_2"]
    };
    slot['4_3'] = {
      neighbours: ["3_2", "3_3", "4_2", "4_4", "5_2", "5_3"]
    };
    slot['4_4'] = {
      neighbours: ["3_3", "3_4", "4_3", "4_5", "5_3", "5_4"]
    };
    slot['4_5'] = {
      neighbours: ["3_4", "3_5", "4_4", "4_6", "5_4", "5_5"]
    };
    slot['4_6'] = {
      neighbours: ["3_5", "3_6", "4_5", "4_7", "5_5", "5_6"]
    };
    slot['4_7'] = {
      neighbours: ["3_6", "4_6", "5_6"]
    };
    slot['5_1'] = {
      neighbours: ["4_1", "4_2", "5_2", "6_1"]
    };
    slot['5_2'] = {
      neighbours: ["4_2", "4_3", "5_1", "5_3", "6_1", "6_2"]
    };
    slot['5_3'] = {
      neighbours: ["4_3", "4_4", "5_2", "5_4", "6_2", "6_3"]
    };
    slot['5_4'] = {
      neighbours: ["4_4", "4_5", "5_3", "5_5", "6_3", "6_4"]
    };
    slot['5_5'] = {
      neighbours: ["4_5", "4_6", "5_4", "5_6", "6_4", "6_5"]
    };
    slot['5_6'] = {
      neighbours: ["4_6", "4_7", "5_5", "6_5"]
    };
    slot['6_1'] = {
      neighbours: ["5_1", "5_2", "6_2", "7_1"]
    };
    slot['6_2'] = {
      neighbours: ["5_2", "5_3", "6_1", "6_3", "7_1", "7_2"]
    };
    slot['6_3'] = {
      neighbours: ["5_3", "5_4", "6_2", "6_4", "7_2", "7_3"]
    };
    slot['6_4'] = {
      neighbours: ["5_4", "5_5", "6_3", "6_5", "7_3", "7_4"]
    };
    slot['6_5'] = {
      neighbours: ["5_5", "5_6", "6_4", "7_4"]
    };
    slot['7_1'] = {
      neighbours: ["6_1", "6_2", "7_2"]
    };
    slot['7_2'] = {
      neighbours: ["6_2", "6_3", "7_1", "7_3"]
    };
    slot['7_3'] = {
      neighbours: ["6_3", "6_4", "7_2", "7_4"]
    };
    slot['7_4'] = {
      neighbours: ["6_4", "6_5", "7_3"]
    };
    return slot;
  }; 
  
  
  


  ///////////////////////////////
  // Return Starting Positions //
  ///////////////////////////////
  returnHomeworldSectors(players = 4) {
    if (players <= 2) {
      return ["1_1", "4_7"];
//      return ["1_1", "2_1"];
    }
    if (players <= 3) {
      return ["1_1", "4_7", "7_1"];
    }
  
    if (players <= 4) {
      return ["1_3", "3_1", "5_6", "7_2"];
    }
  
    if (players <= 5) {
      return ["1_3", "3_1", "4_7", "7_1", "7_4"];
    }
    if (players <= 6) {
      return ["1_1", "1_4", "4_1", "4_7", "7_1", "7_7"];
    }
  }; 




  returnState() {
 
    let state = {};
 
        state.speaker = 1;
        state.round = 0;
        state.turn = 1;
        state.round_scoring = 0;
        state.events = {};

	//
	// these are the laws, cards, etc. in force
	//
        state.laws = [];
        state.agendas = [];

	//
	// riders => who has riders (and is not voting
	// choices => possible outcomes (for/against, players, etc)
	//
        state.riders = [];
        state.choices = [];

        state.assign_hits_queue_instruction = "";
        state.assign_hits_to_cancel = "";
        state.active_player_moved = 0;


        state.agendas_voting_information = [];
        state.strategy_cards = [];
        state.strategy_cards_bonus = [];
        state.stage_i_objectives = [];
        state.stage_ii_objectives = [];
        state.secret_objectives = [];
        state.votes_available = [];
        state.votes_cast = [];
        state.voted_on_agenda = [];
        state.voting_on_agenda = 0; // record of how people have voted, so action cards may be played
        state.agendas_per_round = 2;
        state.how_voted_on_agenda = [];

        state.temporary_assignments = ["all"]; // all = any units
        state.temporary_rerolls = 0; // 100 = unlimited
        state.temporary_adjacency = [];
	
        state.wormholes_open = 1;
        state.wormholes_adjacent = 0;
        state.temporary_wormholes_adjacent = 0;

        state.space_combat_round = 0;
	state.space_combat_attacker = -1;
	state.space_combat_defender = -1;
        state.space_combat_ships_destroyed_attacker = 0;
        state.space_combat_ships_destroyed_defender = 0;
        state.ground_combat_round = 0;
	state.ground_combat_attacker = -1;
	state.ground_combat_defender = -1;
        state.ground_combat_infantry_destroyed_attacker = 0;
        state.ground_combat_infantry_destroyed_defender = 0;

	state.pds_limit_per_planet = 2;
	state.pds_limit_total = 4;

	state.bombardment_sector = "";
	state.bombardment_planet_idx = "";
	state.space_combat_sector = "";
	state.ground_combat_sector = "";
	state.ground_combat_planet_idx = "";

    return state;
  }






  returnEventObjects(player) {

    let z = [];
    let zz = [];

    //
    // player techs
    //
    for (let i = 0; i < this.game.players_info.length; i++) {
      for (let j = 0; j < this.game.players_info[i].tech.length; j++) {
	if (this.tech[this.game.players_info[i].tech[j]] != undefined) {
	  if (!zz.includes(this.game.players_info[i].tech[j])) {
            z.push(this.tech[this.game.players_info[i].tech[j]]);
            zz.push(this.game.players_info[i].tech[j]);
	  }
	}
      }
    }

    //
    // factions in-play
    //
    for (let i = 0; i < this.game.players_info.length; i++) {
      if (this.factions[this.game.players_info[i].faction] != undefined) {
        z.push(this.factions[this.game.players_info[i].faction]);
      }
    }

    //
    // laws-in-play
    //
    for (let i = 0; i < this.game.state.laws.length; i++) {
      if (this.game.state.laws[i].agenda) {
        if (this.agenda_cards[this.game.state.laws[i].agenda]) {
          z.push(this.agenda_cards[this.game.state.laws[i].agenda]);
        }
      }
    }

     

    //
    // action cards
    //
    for (let i in this.action_cards) {
      z.push(this.action_cards[i]);
    }

    return z;

  }



  addEvents(obj) {

    ///////////////////////
    // game state events //
    ///////////////////////
    //
    // these events run at various points of the game, such as at the start of the game or
    // on a new turn. they should be asynchronous (not require user input) and thus do not
    // require a trigger - every function is run every time the game reaches this state..
    //
    // by convention "player" means the player in the players_info. if you mean "the player 
    // that has this tech" you should do a secondary check in the logic of the card to 
    // ensure that "player" has the right to execute the logic being coded, either by 
    // adding gainTechnology() or doesPlayerHaveTech()
    //
    //
    // runs for everyone
    //
    if (obj.handleGameLoop == null) {
      obj.handleGameLoop = function(imperium_self, qe, mv) { return 1; }
    }
    if (obj.initialize == null) {
      obj.initialize = function(imperium_self, player) { return 0; }
    }
    if (obj.gainPlanet == null) {
      obj.gainPlanet = function(imperium_self, gainer, planet) { return 1; }
    }
    if (obj.gainTechnology == null) {
      obj.gainTechnology = function(imperium_self, gainer, tech) { return 1; }
    }
    if (obj.gainFleetSupply == null) {
      obj.gainFleetSupply = function(imperium_self, gainer, amount) { return amount; }
    }
    if (obj.gainTradeGoods == null) {
      obj.gainTradeGoods = function(imperium_self, gainer, amount) { return amount; }
    }
    if (obj.gainCommodities == null) {
      obj.gainCommodities = function(imperium_self, gainer, amount) { return amount; }
    }
    if (obj.gainFleetSupply == null) {
      obj.gainFleetSupply = function(imperium_self, gainer, amount) { return amount; }
    }
    if (obj.gainStrategyCard == null) {
      obj.gainStrategyCard = function(imperium_self, gainer, card) { return card; }
    }
    if (obj.gainCommandTokens == null) {
      obj.gainCommandTokens = function(imperium_self, gainer, amount) { return amount; }
    }
    if (obj.gainStrategyTokens == null) {
      obj.gainStrategyTokens = function(imperium_self, gainer, amount) { return amount; }
    }

    if (obj.losePlanet == null) {
      obj.losePlanet = function(imperium_self, loser, planet) { return 1; }
    }

    //
    // ALL players run upgradeUnit, so upgrades should manage who have them
    //
    if (obj.upgradeUnit == null) {
      obj.upgradeUnit = function(imperium_self, player, unit) { return unit; }
    }
    //
    // ALL players run unitDestroyed
    //
    if (obj.unitDestroyed == null) {
      obj.unitDestroyed = function(imperium_self, attacker, unit) { return unit;}
    }
    if (obj.unitHit == null) {
      obj.unitHit = function(imperium_self, attacker, unit) { return unit;}
    }
    if (obj.onNewRound == null) {
      obj.onNewRound = function(imperium_self, player, mycallback) { return 0; }
    }
    if (obj.onNewTurn == null) {
      obj.onNewTurn = function(imperium_self, player, mycallback) { return 0; }
    }


    ////////////////////
    // strategy cards //
    ////////////////////
    if (obj.strategyPrimaryEvent == null) {
      obj.strategyPrimaryEvent = function(imperium_self, player, strategy_card_player) { return 0; }
    }
    if (obj.strategySecondaryEvent == null) {
      obj.strategySecondaryEvent = function(imperium_self, player, strategy_card_player) { return 0; }
    }
    if (obj.strategyCardBeforeTriggers == null) {
      obj.strategyCardBeforeTriggers = function(imperium_self, player, strategy_card_player, card) { return 0; }
    }
    if (obj.strategyCardBeforeEvent == null) {
      obj.strategyCardBeforeEvent = function(imperium_self, player, strategy_card_player, card) { return 0; }
    }
    if (obj.strategyCardAfterTriggers == null) {
      obj.strategyCardAfterTriggers = function(imperium_self, player, strategy_card_player, card) { return 0; }
    }
    if (obj.strategyCardAfterEvent == null) {
      obj.strategyCardAfterEvent = function(imperium_self, player, strategy_card_player, card) { return 0; }
    }
    if (obj.playersChooseStrategyCardsBeforeTriggers == null) {
      obj.playersChooseStrategyCardsBeforeTriggers = function(imperium_self, player) { return 0; }
    }
    if (obj.playersChooseStrategyCardsBeforeEvent == null) {
      obj.playersChooseStrategyCardsBeforeEvent = function(imperium_self, player) { return 0; }
    }
    if (obj.playersChooseStrategyCardsAfterTriggers == null) {
      obj.playersChooseStrategyCardsAfterTriggers = function(imperium_self, player) { return 0; }
    }
    if (obj.playersChooseStrategyCardsAfterEvent == null) {
      obj.playersChooseStrategyCardsAfterEvent = function(imperium_self, player) { return 0; }
    }



    ////////////////////
    // main turn menu //
    ////////////////////
    //
    // the player here will be the user who is viewing the menu, so this only executes for the
    // active player.
    //
    if (obj.menuOption == null) {
      obj.menuOption = function(imperium_self, menu, player) { return {}; }
    }
    if (obj.menuOptionTriggers == null) {
      obj.menuOptionTriggers = function(imperium_self, menu, player) { return 0; }
    }
    if (obj.menuOptionActivated == null) {
      obj.menuOptionActivated = function(imperium_self, menu, player) { return 0; }
    }


    /////////////
    // agendas //
    /////////////
    if (obj.preAgendaStageTriggers == null) {
      obj.preAgendaStageTriggers = function(imperium_self, player, agenda) { return 0; }
    }
    if (obj.preAgendaStageEvent == null) {
      obj.preAgendaStageEvent = function(imperium_self, player, agenda) { return 1; }
    }
    if (obj.postAgendaStageTriggers == null) {
      obj.postAgendaStageTriggers = function(imperium_self, player, agenda) { return 0; }
    }
    if (obj.postAgendaStageEvent == null) {
      obj.postAgendaStageEvent = function(imperium_self, player, agenda) { return 1; }
    }
    if (obj.returnAgendaOptions == null) {
      obj.returnAgendaOptions = function(imperium_self) { return ['support','oppose']; }
    }
    //
    // when an agenda is resolved (passes) --> not necessarily if it is voted in favour
    // for permanent game effects, run initialize after setting a var
    if (obj.onPass == null) {
      obj.onPass = function(imperium_self, winning_choice) { return 0; }
    }


    ///////////////////////
    // modify dice rolls //
    ///////////////////////
    //
    // executes for all technologies that are available. these functions should check if they
    // are active for either the attacker or the defender when executing.
    //
    if (obj.modifyPDSRoll == null) {
      obj.modifyPDSRoll = function(imperium_self, attacker, defender, roll) { return roll; }
    }
    if (obj.modifySpaceCombat == null) {
      obj.modifySpaceCombatRoll = function(imperium_self, attacker, defender, roll) { return roll; }
    }
    if (obj.modifyGroundCombatRoll == null) {
      obj.modifyGroundCombatRoll = function(imperium_self, attacker, defender, roll) { return roll; }
    }
    if (obj.modifyCombatRoll == null) {
      obj.modifyCombatRoll = function(imperium_self, attacker, defender, player, combat_type, roll) { return roll; }
    }
    if (obj.modifyCombatRerolls == null) {
      obj.modifyCombatRerolls = function(imperium_self, attacker, defender, player, combat_type, roll) { return roll; }
    }
    if (obj.modifyTargets == null) {
      obj.modifyTargets = function(imperium_self, attacker, defender, player, combat_type, targets=[]) { return targets; }
    }


    //
    // synchronous interventions in combat state -- take place at the END of the combat round
    //
    if (obj.spaceCombatRoundEnd == null) {
      obj.spaceCombatRoundEnd = function(imperium_self, attacker, defender, sector) { return 1; }
    }
    if (obj.groundCombatRoundEnd == null) {
      obj.groundCombatRoundEnd = function(imperium_self, attacker, defender, sector, planet_idx) { return 1; }
    }


    ////////////////////
    // Victory Points //
    ////////////////////
    if (obj.canPlayerScoreVictoryPoints == null) {
      obj.canPlayerScoreVictoryPoints = function(imperium_self, player) { return 0; }
    }
    if (obj.scoreObjective == null) {
      obj.scoreObjective = function(imperium_self, player) { return 1; }
    }



    //////////////////////////
    // asynchronous eventsa //
    //////////////////////////
    //
    // these events must be triggered by something that is put onto the stack. they allow users to stop the execution of the game
    // and take arbitrary action. 
    //

    //
    // when action card is played
    //
    if (obj.playActionCardTriggers == null) {
      obj.playActionCardTriggers = function(imperium_self, player, action_card_player, card) { return 0; }
    }
    if (obj.playActionCardEvent == null) {
      obj.playActionCardEvent = function(imperium_self, player, action_card_player, card) { return 0; }
    }
    //
    // the substance of the action card
    //
    if (obj.playActionCard == null) {
      obj.playActionCard = function(imperium_self, player, action_card_player, card) { return 1; }
    }


    //
    // when strategy card primary is played
    //
    if (obj.playStrategyCardPrimaryTriggers == null) {
      obj.playStrategyCardPrimaryTriggers = function(imperium_self, player, card) { return 0; }
    }
    if (obj.playStrategyCardPrimaryEvent == null) {
      obj.playStrategyCardPrimaryEvent = function(imperium_self, player, card) { return 0; }
    }


    //
    // when strategy card secondary is played
    //
    if (obj.playStrategyCardSecondaryTriggers == null) {
      obj.playStrategyCardSecondaryTriggers = function(imperium_self, player, card) { return 0; }
    }
    if (obj.playStrategyCardSecondaryEvent == null) {
      obj.playStrategyCardSecondaryEvent = function(imperium_self, player, card) { return 0; }
    }


    //
    // when system is activated
    //
    if (obj.activateSystemTriggers == null) {
      obj.activateSystemTriggers = function(imperium_self, activating_player, player, sector) { return 0; }
    }
    if (obj.activateSystemEvent == null) {
      obj.activateSystemEvent = function(imperium_self, activating_player, player, sector) { return 0; }
    }

    //
    // when pds combat starts
    //
    if (obj.pdsSpaceDefenseTriggers == null) {
      obj.pdsSpaceDefenseTriggers = function(imperium_self, attacker, player, sector) { return 0; }
    }
    if (obj.pdsSpaceDefenseEvent == null) {
      obj.pdsSpaceDefenseEvent = function(imperium_self, attacker, player, sector) { return 0; }
    }

    //
    // when space combat round starts
    //
    if (obj.spaceCombatTriggers == null) {
      obj.spaceCombatTriggers = function(imperium_self, player, sector) { return 0; }
    }
    if (obj.spaceCombatEvent == null) {
      obj.spaceCombatEvent = function(imperium_self, player, sector) { return 0; }
    }

    //
    // when bombardment starts
    //
    if (obj.bombardmentTriggers == null) {
      obj.bombardmentTriggers = function(imperium_self, player, bombarding_player, sector, planet_idx) { return 0; }
    }
    if (obj.bombardmentEvent == null) {
      obj.bombardmentEvent = function(imperium_self, player, bombarding_player, sector, planet_idx) { return 0; }
    }

    //
    // when planetry invasion starts
    //
    if (obj.planetaryDefenseTriggers == null) {
      obj.planetaryDefenseTriggers = function(imperium_self, player, sector, planet_idx) { return 0; }
    }
    if (obj.planetaryDefenseEvent == null) {
      obj.planetaryDefenseEvent = function(imperium_self, player, sector, planet_idx) { return 0; }
    }


    //
    // when ground combat round starts
    //
    if (obj.groundCombatTriggers == null) {
      obj.groundCombatTriggers = function(imperium_self, player, sector, planet_idx) { return 0; }
    }
    if (obj.groundCombatEvent == null) {
      obj.groundCombatEvent = function(imperium_self, player, sector, planet_idx) { return 0; }
    }

    //
    // end of player turn
    //
    if (obj.playerEndTurnTriggers == null) {
      obj.playerEndTurnTriggers = function(imperium_self, player) { return 0; }
    }
    if (obj.playerEndTurnEvent == null) {
      obj.playerEndTurnEvent = function(imperium_self, player) { return 0; }
    }

    return obj;
  
  }







  /////////////////////
  // Return Factions //
  /////////////////////
  returnFaction(player) {
    if (this.game.players_info[player-1] == null) { return "Unknown"; }
    if (this.game.players_info[player-1] == undefined) { return "Unknown"; }
    return this.returnFactionName(this, player);
  }
  returnFactionName(imperium_self, player) {
    let factions = imperium_self.returnFactions();
    return factions[imperium_self.game.players_info[player-1].faction].name;
  }
  returnSpeaker() {
    let factions = this.returnFactions();
    return factions[this.game.players_info[this.game.state.speaker-1].faction].name;
  }
  returnSectorName(pid) {
    return this.game.sectors[this.game.board[pid].tile].name;
  }
  returnPlanetName(sector, planet_idx) {
    let sys = this.returnSectorAndPlanets(sector);
    return sys.p[planet_idx].name;
  }



  returnNameFromIndex(idx) {
    if (idx.indexOf("planet") == 0) { if (this.game.planets[idx]) { return this.game.planets[idx].name; } }
    if (idx.indexOf("sector") == 0) { if (this.game.sectors[idx]) { return this.game.sectors[idx].sector; } }
    return idx;
  }


  returnActiveAgenda() {
    for (let i = this.game.queue.length-1; i >= 0; i--) {
      let x = this.game.queue[i].split("\t");
      if (x[0] == "agenda") { return x[1]; }
    }
    return "";
  }



  checkForVictory() {
    for (let i = 0; i < this.game.players_info.length; i++) {
      if (this.game.players_info[i].vp >= this.vp_needed) {
        this.updateStatus("Game Over: " + this.returnFaction(i+1) + " has reached 14 VP");
        return 1;
      }
    }
    return 0;
  }

  


  

  canPlayerTrade(player) {
    for (let i = 0; i < this.game.players_info.length; i++) {
      if (this.game.players_info[i].traded_this_turn == 0 && (i+1) != this.game.player) {
        if (this.arePlayersAdjacent(this.game.player, (i+1))) {
	  //
	  // anyone have anything to trade?
	  //
	  if (this.game.players_info[this.game.player-1].commodities > 0 || this.game.players_info[this.game.player-1].goods > 0) {
	    if (this.game.players_info[i].commodities > 0 || this.game.players_info[i].goods > 0) {
	      return 1;
	    }
	  }
        }
      }
    }
    return 0;
  }
  
  canPlayerPlayStrategyCard(player) {
    for (let i = 0; i < this.game.players_info[player-1].strategy.length; i++) {
      if (!this.game.players_info[player-1].strategy_cards_played.includes(this.game.players_info[player-1].strategy[i])) {
        return 1;
      }
    }
    return 0;
  }
  
  
  canPlayerPass(player) {
    if (this.canPlayerPlayStrategyCard(player) == 1) { return 0; }
    return 1;
  }

  canPlayerPlayActionCard(player) {
    let array_of_cards = this.returnPlayerActionCards(this.game.player);
    if (array_of_cards.length > 0) {
      return 1;
    } 
    return 0;
  }
  


  exhaustPlayerResearchTechnologyPrerequisites(tech) {

    let mytech = this.game.players_info[this.game.player-1].tech;
    if (mytech.includes(tech)) { return 0; }

    let prereqs = JSON.parse(JSON.stringify(this.tech[tech].prereqs));
    let techfaction = this.tech[tech].faction;
    let techtype = this.tech[tech].type;

    for (let i = 0; i < mytech.length; i++) {
      if (this.tech[mytech[i]]) {
        let color = this.tech[mytech[i]].color;
        for (let j = 0; j < prereqs.length; j++) {
          if (prereqs[j] == color) {
            prereqs.splice(j, 1);
  	    j = prereqs.length;
          }
        }
      }
    }

    //
    // permanent blue tech skip
    //
    if (this.game.players_info[this.game.player-1].permanent_blue_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "blue") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // permanent green tech skip
    //
    if (this.game.players_info[this.game.player-1].permanent_green_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "green") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // permanent red tech skip
    //
    if (this.game.players_info[this.game.player-1].permanent_red_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "red") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // permanent yellow tech skip
    //
    if (this.game.players_info[this.game.player-1].permanent_yellow_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "yellow") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // temporary blue tech skip
    //
    if (this.game.players_info[this.game.player-1].temporary_blue_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "blue") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
	  this.game.players_info[this.game.player-1].temporary_blue_tech_prerequisite = 0;
        }
      }
    }

    //
    // temporary green tech skip
    //
    if (this.game.players_info[this.game.player-1].temporary_green_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "green") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
	  this.game.players_info[this.game.player-1].temporary_green_tech_prerequisite = 0;
        }
      }
    }

    //
    // temporary red tech skip
    //
    if (this.game.players_info[this.game.player-1].temporary_red_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "red") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
	  this.game.players_info[this.game.player-1].temporary_red_tech_prerequisite = 0;
        }
      }
    }

    //
    // temporary yellow tech skip
    //
    if (this.game.players_info[this.game.player-1].temporary_yellow_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "yellow") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
	  this.game.players_info[this.game.player-1].temporary_yellow_tech_prerequisite = 0;
        }
      }
    }

    //
    // we don't meet the prereqs but have a skip
    //
    if (prereqs.length >= 1 && this.game.players_info[this.game.player-1].permanent_ignore_number_of_tech_prerequisites_on_nonunit_upgrade >= 1) {
      prereqs.splice(0, 1);
    }


    //
    // we don't meet the prereqs but have a skip
    //
    if (prereqs.length >= 1 && this.game.players_info[this.game.player-1].temporary_ignore_number_of_tech_prerequisites_on_nonunit_upgrade >= 1) {
      prereqs.splice(0, 1);
      this.game_players_info[this.game.player-1].temporary_ignore_number_of_tech_prerequisities_on_nonunit_upgrade = 0;
    }


    //
    // we meet the pre-reqs
    //
    if (prereqs.length == 0) {
      if (techfaction == "all" || techfaction == this.game.players_info[this.game.player-1].faction) {
	if (techtype == "normal") {
          return 1;
	}
      }
    }

    return 0;


  }


  canPlayerResearchTechnology(tech) {
  
    let mytech = this.game.players_info[this.game.player-1].tech;
    if (mytech.includes(tech)) { return 0; }
 
    if (this.tech[tech] == undefined) {
      console.log("Undefined Technology: " + tech);
      return 0;
    }

    let prereqs = JSON.parse(JSON.stringify(this.tech[tech].prereqs));
    let techfaction = this.tech[tech].faction;
    let techtype = this.tech[tech].type;

    //
    // we can use tech to represent non-researchable
    // powers, these are marked as "special" because
    // they cannot be researched or stolen.
    //
    if (techtype == "special") { return 0; };

    for (let i = 0; i < mytech.length; i++) {
      if (this.tech[mytech[i]]) {
        let color = this.tech[mytech[i]].color;
        for (let j = 0; j < prereqs.length; j++) {
          if (prereqs[j] == color) {
            prereqs.splice(j, 1);
    	    j = prereqs.length;
          }
        }
      }
    }

    //
    // temporary blue tech skip
    //
    if (this.game.players_info[this.game.player-1].temporary_blue_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "blue") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // temporary green tech skip
    //
    if (this.game.players_info[this.game.player-1].temporary_green_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "green") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // temporary red tech skip
    //
    if (this.game.players_info[this.game.player-1].temporary_red_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "red") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // temporary yellow tech skip
    //
    if (this.game.players_info[this.game.player-1].temporary_yellow_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "yellow") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // permanent blue tech skip
    //
    if (this.game.players_info[this.game.player-1].permanent_blue_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "blue") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // permanent green tech skip
    //
    if (this.game.players_info[this.game.player-1].permanent_green_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "green") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // permanent red tech skip
    //
    if (this.game.players_info[this.game.player-1].permanent_red_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "red") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // permanent yellow tech skip
    //
    if (this.game.players_info[this.game.player-1].permanent_yellow_tech_prerequisite == 1) {
      for (let j = 0; j < prereqs.length; j++) {
        if (prereqs[j] == "yellow") {
          prereqs.splice(j, 1);
  	  j = prereqs.length;
        }
      }
    }

    //
    // we don't meet the prereqs but have a skip
    //
    if (prereqs.length == 1 && this.game.players_info[this.game.player-1].permanent_ignore_number_of_tech_prerequisites_on_nonunit_upgrade >= 1) {
      prereqs.splice(0, 1);
    }

    //
    // we don't meet the prereqs but have a skip
    //
    if (prereqs.length == 1 && this.game.players_info[this.game.player-1].temporary_ignore_number_of_tech_prerequisites_on_nonunit_upgrade >= 1) {
      prereqs.splice(0, 1);
    }

    //
    // we meet the pre-reqs
    //
    if (prereqs.length == 0) {
      if (techfaction == "all" || techfaction == this.game.players_info[this.game.player-1].faction) {
	if (techtype == "normal") {
          return 1;
	}
      }
    }

    return 0;
  
  }


  returnAvailableVotes(player) {

    let array_of_cards = this.returnPlayerPlanetCards(player);
    let total_available_votes = 0;
    for (let z = 0; z < array_of_cards.length; z++) {
      total_available_votes += this.game.planets[array_of_cards[z]].influence;
    }
    return total_available_votes;

  }


  returnPlayersLeastDefendedPlanetInSector(player, sector) {

    let sys = this.returnSectorAndPlanets(sector);
    let least_defended = 100;
    let least_defended_idx = 0;

    if (sys.p.length == 0) { return -1; }
    
    for (let i = 0; i < sys.p.length; i++) {
      if (sys.p[i].owner == player && sys.p[i].units[player-1].length < least_defended) {
	least_defended = sys.p[i].units[player-1].length;
	least_defended_idx = i;
      }
    }

    return least_defended_idx;

  }

  returnPlayerFleetInSector(player, sector) {

    let sys = this.returnSectorAndPlanets(sector);
    let fleet = '';

    for (let i = 0; i < sys.s.units[player-1].length; i++) {
      if (i > 0) { fleet += ", "; }
      fleet += sys.s.units[player-1][i].name;
      //if (sys.s.units[player-1][i].storage.length > 0) {
      //  fleet += ' (';
      //  for (let ii = 0; ii < sys.s.units[player-1][i].storage.length; ii++) {
      //    if (ii > 0) { fleet += ", "; }
      //    fleet += sys.s.units[player-1][i].storage[ii].name;
      //  }
      //  fleet += ')';
      //}
    }
    return fleet;
  }


  returnAvailableResources(player) {
  
    let array_of_cards = this.returnPlayerUnexhaustedPlanetCards(player); // unexhausted
    let total_available_resources = 0;
    for (let z = 0; z < array_of_cards.length; z++) {
      total_available_resources += this.game.planets[array_of_cards[z]].resources;
    }
    total_available_resources += this.game.players_info[player-1].goods;
    return total_available_resources;
  
  }


  returnAvailableInfluence(player) {
  
    let array_of_cards = this.returnPlayerUnexhaustedPlanetCards(player); // unexhausted
    let total_available_influence = 0;
    for (let z = 0; z < array_of_cards.length; z++) {
      total_available_influence += this.game.planets[array_of_cards[z]].influence;
    }
    total_available_influence += this.game.players_info[player-1].goods;
    return total_available_influence;
  
  }
  
  
  returnAvailableTradeGoods(player) {
  
    return this.game.players_info[player-1].goods;
  
  }
  
  
  canPlayerActivateSystem(pid) {
  
    let imperium_self = this;
    let sys = imperium_self.returnSectorAndPlanets(pid);
    if (sys.s.activated[imperium_self.game.player-1] == 1) { return 0; }
    return 1;
  
  }




  returnDefender(attacker, sector, planet_idx=null) {

    let sys = this.returnSectorAndPlanets(sector);

    let defender = -1;
    let defender_found = 0;

    if (planet_idx == null) {
      for (let i = 0; i < sys.s.units.length; i++) {
        if (attacker != (i+1)) {
          if (sys.s.units[i].length > 0) {
            defender = (i+1);
          }
        }
      }
      return defender;
    }

    //
    // planet_idx is not null
    //
    for (let i = 0; i < sys.p[planet_idx].units.length; i++) {
      if (attacker != (i+1)) {
        if (sys.p[planet_idx].units[i].length > 0) {
          defender = (i+1);
        }
      }
    }

    if (defender == -1) {
      if (sys.p[planet_idx].owner != attacker) {
	return sys.p[planet_idx].owner;
      }
    }

    return defender;
  }


  hasUnresolvedSpaceCombat(attacker, sector) {
 
    let sys = this.returnSectorAndPlanets(sector);
 
    let defender = 0;
    let defender_found = 0;
    let attacker_found = 0;

    for (let i = 0; i < sys.s.units.length; i++) {
      if (attacker != (i+1)) {
        if (sys.s.units[i].length > 0) {
          defender = (i+1);
          defender_found = 1;
        }
      } else {
        if (sys.s.units[i].length > 0) {
	  attacker_found = 1;
	}
      }
    }

    if (defender_found == 0) {
      return 0;
    }
    if (defender_found == 1 && attacker_found == 1) { 
      return 1;
    }

    return 0;

  }



  hasUnresolvedGroundCombat(attacker, sector, pid) {

    let sys = this.returnSectorAndPlanets(sector);

    let defender = -1;
    for (let i = 0; i < sys.p[pid].units.length; i++) {
      if (sys.p[pid].units[i].length > 0) {
        if ((i+1) != attacker) {
	  defender = (i+1);
	}
      }
    }

    if (defender == attacker) { 
      return 0; 
    }

    if (attacker == -1) {
      attacker_forces = 0;
    } else {
      attacker_forces = this.returnNumberOfGroundForcesOnPlanet(attacker, sector, pid);
    }
    if (defender == -1) {
      defender_forces = 0;
    } else {
      defender_forces = this.returnNumberOfGroundForcesOnPlanet(defender, sector, pid);
    }

    if (attacker_forces > 0 && defender_forces > 0) { return 1; }
    return 0;

  }


  

  isPlanetExhausted(planetname) {
    if (this.game.planets[planetname].exhausted == 1) { return 1; }
    return 0;
  }

  returnAdjacentSectors(sector) {

    let adjasec = [];
    let s = this.addWormholesToBoardTiles(this.returnBoardTiles());  
    for (let i in s) {

      if (this.game.board[i]) {
        let sys = this.returnSectorAndPlanets(i);
        if (sys.s.sector == sector) {
          for (let t = 0; t < s[i].neighbours.length; t++) {

	    let sys2 = this.returnSectorAndPlanets(s[i].neighbours[t]);

	    adjasec.push(sys2.s.sector);

  	  }
        }
      }

    }
    return adjasec;

  }



  areSectorsAdjacent(sector1, sector2) {

    let s = this.addWormholesToBoardTiles(this.returnBoardTiles()); 

    if (sector1 === "") { return 0; }
    if (sector2 === "") { return 0; }

    let sys1 = this.returnSectorAndPlanets(sector1);
    let sys2 = this.returnSectorAndPlanets(sector2);
    let tile1 = sys1.s.tile;
    let tile2 = sys2.s.tile;

console.log(tile1 + " tile2 " + tile2);

    if (tile1 === "" || tile2 === "") { return 0; }

console.log("CHECKING JSON");
console.log(JSON.stringify(this.game.board));

    if (s[tile1].neighbours.includes(tile2)) { return 1; }
    if (s[tile2].neighbours.includes(tile1)) { return 1; }

    for (let i = 0; i < this.game.state.temporary_adjacency.length; i++) {
      if (temporary_adjacency[i][0] == sector1 && temporary_adjacency[i][1] == sector2) { return 1; }
      if (temporary_adjacency[i][0] == sector2 && temporary_adjacency[i][1] == sector1) { return 1; }
    }

    return 0;
  }
  
  arePlayersAdjacent(player1, player2) {

console.log("checking if players: " + player1 + " + " + player2 + " are adjacent");

    let p1sectors = this.returnSectorsWithPlayerUnits(player1);
    let p2sectors = this.returnSectorsWithPlayerUnits(player2);

console.log(JSON.stringify(p1sectors));
console.log(JSON.stringify(p2sectors));

    for (let i = 0; i < p1sectors.length; i++) {
      for (let ii = 0; ii < p2sectors.length; ii++) {
        if (p1sectors[i] === p2sectors[ii]) { return 1; }
	if (this.areSectorsAdjacent(p1sectors[i], p2sectors[ii])) { return 1; }
      }
    }

console.log("no");
    return 0;
  }

  isPlayerAdjacentToSector(player, sector) {

    let p1sectors = this.returnSectorsWithPlayerUnits(player);

console.log("JALKING: " + JSON.stringify(p1sectors));

    for (let i = 0; i < p1sectors.length; i++) {
      if (p1sectors[i] == sector) { return 1; }
      if (this.areSectorsAdjacent(p1sectors[i], sector)) { return 1; }
    }
    return 0;

  }



  isPlayerShipAdjacentToSector(player, sector) {

    let p1sectors = this.returnSectorsWithPlayerShips(player);

    for (let i = 0; i < p1sectors.length; i++) {
      if (p1sectors[i] == sector) { return 1; }
      if (this.areSectorsAdjacent(p1sectors[i], sector)) { return 1; }
    }
    return 0;

  }


  returnPlanetsOnBoard(filterfunc=null) {
    let planets_to_return = [];
    for (let i in this.game.planets) {
      if (this.game.planets[i].tile != "") {
	if (filterfunc == null) {
	  planets_to_return.push(i);
	} else {
	  if (filterfunc(this.game.planets[i])) {
	    planets_to_return.push(i);
	  }
	}
      }
    }
    return planets_to_return;
  }

  returnSectorsOnBoard(filterfunc=null) {
    let sectors_to_return = [];
    for (let i in this.game.sectors) {
      if (this.game.sectors[i].tile) {
	if (filterfunc == null) {
  	  sectors_to_return.push(i);
        } else {
	  if (filterfunc(this.game.sectors[i])) {
  	    sectors_to_return.push(i);
	  }
	}
      }
    }
    return sectors_to_return;
  }


  returnSectorsWithPlayerShips(player) {
    let sectors_with_units = [];
    for (let i in this.game.sectors) {
      if (this.doesSectorContainPlayerShips(player, i)) {
	sectors_with_units.push(i);
      }
    }
    return sectors_with_units;
  }

  returnSectorsWithPlayerUnits(player) {
    let sectors_with_units = [];
    for (let i in this.game.sectors) {
      if (this.doesSectorContainPlayerUnits(player, i)) {
	sectors_with_units.push(i);
      }
    }
    return sectors_with_units;
  }

  canPlayerProduceInSector(player, sector) {
    if (this.game.players_info[player-1].may_player_produce_without_spacedock == 1) {
      return 1;
    }
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.p.length; i++) {
      for (let k = 0; k < sys.p[i].units[player-1].length; k++) {
        if (sys.p[i].units[player-1][k].type == "spacedock") {
          return 1;
        }
      }
    }
    return 0;
  }



  canPlayerInvadePlanet(player, sector) {
  
    let sys = this.returnSectorAndPlanets(sector);
    let space_transport_available = 0;
    let planets_ripe_for_plucking = 0;
    let total_available_infantry = 0;
    let can_invade = 0;
  
    //
    // any planets available to invade?
    //
    for (let i = 0; i < sys.p.length; i++) {
      if (sys.p[i].locked == 0 && sys.p[i].owner != player) { planets_ripe_for_plucking = 1; }
    }
    if (planets_ripe_for_plucking == 0) { return 0; }

  
  
    //
    // do we have any infantry for an invasion
    //
    for (let i = 0; i < sys.s.units[player-1].length; i++) {
      let unit = sys.s.units[player-1][i];
      for (let k = 0; k < unit.storage.length; k++) {
        if (unit.storage[k].type == "infantry") {
          total_available_infantry += 1;
        }
      }
      if (unit.capacity > 0) { space_tranport_available = 1; }
    }
  
    //
    // return yes if troops in space
    //
    if (total_available_infantry > 0) {
      return 1;
    }
  
    //
    // otherwise see if we can transfer over from another planet in the sector
    //
    if (space_transport_available == 1) {
      for (let i = 0; i < sys.p.length; i++) {
        for (let k = 0; k < sys.p[i].units[player-1].length; k++) {
          if (sys.p[i].units[player-1][k].type == "infantry") { return 1; }
        }
      }
    }
  
    //
    // sad!
    //
    return 0;
  }
  
  
  

  returnSpeakerOrder() {

    let speaker = this.game.state.speaker;
    let speaker_order = [];
  

    for (let i = 0; i < this.game.players.length; i++) {
      let thisplayer = (i+speaker+1);
      if (thisplayer > this.game.players.length) { thisplayer-=this.game.players.length; }
      speaker_order.push(thisplayer);
    }

    return speaker_order;

  }



  returnInitiativeOrder() {
  
    let strategy_cards   = this.returnStrategyCards();
    let card_io_hmap  = [];
    let player_lowest = [];

    for (let j in strategy_cards) {
      card_io_hmap[j] = strategy_cards[j].rank;
    }

    for (let i = 0; i < this.game.players_info.length; i++) {

      player_lowest[i] = 100000;

      for (let k = 0; k < this.game.players_info[i].strategy.length; k++) {
        let sc = this.game.players_info[i].strategy[k];
        let or = card_io_hmap[sc];
        if (or < player_lowest[i]) { player_lowest[i] = or; }
      }
    }

  
    let loop = player_lowest.length;
    let player_initiative_order = [];

    for (let i = 0; i < loop; i++) {

      let lowest_this_loop 	 = 100000;
      let lowest_this_loop_idx = 0;

      for (let ii = 0; ii < player_lowest.length; ii++) {
        if (player_lowest[ii] < lowest_this_loop) {
	  lowest_this_loop = player_lowest[ii];
	  lowest_this_loop_idx = ii;
	}
      }

      player_lowest[lowest_this_loop_idx] = 999999;
      player_initiative_order.push(lowest_this_loop_idx+1);

    }

    return player_initiative_order;
  
  }




  returnSectorsWithinHopDistance(destination, hops, player=null) {

    let sectors = [];
    let distance = [];
    let s = this.addWormholesToBoardTiles(this.returnBoardTiles());  

    sectors.push(destination);
    distance.push(0);
  
    //
    // find which systems within move distance (hops)
    //
    for (let i = 0; i < hops; i++) {
      let tmp = JSON.parse(JSON.stringify(sectors));
      for (let k = 0; k < tmp.length; k++) {

//
// 2/3-player game will remove some tiles
//
if (this.game.board[tmp[k]] != undefined) {

	//
	// if the player is provided and this sector has ships from 
	// other players, then we cannot calculate hop distance as 
	// it would mean moving through systems that are controlled by
	// other players.
	//
	let can_hop_through_this_sector = 1;
	if (player == null) {} else {
	  if (this.game.players_info[player-1].move_through_sectors_with_opponent_ships == 1 || this.game.players_info[player-1].temporary_move_through_sectors_with_opponent_ships == 1) {
	  } else {
	    if (this.doesSectorContainNonPlayerShips(player, tmp[k])) {
	      can_hop_through_this_sector = 0;
	    }
	  }
	}

	//
	// otherwise we can't move into our destination
	//
	if (tmp[k] == destination) { can_hop_through_this_sector = 1; }


	if (can_hop_through_this_sector == 1) {

	  //
	  // board adjacency 
	  //
          let neighbours = s[tmp[k]].neighbours;
          for (let m = 0; m < neighbours.length; m++) {
    	    if (!sectors.includes(neighbours[m]))  {
  	      sectors.push(neighbours[m]);
  	      distance.push(i+1);
  	    }
          }

	  //
	  // temporary adjacency 
	  //
          for (let z = 0; z < this.game.state.temporary_adjacency.length; z++) {
	    if (tmp[k] == this.game.state.temporary_adjacency[z][0]) {
  	      if (!sectors.includes(this.game.state.temporary_adjacency[z][1]))  {
  	        sectors.push(this.game.state.temporary_adjacency[z][1]);
  	        distance.push(i+1);
  	      }
	    }
	    if (tmp[k] == this.game.state.temporary_adjacency[z][1]) {
  	      if (!sectors.includes(this.game.state.temporary_adjacency[z][0]))  {
  	        sectors.push(this.game.state.temporary_adjacency[z][0]);
  	        distance.push(i+1);
  	      }
	    }
	  }
	}
}
      }
    }
    return { sectors : sectors , distance : distance };
  }
  




  doesPlanetHavePDS(planet) {
    if (planet.units == undefined) {
      let x = this.game.planets[planet];
      if (x.units) { planet = x; }
      else { return 0; }
    }
    for (let i = 0; i < planet.units.length; i++) {
      for (let ii = 0; ii < planet.units[i].length; ii++) {
	if (planet.units[i][ii].type == "pds") { return 1; }
      }
    }
    return 0;
  }


  doesPlanetHaveSpaceDock(planet) {
    if (planet.units == undefined) { planet = this.game.planets[planet]; }
    for (let i = 0; i < planet.units.length; i++) {
      for (let ii = 0; ii < planet.units[i].length; ii++) {
	if (planet.units[i][ii].type == "spacedock") { return 1; }
      }
    }
    return 0;
  }


  doesPlanetHaveInfantry(planet) {
console.log("p: " + planet);
    if (planet.units == undefined) { planet = this.game.planets[planet]; }
    for (let i = 0; i < planet.units.length; i++) {
      for (let ii = 0; ii < planet.units[i].length; ii++) {
	if (planet.units[i][ii].type == "infantry") { return 1; }
      }
    }
    return 0;
  }


  doesPlanetHaveUnits(planet) {
    if (planet.units == undefined) { planet = this.game.planets[planet]; }
    for (let i = 0; i < planet.units.length; i++) {
      if (planet.units[i].length > 0) { return 1; }
    }
    return 0;
  }




  doesPlanetHavePlayerInfantry(planet, player) {
    if (planet.units == undefined) { planet = this.game.planets[planet]; }
    for (let ii = 0; ii < planet.units[player-1].length; ii++) {
      if (planet.units[i][ii].type == "infantry") { return 1; }
    }
    return 0;
  }


  doesPlanetHavePlayerSpaceDock(planet, player) {
    for (let ii = 0; ii < planet.units[player-1].length; ii++) {
      if (planet.units[i][ii].type == "spacedock") { return 1; }
    }
    return 0;
  }


  doesPlanetHavePlayerPDS(planet, player) {
    for (let ii = 0; ii < planet.units[player-1].length; ii++) {
      if (planet.units[i][ii].type == "pds") { return 1; }
    }
    return 0;
  }



  doesPlayerHaveRider(player) {

    for (let i = 0; i < this.game.state.riders.length; i++) {
      if (this.game.state.riders[i].player == player) { return 1; }
    }

    if (this.game.turn) {
      for (let i = 0; i < this.game.turn.length; i++) {
	let x = this.game.turn[i].split("\t");
	if (x[0] == "rider") { if (x[1] == this.game.player) { return 1; } }
      }
    }

    return 0;

  }


  doesPlayerHaveInfantryOnPlanet(player, sector, planet_idx) {

    let sys = this.returnSectorAndPlanets(sector);
    if (sys.p[planet_idx].units[player-1].length > 0) { return 1; }
    return 0;

  }



  doesPlayerHaveShipsInSector(player, sector) {

    let sys = this.returnSectorAndPlanets(sector);
    if (sys.s.units[player-1].length > 0) { return 1; }
    return 0;

  }


  doesPlayerHaveUnitOnBoard(player, unittype) {

    for (let i in this.game.sectors) {
      for (let ii = 0; ii < this.game.sectors[i].units[player-1].length; ii++) {
	if (this.game.sectors[i].units[player-1][ii].type == unittype) { return 1; }
      }
    }

    for (let i in this.game.planets) {
      for (let ii = 0; ii < this.game.planets[i].units[player-1].length; ii++) {
	if (this.game.planets[i].units[player-1][ii].type == unittype) { return 1; }
      }
    }

    return 1;

  }


  doesPlayerHavePDSUnitsWithinRange(attacker, player, sector) {

console.log("SECTOR: " + sector);

    let sys = this.returnSectorAndPlanets(sector);
    let x = this.returnSectorsWithinHopDistance(sector, 1);
    let sectors = [];
    let distance = [];

    sectors = x.sectors;
    distance = x.distance;

    //
    // get pds units within range
    //
    let battery = this.returnPDSWithinRange(attacker, sector, sectors, distance);

    for (let i = 0; i < battery.length; i++) {
      if (battery[i].owner == player) { return 1; }
    }

    return 0;
  }


  returnPDSWithinRangeOfSector(attacker, player, sector) {

    let sys = this.returnSectorAndPlanets(sector);
    let x = this.returnSectorsWithinHopDistance(sector, 1);
    let sectors = [];
    let distance = [];

    sectors = x.sectors;
    distance = x.distance;

    //
    // get pds units within range
    //
    return this.returnPDSWithinRange(attacker, sector, sectors, distance);

  }





  returnPDSWithinRange(attacker, destination, sectors, distance) {
  
    let z = this.returnEventObjects();
    let battery = [];
  
    for (let i = 0; i < sectors.length; i++) {
  
      let sys = this.returnSectorAndPlanets(sectors[i]);
  
      //
      // some sectors not playable in 3 player game
      //
      if (sys != null) {
        for (let j = 0; j < sys.p.length; j++) {
          for (let k = 0; k < sys.p[j].units.length; k++) {
  	  if (k != attacker-1) {
  	      for (let z = 0; z < sys.p[j].units[k].length; z++) {
    	        if (sys.p[j].units[k][z].type == "pds") {
  		  if (sys.p[j].units[k][z].range >= distance[i]) {
  	            let pds = {};
  	                pds.combat = sys.p[j].units[k][z].combat;
  		        pds.owner = (k+1);
  		        pds.sector = sectors[i];
  	            battery.push(pds);
  	  	  }
  	        }
  	      }
  	    }
          }
        }
      }
    }

/****
    let battery2 = [];   
    for (let i = 0; i < this.game.players_info.length; i++) {

      let owner = (i+1);
      let pds_shots = 0;
      let hits_on = 6;

      for (let j = 0; j < battery.length; j++) {
	if (battery[j].owner == owner) { pds_shots++; hits_on = battery[j].combat; }
      }

      battery2.push({ player : owner , shots : pds_shots });
    }

****/

    return battery;
  
  }
  




  returnShipsMovableToDestinationFromSectors(destination, sectors, distance) {
  
    let imperium_self = this;
    let ships_and_sectors = [];
    for (let i = 0; i < sectors.length; i++) {
  
      let sys = this.returnSectorAndPlanets(sectors[i]);
      
  
      //
      // some sectors not playable in 3 player game
      //
      if (sys != null) {
  
        let x = {};
        x.ships = [];
        x.ship_idxs = [];
        x.sector = null;
        x.distance = distance[i];
        x.adjusted_distance = [];
  
        //
        // only move from unactivated systems
        //
        if (sys.s.activated[imperium_self.game.player-1] == 0) {
  
          for (let k = 0; k < sys.s.units[this.game.player-1].length; k++) {
            let this_ship = sys.s.units[this.game.player-1][k];
            if (this_ship.move >= distance[i]) {
  	    x.adjusted_distance.push(distance[i]);
              x.ships.push(this_ship);
              x.ship_idxs.push(k);
              x.sector = sectors[i];
            }
          }
          if (x.sector != null) {
            ships_and_sectors.push(x);
          }
        }
  
      }
    }
  
    return ships_and_sectors;
  
  }
 


  returnNumberOfGroundForcesOnPlanet(player, sector, planet_idx) {
  
    let sys = this.returnSectorAndPlanets(sector);
    let num = 0;

    for (let z = 0; z < sys.p[planet_idx].units[player-1].length; z++) {
      if (sys.p[planet_idx].units[player-1][z].strength > 0 && sys.p[planet_idx].units[player-1][z].destroyed == 0) {
        if (sys.p[planet_idx].units[player-1][z].type === "infantry") {
          num++;
        }
      }
    }
  
    return num;
  }


  
  
  ///////////////////////////////
  // Return System and Planets //
  ///////////////////////////////
  //
  // pid can be the tile "2_2" or the sector name "sector42"
  //
  returnSectorAndPlanets(pid) {

    let sys = null;
    
    if (this.game.board[pid] == null) {
      //
      // then this must be the name of a sector
      //
      if (this.game.sectors[pid]) {
        sys = this.game.sectors[pid];
      } else {
        return;
      }
    } else {
      if (this.game.board[pid].tile == null) {
        return;
      } else {
        sys = this.game.sectors[this.game.board[pid].tile];
      }
    }

    if (sys == null) { return null; }

    let planets = [];

    for (let i = 0; i < sys.planets.length; i++) {
      planets[i] = this.game.planets[sys.planets[i]];
    }
  
    return {
      s: sys,
      p: planets
    };
  }; 
  
  


  /////////////////////////////
  // Save System and Planets //
  /////////////////////////////
  saveSystemAndPlanets(sys) {
    for (let key in this.game.sectors) {
      if (this.game.sectors[key].img == sys.s.img) {
        this.game.sectors[key] = sys.s;
        for (let j = 0; j < this.game.sectors[key].planets.length; j++) {
          this.game.planets[this.game.sectors[key].planets[j]] = sys.p[j];
        }
      }
    }
  };
  
  



  
  returnOtherPlayerHomeworldPlanets(player=this.game.player) {
  
    let planets = [];
  
    for (let i = 0; i < this.game.players_info.length; i++) {
      if (this.game.player != (i+1)) {
        let their_home_planets = this.returnPlayerHomeworldPlanets((i+1));
        for (let z = 0; z < their_home_planets.length; z++) {
          planets.push(their_home_planets);
        }
      }
    }
  
    return planets;
  
  }
  
  
  returnPlayerHomeworldPlanets(player=null) {
    if (player == null) { player = this.game.player; }
    let home_sector = this.game.board[this.game.players_info[player-1].homeworld].tile;  // "sector";
    return this.game.sectors[home_sector].planets;
  }
  
  returnPlayerUnexhaustedPlanetCards(player=null) {
    if (player == null) { player = this.game.player; }
    return this.returnPlayerPlanetCards(player, 1);
  }
  returnPlayerExhaustedPlanetCards(player=null) {
    if (player == null) { player = this.game.player; }
    return this.returnPlayerPlanetCards(player, 2);
  }
  // mode = 0 ==> all
  // mode = 1 ==> unexausted
  // mode = 2 ==> exhausted
  //
  returnPlayerPlanetCards(player=null, mode=0) {
  
    if (player == null) { player == parseInt(this.game.player); }

    let x = [];
  
    for (var i in this.game.planets) {

      if (this.game.planets[i].owner == player) {

        if (mode == 0) {
          x.push(i);
        }
        if (mode == 1 && this.game.planets[i].exhausted == 0) {
          x.push(i);
        }
        if (mode == 2 && this.game.planets[i].exhausted == 1) {
  	x.push(i);
        }
      }
    }
  
    return x;
  
  }
  returnPlayerActionCards(player=null, types=[]) {

    if (player == null) { player = this.game.player; }  

    let x = [];
    //
    // deck 2 -- hand #1 -- action cards
    //
    for (let i = 0; i < this.game.deck[1].hand.length; i++) {
      if (types.length == 0) {
	x.push(this.game.deck[1].hand[i]);
      } else {
	if (types.includes(this.action_cards[this.game.deck[1].hand[i]].type)) {
	  x.push(this.game.deck[1].hand[i]);
	}
      }
    }
  
    return x;
  
  }
  returnPlayerObjectives(player=null, types=[]) {

    if (player == null) { player = this.game.player; }  

    let x = [];

    //
    // deck 6 -- hand #5 -- secret objectives
    //
    if (this.game.player == player) {
      for (let i = 0; i < this.game.deck[5].hand.length; i++) {
        if (types.length == 0) {
  	  x.push(this.secret_objectives[this.game.deck[5].hand[i]]);
        } else {
  	  if (types.includes("secret_objectives")) {
	    x.push(this.secret_objectives[this.game.deck[5].hand[i]]);
	  }
        }
      }
    }


    //
    // stage 1 public objectives
    //
    for (let i = 0; i < this.game.state.stage_i_objectives.length; i++) {
      if (types.length == 0) {
	x.push(this.stage_i_objectives[this.game.state.stage_i_objectives[i]]);
      } else {
	if (types.includes("stage_i_objectives")) {
	  x.push(this.stage_i_objectives[this.game.state.stage_i_objectives[i]]);
	}
      }
    }


    //
    // stage 2 public objectives
    //
    for (let i = 0; i < this.game.state.stage_ii_objectives; i++) {
      if (types.length == 0) {
	x.push(this.stage_i_objectives[this.game.state.stage_ii_objectives[i]]);
      } else {
	if (types.includes("stage_ii_objectives")) {
	  x.push(this.stage_i_objectives[this.game.state.stage_ii_objectives[i]]);
	}
      }
    }

    return x;
  
  }
  
  returnPlanetCard(planetname="") {
  
    var c = this.game.planets[planetname];
    if (c == undefined) {
  
      //
      // this is not a card, it is something like "skip turn" or cancel
      //
      return '<div class="noncard">'+cardname+'</div>';
  
    }
  
    var html = `
      <div class="planetcard" style="background-image: url('${c.img}');">
      </div>
    `;
    return html;
  
  }
  
  
  returnStrategyCard(cardname) {
  
    let cards = this.returnStrategyCards();
    let c = cards[cardname];
  
    if (c == undefined) {
  
      //
      // this is not a card, it is something like "skip turn" or cancel
      //
      return '<div class="noncard">'+cardname+'</div>';
  
    }
  
    var html = `
      <div class="strategycard" style="background-image: url('${c.img}');">
        <div class="strategycard_name">${c.name}</div>
      </div>
    `;
    return html;
  
  }
  
  
  returnActionCard(cardname) {

    let cards = this.returnActionCards();
    let c = cards[cardname];
 
  }

  doesSectorContainPlanetOwnedByPlayer(sector, player) {

    let sys = this.returnSectorAndPlanets(sector);
    if (!sys) { return 0; }
    for (let i = 0; i < sys.p.length; i++) {
      if (sys.p[i].owner == player) { 
	return 1;
      }
    }
    return 0;
 
  }

  doesSectorContainUnit(sector, unittype) {

    let sys = this.returnSectorAndPlanets(sector);
    if (!sys) { return 0; }
    for (let i = 0; i < sys.s.units.length; i++) {
      for (let ii = 0; ii < sys.s.units[i].length; ii++) {
        if (sys.s.units[i][ii].type == unittype) {
	  return 1;
	}
      }
    }
    return 0;
 
  }


  doesSectorContainPlayerShip(player, sector) {
    return this.doesSectorContainPlayerShips(player, sector);
  }
  doesSectorContainPlayerShips(player, sector) {
    let sys = this.returnSectorAndPlanets(sector);
    if (!sys) { return 0; }
    if (sys.s.units[player-1].length > 0) { return 1; }
    return 0;
  }

  doesSectorContainShips(sector) {
    let sys = this.returnSectorAndPlanets(sector);
    if (!sys) { return 0; }
    for (let i = 0; i < sys.s.units.length; i++) { 
      if (sys.s.units[i].length > 0) { return 1; }
    }
    return 0;
  }

  doesSectorContainPlayerUnits(player, sector) {
    let sys = this.returnSectorAndPlanets(sector);
    if (!sys) { return 0; }
    if (sys.s.units[player-1].length > 0) { return 1; }
    for (let i = 0; i < sys.p.length; i++) {
      if (sys.p[i].units[player-1].length > 0) { return 1; }
    }
    return 0;
  }


  doesSectorContainNonPlayerUnit(player, sector, unittype) {

    for (let i = 0; i < this.game.players_info.length; i++) {
      if ((i+1) != player) {
	if (this.doesSectorContainPlayerUnit((i+1), sector, unittype)) { return 1; }
      }
    }

    return 0;
 
  }
  
  doesSectorContainNonPlayerShips(player, sector) {
    for (let i = 0; i < this.game.players_info.length; i++) {
      if ((i+1) != player) {
	if (this.doesSectorContainPlayerShips((i+1), sector)) { return 1; }
      }
    }
    return 0;
  }
  

  doesSectorContainPlayerUnit(player, sector, unittype) {

    let sys = this.returnSectorAndPlanets(sector);
    if (!sys) { return 0; }

    for (let i = 0; i < sys.s.units[player-1].length; i++) {
      if (sys.s.units[player-1][i].type == unittype) { return 1; }
    }
    for (let i = 0; i < sys.p.length; i++) {
      for (let ii = 0; ii < sys.p[i].units[player-1].length; ii++) {
        if (sys.p[i].units[player-1][ii].type == unittype) { return 1; }
      }
    }
    return 0;
 
  }
  
  


  


  //
  // this function can be run after a tech bonus is used, to see if 
  // it is really exhausted for the turn, or whether it is from an
  // underlying tech bonus (and will be reset so as to be always
  // available.
  //
  resetTechBonuses() {

    let technologies = this.returnTechnology();

    //
    // reset tech bonuses
    //
    for (let i = 0; i < this.game.players_info.length; i++) {
      for (let ii = 0; ii < this.game.players_info[i].tech.length; ii++) {
        technologies[this.game.players_info[i].tech[ii]].onNewTurn();
      }
    }
  }
 

  resetSpaceUnitTemporaryModifiers(sector) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.s.units.length; i++) {
      for (let ii = 0; ii < sys.s.units[i].length; ii++) {
	this.resetTemporaryModifiers(sys.s.units[i][ii]);
      }
    }
  }
  resetGroundUnitTemporaryModifiers(sector, planet_idx) {
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < sys.p[planet_idx].units.length; i++) {
      for (let ii = 0; ii < sys.p[planet_idx].units[i].length; ii++) {
	this.resetTemporaryModifiers(sys.p[planet_idx].units[i][ii]);
      }
    }
  }


  resetTargetUnits() {
console.log("let a here");
    for (let i = 0; i < this.game.players_info.length; i++) {
console.log(i);
      this.game.players_info[i].target_units = [];
    }
console.log(" ... anddone");
  }

  resetTurnVariables(player) {
    this.game.players_info[player-1].planets_conquered_this_turn = [];
    this.game.players_info[player-1].may_player_produce_without_spacedock = 0;
    this.game.players_info[player-1].may_player_produce_without_spacedock_production_limit = 0;
    this.game.players_info[player-1].may_player_produce_without_spacedock_cost_limit = 0;
    this.game.players_info[player-1].temporary_space_combat_roll_modifier 	= 0;
    this.game.players_info[player-1].temporary_ground_combat_roll_modifier 	= 0;
    this.game.players_info[player-1].temporary_pds_combat_roll_modifier 	= 0;
    this.game.players_info[player-1].temporary_bombardment_combat_roll_modifier 	= 0;
    this.game.players_info[player-1].temporary_move_through_sectors_with_opponent_ships = 0;
    this.game.players_info[player-1].temporary_fleet_move_bonus = 0;
    this.game.players_info[player-1].temporary_ship_move_bonus = 0;
    this.game.players_info[player-1].ground_combat_dice_reroll = 0;
    this.game.players_info[player-1].space_combat_dice_reroll               = 0;
    this.game.players_info[player-1].pds_combat_dice_reroll                 = 0;
    this.game.players_info[player-1].bombardment_combat_dice_reroll         = 0;
    this.game.players_info[player-1].combat_dice_reroll                     = 0;

    for (let i = 0; i < this.game.players_info.length; i++) {
      this.game.players_info[i].traded_this_turn 			    = 0;
    }

    this.game.state.temporary_adjacency = [];
    this.game.state.temporary_wormhole_adjacency = 0;
  }




  deactivateSectors() {

    //
    // deactivate all systems
    //
    for (let sys in this.game.sectors) {
      for (let j = 0; j < this.totalPlayers; j++) {
        this.game.sectors[sys].activated[j] = 0;
      }
    }

  }
 


  exhaustPlanet(pid) {
    this.game.planets[pid].exhausted = 1;
  }
  unexhaustPlanet(pid) {
    this.game.planets[pid].exhausted = 0;
  }

  updatePlanetOwner(sector, planet_idx, new_owner=-1) {

    let planetname = "";
    let sys = this.returnSectorAndPlanets(sector);
    let owner = new_owner;
    let existing_owner = sys.p[planet_idx].owner;

    //
    // new_owner does not need to be provided if the player has units on the planet
    //
    for (let i = 0; i < sys.p[planet_idx].units.length; i++) {
      if (sys.p[planet_idx].units[i].length > 0) { owner = i+1; }
    }
    if (owner != -1) {
      sys.p[planet_idx].owner = owner;
      sys.p[planet_idx].exhausted = 1;
    }

    for (let pidx in this.game.planets) {
      if (this.game.planets[pidx].name === sys.p[planet_idx].name) {
	planetname = pidx;
      }
    }

    if (existing_owner != owner) {
      this.game.players_info[owner-1].planets_conquered_this_turn.push(sys.p[planet_idx].name);
      let z = this.returnEventObjects();
      for (let z_index in z) {
	z[z_index].gainPlanet(this, owner, planetname); 
	if (existing_owner != -1) {
	  z[z_index].losePlanet(this, existing_owner, planetname); 
        }
      }

    }

    this.saveSystemAndPlanets(sys);
  }
  
  
  
  
  


  eliminateDestroyedUnitsInSector(player, sector) {
  
    if (player < 0) { return; }
  
    let sys = this.returnSectorAndPlanets(sector);
  
    //
    // in space
    //
    for (let z = 0; z < sys.s.units[player-1].length; z++) {
      if (sys.s.units[player-1][z].destroyed == 1) {
        sys.s.units[player-1].splice(z, 1);
        z--;
      }
    }
  
    //
    // on planets
    //
    for (let planet_idx = 0; planet_idx < sys.p.length; planet_idx++) {
      for (let z = 0; z < sys.p[planet_idx].units[player-1].length; z++) {
        if (sys.p[planet_idx].units[player-1][z].destroyed == 1) {
console.log("ELIMINATING DESTROYED UNIT FROM PLAYER ARRAY ON PLANET");
          sys.p[planet_idx].units[player-1].splice(z, 1);
          z--;
        }
      }
    }
  
    this.saveSystemAndPlanets(sys);
  
  }
  




  eliminateDestroyedUnitsOnPlanet(player, sector, planet_idx) {
  
    if (player < 0) { return; }
  
    let sys = this.returnSectorAndPlanets(sector);
  
    for (let z = 0; z < sys.p[planet_idx].units[player-1].length; z++) {
      if (sys.p[planet_idx].units[player-1][z].destroyed == 1) {
        sys.p[planet_idx].units[player-1].splice(z, 1);
        z--;
      }
    }
  
    this.saveSystemAndPlanets(sys);
  
  }




  assignHitsToGroundForces(attacker, defender, sector, planet_idx, hits) {

    let z = this.returnEventObjects();

    let ground_forces_destroyed = 0;  
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < hits; i++) {
  
      //
      // find weakest unit
      //
      let weakest_unit = -1;
      let weakest_unit_idx = -1;
      for (let z = 0; z < sys.p[planet_idx].units[defender-1].length; z++) {
        let unit = sys.p[planet_idx].units[defender-1][z];

        if (unit.strength > 0 && weakest_unit_idx == -1 && unit.destroyed == 0) {
  	  weakest_unit = sys.p[planet_idx].units[defender-1].strength;
  	  weakest_unit_idx = z;
        }

        if (unit.strength > 0 && unit.strength < weakest_unit && weakest_unit_idx != -1) {
  	  weakest_unit = unit.strength;
  	  weakest_unit_idx = z;
        }
      }
  
      //
      // and assign 1 hit
      //
      if (weakest_unit_idx != -1) {
        sys.p[planet_idx].units[defender-1][weakest_unit_idx].strength--;
        if (sys.p[planet_idx].units[defender-1][weakest_unit_idx].strength <= 0) {

console.log(this.returnFaction(defender) + " has assigned a hit to their weakest unit...");

          ground_forces_destroyed++;
          sys.p[planet_idx].units[defender-1][weakest_unit_idx].destroyed = 1;

	  for (z_index in z) {
            sys.p[planet_idx].units[defender-1][weakest_unit_idx] = z[z_index].unitDestroyed(this, attacker, sys.p[planet_idx].units[defender-1][weakest_unit_idx]);
	  }

        }
      }
    }

    this.saveSystemAndPlanets(sys);
    return ground_forces_destroyed;

  }




  assignHitsToSpaceFleet(attacker, defender, sector, hits) {

    let z = this.returnEventObjects();
    let ships_destroyed = 0;  
    let sys = this.returnSectorAndPlanets(sector);
    for (let i = 0; i < hits; i++) {
  
      //
      // find weakest unit
      //
      let weakest_unit = -1;
      let weakest_unit_idx = -1;
      for (let z = 0; z < sys.s.units[defender-1].length; z++) {
        let unit = sys.s.units[defender-1][z];
        if (unit.strength > 0 && weakest_unit_idx == -1 && unit.destroyed == 0) {
  	  weakest_unit = sys.s.units[defender-1][z].strength;
  	  weakest_unit_idx = z;
        }
        if (unit.strength > 0 && unit.strength < weakest_unit && weakest_unit_idx != -1) {
  	  weakest_unit = unit.strength;
  	  weakest_unit_idx = z;
        }
      }
  
      //
      // and assign 1 hit
      //
      if (weakest_unit_idx != -1) {
        sys.s.units[defender-1][weakest_unit_idx].strength--;
        if (sys.s.units[defender-1][weakest_unit_idx].strength <= 0) {
	  ships_destroyed++;
          sys.s.units[defender-1][weakest_unit_idx].destroyed = 1;

	  for (z_index in z) {
            sys.s.units[defender-1][weakest_unit_idx] = z[z_index].unitDestroyed(this, attacker, sys.s.units[defender-1][weakest_unit_idx]);
	  }

        }
      }
    }
  
    this.saveSystemAndPlanets(sys);
    return ships_destroyed;  

  }
  
  




//
// redraw all sectors
//
displayBoard() {
  for (let i in this.game.systems) {
    this.updateSectorGraphics(i);
  }
  this.addEventsToBoard();
}


/////////////////////////
// Add Events to Board //
/////////////////////////
addEventsToBoard() {

  let imperium_self = this;
  let pid = "";

  $('.sector').off();
  $('.sector').on('mouseenter', function () {
    pid = $(this).attr("id");
    imperium_self.showSector(pid);
  }).on('mouseleave', function () {
    pid = $(this).attr("id");
    imperium_self.hideSector(pid);
  });

}



addUIEvents() {

  var imperium_self = this;

  if (this.browser_active == 0) { return; }

  GameBoardSizer.render(this.app, this.data);
  GameBoardSizer.attachEvents(this.app, this.data, '.gameboard');

  //make board draggable
  $('#hexGrid').draggable();
  //add ui functions  
  //log-lock
  document.querySelector('.log').addEventListener('click', (e) => {
    document.querySelector('.log').toggleClass('log-lock');
  });

  document.querySelector('.leaderboardbox').addEventListener('click', (e) => {
    document.querySelector('.leaderboardbox').toggleClass('leaderboardbox-lock');
  });

  //set player highlight color
  document.documentElement.style.setProperty('--my-color', `var(--p${this.game.player})`);

  //add faction buttons
  var html = "";
  var faction_initial = "";
  var factions_enabled = [];

  for (let i = 0; i < this.game.players_info.length; i++) {
    factions_enabled.push(0);
    let faction_name = this.returnFaction((i+1));
    let faction_initial = "";
    if (faction_name[0] != "") { faction_initial = faction_name[0]; }
    if (faction_name.indexOf("of ") > -1) {
      faction_initial = faction_name.split("of ")[faction_name.split("of ").length-1].charAt(0);
    }
    html += `<div data-id="${(i+1)}" class="faction_button p${(i+1)}" style="border-color:var(--p${(i+1)});">${faction_initial}</div>`;
  };
  document.querySelector('.faction_buttons').innerHTML = html;

  //add faction names to their sheets
  for (let i = 0; i < this.game.players_info.length; i++) {
    document.querySelector('.faction_name.p' + (i+1)).innerHTML = this.returnFaction(i+1);
    let factions = this.returnFactions();
    document.querySelector('.faction_sheet.p' + (i+1)).style.backgroundImage = "url('./img/factions/" + factions[this.game.players_info[i].faction].background + "')";
  };

  document.querySelectorAll('.faction_button').forEach(el => {
    el.addEventListener('click', (e) => {
      for (let i = 0; i < imperium_self.game.players_info.length; i++) {
        document.querySelector(`.faction_content.p${(i+1)}`).innerHTML = imperium_self.returnFactionSheet(imperium_self, (i+1));
      }
      if (document.querySelector('.interface_overlay').classList.contains('hidden')) {
        document.querySelector('.interface_overlay').classList.remove('hidden');
      } else {
      }
      let is_visible = 0;
      let faction_idx = e.target.dataset.id-1;
      if (factions_enabled[faction_idx] == 1) {
	factions_enabled[faction_idx] = 0;
      } else {
	factions_enabled[faction_idx] = 1;
      }
      document.querySelector('.faction_sheet.p' + e.target.dataset.id).toggleClass('hidden');
      for (let i = 0; i < imperium_self.game.players_info.length; i++) {
        if (factions_enabled[i] > 0) { is_visible++; }
      }
      if (is_visible == 0) {
        document.querySelector('.interface_overlay').classList.add('hidden');
      }
    });
  });

  document.querySelectorAll('.faction_sheet').forEach(el => {
    el.addEventListener('click', (e) => {
      document.querySelector('.interface_overlay').classList.add('hidden');
    });
  });

  for (let i = 0; i < this.game.players_info.length; i++) {
    document.querySelector(`.faction_content.p${(i+1)}`).innerHTML = imperium_self.returnFactionSheet(imperium_self, (i+1));
  }

  var html = `
    <div class="hud-token-count">
      <div>	
        <span class="fa-stack fa-3x">
        <i class="fas fa-dice-d20 fa-stack-2x pc white-stroke"></i>
        <span class="fa fa-stack-1x">
        <div id="token_display_command_token_count" class="token_count command_token_count">
        ${this.game.players_info[this.game.player-1].command_tokens}
        </div>
        </span>
        </span>
      </div>
      <div>
        <span class="fa-stack fa-3x">
        <i class="far fa-futbol fa-stack-2x pc white-stroke"></i>
        <span class="fa fa-stack-1x">
        <div id="token_display_strategy_token_count" class="token_count strategy_token_count">
        ${this.game.players_info[this.game.player-1].strategy_tokens}
        </div>
        </span>
        </span>
      </div>
      <div>
        <span class="fa-stack fa-3x">
        <i class="fas fa-space-shuttle fa-stack-2x pc white-stroke"></i>
        <span class="fa fa-stack-1x">
        <div id="token_display_fleet_supply_count" class="token_count fleet_supply_count">
        ${this.game.players_info[this.game.player-1].fleet_supply}
        </div>
        </span>
        </span>
      </div>
      <div>
        <span class="fa-stack fa-3x">
        <i class="fas fa-box fa-stack-2x pc white-stroke"></i>
        <span class="fa fa-stack-1x">
        <div id="token_display_commodities_count" class="token_count commodities_count">
        ${this.game.players_info[this.game.player-1].commodities}
        </div>
        </span>
        </span>
      </div>
      <div>
        <span class="fa-stack fa-3x">
        <i class="fas fa-database fa-stack-2x pc white-stroke"></i>
        <span class="fa fa-stack-1x">
        <span id="token_display_trade_goods_count" class="token_count trade_goods_count">
        ${this.game.players_info[this.game.player-1].goods}
        </div>
        </span>
        </span>
      </div>
    </div>`;

    document.querySelector('.hud-header').innerHTML += html;

  document.querySelectorAll('.faction_sheet_buttons div').forEach((el) => {
    var target = el.dataset.action;
    el.addEventListener('click', (el) => {
      document.querySelectorAll('.'+target+'.anchor').forEach((sec) => {
        sec.parentElement.scrollTop = sec.offsetTop - sec.parentElement.offsetTop;
      });
    });
  });
}


returnFactionSheet(imperium_self, player) {

  let html = `
        <div class="faction_sheet_token_box" id="faction_sheet_token_box">
        <div>Command</div>
        <div>Strategy</div>
        <div>Fleet</div>
        <div>	
          <span class="fa-stack fa-3x">
          <i class="fas fa-dice-d20 fa-stack-2x pc white-stroke"></i>
          <span class="fa fa-stack-1x">
          <span class="token_count commend_token_count">
          ${this.game.players_info[player - 1].command_tokens}
          </span>
          </span>
          </span>
        </div>
        <div>
          <span class="fa-stack fa-3x">
          <i class="far fa-futbol fa-stack-2x pc white-stroke"></i>
          <span class="fa fa-stack-1x">
          <span class="token_count strategy_token_count">
          ${this.game.players_info[player - 1].strategy_tokens}
          </span>
          </span>
          </span>
        </div>
        <div>
          <span class="fa-stack fa-3x">
          <i class="fas fa-space-shuttle fa-stack-2x pc white-stroke"></i>
          <span class="fa fa-stack-1x">
          <span class="token_count fleet_supply_count">
          ${this.game.players_info[player - 1].fleet_supply}
          </span>
          </span>
          </span>
        </div>
      </div>
      <div class="faction_sheet_active">
   `;


    //
    // ACTION CARDS
    //
    html += `
      <h3 class="action anchor">Action Cards</h3>
      <div class="faction_sheet_action_card_box" id="faction_sheet_action_card_box">
      `;
      if (imperium_self.game.player == player) {

        let ac = imperium_self.returnPlayerActionCards(imperium_self.game.player);
	for (let i = 0; i < ac.length; i++) {
          html += `
            <div class="faction_sheet_action_card bc">
              <div class="action_card_name">${imperium_self.action_cards[ac[i]].name}</div>
              <div class="action_card_content">${imperium_self.action_cards[ac[i]].text}</div>
            </div> 
	  `;
	}

      } else {

	let acih = imperium_self.game.players_info[player-1].action_cards_in_hand;
	for (let i = 0; i < acih; i++) {
          html += `
            <div class="faction_sheet_action_card faction_sheet_action_card_back bc">
            </div> 
	  `;
	}
      }

    html += `</div>`;


    //
    // PLANET CARDS
    //
    html += `
      <h3 class="planets anchor">Planet Cards</h3>
      <div class="faction_sheet_planet_card_box" id="faction_sheet_planet_card_box">
    `;
  
    let pc = imperium_self.returnPlayerPlanetCards(player);
    for (let b = 0; b < pc.length; b++) {
      let exhausted = "";
      if (this.game.planets[pc[b]].exhausted == 1) { exhausted = "exhausted"; }
      html += `<div class="faction_sheet_planet_card bc ${exhausted}" id="${pc[b]}" style="background-image: url(${this.game.planets[pc[b]].img});"></div>`
    }
    html += `
      </div>
    `;


    //
    // FACTION ABILITIES
    //
    html += `
      <h3 class="abilities anchor">Faction Abilities</h3>
      <div class="faction_sheet_tech_box" id="faction_sheet_abilities_box">
    `;

    for (let i = 0; i < imperium_self.game.players_info[player-1].tech.length; i++) {
      let tech = imperium_self.tech[imperium_self.game.players_info[player-1].tech[i]];
      if (tech.type == "ability") {
        html += `
          <div class="faction_sheet_tech_card bc">
            <div class="tech_card_name">${tech.name}</div>
            <div class="tech_card_content">${tech.text}</div>
            <div class="tech_card_level">♦♦</div>
          </div>
        `;
      }
    }
    html += `</div>`;

    
     html += `
      <h3 class="tech anchor">Tech</h3>
      <div class="faction_sheet_tech_box" id="faction_sheet_tech_box">
    `;

    for (let i = 0; i < imperium_self.game.players_info[player-1].tech.length; i++) {
      let tech = imperium_self.tech[imperium_self.game.players_info[player-1].tech[i]];
      if (tech.type != "ability") {
        html += `
          <div class="faction_sheet_tech_card bc">
            <div class="tech_card_name">${tech.name}</div>
            <div class="tech_card_content">${tech.text}</div>
            <div class="tech_card_level">♦♦</div>
          </div>
        `;
      }
    }
    html += `</div>`;


    //
    // OBJECTIVES
    //
    let objc = imperium_self.returnPlayerObjectives(player);
    let scored_objectives = [];
    let unscored_objectives = [];


      for (let i in objc) {
        if (this.game.players_info[player-1].objectives_scored.includes(i)) {
   	  scored_objectives.push(objc[i]);
        } else {
  	  unscored_objectives.push(objc[i]);
        }
      }

      html += `

        <h3>Objectives</h3>
        <div class="faction_sheet_objectives">
          <div class="scored">
            <h4>Scored</h4>
            <div class="faction_sheet_objective_cards scored">
      `;

      for (let i = 0; i < scored_objectives.length; i++) {
        html += `
              <div class="faction_sheet_action_card bc" style="background-image: url(${scored_objectives[i].img})">
                <div class="action_card_name">${scored_objectives[i].name}</div>
                <div class="action_card_content">${scored_objectives[i].text}</div>
              </div>
        `;
      }

      html += `
          </div>
          </div>
          <div class="unscored">
            <h4>Unscored</h4>
            <div class="faction_sheet_objective_cards unscored">
      `;


      if (this.game.player != player) {
        for (let i = 0; i < this.game.players_info[player-1].secret_objectives_in_hand; i++) {
          html += `
            <div class="faction_sheet_action_card bc" style="background-image: url(/imperium/img/secret_objective_back.png)">
            </div>
        `;
        }
      }
	

      for (let i = 0; i < unscored_objectives.length; i++) {
        html += `
            <div class="faction_sheet_action_card bc" style="background-image: url(${unscored_objectives[i].img})">
              <div class="action_card_name">${unscored_objectives[i].name}</div>
              <div class="action_card_content">${unscored_objectives[i].text}</div>
            </div>
        `;
      }

      html += `
          </div>
        </div>
      </div>

     
      <h3 class="units anchor">Units</h3>

       


      <div class="faction_sheet_unit_box" id="faction_sheet_unit_box">
          
     `;
     
     //var unit_array = Object.entries(imperium_self.units);
     var unit_array = [];
     console.log(imperium_self.units);
     Object.entries(imperium_self.units).forEach(item => {
       let unit = item[1];
       if(unit.extension == 1) {
       } else {
         unit_array.push([item[0],{
           type: unit.type,
           name: unit.name,
           cost: unit.cost,
           combat: unit.combat, 
           move: unit.move,
           capacity: unit.capacity
         }]);
       }  
     });
     Object.entries(imperium_self.units).forEach(item => {
      let unit = item[1];
      if (unit.extension == 1) {
        for(i=0; i < unit_array.length; i++){
          //console.log("---"+unit_array[i][0]+"---"+item[0]+"---");
           if (unit_array[i][1].type == unit.type){
             unit_array[i][1].cost += " (" + unit.cost +")";
             unit_array[i][1].combat += " (" + unit.combat +")";
             unit_array[i][1].move += " (" + unit.move +")";
             unit_array[i][1].capacity += " (" + unit.capacity +")";
           }
         };
      }
    });
    unit_array.forEach((u) =>{
     html += `

     <div class="unit-display-tile _${u[1].type}">
   <div class="unit-name">${u[1].name}</div>
     <div class="unit-image player_color_${player}" style="background-image: url(img/units/${u[0]}.png);"></div>
     <div class="unit-display">
       <div class="cost">Cost: ${u[1].cost}</div>
       <div class="combat">Combat: ${u[1].combat}</div>
       <div class="movement">Move: ${u[1].move}</div>
       <div class="capacity">Carry: ${u[1].capacity}</div>
     </div>
 </div>
     `;
    });

    html += `
    </div>
    <h3 class="lore anchor">Faction Lore</h3>
    <div class="faction_sheet_lore" id="faction_sheet_lore">
    <div class="anyipsum-output"><p>Spicy jalapeno bacon ipsum dolor amet turducken jerky pork loin pork chop pig chislic boudin meatloaf biltong.  Beef tri-tip ham hock, swine biltong prosciutto frankfurter.  Porchetta swine chislic pork belly bacon salami beef ribs pork loin prosciutto fatback pastrami ham hock ham.  Pastrami sausage t-bone filet mignon cow porchetta, bresaola landjaeger pork loin shoulder alcatra chislic ham buffalo.  Beef ribs sirloin strip steak prosciutto corned beef.  Biltong sausage porchetta, hamburger turkey tenderloin tongue frankfurter bresaola rump doner kevin pancetta burgdoggen.  Picanha porchetta drumstick turkey tenderloin landjaeger pork ribeye pig swine sausage t-bone chuck flank bacon.</p><p>Andouille tail sausage, ham hock capicola turkey chicken short loin buffalo meatloaf sirloin.  Jerky filet mignon tenderloin pancetta bresaola kielbasa.  Beef venison t-bone, tongue sausage cow burgdoggen landjaeger jowl alcatra short loin shoulder turducken.  Tenderloin cow landjaeger, chuck capicola picanha beef tri-tip cupim prosciutto kevin.  Pancetta capicola short ribs shank.  Bacon porchetta short ribs short loin, prosciutto pork belly chicken corned beef.  Kielbasa biltong corned beef hamburger doner jowl boudin jerky shank cupim frankfurter pancetta strip steak ribeye.</p><p>Tri-tip beef pork chop beef ribs.  Capicola tongue cow flank ham, landjaeger hamburger beef ribs turkey sausage.  Meatball ground round pastrami cow bresaola.  Jerky tail tri-tip picanha salami ground round meatloaf shoulder strip steak jowl porchetta sausage pork chop short ribs shank.  Capicola bacon beef strip steak corned beef.  Strip steak beef pork leberkas.  Jerky shank ham hock leberkas beef ribs doner.</p><p>Pastrami drumstick picanha bresaola.  Cow kevin pork loin, turducken alcatra beef ribs jerky salami.  Pastrami pork meatball buffalo chuck, chicken short loin ham.  Pork belly swine venison chicken beef ribs beef.</p><p>Pork bresaola shankle short loin, frankfurter jowl flank leberkas.  Filet mignon drumstick tri-tip sirloin tenderloin meatloaf buffalo.  Cupim ground round venison tri-tip salami tenderloin pork chop spare ribs bacon.  Shank picanha flank chuck cupim jowl pork belly.  Meatball kevin jowl short ribs pork loin spare ribs.</p><p>Bacon frankfurter rump, chislic ground round sausage prosciutto fatback drumstick boudin.  Cow ground round burgdoggen tri-tip bresaola.  Pig chuck tail pork.  Pork loin swine chislic shoulder cupim.  Capicola pig doner brisket meatball burgdoggen.  Biltong short loin flank, pork loin meatball ham hock shank beef ribs fatback.  Shank ball tip beef ribs, ribeye ham hock pancetta sausage chislic chicken picanha biltong rump leberkas filet mignon alcatra.</p><p>Beef chislic short ribs jerky landjaeger tri-tip boudin corned beef.  Short ribs fatback rump shankle andouille.  Pig shoulder andouille burgdoggen, tongue frankfurter tail tenderloin pork landjaeger alcatra swine boudin turducken.  Short loin corned beef capicola chuck kielbasa tri-tip, burgdoggen bacon drumstick meatball spare ribs.  Sirloin pig jowl meatball, tail drumstick landjaeger short loin bresaola ham hock.  Capicola meatball ham hock ground round.  Boudin salami flank swine sirloin kevin ball tip strip steak capicola t-bone shankle landjaeger chuck chislic.</p><p>Ribeye rump pig doner tongue beef ribs boudin filet mignon turducken corned beef jowl shankle strip steak andouille short loin.  Turducken tongue pork belly pork loin short ribs jerky strip steak jowl shank leberkas filet mignon.  Corned beef flank buffalo, ham hock short loin turkey pork loin.  Tenderloin bacon bresaola, short ribs meatball rump tongue fatback picanha filet mignon.  Frankfurter chicken pork loin, pancetta chuck turkey rump cupim cow.  Picanha shank doner drumstick meatball landjaeger brisket cupim.</p><p>Capicola turkey pork belly andouille filet mignon buffalo.  Strip steak shoulder short ribs biltong chicken, corned beef sirloin salami capicola bacon.  Boudin tenderloin bresaola shank pork belly drumstick kevin alcatra brisket biltong chicken jerky shoulder shankle corned beef.  Pork chop beef ribs meatloaf boudin, buffalo shoulder jowl salami brisket ball tip beef chislic.  Turkey andouille spare ribs, pork belly tongue tail tri-tip venison.  Frankfurter chuck porchetta biltong pastrami andouille kielbasa flank chislic pig t-bone hamburger turducken boudin venison.  Tri-tip filet mignon kevin, porchetta jerky rump picanha shank buffalo flank short loin.</p></div>
    
      </div>
    </div>

    `;

  return html;
}



showSector(pid) {

  let hex_space = ".sector_graphics_space_" + pid;
  let hex_ground = ".sector_graphics_planet_" + pid;

  $(hex_space).fadeOut();
  $(hex_ground).fadeIn();

}
hideSector(pid) {

  let hex_space = ".sector_graphics_space_" + pid;
  let hex_ground = ".sector_graphics_planet_" + pid;

  $(hex_ground).fadeOut();
  $(hex_space).fadeIn();

}



updateTokenDisplay() {

  try {
    $('#token_display_command_token_count').html(imperium_self.game.players[imperium_self.game.player-1].command_tokens);
    $('#token_display_strategy_token_count').html(imperium_self.game.players[imperium_self.game.player-1].strategy_tokens);
    $('#token_display_fleet_supply_count').html(imperium_self.game.players[imperium_self.game.player-1].fleet_supply_tokens);
    $('#token_display_commodities_count').html(imperium_self.game.players[imperium_self.game.player-1].commodities);
    $('#token_display_trade_goods_count').html(imperium_self.game.players[imperium_self.game.player-1].goods);
  } catch (err) {}

}
updateLeaderboard() {

  if (this.browser_active == 0) { return; }

  let imperium_self = this;
  let factions = this.returnFactions();

  try {

    document.querySelector('.round').innerHTML = this.game.state.round;
    document.querySelector('.turn').innerHTML = this.game.state.turn;

    let html = '<div class="VP-track-label">Victory Points</div>';

    for (let j = this.vp_needed; j >= 0; j--) {
      html += '<div class="vp ' + j + '-points"><div class="player-vp-background">' + j + '</div>';
      html += '<div class="vp-players">'

      for (let i = 0; i < this.game.players_info.length; i++) {
        if (this.game.players_info[i].vp == j) {
          html += `  <div class="player-vp" style="background-color:var(--p${i + 1});"><div class="vp-faction-name">${factions[this.game.players_info[i].faction].name}</div></div>`;
        }
      }

      html += '</div></div>';
    }

    document.querySelector('.leaderboard').innerHTML = html;

  } catch (err) { }
}



updateSectorGraphics(sector) {

  let sys = this.returnSectorAndPlanets(sector);

  let divsector = '#hex_space_' + sector;
  let fleet_color = '';
  let bg = '';
  let bgsize = '';
  let sector_controlled = 0;

  for (let z = 0; z < sys.s.units.length; z++) {

    let player = z + 1;

    //
    // is activated?
    //
    if (sys.s.activated[player - 1] == 1) {
      let divpid = '#' + sector;
      $(divpid).find('.hex_activated').css('background-color', 'yellow');
      $(divpid).find('.hex_activated').css('opacity', '0.3');
    }

    if (sys.s.type > 0) {
      let divpid = '#hex_img_hazard_border_' + sector;
      $(divpid).css('display', 'block');
    }

    if (sys.s.units[player-1].length > 0) {
      let divpid = '#hex_img_faction_border_' + sector;
      let newclass = "player_color_"+player;
      $(divpid).removeClass("player_color_1");
      $(divpid).removeClass("player_color_2");
      $(divpid).removeClass("player_color_3");
      $(divpid).removeClass("player_color_4");
      $(divpid).removeClass("player_color_5");
      $(divpid).removeClass("player_color_6");
      $(divpid).addClass(newclass);
      $(divpid).css('display','block');
    }


    //
    // space
    //
    if (sys.s.units[player - 1].length > 0) {

      updated_space_graphics = 1;

      let carriers = 0;
      let fighters = 0;
      let destroyers = 0;
      let cruisers = 0;
      let dreadnaughts = 0;
      let flagships = 0;
      let warsuns = 0;

      for (let i = 0; i < sys.s.units[player - 1].length; i++) {

        let ship = sys.s.units[player - 1][i];

        if (ship.type == "carrier") { carriers++; }
        if (ship.type == "fighter") { fighters++; }
        if (ship.type == "destroyer") { destroyers++; }
        if (ship.type == "cruiser") { cruisers++; }
        if (ship.type == "dreadnaught") { dreadnaughts++; }
        if (ship.type == "flagship") { flagships++; }
        if (ship.type == "warsun") { warsuns++; }

      }

      let space_frames = [];
      let ship_graphics = [];
//
// replaced with border
//
//      space_frames.push("white_space_frame.png");

      ////////////////////
      // SPACE GRAPHICS //
      ////////////////////
      fleet_color = "color" + player;

      if (fighters > 0) {
        let x = fighters; if (fighters > 9) { x = 9; }
        let numpng = "white_space_frame_1_" + x + ".png";
        ship_graphics.push("white_space_fighter.png");
        space_frames.push(numpng);
      }
      if (destroyers > 0) {
        let x = destroyers; if (destroyers > 9) { x = 9; }
        let numpng = "white_space_frame_2_" + x + ".png";
        ship_graphics.push("white_space_destroyer.png");
        space_frames.push(numpng);
      }
      if (carriers > 0) {
        let x = carriers; if (carriers > 9) { x = 9; }
        let numpng = "white_space_frame_3_" + x + ".png";
        ship_graphics.push("white_space_carrier.png");
        space_frames.push(numpng);
      }
      if (cruisers > 0) {
        let x = cruisers; if (cruisers > 9) { x = 9; }
        let numpng = "white_space_frame_4_" + x + ".png";
        ship_graphics.push("white_space_cruiser.png");
        space_frames.push(numpng);
      }
      if (dreadnaughts > 0) {
        let x = dreadnaughts; if (dreadnaughts > 9) { x = 9; }
        let numpng = "white_space_frame_5_" + x + ".png";
        ship_graphics.push("white_space_dreadnaught.png");
        space_frames.push(numpng);
      }
      if (flagships > 0) {
        let x = flagships; if (flagships > 9) { x = 9; }
        let numpng = "white_space_frame_6_" + x + ".png";
        ship_graphics.push("white_space_flagship.png");
        space_frames.push(numpng);
      }
      if (warsuns > 0) {
        let x = warsuns; if (warsuns > 9) { x = 9; }
        let numpng = "white_space_frame_7_" + x + ".png";
        ship_graphics.push("white_space_warsun.png");
        space_frames.push(numpng);
      }


      //
      // remove and re-add space frames
      //
      let old_images = "#hex_bg_" + sector + " > .sector_graphics";
      $(old_images).remove();
      let divsector2 = "#hex_bg_" + sector;
      let player_color = "player_color_" + player;
      for (let i = 0; i < ship_graphics.length; i++) {
        $(divsector2).append('<img class="sector_graphics ' + player_color + ' ship_graphic sector_graphics_space sector_graphics_space_' + sector + '" src="/imperium/img/frame/' + ship_graphics[i] + '" />');
      }
      for (let i = 0; i < space_frames.length; i++) {
        $(divsector2).append('<img style="opacity:0.8" class="sector_graphics sector_graphics_space sector_graphics_space_' + sector + '" src="/imperium/img/frame/' + space_frames[i] + '" />');
      }
    }
  }




  let ground_frames = [];
  let ground_pos = [];

  for (let z = 0; z < sys.s.units.length; z++) {

    let player = z + 1;

    ////////////////////////
    // PLANETARY GRAPHICS //
    ////////////////////////
    let total_ground_forces_of_player = 0;

    for (let j = 0; j < sys.p.length; j++) {
      total_ground_forces_of_player += sys.p[j].units[player - 1].length;
    }

    if (total_ground_forces_of_player > 0) {


      for (let j = 0; j < sys.p.length; j++) {

        let infantry = 0;
        let spacedock = 0;
        let pds = 0;

        for (let k = 0; k < sys.p[j].units[player - 1].length; k++) {

          let unit = sys.p[j].units[player - 1][k];

          if (unit.type == "infantry") { infantry++; }
          if (unit.type == "pds") { pds++; }
          if (unit.type == "spacedock") { spacedock++; }

        }

        let postext = "";

        ground_frames.push("white_planet_center.png");
        if (sys.p.length == 1) {
          postext = "center";
        } else {
          if (j == 0) {
            postext = "top_left";
          }
          if (j == 1) {
            postext = "bottom_right";
          }
        }
        ground_pos.push(postext);


        if (infantry > 0) {
          let x = infantry; if (infantry > 9) { x = 9; }
          let numpng = "white_planet_center_1_" + x + ".png";
          ground_frames.push(numpng);
          ground_pos.push(postext);
        }
        if (spacedock > 0) {
          let x = spacedock; if (spacedock > 9) { x = 9; }
          let numpng = "white_planet_center_2_" + x + ".png";
          ground_frames.push(numpng);
          ground_pos.push(postext);
        }
        if (pds > 0) {
          let x = pds; if (pds > 9) { x = 9; }
          let numpng = "white_planet_center_3_" + x + ".png";
          ground_frames.push(numpng);
          ground_pos.push(postext);
        }
      }

      //
      // remove and re-add space frames
      //
      let old_images = "#hex_bg_" + sector + " > .sector_graphics_planet";
      $(old_images).remove();

      let divsector2 = "#hex_bg_" + sector;
      let player_color = "player_color_" + player;
      let pid = 0;
      for (let i = 0; i < ground_frames.length; i++) {
        if (i > 0 && ground_pos[i] != ground_pos[i - 1]) { pid++; }
        $(divsector2).append('<img class="sector_graphics ' + player_color + ' sector_graphics_planet sector_graphics_planet_' + sector + ' sector_graphics_planet_' + sector + '_' + pid + ' ' + ground_pos[i] + '" src="/imperium/img/frame/' + ground_frames[i] + '" />');
      }
    }
  }
};


  unhighlightSectors() {
    for (let i in this.game.sectors) {
      this.removeSectorHighlight(i);
    }
  }

  showSectorHighlight(sector) { this.addSectorHighlight(sector); }
  hideSectorHighlight(sector) { this.removeSectorHighlight(sector); }
  addSectorHighlight(sector) {
    let divname = "#hex_space_" + sector;
console.log("Add: " + divname);
    $(divname).css('background-color', '#900');
  }
  removeSectorHighlight(sector) {
    let divname = "#hex_space_" + sector;
    $(divname).css('background-color', 'transparent');
  }
  addPlanetHighlight(sector, pid)  {
    let divname = ".sector_graphics_planet_" + sector + '_' + pid;
    $(divname).show();
  }
  removePlanetHighlight(sector, pid)  {
    let divname = ".sector_graphics_planet_" + sector + '_' + pid;
    $(divname).hide();
  }
  showActionCard(c) {
    let thiscard = this.action_cards[c];
    $('.cardbox').html('<img src="' + thiscard.img + '" style="width:100%" /><div class="action_card_overlay">'+thiscard.text+'</div>');
    $('.cardbox').show();
  }
  hideActionCard(c) {
    $('.cardbox').hide();
  }
  showStrategyCard(c) {
    let strategy_cards = this.returnStrategyCards();
    let thiscard = strategy_cards[c];
    $('.cardbox').html('<img src="' + thiscard.img + '" style="width:100%" /><div class="strategy_card_overlay">'+thiscard.text+'</div>');
    $('.cardbox').show();
  }
  hideStrategyCard(c) {
    $('.cardbox').hide();
  }
  showPlanetCard(sector, pid) {
    let planets = this.returnPlanets();
    let systems = this.returnSectors();
    let sector_name = this.game.board[sector].tile;
    let this_planet_name = systems[sector_name].planets[pid];
    console.log(sector_name + " -- " + this_planet_name + " -- " + pid);
    let thiscard = planets[this_planet_name];
    $('.cardbox').html('<img src="' + thiscard.img + '" style="width:100%" />');
    $('.cardbox').show();
  }
  hidePlanetCard(sector, pid) {
    $('.cardbox').hide();
  }
  showAgendaCard(agenda) {
    $('.cardbox').html('<img src="' + this.agenda_cards[agenda].img + '" style="width:100%" /><div class="agenda_card_overlay">'+this.agenda_cards[agenda].text+'</div>');
    $('.cardbox').show();
  }
  hideAgendaCard(sector, pid) {
    $('.cardbox').hide();
  }


  

  //
  // NOTE: this.game.strategy_cards --> is an array that is used in combination with
  // this.game.strategy_cards_bonus to add trade goods to cards that are not selected
  // in any particular round.
  //
  returnStrategyCards() {
    return this.strategy_cards;
  }
  
  importStrategyCard(name, obj) {

    if (obj.name == null) 	{ obj.name = "Strategy Card"; }
    if (obj.rank == null) 	{ obj.rank = 1; }

    obj = this.addEvents(obj);
    this.strategy_cards[name] = obj;

  }  


  playStrategyCardPrimary(player, card) {
    for (let i = 0; i < this.game.players_info.length; i++) {
      if (this.strategy_cards[card]) {
	this.strategy_cards[card].strategyPrimaryEvent(this, (i+1), player);
      }
    }
    return 0;
  }

  playStrategyCardSecondary(player, card) {
    for (let i = 0; i < this.game.players_info.length; i++) {
      if (this.strategy_cards[card]) {
	this.strategy_cards[card].strategySecondaryEvent(this, (i+1), player);
      }
    }
    return 0;
  }






}

module.exports = Imperium;
  

