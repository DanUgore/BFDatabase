var scriptDir = __dirname+"/";

var BF_Database = {
	name: "BFDatabase",
	init: function (client, imports) {
		var BFDataFile = scriptDir+'BFData.js';
		var BFData = require(BFDataFile);
		var romaji = BFData.romaji;
		var strFormat = require('util').format;
		var silentChans = {};
		if (client.config("silenced-channels")) {
			if (Array.isArray(client.config("silenced-channels"))) {
				client.config("silenced-channels").forEach(function (chanName) { silentChans[chanName] = true; });
			} else {
				console.log("Error: `silenced-channels` config property should be an array.")
			}
		}
		var definePassive = function (passives) {
			var effects = [];
			passives = [].concat(passives); // Make passives an array.
			var defineStatBuffs = function (dict) {
					var buffs = [], descBuf = [], desc = "";
					var stats = {hp:"HP",atk:"ATK",def:"DEF",rec:"REC",crit:"Crit"};
					for (var stat in stats) if (dict[stat+"% buff"]) buffs.push({stat: stats[stat], value: dict[stat+"% buff"]});
					for (var i = 0; i < buffs.length; i++) {
						var buff = buffs[i];
						desc += strFormat("%s%s%% %s", buff.value>0?"+":"" , buff.value, buff.stat);
						for (var j = i+1; j < buffs.length; j++)
							if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
						descBuf.push(desc);
						desc = "";
					}
					return descBuf.join(" ");
			}
			passiveIDs = {
				"1": function (dict) { // Stat Buffs
					return "All Units: "+defineStatBuffs(dict);
				},
				"2": function (dict) { // Element-Specific Stat Buffs
					return dict["elements buffed"].map(function(name){return name.charAt(0).toUpperCase()+name.substr(1);}) + " Units: " + defineStatBuffs(dict);
				},
				"4": function (dict) { // Resist Status Ailments
					var buffs = [], descBuf = [], desc = "";
					var statuses = {injury:"Injury",poison:"Poison",sick:"Sick",weaken:"Weaken",curse:"Curse",paralysis:"Paralyze"};
					for (var status in statuses) if (dict[status+" resist%"]) buffs.push({status: statuses[status], value: dict[status+" resist%"]});
					if (buffs.length === Object.keys(statuses).length) {
						console.log("All statuses");
						return strFormat("%s Status Ailments", buffs[0].value<100 ? (buffs[0].value+"% Resist") : "Invalidate");
					}
					for (var i = 0; i < buffs.length; i++) {
						var buff = buffs[i];
						desc += strFormat("%s %s", buff.value<100?(buff.value+"% Resist"):"Negate" , buff.status);
						for (var j = i+1; j < buffs.length; j++)
							if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].status;
						descBuf.push(desc);
						desc = "";
					}
					return descBuf.join(" ");
				},
				"9": function (dict) { // BC per turn
					return strFormat("%s BC/turn", dict["bc fill per turn"]);
				},
				"10": function (dict) { // HC Effectiveness
					return strFormat("%s%% HC Effectiveness", dict["hc effectiveness"]);
				},
				"11": function (dict) { // HP threshold buff
					var compType = dict["hp above % buff requirement"] ? "above" : "below";
					if (dict["hp above % buff requirement"] === 100) return strFormat("%s when HP is full", defineStatBuffs(dict));
					if (dict["hp below % buff requirement"] === 100) return strFormat("%s when HP is not full", defineStatBuffs(dict));
					return strFormat("%s when HP is %s %s%%", defineStatBuffs(dict), compType, dict["hp "+compType+" % buff requirement"]);
				},
				"17": function (dict) { // HP Drain
					var buf = "";
					if (dict["hp drain chance%"] < 100) buf += dict["hp drain chance%"] + "% Chance ";
					buf += dict["hp drain% low"];
					if (dict["hp drain% low"] !== dict["hp drain% high"]) buf += "-"+dict["hp drain% high"];
					buf += "% HP Drain";
					return buf;
				},
				"19": function (dict) { // Drop Rate Buff
					var buffs = [], descBuf = [], desc = "";
					var stats = {bc:"BC",hc:"HC",karma:"Karma",zel:"Zel",item:"Item"};
					for (var stat in stats) if (dict[stat+" drop rate% buff"]) buffs.push({stat: stats[stat], value: dict[stat+" drop rate% buff"]});
					for (var i = 0; i < buffs.length; i++) {
						var buff = buffs[i];
						desc += strFormat("%s%s%% %s", buff.value>0?"+":"" , buff.value, buff.stat);
						for (var j = i+1; j < buffs.length; j++)
							if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
						descBuf.push(desc+" Drop Rate");
						desc = "";
					}
					return descBuf.join(" ");
				},
				"20": function (dict) { // Inflict Status Ailments
					var buffs = [], descBuf = [], desc = "";
					var statuses = {injury:"Injury",poison:"Poison",sick:"Sick",weaken:"Weaken",curse:"Curse",paralysis:"Paralyze"};
					for (var status in statuses) if (dict[status+"%"]) buffs.push({status: statuses[status], value: dict[status+"%"]});
					for (var i = 0; i < buffs.length; i++) {
						var buff = buffs[i];
						desc += strFormat("%s%s%% Inflict %s", buff.value>0?"+":"" , buff.value, buff.status);
						for (var j = i+1; j < buffs.length; j++)
							if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].status;
						descBuf.push(desc);
						desc = "";
					}
					return descBuf.join(" ");
				},
				"21": function (dict) {
					var buffs = [], descBuf = [], desc = "";
					var stats = {hp:"HP",atk:"ATK",def:"DEF",rec:"REC",crit:"Crit"};
					var buffObj = {};
					if (dict["first x turns atk% (1)"]) buffObj["atk% buff"] = dict["first x turns atk% (1)"];
					if (dict["first x turns def% (3)"]) buffObj["def% buff"] = dict["first x turns def% (3)"];
					if (dict["first x turns rec% (5)"]) buffObj["rec% buff"] = dict["first x turns rec% (5)"];
					if (dict["first x turns crit% (7)"]) buffObj["crit% buff"] = dict["first x turns crit% (7)"];
					return strFormat("%s for First %s Turns", defineStatBuffs(buffObj), dict["first x turns"]);
				},
				"24": function (dict) { // Damage to HP on hit
					var buf = "";
					if (dict["dmg% to hp% when attacked chance%"] < 100) buf += dict["dmg% to hp% when attacked chance%"] + "% Chance ";
					buf += dict["dmg% to hp% when attacked low"];
					if (dict["dmg% to hp% when attacked low"] !== dict["dmg% to hp% when attacked high"]) buf += "-"+dict["dmg% to hp% when attacked high"];
					buf += "% DMG to HP when hit";
					return buf;
				},
				"25": function (dict) { // BC On Hit
					var buf = "";
					if (dict["bc fill when attacked chance%"] < 100) buf += dict["bc fill when attacked chance%"] + "% Chance ";
					buf += dict["bc fill when attacked low"];
					if (dict["bc fill when attacked low"] !== dict["bc fill when attacked high"]) buf += "-"+dict["bc fill when attacked high"];
					buf += " BC when hit";
					return buf;
				},
				"26": function (dict) { // Damage Reflect
					var buf = "";
					if (dict["dmg% reflect chance%"] < 100) buf += dict["dmg% reflect chance%"] + "% Chance ";
					buf += dict["dmg% reflect low"];
					if (dict["dmg% reflect low"] !== dict["dmg% reflect high"]) buf += "-"+dict["dmg reflect% high"];
					buf += "% Damage Reflect";
					return buf;
				},
				"29": function (dict) { // % Chance Def Ignore
					return strFormat("%s%% Chance Ignore Def", dict["ignore def%"]);
				},
				"30": function (dict) { // BB Gauge threshold buff
					var compType = dict["bb gauge above % buff requirement"] ? "above" : "below";
					if (dict["bb gauge above % buff requirement"] === 100) return strFormat("%s when BB Gauge is full", defineStatBuffs(dict));
					if (dict["bb gauge below % buff requirement"] === 100) return strFormat("%s when BB Gauge is not full", defineStatBuffs(dict));
					return strFormat("%s when BB Gauge is %s %s%%", defineStatBuffs(dict), compType, dict["bb gauge "+compType+" % buff requirement"]);
				},
				"31": function (dict) { // Spark Damage
					return strFormat("+%s%% Spark Damage", dict["damage% for spark"]);
				},
				"32": function (dict) { // BB Gauge Fill Rate
					return strFormat("+%s%% BB Gauge Fill Rate", dict["bb gauge fill rate%"]);
				},
			}
			passives.forEach(function (passive, index, passives) {
				if (!passiveIDs[passive["passive id"]]) effects.push(strFormat("Unknown Passive (%s)", passive["passive id"] || "?"));
				else effects.push(passiveIDs[passive["passive id"]](passive));
			});
			return effects.join(", ");
		};
		var formatDict = function (dict, path) {
			var buf = "", queue = [];
			function pushBuf() {
				queue.push(buf);
				buf = "";
			}
			function clearBuf() {
				buf = "";
			}
			path = path || '';
			if (!dict) return null;
			if (Array.isArray(path)) {
				// Convert path array to string
				path = path.map(function(str){return "["+str+"]"}).join('');
			}
			switch (path) {
				case '': // No path, summarize unit.
					var unit = dict;
					console.log('unit.stats exists = '+!!unit.stats);
					if (!unit.stats) console.log(require('util').inspect(unit));
					var str = strFormat("#%d) %s | %d* %s | Hits/DC %d/%d | Cost %d", unit['guide_id'], unit['name'], unit['rarity'], unit['element'], unit['hits'], (unit['max bc generated']/unit['hits']), unit['cost']);
					queue.push(str);
					str = strFormat("%s | %s", formatDict(unit['stats']['_lord'], path+'[stats][_lord]'), formatDict(unit['imp'], path+'[imp]'));
					queue.push(str);
					if (unit['bb']) {
						var bbinfo = "BB: " + formatDict(unit['bb'], 'bb');
						queue.push(bbinfo);
					}
					if (unit['sbb']) {
						var sbbinfo = "SBB: " + formatDict(unit['sbb'], 'bb');
						queue.push(sbbinfo);
					}
					if (unit['ubb']) {
						var ubbinfo = "UBB: " + formatDict(unit['ubb'], 'bb');
						queue.push(ubbinfo);
					}
					return queue;
					
				case '[ai]':
					var ai = dict, aistring = JSON.stringify(ai);
					for (var type in AITypes) {
						if (aistring === JSON.stringify(AITypes[type])) {
							var nobbchance = 1;
							for (var i = 0; i < ai.length; i++) {
								if (ai[i]["action"] !== "skill") continue;
								nobbchance *= (100-ai[i]["chance%"])/100;
							}
							return strFormat("%s AI - Optimal BB Chance = %d%%", type, ((1-nobbchance)*100));
						}
					}
					return "Unrecognized AI Type";
					
				case '[bb]':
				case '[sbb]':
					var bb = dict;
					buf += strFormat("%s - %s", dict.name, dict.desc);
					pushBuf();
					buf += "Max Level Data";
					if (bb['hits']) {
						buf += strFormat(": Hits/DC %d/%d", bb['hits'], (bb['max bc generated']/bb['hits']));
						if (bb["hit dmg% distribution (total)"] !== 100) {
							buf += " | Dmg% " + bb["hit dmg% distribution (total)"];
						}
					}
					pushBuf();
					queue = queue.concat(formatDict(dict.levels[9], path+'[levels][9]'));
					return queue;
					
				case '[ubb][levels]':
				case '[sbb][levels]':
				case '[bb][levels]':
					return "Array 0-9: [Level 1, Level 2, Level 3, Level 4, Level 5, Level 6, Level 7, Level 8, Level 9, Level 10]";
					
				// case '[bb]':
				case '[ubb]':
					buf += strFormat("%s - %s", dict.name, dict.desc);
					var bb = dict;
					if (bb['hits']) {
						buf += strFormat("Hits/DC %d/%d", bb['hits'], (bb['max bc generated']/bb['hits']));
						if (bb["hit dmg% distribution (total)"] !== 100) {
							buf += " | Dmg% " + bb["hit dmg% distribution (total)"];
						}
					}
					pushBuf();
					dict = dict.levels[9];
					
				case '[ubb][levels][0]': case '[ubb][levels][1]': case '[ubb][levels][2]': case '[ubb][levels][3]': case '[ubb][levels][4]': case '[ubb][levels][5]': case '[ubb][levels][6]': case '[ubb][levels][7]': case '[ubb][levels][8]': case '[ubb][levels][9]':
				case '[sbb][levels][0]': case '[sbb][levels][1]': case '[sbb][levels][2]': case '[sbb][levels][3]': case '[sbb][levels][4]': case '[sbb][levels][5]': case '[sbb][levels][6]': case '[sbb][levels][7]': case '[sbb][levels][8]': case '[sbb][levels][9]':
				case '[bb][levels][0]': case '[bb][levels][1]': case '[bb][levels][2]': case '[bb][levels][3]': case '[bb][levels][4]': case '[bb][levels][5]': case '[bb][levels][6]': case '[bb][levels][7]': case '[bb][levels][8]': case '[bb][levels][9]':
					buf += strFormat("BC Cost %s | ", dict["bc cost"]);
					dict = dict["effects"];
				case '[ubb][levels][0][effects]': case '[ubb][levels][1][effects]': case '[ubb][levels][2][effects]': case '[ubb][levels][3][effects]': case '[ubb][levels][4][effects]': case '[ubb][levels][5][effects]': case '[ubb][levels][6][effects]': case '[ubb][levels][7][effects]': case '[ubb][levels][8][effects]': case '[ubb][levels][9][effects]':
				case '[sbb][levels][0][effects]': case '[sbb][levels][1][effects]': case '[sbb][levels][2][effects]': case '[sbb][levels][3][effects]': case '[sbb][levels][4][effects]': case '[sbb][levels][5][effects]': case '[sbb][levels][6][effects]': case '[sbb][levels][7][effects]': case '[sbb][levels][8][effects]': case '[sbb][levels][9][effects]':
				case '[bb][levels][0][effects]': case '[bb][levels][1][effects]': case '[bb][levels][2][effects]': case '[bb][levels][3][effects]': case '[bb][levels][4][effects]': case '[bb][levels][5][effects]': case '[bb][levels][6][effects]': case '[bb][levels][7][effects]': case '[bb][levels][8][effects]': case '[bb][levels][9][effects]':
					var effects = dict, numEffects = effects.length;
					buf += "# of Effects: " + numEffects;
					pushBuf();
					effects.forEach(function (el, i) {
						var effect = formatDict(el, "bb effect");
						queue.push(strFormat("%d) %s", i, effect));
					});
					return queue;
				
				// Stats
				case '[imp]': 
					return strFormat("Imps: %d HP / %d ATK / %d DEF / %d REC", dict['max hp'], dict['max atk'], dict['max def'], dict['max rec']);

				case '[stats]':
					return formatDict(dict['_lord'], path+'[_lord]'); // Just return lord stats
				case '[stats][_base]':
					return strFormat("Stats (LV1): %d HP / %d ATK / %d DEF / %d REC", dict['hp'], dict['atk'], dict['def'], dict['rec']);
				case '[stats][_lord]':
					return strFormat("Stats (L): %d HP / %d ATK / %d DEF / %d REC", dict['hp'], dict['atk'], dict['def'], dict['rec']);
				case '[stats][anima]':
					return strFormat("Stats (A): ~%d (%d-%d) HP / %d ATK / %d DEF / ~%d (%d-%d) REC",
							Math.floor((dict['hp min']+dict['hp max'])/2), dict['hp min'], dict['hp max'],
							dict['atk'], dict['def'],
							Math.floor((dict['rec min']+dict['rec max'])/2), dict['rec min'], dict['rec max']);
				case '[stats][breaker]':
					return strFormat("Stats (B): %d HP / ~%d (%d-%d) ATK / ~%d (%d-%d) DEF / %d REC", dict['hp'],
							Math.floor((dict['atk min']+dict['atk max'])/2), dict['atk min'], dict['atk max'],
							Math.floor((dict['def min']+dict['def max'])/2), dict['def min'], dict['def max'],
							dict['rec']);
				case '[stats][guardian]':
					return strFormat("Stats (G): %d HP / ~%d (%d-%d) ATK / ~%d (%d-%d) DEF / %d REC", dict['hp'],
							Math.floor((dict['atk min']+dict['atk max'])/2), dict['atk min'], dict['atk max'],
							Math.floor((dict['def min']+dict['def max'])/2), dict['def min'], dict['def max'],
							dict['rec']);
				case '[stats][oracle]':
					return strFormat("Stats (R): ~%d (%d-%d) HP / %d ATK / %d DEF / ~%d (%d-%d) REC",
							Math.floor((dict['hp min']+dict['hp max'])/2), dict['hp min'], dict['hp max'],
							dict['atk'], dict['def'],
							Math.floor((dict['rec min']+dict['rec max'])/2), dict['rec min'], dict['rec max']);
					
				case '[leader skill]':
					queue.push(strFormat("LS: %s - %s", dict.name, dict.desc));
					var effects = dict.effects, numEffects = effects.length;
					buf += "# of Effects: " + numEffects;
					queue.push(buf);
					effects.forEach(function (el, i) {
						var effect = formatDict(el, "effect");
						queue.push(strFormat("%d) %s", i, effect));
					});
					return queue;
				case '[extra skill]':
					queue.push(strFormat("ES: %s - %s", dict.name, dict.desc));
					queue.push(strFormat("Conditions: %s", dict["conditions"].map(function(con){return formatDict(con, "condition");}).join(", ")));
					var effects = dict.effects, numEffects = effects.length;
					buf += "# of Effects: " + numEffects;
					queue.push(buf);
					effects.forEach(function (el, i) {
						var effect = formatDict(el, "effect");
						queue.push(strFormat("%d) %s", i, effect));
					});
					return queue;
					
				// Internal Paths. Used for formatting specific dicts in a different way.
				case "effect": // used by the [leader skill] and [extra skill] paths
					var effects = Object.keys(dict);
					var formatEffect = function (prop) {
						var effStr = "", eff = dict[prop];
						if (eff === true) return prop;
						if (typeof eff !== 'object') return strFormat("%s: %s", prop, eff);
						if (Array.isArray(eff)) {
							return strFormat("%s: [ %s ]", prop, eff.join(", "));
						}
						return strFormat("%s: { %s }", prop, formatDict(eff, "effect"));
					};
					return effects.map(formatEffect).join(", ");
				case "condition": // Used by [extra skill] path
					var conditions = Object.keys(dict);
					var formatCondition = function (prop) {
						var effStr = "", cond = dict[prop];
						switch (prop) {
							case "item required": return strFormat("%s = %s", prop, (BFData.getItem(cond) || BFData.getItemJP(cond) || {}).name || ("Unknown Item ID: "+cond));
							case "unit required":
								var units = cond.map(function (unit) {
									return unit.name || (BFData.getUnit(unit.id) || BFData.JP.getUnit(unit.id) || {}).name || ("Unknown Unit ID: "+cond);
								}).join(" or ");
								return strFormat("%s: %s", prop, units);
							case "unknown": return "Unknown";
						}
						if (cond === true) return prop;
						if (typeof cond !== 'object') return strFormat("%s: %s", prop, cond);
						if (Array.isArray(cond)) {
							return strFormat("%s: [ %s ]", prop, cond.join(", "));
						}
						return strFormat("%s: { %s }", prop, formatDict(cond, "condition"));
					};
					return conditions.map(formatCondition).join(", ");
				case "bb effect": // used by the [bb], [sbb], and [ubb] paths
					var effDict = {}
					for (var prop in dict) effDict[prop] = dict[prop];
					for (eff in effDict) {
						if (eff in {"target area":1,"target type":1,"effect delay time(ms)/frame":1}) delete effDict[eff];
						if (eff.substr(-5) === " high") {
							var buffName = eff.substr(0, eff.length-5);
							effDict[buffName] = strFormat("%s-%s", effDict[buffName+" low"], effDict[eff]);
							delete effDict[eff];
							delete effDict[buffName+" low"];
						}
					}
					var targetTypes = {
						singleenemy: "Single Enemy",
						aoeenemy: "All Enemies",
						singleparty: "Single Ally",
						aoeparty: "All Allies",
						singleself: "Self"
					};
					buf += strFormat("Target: %s | Frame %s | ", targetTypes[dict["target area"]+dict["target type"]], dict["effect delay time(ms)/frame"].split("/")[1]);
					var effects = Object.keys(effDict);
					var formatEffect = function (prop) {
						var effStr = "", eff = effDict[prop];
						if (eff === true) return prop;
						if (typeof eff !== 'object') return strFormat("%s: %s", prop, eff);
						if (Array.isArray(eff)) {
							return strFormat("%s: [ %s ]", prop, eff.join(", "));
						}
						return strFormat("%s: { %s }", prop, formatDict(eff, "effect"));
					};
					return buf + effects.sort().map(formatEffect).join(", ");

				case "bb":
					var bb = dict;
					// buf += dict.name;
					var minbb = bb.levels[0], maxbb = bb.levels[9];
					var ofbb = !!bb["hits"];
					var rtbb = !!minbb.effects[0]["random attack"];
					if (rtbb) {
						buf += "RTBB";
					} else if (ofbb) {
						buf += {single: "ST", aoe: "MT"}[minbb.effects[0]["target area"]] + "BB";
					} else {
						buf += " Heal/Support";
					}
					buf += " | Cost ";
					if (minbb["bc cost"] !== maxbb["bc cost"]) {
						buf += minbb["bc cost"] + "-" + maxbb["bc cost"];
					} else {
						buf += minbb["bc cost"];
					}
					buf += " BC";
					if (ofbb) {
						if (!rtbb) {
							buf += " | Hits/DC " + bb['hits'] + "/" + (bb['max bc generated']/bb['hits']);
							if (bb["hit dmg% distribution (total)"] !== 100) {
								buf += " | Dmg% " + bb["hit dmg% distribution (total)"];
							}
						}
						buf += " | BBMod Range " + minbb.effects[0]["bb atk%"] + "%-" + maxbb.effects[0]["bb atk%"] + "%";
						if (Object.keys(maxbb.effects[0]).length > 5) {
							if (!rtbb || Object.keys(maxbb.effects[0]).length > 6) {
								buf += " | May Have Innate Buff(s)";
							}
						}
						if (maxbb.effects.length > 1) buf += " | May Have Other Effects";
					}
					return buf;
					
				case 'no format':
				default:
					if (Array.isArray(dict)) {
						var elems = dict.map(function (elem) {
							if (typeof elem === "object") {
								return Array.isArray(elem) ? "[Array]" : "{Dict}";
							}
							return elem;
						});
						return strFormat("Array: [ %s ]", elems.join(", "));
					} else {
						var keys = Object.keys(dict).map(function (key) {
							var dictText = "";
							switch (typeof dict[key]) {
								case "object": // Check for null, then array
									if (!dict[key]) dictText += null;
									else if (Array.isArray(dict[key])) dictText += "[Array]";
									else dictText += "{Dict}";
									break;
								case "string":
									dictText += '"'+dict[key]+'"'; break;
								case "number":
								case "boolean":
									dictText += dict[key]; break;
							}
							return strFormat("%s: %s", key, dictText);
						});
						return strFormat("Dict: { %s }", keys.join(", "));
					}
			}
			return "";
		}
		var formatItemDict = function (dict, path) {
			var buf = "", queue = [];
			path = path || '';
			if (!dict) return null;
			if (Array.isArray(path)) {
				// Convert path array to string
				path = path.map(function(str){return "["+str+"]"}).join('');
			}
			switch (path) {
				case '': // No path, display item info
					buf += strFormat("%s - %s", dict.name, dict.desc);
					queue.push(buf);
					if (dict["type"] === "sphere") queue.push(strFormat("%s Type Sphere", dict['sphere type text']));
					if (dict["effect"]) queue.push(formatItemDict(dict.effect, '[effect]'));
					return queue;
				
				case '[effect]':
				case '[effect][effect]':
					var effects = dict.effect || dict;
					numEffects = effects.length;
					buf += "# of Effects: " + numEffects;
					var targetTypes = {
						singleenemy: "Single Enemy",
						aoeenemy: "All Enemies",
						singleparty: "Single Ally",
						aoeparty: "All Allies",
						singleself: "Self"
					};
					if (dict["target_area"]) buf += strFormat(" | Target: %s", targetTypes[dict["target area"]+dict["target type"]]);
					queue.push(buf);
					for (var i = 0; i < numEffects; i++) {
						var effect = formatItemDict(effects[i], "effect");
						queue.push(strFormat("%d) %s", i, effect));
					}
					return queue;
				case 'effect': // Internal case used by the [effect] path
					var effects = Object.keys(dict);
					var formatEffect = function (prop) {
						var effStr = "";
						if (dict[prop] === true) return dict[prop];
						// if (prop.indexOf("%") >= -1) {}
						return prop + ": " + dict[prop];
					};
					return effects.map(formatEffect).join(", ");
					
				default:
					if (Array.isArray(dict)) {
						var elems = dict.map(function (elem) {
							if (typeof elem === "object") {
								return Array.isArray(elem) ? "[Array]" : "{Dict}";
							}
							return elem;
						});
						return strFormat("Array: [ %s ]", elems.join(", "));
					} else {
						var keys = Object.keys(dict).map(function (key) {
							var dictText = "";
							switch (typeof dict[key]) {
								case "object": // Check for null, then array
									if (!dict[key]) dictText += null;
									else if (Array.isArray(dict[key])) dictText += "[Array]";
									else dictText += "{Dict}";
									break;
								case "string":
									dictText += '"'+dict[key]+'"'; break;
								case "number":
								case "boolean":
									dictText += dict[key]; break;
							}
							return strFormat("%s: %s", key, dictText);
						});
						return strFormat("Dict: { %s }", keys.join(", "));
					}
			}
		}
		var formatBuff = function (buffObj) {};
		var AITypes = {
			"Type 1": [
				{
					"action": "skill", 
					"chance%": 60.0, 
					"target conditions": "random", 
					"target type": "party"
				}, 
				{
					"action": "attack", 
					"chance%": 30.0, 
					"target conditions": "atk_max", 
					"target type": "enemy"
				}, 
				{
					"action": "attack", 
					"chance%": 100.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}
			],
			"Type 2": [
				{
					"action": "skill", 
					"chance%": 60.0, 
					"target conditions": "hp_50pr_over", 
					"target type": "enemy"
				}, 
				{
					"action": "skill", 
					"chance%": 20.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}, 
				{
					"action": "attack", 
					"chance%": 100.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}
			],
			"Type 3": [
				{
					"action": "skill", 
					"chance%": 60.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}, 
				{
					"action": "skill", 
					"chance%": 20.0, 
					"target conditions": "atk_max", 
					"target type": "enemy"
				}, 
				{
					"action": "attack", 
					"chance%": 30.0, 
					"target conditions": "hp_min", 
					"target type": "enemy"
				}, 
				{
					"action": "attack", 
					"chance%": 100.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}
			],
			"Type 4": [
				{
					"action": "skill", 
					"chance%": 60.0, 
					"target conditions": "hp_50pr_under", 
					"target type": "enemy"
				}, 
				{
					"action": "skill", 
					"chance%": 30.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}, 
				{
					"action": "attack", 
					"chance%": 70.0, 
					"target conditions": "hp_max", 
					"target type": "enemy"
				}, 
				{
					"action": "attack", 
					"chance%": 50.0, 
					"target conditions": "hp_min", 
					"target type": "enemy"
				}, 
				{
					"action": "attack", 
					"chance%": 100.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}
			],
			"Type 5": [
				{
					"action": "skill", 
					"chance%": 80.0, 
					"target conditions": "hp_50pr_under", 
					"target type": "party"
				}, 
				{
					"action": "skill", 
					"chance%": 20.0, 
					"target conditions": "hp_min", 
					"target type": "party"
				}, 
				{
					"action": "attack", 
					"chance%": 100.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}
			],
			"Type 6": [
				{
					"action": "skill", 
					"chance%": 100.0, 
					"target conditions": "hp_25pr_under", 
					"target type": "party"
				}, 
				{
					"action": "attack", 
					"chance%": 50.0, 
					"target conditions": "atk_max", 
					"target type": "enemy"
				}, 
				{
					"action": "attack", 
					"chance%": 100.0, 
					"target conditions": "random", 
					"target type": "enemy"
				}
			]
		}
		
		return {
			handlers: {
				'!unit !unitjp !uniteu !unitkr': function (command) {
					var buf = "", queue = [];
					var bfdata = BFData["GL"];
					if (command.command !== 'unit') {
						bfdata = BFData[command.command.substr(-2).toUpperCase()];
					}
					var silenced = !!silentChans[command.channel];
					var unit = bfdata.searchUnit(command.args.join(' '));
					if (!unit) {
						return {
							intent: silenced ? "notice" : "say",
							message: "Unit Not Found",
							query: silenced
						};
					}
					buf += unit['name'] + " - " + unit['rarity'] + "★ " + unit['element'][0].toUpperCase()+unit['element'].slice(1)
					if (unit['leader skill']) buf += " - LS: "  + unit['leader skill'].name + " (" + unit['leader skill'].desc + ")"
					queue.push(buf);
					if (unit['extra skill']) queue.push("ES: "  + unit['extra skill'].name + " (" + unit['extra skill'].desc + ")");
					if (unit['bb']) {
						var bb = unit['bb'];
						var minCost = bb['levels'][0]['bc cost'], maxCost = bb['levels'][9]['bc cost'];
						queue.push("BB: " + bb['name'] + " (" + (minCost === maxCost ? minCost : minCost + "-" + maxCost) + "BC) - " + bb['desc']);
					}
					if (unit['sbb']) {
						var bb = unit['sbb'];
						var minCost = bb['levels'][0]['bc cost'], maxCost = bb['levels'][9]['bc cost'];
						queue.push("SBB: " + bb['name'] + " (" + (minCost === maxCost ? minCost : minCost + "-" + maxCost) + "BC) - " + bb['desc']);
					}
					if (unit['ubb']) {
						var bb = unit['ubb'];
						var minCost = bb['levels'][0]['bc cost']
						queue.push("UBB: " + bb['name'] + " (" + minCost + "BC) - " + bb['desc']);
					}
					return {
						intent: silenced ? "notice" : "say",
						message: queue,
						query: silenced
					};
				},
				'!unitdata !unitdatajp !unitdataeu !unitdatakr !udata !udatajp !udataeu !udatakr': function (command) {
					var bfdata = BFData["GL"];
					if (command.command.substr(-4) !== 'data') {
						bfdata = BFData[command.command.substr(-2).toUpperCase()];
					}
					var formatDicts = true;
					var silenced = !!silentChans[command.channel];
					var response = {
						intent: silenced ? "notice" : "say",
						message: "",
						target: silenced ? command.nickname : command.channel
					};
					var args = command.args.join(' ').toLowerCase().split(',').map(function(str){return str.trim();});
					if (args[args.length-1].substr(-1) === "*" && (args.length > 1 || isNaN(args[args.length-1].substr(-2,1)))) {
						var last_arg = args[args.length-1];
						args[args.length-1] = last_arg.substr(0,last_arg.length-1);
						formatDicts = false;
					}
					var unit = bfdata.searchUnit(args[0]);
					if (!unit) {
						response.message = "Unit not found.";
						return response;
					}
					var buf = "", queue = [], path = [];
					var data = unit;
					for (var i = 1; i < args.length; i++) {
						if (typeof data !== 'object') {
							response.message = "Cannot get property of non-object: Last valid property was '"+key+"' = "+data;
							return response;
						}
						var key = args[i];
						path.push(key);
						data = data[key];
						if (data === undefined) {
							response.message = "Key undefined: "+key;
							return response;
						}
					}
					if (typeof data === 'object') {
						if (formatDicts) {
							var text = formatDict(data, path);
							if (text) {
								response.message = text;
								return response;
							} else {
								if (text === null) console.log('no dict found?');
								else console.log('Could not find format for path: '+path.map(function(str){return "["+str+"]"}).join(''));
							}
						}
						/*
						if (Array.isArray(data)) {
							var str = "Array found: ";
							if (data.length > 50) {
								str += "Too large to display. Length: " + data.length;
							} else {
								str += "[";
								str += data.map(function(el){
									if (typeof el === 'object') {
										return Array.isArray(el) ? "[Array]" : "{Dict}";
									}
									return el;
								});
								str += "]"
							}
							response.message = str;
							return response;
						}
						response.message = "Unformattable dict found! Properties: "+Object.keys(data);
						*/
						response.message = formatDict(data, 'no format');
						return response;
					}
					response.message = ""+data;
					return response;
				},
				'!unitsearch !unitsearchjp !unitsearcheu !unitsearchkr !usearch !usearchjp !usearcheu !usearchkr': function (command) {
					var bfdata = BFData["GL"];
					if (command.command !== 'unitsearch' && command.command !== 'usearch') {
						bfdata = BFData[command.command.substr(-2).toUpperCase()];
					}
					var silenced = !!silentChans[command.channel];
					var response = {
						intent: silenced ? "notice" : "say",
						message: "",
						query: silenced || command.isQuery
					};
					var args = command.args.join(' ').toLowerCase().split(',').map(function(str){return str.trim();});
					if (args.length < 1) {
						response.message = "No Filter Specified";
						return response;
					}
					var query = {
						plus:  {},
						minus: {}
					};
					function queryBuilder(arg) { // Builds the query obj to pass to data.queryUnits()
						var q = query.plus;
						if (arg.charAt(0) === "+") {
							arg = arg.substr(1);
						} else if (arg.charAt(0) === "-") {
							arg = arg.substr(1);
							q = query.minus;
						}
						var parsedArg = parseArg(arg);
						if (command.nickname === "Dan_Ugore") console.log(JSON.stringify(parsedArg));
						propHandlers = {
							'element': function (argData) {
								q['element'] = argData.val;
							},
							'rarity': function (argData) {
								q['rarity'] = q['rarity'] || {};
								if (argData.comp && argData.comp.charAt(0) !== "=") {
									if (argData.comp === '<') q['rarity'].max = Number(argData.val)+1;
									if (argData.comp === '<=') q['rarity'].max = Number(argData.val);
									if (argData.comp === '>') q['rarity'].min = Number(argData.val)-1;
									if (argData.comp === '>=') q['rarity'].min = Number(argData.val);
								} else {
									q['rarity'].min = q['rarity'].max = argData.val;
								}
							},
							'cost': function (argData) {
								q['cost'] = q['cost'] || {};
								if (argData.comp && argData.comp.charAt(0) !== "=") {
									if (argData.comp === '<') q['cost'].max = Number(argData.val)+1;
									if (argData.comp === '<=') q['cost'].max = Number(argData.val);
									if (argData.comp === '>') q['cost'].min = Number(argData.val)-1;
									if (argData.comp === '>=') q['cost'].min = Number(argData.val);
								} else {
									q['cost'].min = q['cost'].max = argData.val;
								}
							},
							'hits': function (argData) {
								q['hits'] = q['hits'] || {};
								if (argData.comp && argData.comp.charAt(0) !== "=") {
									if (argData.comp === '<') q['hits'].max = Number(argData.val)+1;
									if (argData.comp === '<=') q['hits'].max = Number(argData.val);
									if (argData.comp === '>') q['hits'].min = Number(argData.val)-1;
									if (argData.comp === '>=') q['hits'].min = Number(argData.val);
								} else {
									q['hits'].min = q['hits'].max = argData.val;
								}
							},
							'dc': function (argData) {
								q['dc'] = q['dc'] || {};
								if (argData.comp && argData.comp.charAt(0) !== "=") {
									if (argData.comp === '<') q['dc'].max = Number(argData.val)+1;
									if (argData.comp === '<=') q['dc'].max = Number(argData.val);
									if (argData.comp === '>') q['dc'].min = Number(argData.val)-1;
									if (argData.comp === '>=') q['dc'].min = Number(argData.val);
								} else {
									q['dc'].min = q['dc'].max = argData.val;
								}
							},
							'bbtype': function (argData) {
								q.bb = q.bb || {};
								q.bb['type'] = argData.val.toLowerCase();
							},
							'spark': function (argData) {
								q['bb'] = q['bb'] || {};
								q['sbb'] = q['sbb'] || {};
								q['bb']['has'] = q['bb']['has'] || {};
								q['sbb']['has'] = q['sbb']['has'] || {};
								q['bb']['has']['spark'] = q['sbb']['has']['spark'] = true;
								if (argData.comp) {
									q['bb']['has']['spark'] = {};
									q['sbb']['has']['spark'] = {};
									if (argData.comp.charAt(0) !== "=") {
										if (argData.comp === '<') q['bb']['has']['spark'].max = q['sbb']['has']['spark'].max = Number(argData.val)+1;
										if (argData.comp === '<=') q['bb']['has']['spark'].max = q['sbb']['has']['spark'].max = Number(argData.val);
										if (argData.comp === '>') q['bb']['has']['spark'].min = q['sbb']['has']['spark'].max = Number(argData.val)-1;
										if (argData.comp === '>=') q['bb']['has']['spark'].min = q['sbb']['has']['spark'].max = Number(argData.val);
									} else {
										q['bb']['has']['spark'].min = q['bb']['has']['spark'].max = argData.val;
									}
								}
							},
							'crit': function (argData) {
								q['bb'] = q['bb'] || {};
								q['sbb'] = q['sbb'] || {};
								q['bb']['has'] = q['bb']['has'] || {};
								q['sbb']['has'] = q['sbb']['has'] || {};
								q['bb']['has']['crit'] = q['sbb']['has']['crit'] = true;
								if (argData.comp) {
									q['bb']['has']['crit'] = {};
									q['sbb']['has']['crit'] = {};
									if (argData.comp.charAt(0) !== "=") {
										if (argData.comp === '<') q['bb']['has']['crit'].max = q['sbb']['has']['crit'].max = Number(argData.val)+1;
										if (argData.comp === '<=') q['bb']['has']['crit'].max = q['sbb']['has']['crit'].max = Number(argData.val);
										if (argData.comp === '>') q['bb']['has']['crit'].min = q['sbb']['has']['crit'].max = Number(argData.val)-1;
										if (argData.comp === '>=') q['bb']['has']['crit'].min = q['sbb']['has']['crit'].max = Number(argData.val);
									} else {
										q['bb']['has']['crit'].min = q['bb']['has']['crit'].max = argData.val;
									}
								}
							}
						}
						// Aliases
						propHandlers['stars'] = propHandlers['rarity'];
						propHandlers['dropchecks'] = propHandlers['dc'];
						// Run the proper function.
						propHandlers[parsedArg.propName](parsedArg);
					}
					function parseArg(arg) { // Parses an arg string char by char
						var buf = "";
						var propName = "", val = "", comp = "";
						arg.split('').forEach(function (ch) {
							if (ch === ' ') return;
							if (ch === ':') {
								propName += buf;
								buf = "";
							} else if (!comp && (ch === '<' || ch === '>' || ch === '=')) {
								comp = ch;
								if (propName) propName += ':';
								propName += buf;
								buf = "";
							} else if (!buf && ch === '=') {
								comp += ch;
							} else {
								buf += ch;
							}
						});
						if (!propName) {
							propName += buf;
							buf = "";
						}
						val = buf;
						return {
							propName: propName,
							val: val,
							comp: comp
						}
					}
					args.forEach(queryBuilder);
					console.log(JSON.stringify(query));
					var results = bfdata.queryUnits(query).map(function(u){return u.name});
					if (!results.length) {
						response.message = "No Units Found";
					} else if (results.length > 50) {
						response.message = "Too Many Units Found. Please Narrow Your Search.";
					} else if (results.length > 10) {
						if (!response.query) {
							response.message = [results.slice(0, 10).join(', ') + " and " + (results.length-10) + " others.", "PM "+client.nickname()+" for all results."];
						} else {
							response.message = [];
							for (var i = 0; i < results.length; i += 10) {
								response.message.push(results.slice(i, 10).join(', '));
							}
						}
					} else {
						response.message = results.join(', ');
					}
					return response;
				},
				'!item !itemjp !itemeu !itemkr': function (command) {
					var bfdata = BFData;
					if (command.command !== 'item') {
						bfdata = BFData[command.command.substr(-2).toUpperCase()];
					}
					var silenced = !!silentChans[command.channel];
					var item = bfdata.findItem(command.args.join(' '));
					if (!item) {
						return {
							intent: silenced ? "notice" : "say",
							message: "Item Not Found",
							query: silenced
						};
					}
					var str = "", queue = [];
					str = strFormat("%s - %s", item.name, item.desc);
					queue.push(str);
					if (item['type'] === "sphere") {
						str = strFormat("%s Type Sphere", item['sphere type text']);
						queue.push(str);
					}
					if (item['recipe']) {
						str = "";
						var recipe = item['recipe'], karma = Number(recipe['karma']) || 0;
						if (karma) str += strFormat("Cost: %d Karma | ", karma);
						str += "Materials: ";
						str += recipe['materials'].map(function (mat) {
							return strFormat("%s x%d", bfdata.getItem(mat.id).name, mat.count);
						}).join(", ");
						queue.push(str);
					}
					return {
						intent: silenced ? "notice" : "say",
						message: queue,
						query: silenced
					};
				},
				'!itemdata !itemdatajp !itemdataeu !itemdatakr !idata !idatajp !idataeu !idatakr': function (command) {
					var bfdata = BFData;
					if (command.command.substr(-4) !== 'data') {
						bfdata = BFData[command.command.substr(-2).toUpperCase()];
					}
					var formatDicts = true;
					var silenced = !!silentChans[command.channel];
					var response = {
						intent: silenced ? "notice" : "say",
						message: "",
						query: silenced
					};
					var args = command.args.join(' ').toLowerCase().split(',').map(function(str){return str.trim();});
					if (args[args.length-1].substr(-1) === "*") {
						var last_arg = args[args.length-1];
						args[args.length-1] = last_arg.substr(0,last_arg.length-1);
						formatDicts = false;
					}
					var item = bfdata.findItem(args[0]);
					if (!item) {
						response.message = "Item not found.";
						return response;
					}
					var buf = "", queue = [], path = [];
					var data = item;
					for (var i = 1; i < args.length; i++) {
						if (typeof data !== 'object') {
							response.message = "Cannot get property of non-object: Last valid property was '"+key+"' = "+data;
							return response;
						}
						var key = args[i];
						path.push(key);
						data = data[key];
						if (data === undefined) {
							response.message = "Key undefined: "+key;
							return response;
						}
					}
					if (typeof data === 'object') {
						if (formatDicts) {
							var text = formatItemDict(data, path);
							if (text) {
								response.message = text;
								return response;
							} else {
								if (text === null) console.log('no dict found?');
								else console.log('Could not find format for path: '+path.map(function(str){return "["+str+"]"}).join(''));
							}
						}
						if (Array.isArray(data)) {
							var str = "Array found: ";
							if (data.length > 50) {
								str += "Too large to display. Length: " + data.length;
							} else {
								str += "[";
								str += data.map(function(el){
									if (typeof el === 'object') {
										return Array.isArray(el) ? "[Array]" : "{Dict}";
									}
									return el;
								});
								str += "]"
							}
							response.message = str;
							return response;
						}
						response.message = "Unformattable dict found! Properties: "+Object.keys(data);
						return response;
					}
					response.message = ""+data;
					return response;
				},
				'!evomat !evomatgl !evomatjp !evomateu !evomatkr': function (command) {
					var bfdata = BFData["GL"];
					if (command.command !== 'evomat') {
						bfdata = BFData[command.command.substr(-2).toUpperCase()];
					}
					var silenced = !!silentChans[command.channel];
					var response = {
							intent: silenced ? "notice" : "say",
							message: [],
							query: silenced
					};
					var unit = bfdata.searchUnit(command.args.join(' '));
					if (!unit) {
						response.message = "Unit not found";
						return response;
					}
					var evodata = bfdata.getEvoData(unit.id);
					if (!evodata) {
						response.message = "Unit does not evolve.";
						return response;
					}
					var unitFormat = "%s (%s*)"; // Name, Rarity
					var evoFormat = "%s evolves into %s";
					var matsFormat = "Evo Mats: %s";
					response.message.push(strFormat(evoFormat, strFormat(unitFormat, unit.name, unit.rarity), strFormat(unitFormat, evodata.evo.name, evodata.evo.rarity)));
					response.message.push(strFormat(matsFormat, evodata.mats.map(function(mat){return mat.name;}).join(', ')));
					return response;
				},
				'!update': function (command) {
					if (command.nickname === "Dan_Ugore") {
						// Consider putting update script here after identification check...
					}
				},
				'!silence': function (command) { // Requires channel plugin
					var chan = client.Channels[command.channel];
					var response = {intent: "notice", message: "", query: true};
					if (chan.hasAuth(command.nickname, 'h')) {
						silentChans[command.channel] = chan.hasAuth(command.nickname).charAt(0);
						response.intent = 'say';
						response.message = "Unit commands silenced.";
						response.query = false;
					} else {
						response.message = "Access denied. halfop or higher required.";
					}
					return response;
				},
				'!unsilence': function (command) { // Requires channel plugin
					var chan = client.Channels[command.channel];
					var response = {intent: "notice", message: "", query: true}
					if (!silentChans[command.channel]) {
						response.message = "Commands aren't silenced.";
					} else if (!chan.hasAuth(command.nickname, silentChans[command.channel])) {
						response.message = "Access denied. Must be equal or greater than the silencer.";
					} else {
						delete silentChans[chan];
						response.intent = 'say';
						response.message = "Unit commands unsilenced.";
						response.query = false;
					}
					return response;
				},
				'!jptime': function (cmd) {
					function calcTime(offset) {

						// create Date object for current location
						var d = new Date();
						
						// convert to msec
						// add local time zone offset 
						// get UTC time in msec
						var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
						
						// create new Date object for different city
						// using supplied offset
						var nd = new Date(utc + (3600000*offset));
						return nd.toLocaleString();
					}
					return calcTime(9);
				},
				'notice': function (msg) {
					if (msg.nickname === "GitBot" || (msg.nickname in {"Lucius":1,"Whammu":1} && msg.message === "Update BFData")) {
						BFData.updateData();
						// Re-require the data to update.
						// BFData = require(BFDataFile);
						console.log("Updated Data Files");
					}
				}
			},
			help: {
				'unit': [
					"{{!}}unit[jp|eu|kr] <unit>",
					"Displays assorted information about <unit> including Leader Skill, BB, and SBB flavor texts.",
					"Note: Flavor text will be in the data's native language."
				],
				'unitjp': [
					"{{!}}unit[jp|eu|kr] <unit>",
					"Displays assorted information about <unit> including Leader Skill, BB, and SBB flavor texts.",
					"Note: Flavor text will be in the data's native language."
				],
				'uniteu': [
					"{{!}}unit[jp|eu|kr] <unit>",
					"Displays assorted information about <unit> including Leader Skill, BB, and SBB flavor texts.",
					"Note: Flavor text will be in the data's native language."
				],
				'unitkr': [
					"{{!}}unit[jp|eu|kr] <unit>",
					"Displays assorted information about <unit> including Leader Skill, BB, and SBB flavor texts.",
					"Note: Flavor text will be in the data's native language."
				],
				'unitdata': [
					"{{!}}unitdata[jp|eu|kr] <unit> <, path>",
					"Finds object for <unit> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"Common formatted paths: 'bb', 'sbb', 'ubb', 'leader skill', 'stats', 'stats, breaker' etc., 'imp', or no path at all.",
					"If you are familiar with the data structure of a unit and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Examples: {{!}}unitdata vargas ; {{!}}unitdatajp vargas ; {{!}}unitdatajp 4* Zeln, bb ; {{!}}unitdata Lilly Matah, leader skill*"
				],
				'unitdatajp': [
					"{{!}}unitdata[jp|eu|kr] <unit> <, path>",
					"Finds object for <unit> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"Common formatted paths: 'bb', 'sbb', 'ubb', 'leader skill', 'stats', 'stats, breaker' etc., 'imp', or no path at all.",
					"If you are familiar with the data structure of a unit and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Examples: {{!}}unitdata vargas ; {{!}}unitdatajp vargas ; {{!}}unitdatajp 4* Zeln, bb ; {{!}}unitdata Lilly Matah, leader skill*"
				],
				'unitdataeu': [
					"{{!}}unitdata[jp|eu|kr] <unit> <, path>",
					"Finds object for <unit> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"Common formatted paths: 'bb', 'sbb', 'ubb', 'leader skill', 'stats', 'stats, breaker' etc., 'imp', or no path at all.",
					"If you are familiar with the data structure of a unit and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Examples: {{!}}unitdata vargas ; {{!}}unitdatajp vargas ; {{!}}unitdatajp 4* Zeln, bb ; {{!}}unitdata Lilly Matah, leader skill*"
				],
				'unitdatakr': [
					"{{!}}unitdata[jp|eu|kr] <unit> <, path>",
					"Finds object for <unit> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"Common formatted paths: 'bb', 'sbb', 'ubb', 'leader skill', 'stats', 'stats, breaker' etc., 'imp', or no path at all.",
					"If you are familiar with the data structure of a unit and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Examples: {{!}}unitdata vargas ; {{!}}unitdatajp vargas ; {{!}}unitdatajp 4* Zeln, bb ; {{!}}unitdata Lilly Matah, leader skill*"
				],
				'udata': [
					"{{!}}unitdata[jp|eu|kr] <unit> <, path>",
					"Finds object for <unit> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"Common formatted paths: 'bb', 'sbb', 'ubb', 'leader skill', 'stats', 'stats, breaker' etc., 'imp', or no path at all.",
					"If you are familiar with the data structure of a unit and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Examples: {{!}}unitdata vargas ; {{!}}unitdatajp vargas ; {{!}}unitdatajp 4* Zeln, bb ; {{!}}unitdata Lilly Matah, leader skill*"
				],
				'udatajp': [
					"{{!}}unitdata[jp|eu|kr] <unit> <, path>",
					"Finds object for <unit> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"Common formatted paths: 'bb', 'sbb', 'ubb', 'leader skill', 'stats', 'stats, breaker' etc., 'imp', or no path at all.",
					"If you are familiar with the data structure of a unit and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Examples: {{!}}unitdata vargas ; {{!}}unitdatajp vargas ; {{!}}unitdatajp 4* Zeln, bb ; {{!}}unitdata Lilly Matah, leader skill*"
				],
				'udataeu': [
					"{{!}}unitdata[jp|eu|kr] <unit> <, path>",
					"Finds object for <unit> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"Common formatted paths: 'bb', 'sbb', 'ubb', 'leader skill', 'stats', 'stats, breaker' etc., 'imp', or no path at all.",
					"If you are familiar with the data structure of a unit and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Examples: {{!}}unitdata vargas ; {{!}}unitdatajp vargas ; {{!}}unitdatajp 4* Zeln, bb ; {{!}}unitdata Lilly Matah, leader skill*"
				],
				'udatakr': [
					"{{!}}unitdata[jp|eu|kr] <unit> <, path>",
					"Finds object for <unit> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"Common formatted paths: 'bb', 'sbb', 'ubb', 'leader skill', 'stats', 'stats, breaker' etc., 'imp', or no path at all.",
					"If you are familiar with the data structure of a unit and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Examples: {{!}}unitdata vargas ; {{!}}unitdatajp vargas ; {{!}}unitdatajp 4* Zeln, bb ; {{!}}unitdata Lilly Matah, leader skill*"
				],
				'item': [
					"{{!}}item[jp|kr|eu] <item>",
					"Displays Name and Desc for <item>. Includes Sphere Type and Crafting Materials if relevant.",
					"Note: Flavor text will be in the data's native language."
				],
				'itemjp': [
					"{{!}}item[jp|kr|eu] <item>",
					"Displays Name and Desc for <item>. Includes Sphere Type and Crafting Materials if relevant.",
					"Note: Flavor text will be in the data's native language."
				],
				'itemeu': [
					"{{!}}item[jp|kr|eu] <item>",
					"Displays Name and Desc for <item>. Includes Sphere Type and Crafting Materials if relevant.",
					"Note: Flavor text will be in the data's native language."
				],
				'itemkr': [
					"{{!}}item[jp|kr|eu] <item>",
					"Displays Name and Desc for <item>. Includes Sphere Type and Crafting Materials if relevant.",
					"Note: Flavor text will be in the data's native language."
				],
				'itemdata': [
					"{{!}}itemdata[jp|eu|kr] <item> <, path>",
					"Finds object for <item> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"If you are familiar with the data structure of an item and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Remember, properties are CASE SENSITIVE and are almost always in lower case",
					"Examples: {{!}}itemdata angelic foil ; {{!}}itemdatajp lignes, effects"
				],
				'itemdatajp': [
					"{{!}}itemdata[jp|eu|kr] <item> <, path>",
					"Finds object for <item> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"If you are familiar with the data structure of an item and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Remember, properties are CASE SENSITIVE and are almost always in lower case",
					"Examples: {{!}}itemdata angelic foil ; {{!}}itemdatajp lignes, effects"
				],
				'itemdataeu': [
					"{{!}}itemdata[jp|eu|kr] <item> <, path>",
					"Finds object for <item> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"If you are familiar with the data structure of an item and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Remember, properties are CASE SENSITIVE and are almost always in lower case",
					"Examples: {{!}}itemdata angelic foil ; {{!}}itemdatajp lignes, effects"
				],
				'itemdatakr': [
					"{{!}}itemdata[jp|eu|kr] <item> <, path>",
					"Finds object for <item> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"If you are familiar with the data structure of an item and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Remember, properties are CASE SENSITIVE and are almost always in lower case",
					"Examples: {{!}}itemdata angelic foil ; {{!}}itemdatajp lignes, effects"
				],
				'idata': [
					"{{!}}itemdata[jp|eu|kr] <item> <, path>",
					"Finds object for <item> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"If you are familiar with the data structure of an item and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Remember, properties are CASE SENSITIVE and are almost always in lower case",
					"Examples: {{!}}itemdata angelic foil ; {{!}}itemdatajp lignes, effects"
				],
				'idatajp': [
					"{{!}}itemdata[jp|eu|kr] <item> <, path>",
					"Finds object for <item> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"If you are familiar with the data structure of an item and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Remember, properties are CASE SENSITIVE and are almost always in lower case",
					"Examples: {{!}}itemdata angelic foil ; {{!}}itemdatajp lignes, effects"
				],
				'idataeu': [
					"{{!}}itemdata[jp|eu|kr] <item> <, path>",
					"Finds object for <item> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"If you are familiar with the data structure of an item and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Remember, properties are CASE SENSITIVE and are almost always in lower case",
					"Examples: {{!}}itemdata angelic foil ; {{!}}itemdatajp lignes, effects"
				],
				'idatakr': [
					"{{!}}itemdata[jp|eu|kr] <item> <, path>",
					"Finds object for <item> and allows you to view its properties. Object data provided by Deathmax https://github.com/Deathmax/bravefrontier_data",
					"If you are familiar with the data structure of an item and are looking for specific info, you can navigate on your own.",
					"To view a path's object unformatted, append an asterisk to the last argument.",
					"Remember, properties are CASE SENSITIVE and are almost always in lower case",
					"Examples: {{!}}itemdata angelic foil ; {{!}}itemdatajp lignes, effects"
				],
				'silence': [
					"{{!}}silence | {{!}}unsilence",
					"If a channel is silenced, the bot will notice users who activate its info commands.",
					"{{!}}silence requires halfop or higher to be triggered",
					"{{!}}unsilence requires someone of the same level or higher to undo the silencing."
				],
				'unsilence': [
					"{{!}}silence | {{!}}unsilence",
					"If a channel is silenced, the bot will notice users who activate its info commands.",
					"{{!}}silence requires halfop or higher to be triggered",
					"{{!}}unsilence requires someone of the same level or higher to undo the silencing."
				]
			},
			commands: ['unit[jp|eu|kr]', 'unitdata[jp|eu|kr] or udata[jp|eu|kr]', 'item[jp|eu|kr]', 'itemdata[jp|eu|kr] or idata[jp|eu|kr]', 'silence', 'unsilence'],
			exports: {
				BFData: BFData,
				formatDict: formatDict,
				formatItemDict: formatItemDict,
				definePassive: definePassive
			}
		};
	}
};
module.exports = BF_Database;