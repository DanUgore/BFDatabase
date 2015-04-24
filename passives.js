var strFormat = require('util').format;
var defineStatBuffs = function (dict) {
		var buffs = [], descBuf = [], desc = "";
		var stats = {hp:"HP",atk:"ATK",def:"DEF",rec:"REC",crit:"Crit"};
		for (var stat in stats) if (dict[stat+"% buff"]) buffs.push({stat: stats[stat], value: dict[stat+"% buff"]});
		for (var i = 0; i < buffs.length; i++) {
			var buff = buffs[i];
			desc += strFormat("%s%s%% %s", buff.value>0?"+":"" , buff.value, buff.stat);
			for (var j = i+1; j < buffs.length; j++)
				if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
			if (desc.substr(-14) === "HP/ATK/DEF/REC") desc = strFormat("%s%s%% All Stats", buff.value>0?"+":"" , buff.value);
			descBuf.push(desc);
			desc = "";
		}
		return descBuf.join(" ");
}
// var defineDropBuffs = function () {} Consider it.

var passiveIDs = {
	"1": {
		name: "Stat Buffs",
		format: function (dict) { // 
			return "All Units: "+defineStatBuffs(dict);
		}
	},
	"2": {
		name: "Element-Specific Stat Buffs",
		format: function (dict) { // 
			return dict["elements buffed"].map(function(name){return name.charAt(0).toUpperCase()+name.substr(1);}) + " Units: " + defineStatBuffs(dict);
		}
	},
	"4": {
		name: "Resist Status Ailments",
		format: function (dict) { // 
			var buffs = [], descBuf = [], desc = "";
			var statuses = {injury:"Injury",poison:"Poison",sick:"Sick",weaken:"Weaken",curse:"Curse",paralysis:"Paralyze"};
			for (var status in statuses) if (dict[status+" resist%"]) buffs.push({status: statuses[status], value: dict[status+" resist%"]});
			for (var i = 0; i < buffs.length; i++) {
				var buff = buffs[i];
				desc += strFormat("%s %s", buff.value<100?(buff.value+"% Resist"):"Negate" , buff.status);
				for (var j = i+1, count = 1; j < buffs.length; j++, count++)
					if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].status;
				if (i === 0 && count === Object.keys(statuses).length) {
					return strFormat("%s Status Ailments", buff.value<100 ? (buff.value+"% Resist") : "Invalidate");
				}
				descBuf.push(desc);
				desc = "";
			}
			return descBuf.join(" ");
		}
	},
	"5": {
		name: "Resist Element Damage",
		format: function (dict) { // 
			var buffs = [], descBuf = [], desc = "";
			var elements = {fire:"Fire",water:"Water",earth:"Earth",thunder:"Thunder",light:"Light",dark:"Dark"};
			for (var element in elements) if (dict[element+" resist%"]) buffs.push({element: elements[element], value: dict[element+" resist%"]});
			for (var i = 0; i < buffs.length; i++) {
				var buff = buffs[i];
				desc += strFormat("%s%% %s", buff.value, buff.element);
				for (var j = i+1, count = 1; j < buffs.length; j++, count++)
					if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].element;
				if (i === 0 && count === Object.keys(elements).length) {
					return strFormat("%s%% Element Resist", buff.value);
				}
				descBuf.push(desc+" Resist");
				desc = "";
			}
			return descBuf.join(" ");
		}
	},
	"8": {
		name: "",
		format: function (dict) { // Mitigation
			return strFormat("%s%% Dmg Mit", dict["dmg% mitigation"]);
		}
	},
	"9": {
		name: "BC per turn",
		format: function (dict) {
			return strFormat("%s BC/turn", dict["bc fill per turn"]);
		}
	},
	"10": {
		name: "HC Effectiveness",
		format: function (dict) {
			return strFormat("%s%% HC Effectiveness", dict["hc effectiveness"]);
		}
	},
	"11": {
		name: "HP Threshold Stat Buffs",
		format: function (dict) {
			var compType = dict["hp above % buff requirement"] ? "above" : "below";
			if (dict["hp above % buff requirement"] === 100) return strFormat("%s when HP is full", defineStatBuffs(dict));
			if (dict["hp below % buff requirement"] === 100) return strFormat("%s when HP is not full", defineStatBuffs(dict));
			return strFormat("%s when HP is %s %s%%", defineStatBuffs(dict), compType, dict["hp "+compType+" % buff requirement"]);
		}
	},
	"12": {
		name: "HP Threshold Drop Rate Buffs ",
		format: function (dict) {
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
			var compType = dict["hp above % buff requirement"] ? "above" : "below";
			if (dict["hp above % buff requirement"] === 100) return strFormat("%s when HP is full", descBuf.join(" "));
			if (dict["hp below % buff requirement"] === 100) return strFormat("%s when HP is not full", descBuf.join(" "));
			return strFormat("%s when HP is %s %s%%", descBuf.join(" "), compType, dict["hp "+compType+" % buff requirement"]);
		}
	},
	"13": {
		name: "BC on Enemy Defeat",
		format: function (dict) {
			var buf = "";
			if (dict["bc fill on enemy defeat chance%"] < 100) buf += dict["bc fill on enemy defeat chance%"] + "% Chance ";
			buf += dict["bc fill on enemy defeat low"];
			if (dict["bc fill on enemy defeat low"] !== dict["bc fill on enemy defeat high"]) buf += "-"+dict["bc fill on enemy defeat high"];
			buf += " BC on Enemy Defeated";
			return buf;
		}
	},
	"14": {
		name: "% Chance Reduce Damage",
		format: function (dict) {
			return strFormat("%s%% Chance Reduce Damage %s%%", dict["dmg reduction chance%"], dict["dmg reduction%"]);
		}
	},
	"17": {
		name: "HP Drain",
		format: function (dict) {
			var buf = "";
			if (dict["hp drain chance%"] < 100) buf += dict["hp drain chance%"] + "% Chance ";
			buf += dict["hp drain% low"];
			if (dict["hp drain% low"] !== dict["hp drain% high"]) buf += "-"+dict["hp drain% high"];
			buf += "% HP Drain";
			return buf;
		}
	},
	"19": {
		name: "Drop Rate Buff",
		format: function (dict) {
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
		}
	},
	"20": {
		name: "Inflict Status Ailments",
		format: function (dict) {
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
		}
	},
	"21": {
		name: "First X Turns Buffs",
		format: function (dict) {
			var buffs = [], descBuf = [], desc = "";
			var stats = {hp:"HP",atk:"ATK",def:"DEF",rec:"REC",crit:"Crit"};
			var buffObj = {};
			if (dict["first x turns atk% (1)"]) buffObj["atk% buff"] = dict["first x turns atk% (1)"];
			if (dict["first x turns def% (3)"]) buffObj["def% buff"] = dict["first x turns def% (3)"];
			if (dict["first x turns rec% (5)"]) buffObj["rec% buff"] = dict["first x turns rec% (5)"];
			if (dict["first x turns crit% (7)"]) buffObj["crit% buff"] = dict["first x turns crit% (7)"];
			return strFormat("%s for First %s Turns", defineStatBuffs(buffObj), dict["first x turns"]);
		}
	},
	"24": {
		name: "Damage to HP on hit",
		format: function (dict) {
			var buf = "";
			if (dict["dmg% to hp% when attacked chance%"] < 100) buf += dict["dmg% to hp% when attacked chance%"] + "% Chance ";
			buf += dict["dmg% to hp% when attacked low"];
			if (dict["dmg% to hp% when attacked low"] !== dict["dmg% to hp% when attacked high"]) buf += "-"+dict["dmg% to hp% when attacked high"];
			buf += "% DMG to HP when hit";
			return buf;
		}
	},
	"25": {
		name: "BC On Hit",
		format: function (dict) {
			var buf = "";
			if (dict["bc fill when attacked chance%"] < 100) buf += dict["bc fill when attacked chance%"] + "% Chance ";
			buf += dict["bc fill when attacked low"];
			if (dict["bc fill when attacked low"] !== dict["bc fill when attacked high"]) buf += "-"+dict["bc fill when attacked high"];
			buf += " BC when hit";
			return buf;
		}
	},
	"26": {
		name: "Damage Reflect",
		format: function (dict) {
			var buf = "";
			if (dict["dmg% reflect chance%"] < 100) buf += dict["dmg% reflect chance%"] + "% Chance ";
			buf += dict["dmg% reflect low"];
			if (dict["dmg% reflect low"] !== dict["dmg% reflect high"]) buf += "-"+dict["dmg reflect% high"];
			buf += "% Damage Reflect";
			return buf;
		}
	},
	"29": {
		name: "% Chance Def Ignore",
		format: function (dict) {
			return strFormat("%s%% Chance Ignore Def", dict["ignore def%"]);
		}
	},
	"30": {
		name: "BB Gauge threshold buff",
		format: function (dict) {
			var compType = dict["bb gauge above % buff requirement"] ? "above" : "below";
			if (dict["bb gauge above % buff requirement"] === 100) return strFormat("%s when BB Gauge is full", defineStatBuffs(dict));
			if (dict["bb gauge below % buff requirement"] === 100) return strFormat("%s when BB Gauge is not full", defineStatBuffs(dict));
			return strFormat("%s when BB Gauge is %s %s%%", defineStatBuffs(dict), compType, dict["bb gauge "+compType+" % buff requirement"]);
		}
	},
	"31": {
		name: "Spark Damage",
		format: function (dict) {
			var queue = [];
			if (dict["damage% for spark"]) queue.push(strFormat("+%s%% Spark Damage", dict["damage% for spark"]));
			var buffs = [], descBuf = [], desc = "";
			var stats = {bc:"BC",hc:"HC",karma:"Karma",zel:"Zel",item:"Item"};
			for (var stat in stats) if (dict[stat+" drop% for spark"]) buffs.push({stat: stats[stat], value: dict[stat+" drop% for spark"]});
			for (var i = 0; i < buffs.length; i++) {
				var buff = buffs[i];
				desc += strFormat("%s%s%% %s", buff.value>0?"+":"" , buff.value, buff.stat);
				for (var j = i+1; j < buffs.length; j++)
					if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
				descBuf.push(desc+" Drop Rate");
				desc = "";
			}
			queue.push(descBuf.join(" ")+" on Spark");
			return queue.join(" & ");
		}
	},
	"32": {
		name: "BB Gauge Fill Rate",
		format: function (dict) {
			return strFormat("+%s%% BB Gauge Fill Rate", dict["bb gauge fill rate%"]);
		}
	},
	"33": {
		name: "Gradual Heal",
		format: function (dict) {
			var buf = "Heal ";
			buf += dict["turn heal low"];
			if (dict["turn heal low"] !== dict["turn heal high"]) buf += "-"+dict["turn heal high"];
			buf += " (+ "+dict["rec% added (turn heal)"]+"% REC) HP/turn";
			return buf;
		}
	},
	"34": {
		name: "Crit Damage",
		format: function (dict) {
			return strFormat("+%d%% Crit Damage", dict["crit multiplier%"]);
		}
	},
	"35": {
		name: "BC On Attack",
		format: function (dict) {
			var buf = "";
			if (dict["bc fill when attacking chance%"] < 100) buf += dict["bc fill when attacking chance%"] + "% Chance ";
			buf += dict["bc fill when attacking low"];
			if (dict["bc fill when attacking low"] !== dict["bc fill when attacking high"]) buf += "-"+dict["bc fill when attacking high"];
			buf += " BC On Attack";
			return buf;
		}
	},
	"36": {
		name: "Additional Actions?",
		format: function (dict) { return "Unused (36)"; }
	},
	"37": {
		name: "Extra Hits",
		format: function (dict) {
			var buf = strFormat("Hit Count +%s", dict["hit increase/hit"]);
			if (dict["dmg% buff on extra hits"]) buf += strFormat("(%s%s%% Damage)", (dict["dmg% buff on extra hits"]>0?"+":""), dict["dmg% buff on extra hits"]);
			return buf;
		}
	},
	"40": {
		name: "Convert Stat to Buffs?",
		format: function (dict) { return "Unused (40)"; }
	},
	"41": {
		name: "N Unique Elements Buffs", // Five Lights, Six Gods
		format: function (dict) {
			return strFormat("%s with %s unique elements", defineStatBuffs(dict), dict["unique elements required"]);
		}
	},
	"42": {
		name: "Gender Buffs",
		format: function (dict) {
			var gender = dict["gender required"].charAt(0).toUpperCase() + dict["gender required"].substr(1);
			return strFormat("%s Units: %s", gender, defineStatBuffs(dict));
		}
	},
	"43": {
		name: "% Chance take 1 damage",
		format: function (dict) {
			return strFormat("%s%% Chance to take 1 damage", dict["take 1 dmg%"]);
		}
	},
	"45": {
		name: "Crit Resist",
		format: function (dict) {
			var buf = "";
			if (dict["base crit% resist"]) {
				buf += dict["base crit% resist"] + "% Base";
				if (dict["buff crit% resist"]) {
					if (dict["base crit% resist"] === dict["base crit% resist"]) {
						buf += "/Buff";
					} else {
						buf += " & "+dict["buff crit% resist"] + "% Buff";
					}
				}
			} else if (dict["buff crit% resist"]) {
				buf += dict["buff crit% resist"] + "% Buff";
			}
			return buf+" Crit Resist";
		}
	},
	"46": {
		name: "HP Proportional ATK Buff",
		format: function (dict) {
			return strFormat("%s-%s%% ATK depending on HP %s", dict["atk% base buff"], dict["atk% extra buff based on hp"], dict["buff proportional to hp"]);
		}
	},
	"47": {
		name: "BC On Spark",
		format: function (dict) {
			var buf = "";
			if (dict["bc fill on spark%"] < 100) buf += dict["bc fill on spark%"] + "% Chance ";
			buf += dict["bc fill on spark low"];
			if (dict["bc fill on spark low"] !== dict["bc fill on spark high"]) buf += "-"+dict["bc fill on spark high"];
			buf += " BC On Spark";
			return buf;
		}
	},
	"48": {
		name: "Reduce BB Cost",
		format: function (dict) {
			return strFormat("Reduce BB Cost %s%%", dict["reduced bb bc cost%"]);
		}
	},
	"49": {
		name: "Reduce BB Used",
		format: function (dict) {
			var buf = "";
			if (dict["reduced bb bc use chance%"] < 100) buf += dict["reduced bb bc use chance%"] + "% Chance ";
			buf += dict["reduced bb bc use% low"];
			if (dict["reduced bb bc use% low"] !== dict["reduced bb bc use% high"]) buf += "-"+dict["reduced bb bc use% high"];
			buf += "% BB Cashback";
			return buf;
		}
	},
	"50": {
		name: "Elemental Weakness Buff",
		format: function (dict) {
			var unitsBuffed = [];
			var elements = {fire:"Fire",water:"Water",earth:"Earth",thunder:"Thunder",light:"Light",dark:"Dark"};
			for (var element in elements) 
				if (dict[element+" units do extra elemental weakness dmg"]) unitsBuffed.push(elements[element]);
			if (unitsBuffed.length < 6) return strFormat("%s Units: +%s%% Weakness Damage", unitsBuffed.join("/"), dict["elemental weakness multiplier%"]);
			return strFormat("All Units: +%s%% Weakness Damage", dict["elemental weakness multiplier%"]);
		}
	},
	"53": {
		name: "Element Weakness Resist",
		format: function (dict) {
			var buf = "";
			if (dict["strong base element damage resist"]) {
				buf += dict["strong base element damage resist"] + "% Base";
				if (dict["strong buffed element damage resist"]) {
					if (dict["strong base element damage resist"] === dict["strong base element damage resist"]) {
						buf += "/Buffed";
					} else {
						buf += " & "+dict["strong buffed element damage resist"] + "% Buffed";
					}
				}
			} else if (dict["strong buffed element damage resist"]) {
				buf += dict["strong buffed element damage resist"] + "% Buffed";
			}
			return buf+" Element Weakness Resist";
		}
	},
	"55": {
		name: "Angel Idol",
		format: function (dict) {
			return strFormat("Angel Idol Buff when HP below %s%%. Recover %s%% HP when revived.", dict["hp below % buff activation"], dict["buff"]["angel idol recover hp%"]);
		}
	},
	"58": {
		name: "Increase Guard Mit",
		format: function (dict) {
			return strFormat("+%s%% Mit when Guarding", dict["guard increase mitigation%"]);
		}
	},
	"59": {
		name: "BC on Hit while Guarding",
		format: function (dict) {
			return strFormat("%s BC when hit while Guarding", dict["bc filled when attacked while guarded"]);
		}
	},
	"61": {
		name: "BC on Guard",
		format: function (dict) {
			return strFormat("%s BC on Guard", dict["bc filled on guard"]);
		}
	},
	"62": {
		name: "Elemental Mitigation",
		format: function (dict) {
			var unitsBuffed = [];
			var elements = {fire:"Fire",water:"Water",earth:"Earth",thunder:"Thunder",light:"Light",dark:"Dark"};
			for (var element in elements) 
				if (dict["mitigate "+element+" attacks"]) unitsBuffed.push(elements[element]);
			if (unitsBuffed.length < 6) return strFormat("Mitigate %s Damage %d%%", unitsBuffed.join("/"), dict["dmg% mitigation for elemental attacks"]);
			return strFormat("Mitigate All Element Damage %s%%", dict["dmg% mitigation for elemental attacks"]);
		}
	},
	"64": {
		name: "BB Mod Buff",
		format: function (dict) {
			var buffs = [], descBuf = [], desc = "";
			var bbtypes = {bb:"BB",sbb:"SBB",ubb:"UBB"};
			for (var bbtype in bbtypes) if (dict[bbtype+" atk% buff"]) buffs.push({bbtype: bbtypes[bbtype], value: dict[bbtype+" atk% buff"]});
			for (var i = 0; i < buffs.length; i++) {
				var buff = buffs[i];
				desc += strFormat("+%s%% %s", buff.value, buff.bbtype);
				for (var j = i+1, count = 1; j < buffs.length; j++, count++)
					if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].bbtype;
				descBuf.push(desc+" Mod");
				desc = "";
			}
			return descBuf.join(" ");
		}
	},
	"65": {
		name: "BC On Crit",
		format: function (dict) {
			var buf = "";
			if (dict["bc fill on crit%"] < 100) buf += dict["bc fill on crit%"] + "% Chance ";
			buf += dict["bc fill on crit min"];
			if (dict["bc fill on crit min"] !== dict["bc fill on crit max"]) buf += "-"+dict["bc fill on crit max"];
			buf += " BC On Crit";
			return buf;
		}
	},
	"66": {
		name: "Add Effect To Brave Bursts",
		format: function (dict) { return "Add Effect To Brave Bursts"; }
	},
}

module.exports = passiveIDs;