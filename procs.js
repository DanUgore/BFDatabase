var strFormat = require('util').format;
var defineTarget = function (dict) {
	var targetTypes = {
		singleenemy: "Single Enemy",
		aoeenemy: "All Enemies",
		singleparty: "Single Ally",
		aoeparty: "All Allies",
		singleself: "Self"
	};
	return "on "+(targetTypes[dict["target area"]+dict["target type"]] || "Unrecognized Target");
};
var defineStatBuffs = function (dict, debuff) {
		var buffs = [], debuffs = [], descBuf = [], desc = "";
		var stats = {atk:{name:"ATK",id:1},def:{name:"DEF",id:3},rec:{name:"REC",id:5},crit:{name:"Crit",id:7}};
		for (var stat in stats) {
			var id = stats[stat].id;
			var propName = strFormat("%s%% buff (%s)", stat, id);
			if (dict[propName]) buffs.push({stat: stats[stat].name, value: dict[propName]});
			propName = strFormat("%s%% buff (%s)", stat, id+1);
			if (dict[propName]) debuffs.push({stat: stats[stat].name, value: dict[propName]});
		}
		for (var i = 0; i < buffs.length; i++) {
			var buff = buffs[i];
			desc += strFormat("%s%s%% %s", buff.value>0?"+":"" , buff.value, buff.stat);
			for (var j = i+1; j < buffs.length; j++)
				if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
			if (desc.substr(-12) === "ATK/DEF/REC") desc = strFormat("%s%s%s%% All Stats", desc.substr(0, desc.length), buff.value>0?"+":"" , buff.value);
			descBuf.push(desc);
			desc = "";
		}
		for (var i = 0; i < debuffs.length; i++) {
			var buff = debuffs[i];
			if (dict["proc"])
			desc += strFormat("%s%s%% %s", buff.value>0?"+":"" , buff.value, buff.stat);
			for (var j = i+1; j < debuffs.length; j++)
				if (debuffs[j].value === buff.value) desc += "/"+debuffs.splice(j--,1)[0].stat;
			if (desc.substr(-12) === "ATK/DEF/REC") desc = strFormat("%s%s%s%% All Stats", desc.substr(0, desc.length), buff.value>0?"+":"" , buff.value);
			descBuf.push(desc);
			desc = "";
		}
		return descBuf.join(" & ");
}
var defineAttack = function (dict) {
	var buf = "";
	buf += dict["bb atk%"] + "% ";
	buf += dict["target area"] === "single" ? "ST" : "AoE";
	var extras = [];
	if (dict["bb flat atk"]) extras.push(strFormat("ATK+%s", dict["bb flat atk"]));
	var buffs = [], descBuf = [], desc = "";
	var dropbuffs = {bc:"BC",hc:"HC"};
	for (var bbbuff in dropbuffs) if (dict["bb "+bbbuff+"%"]) buffs.push({stat: dropbuffs[bbbuff], value: dict["bb "+bbbuff+"%"]});
	for (var i = 0; i < buffs.length; i++) {
		var buff = buffs[i];
		desc += buff.stat;
		for (var j = i+1; j < buffs.length; j++)
			if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
		desc += strFormat(" Drop+%s%%", buff.value);
		extras.push(desc);
		desc = "";
	}
	var buffs = [], desc = "";
	var dmgbuffs = {crit:"Crit Rate",dmg:"Damage"};
	for (var bbbuff in dmgbuffs) if (dict["bb "+bbbuff+"%"]) buffs.push({stat: dmgbuffs[bbbuff], value: dict["bb "+bbbuff+"%"]});
	for (var i = 0; i < buffs.length; i++) {
		var buff = buffs[i];
		desc += buff.stat;
		for (var j = i+1; j < buffs.length; j++)
			if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
		desc += strFormat("+%s%%", buff.value);
		extras.push(desc);
		desc = "";
	}
	if (extras.length) buf += strFormat(" (%s)", extras.join(","));
	return buf;
}
var procIDs = {
	"1":{
		name: "Standard Attack",
		format: defineAttack
	},
	"2":{
		name: "Standard Heal",
		format: function (dict) {
			var buf = "Heal ";
			buf += dict["heal low"];
			if (dict["heal low"] !== dict["heal high"]) buf += "-" + dict["heal high"];
			buf += strFormat(" (+ %s%% Healer REC) HP", dict["rec added% (from healer)"]);
			return buf;
		}
	},
	"3":{
		name: "Standard HoT",
		format: function (dict) {
			var buf = ""+dict["gradual heal low"];
			if (dict["gradual heal low"] !== dict["gradual heal high"]) buf += "-" + dict["gradual heal high"];
			return strFormat("Heal %s (+%s%% Target REC) HP for %s turns", buf, dict["rec added% (from target)"], dict["gradual heal turns (8)"]);
		}
	},
	"4":{
		name: "Fill BB Gauge",
	},
	"5":{
		name: "Stat Buff",
		format: function (dict) {
			return strFormat("%s turn %s %s", dict["buff turns"], defineStatBuffs(dict), defineTarget(dict));
		}
	},
	"6":{
		name: "Drop Rate Buff",
		format: function (dict) {
			var buffs = [], descBuf = [], desc = "";
			var stats = {bc:"BC",hc:"HC",karma:"Karma",zel:"Zel",item:"Item"};
			if (dict["bc drop rate% buff (10)"]) buffs.push({stat: "BC", value: dict["bc drop rate% buff (10)"]});
			if (dict["hc drop rate% buff (9)"]) buffs.push({stat: "HC", value: dict["hc drop rate% buff (9)"]});
			if (dict["item drop rate% buff (11)"]) buffs.push({stat: "Item", value: dict["item drop rate% buff (11)"]});
			for (var i = 0; i < buffs.length; i++) {
				var buff = buffs[i];
				desc += strFormat("%s%s%% %s", buff.value>0?"+":"" , buff.value, buff.stat);
				for (var j = i+1; j < buffs.length; j++)
					if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
				descBuf.push(desc+" Drop Rate");
				desc = "";
			}
			return strFormat("%s turn %s Buff %s", dict["drop rate buff turns"], descBuf.join(" "), defineTarget(dict));
		}
	},
	"7":{
		name: "Angel Idol",
	},
	"8":{
		name: "Max HP Up",
	},
	"9":{
		name: "Apply Buff/Debuff",
	},
	"10":{
		name: "Status Purge",
	},
	"11":{
		name: "Inflict Ailments",
	},
	"12":{
		name: "Angel Idol",
	},
	"13":{
		name: "Random Attack",
		format: function (dict) {
			return strFormat("%s Hit ", dict["hits"], defineAttack(dict).replace("ST", "RT"));
		}
	},
	"14":{
		name: "HP Drain Attack",
		format: function (dict) {
			var buf = dict["hp drain% low"];
			if (buf !== dict["hp drain% high"]) buf += "-"+dict["hp drain% high"];
			return defineAttack(dict) + strFormat(" + %s%% HP Drain", buf);
		}
	},
	"16":{
		name: "Mitigate Element",
	},
	"17":{
		name: "Resist Status",
	},
	"18":{
		name: "Damage Mitigation",
		format: function (dict) {
			return strFormat("%s turn %s%% Mit %s", dict["dmg% reduction turns (36)"], dict["dmg% reduction"], defineTarget(dict));
		}
	},
	"19":{
		name: "BC per turn",
	},
	"20":{
		name: "BC when hit",
	},
	"22":{
		name: "Ignore Defense",
	},
	"23":{
		name: "Spark Buff",
	},
	"24":{
		name: "Convert Stat Buff",
		format: function (dict) {
			// Does not always have to be ATK? Fix later.
			var stat = dict["converted attribute"];
			var stats = {
				attack: "ATK",
				defense: "DEF",
				hp: "HP",
				recovery: "REC"
			};
			return strFormat("%s turn %s%% %s->ATK buff %s", dict["% converted turns"], dict["atk% buff (46)"], stats[stat], defineTarget(dict));
		}
	},
	"26":{
		name: "Increase Hits",
	},
	"27":{
		name: "HP% Attack",
		format: function (dict) {
			var buf = dict["hp% damage low"];
			if (buf !== dict["hp% damage high"]) buf += "-"+dict["hp% damage high"];
			return defineAttack(dict) + strFormat(" or %s%% Target HP Remaining (%s%% Chance)", buf, dict["hp% damage chance"]);
		}
	},
	"28":{
		name: "Fixed Damage",
	},
	"29":{
		name: "Multi-Element Attack",
		format: function (dict) {
			var elements = dict["bb elements"].map(function(e){return e.charAt(0).toUpperCase()+e.substr(1);}).join("/");
			return defineAttack(dict) + strFormat(" + %s Elements", elements);
		}
	},
	"30":{
		name: "Element Buff",
		format: function (dict) {
			var elements = dict["elements added"].map(function(e){return e.charAt(0).toUpperCase()+e.substr(1);}).join("/");
			return strFormat("%s turn %s Buff %s", dict["elements added turns"], elements, defineTarget(dict));
		}
	},
	"31":{
		name: "BB Fill",
		format: function (dict) {
			return strFormat("Fill %d BC", dict["increase bb gauge"]);
		}
	},
	"32":{
		name: "Change Element",
	},
	"33":{
		name: "Buff Wipe",
	},
	"34":{
		name: "BB Drain",
	},
	"36":{
		name: "LS Null",
	},
	"38":{
		name: "Cure Ailments",
	},
	"40":{
		name: "Inflict Status Buff",
	},
	"43":{
		name: "OD Fill",
	},
	"44":{
		name: "Damage Over Time",
	},
	"45":{
		name: "BB Mod Buff",
	},
	"47":{
		name: "HP Proportional Attack",
		format: function (dict) {
			var buf = "";
			buf += strFormat("%s-%s%% %s depending on HP %s",
				dict["bb base atk%"],
				dict["bb base atk%"]+dict["bb added atk% based on hp"],
				dict["target area"] === "single" ? "ST" : "AoE",
				dict["bb added atk% proportional to hp"]);
			var extras = [];
			if (dict["bb flat atk"]) extras.push(strFormat("ATK+%s", dict["bb flat atk"]));
			var buffs = [], descBuf = [], desc = "";
			var dropbuffs = {bc:"BC",hc:"HC"};
			for (var bbbuff in dropbuffs) if (dict["bb "+bbbuff+"%"]) buffs.push({stat: dropbuffs[bbbuff], value: dict["bb "+bbbuff+"%"]});
			for (var i = 0; i < buffs.length; i++) {
				var buff = buffs[i];
				desc += buff.stat;
				for (var j = i+1; j < buffs.length; j++)
					if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
				desc += strFormat(" Drop+%s%%", buff.value);
				extras.push(desc);
				desc = "";
			}
			var buffs = [], desc = "";
			var dmgbuffs = {crit:"Crit Rate",dmg:"Damage"};
			for (var bbbuff in dmgbuffs) if (dict["bb "+bbbuff+"%"]) buffs.push({stat: dmgbuffs[bbbuff], value: dict["bb "+bbbuff+"%"]});
			for (var i = 0; i < buffs.length; i++) {
				var buff = buffs[i];
				desc += buff.stat;
				for (var j = i+1; j < buffs.length; j++)
					if (buffs[j].value === buff.value) desc += "/"+buffs.splice(j--,1)[0].stat;
				desc += strFormat("+%s%%", buff.value);
				extras.push(desc);
				desc = "";
			}
			if (extras.length) buf += strFormat(" (%s)", extras.join(","));
			return buf;
		}
	},
	"51":{
		name: "Inflict Debuff Buff",
	},
	"52":{
		name: "BB Fill Rate Buff",
	},
	"54":{
		name: "Crit Damage Buff",
	},
	"902":{
		name: "Timed Stat Buff",
	},
	"10000":{
		name: "Taunt Buff",
	},
	"10001":{
		name: "Stealth Buff",
	},
	"10002":{
		name: "Elemental Shield",
	},
};

module.exports = procIDs;