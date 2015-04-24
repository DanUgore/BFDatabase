var scriptdir = __dirname;
var scriptname = __filename;
var dataPath = scriptdir+"/data/";

var romaji = require(scriptdir+'/romaji_converter.js');
var toKatakana = function (str) {
	return str.split(" ").map(function(w){return romaji.toKana(w).katakana;}).join("・");
}
// Requires `request` module from npm
var request = require('request');

var fs = require('fs');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

// Data Filenames
var dataFiles = { // extension is .json
	Units: "units",
	Items: "items",
	Evos: "evos"
}
var getFilename = function (dataName, gameType) {
	if (!dataFiles[dataName]) return false;
	gameType = "_" + ( gameType || "gl" ).toLowerCase();
	return dataPath + dataFiles[dataName] + gameType + ".json";
}
var getBackupFile = function (dataName, gameType) {
	if (!dataFiles[dataName]) return false;
	gameType = "_" + ( gameType || "gl" ).toLowerCase();
	return dataPath + dataFiles[dataName] + gameType + "_bkup.json";
}

var BFData = {
	// Data
	GL: {
		Units: {},
		Items: {},
		Evos: {},
	},
	JP: {
		Units: {},
		Items: {},
		Evos: {},
	},
	EU: {
		Units: {},
		Items: {},
		Evos: {},
	},
	KR: {
		Units: {},
		Items: {},
		Evos: {},
	},
	romaji: romaji,
	toKatakana: toKatakana
};
BFData.versions = {
	GL: BFData.GL,
	JP: BFData.JP,
	EU: BFData.EU,
	KR: BFData.KR
}

// Data Management
var lastUpdated = {
	'GL': 0,
	'JP': 0,
	'EU': 0,
	'KR': 0
}
var lastUpdatedFile = dataPath+'last_updated.json';
if (fs.existsSync(lastUpdatedFile)) {
	try {
		lastUpdated = require(lastUpdatedFile);
	} catch (e) {}
}
BFData.checkLastUpdated = function () {
	return Object.keys(lastUpdated).map(function(k){return k+": "+lastUpdated[k];}).join(", ");
}

BFData.updateData = function (force) { // Can be a boolean (force all), a string (force one), or an array (force these)
	var baseUrl = "https://raw.githubusercontent.com/Deathmax/bravefrontier_data/master";
	var datadir = scriptdir+'/data/';
	var forceUpdate = {'GL':false,'JP':false,'EU':false,'KR':false};
	if (force) {
		if (force === true) {
			for (var gameType in forceUpdate) forceUpdate[gameType] = true;
		} else if (typeof force === 'string') {
			forceUpdate[force] = true;
		} else if (Array.isArray(force)) {
			for (var i = 0; i < force.length; i++) forceUpdate[force[i]] = true;
		}
	}
	var dataToRetrieve = {
		'': {
			units: 'info.json',
			items: 'items.json',
			evos: 'evo_list.json',
		},
		'/jp': {
			units: 'info.json',
			items: 'items_light.json',
			evos: 'evo_list.json',
		},
		'/eu': {
			units: 'info.json',
			items: 'items_light.json',
			evos: 'evo_list.json',
		},
		'/kr': {
			units: 'info.json',
			items: 'items_light.json',
			evos: 'evo_list.json',
		},
	};
	function dataUrlHandler(gameType, dataType, err, res, body) {
		var data = body || '';
		if (!data) return null;
		var filename = dataType + ("_"+(gameType || "gl").toLowerCase());
		var propName = {
			units: 'Units',
			items: 'Items',
			evos: 'Evos',
		}[dataType];
		try {
			BFData[gameType][propName] = JSON.parse(data);
			
			fs.rename(datadir+filename+".json", datadir+filename+"_bkup.json", function callback(err) { // Backup Old Data

				fs.writeFile(datadir+filename+".json", data, function callback(err) {
					if (err) {
						dataToRetrieve[dataType] = false;
						throw err;
					} else {
						dataToRetrieve[dataType] = true;
					}
					var complete = false;
					for (var k in dataToRetrieve) {
						if (typeof k === 'string') break;
						if (k) continue;
						else complete = null;
					}
					if (complete) {
						console.log('All data updated');
					} else if (complete === null) {
						console.log('Something went wrong');
					}
				});
				
			});
		} catch (e) {
			console.log('dataType: '+dataType);
			console.log(e.message);
			console.log();
			console.log(e.stack);
			return false;
		}
	}
	function updateUrlHandler(dir, err, res, body) {
		var gameType = (dir.substr(1,2) || "GL").toUpperCase();
		var last_updated = Number(body);
		console.log(dir+' last updated (from url): '+last_updated);
		console.log("Last updated (from file): "+lastUpdated[gameType]);
		if (!last_updated) last_updated = lastUpdated[gameType];
		if (forceUpdate[gameType] || last_updated > lastUpdated[gameType]) {
			if (forceUpdate[gameType]) console.log("Forcing update of "+gameType+" data.");
			if (evoChainCacheDict) {
				evoChainCacheDict[gameType] = {}; console.log("Clearing Evo Cache "+gameType); // Clear Evo Cache (Old Data is Stored Here)
			}
			console.log('Downloading '+gameType+' data.');
			lastUpdated[gameType] = last_updated;
			fs.writeFile(lastUpdatedFile, JSON.stringify(lastUpdated, null, '\t'));
			for (var file in dataToRetrieve[dir]) {
				console.log("Fetching from "+baseUrl+dir+"/"+dataToRetrieve[dir][file]);
				request(baseUrl+dir+"/"+dataToRetrieve[dir][file], dataUrlHandler.bind(null, gameType, file));
			}
		}
	}
	for (var dir in dataToRetrieve) {
		console.log('Requesting '+baseUrl+dir+'/last_update.txt');
		request(baseUrl+dir+'/last_update.txt', updateUrlHandler.bind(null, dir));
	}
	return true;
}
BFData.reloadData = function () {
	// Remove old data from require cache
	var success = true;
	try {
		for (var dataName in dataFiles) for (var gameType in BFData.versions) {
			var file = require.resolve(getFilename(dataName, gameType));
			if (file) {
				delete require.cache[file];
				try {
					BFData[gameType][dataName] = require(file);
					if (evoChainCacheDict) {
						evoChainCacheDict[gameType] = {}; console.log("Clearing Evo Cache "+gameType); // Clear Evo Cache (Old Data is Stored Here)
					}
				} catch (e) {
					console.log("Failed to reload '"+dataType+"' for '"+gameType+"' from "+getFilename(dataType, gameType));
				}
			}
		}
	} catch (e) {
		console.log(e.message);
		console.log(e.stack);
		success = false;
	}
	return success;
};

// Load Data
if ((function () {
	var failed = false;
	for (var version in BFData.versions) for (var dataType in dataFiles) {
		try {
			BFData[version][dataType] = require(getFilename(dataType, version));
		} catch (e) {
			console.log("Failed to load '"+dataType+"' for '"+version+"' from "+getFilename(dataType, version));
			failed = true;
			BFData[version][dataType] = {};
		}
	}
	return failed;
})()) BFData.updateData();

// -------------------- Units

// Specific unit access, no searching (well advanced searching)
BFData.getUnitEnglish = function (gameType, rqid) {
	if (!rqid) return null;
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: true,
		EU: true
	}
	if (!dataTypes[gameType]) return null;
	var data = BFData[gameType], unitData = data.Units;
	if (unitData[rqid]) return unitData[rqid];
	if (typeof rqid !== 'string') return null;
	for (var id in unitData) {
		if (rqid.toLowerCase() === unitData[id].name.toLowerCase()) return unitData[id];
	}
	return false;
};
BFData.getUnitForeign = function (gameType, rqid) {
	if (!rqid) return null;
	gameType = (gameType || "JP").toUpperCase();
	var dataTypes = {
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], unitData = data.Units;
	if (unitData[rqid]) return unitData[rqid];
	return false;
};
BFData.GL.getUnit = BFData.getUnit = BFData.getUnitEnglish.bind(BFData, "GL");
BFData.EU.getUnit = BFData.getUnitEnglish.bind(BFData, "EU");
BFData.JP.getUnit = BFData.getUnitJP = BFData.getUnitForeign.bind(BFData, "JP");
BFData.KR.getUnit = BFData.getUnitForeign.bind(BFData, "KR");

// Unit Search Functions
BFData.findUnitEnglish = function (gameType, name, returnAll) {
	if (!name) return null;
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], unitData = data.Units;
	var getEvoChain = data.getEvoChain;
	var isID = !!(name.match(/^\d{5}\d?$/));
	if (isID) {
		var unit = unitData[name];
		if (unit) return unit;
		return null;
	}
	var isGuideID = !!(name.match(/^#(\d{3}\d?)$/));
	if (isGuideID) {
		var rqid = Number(name.substr(1));
		for (var id in unitData) {
			if (unitData[id]['guide_id'] === rqid) return unitData[id];
		}
		return null;
	}
	var possibleMatches = [];
	name = (""+name).toLowerCase();
	for (var id in unitData) {
		var unit = unitData[id], unitName = unit.name.toLowerCase();
		if (name === unitName) return unit; // string.lastIndexOf(postfix) === string.length - postfix.length;
		if (unitName.split(' ').slice(-(name.split(' ').length)).join(' ') === name) {
			var chain = getEvoChain(id);
			if (!chain) continue;
			var highestRarity = Object.keys(chain).sort(function (a,b) { return b-a; })[0];
			return chain[highestRarity];
		} else if (unitName.indexOf(name.toLowerCase()) >= 0) {
			possibleMatches.push(unit);
		}
	}
	possibleMatches.sort(function(a,b){return b.rarity - a.rarity});
	if (returnAll) return possibleMatches;
	return possibleMatches[0];
};
BFData.GL.findUnit = BFData.findUnit = BFData.findUnitEnglish.bind(BFData, "GL");
BFData.EU.findUnit = BFData.findUnitEnglish.bind(BFData, "EU");

BFData.JP.findUnit = BFData.findUnitJP = function (name, returnAll) {
	if (!name) return null;
	var data = BFData.JP, unitDataJP = data.Units;
	var name = name.toLowerCase();
	var UNIT_EXCEPTIONS = {
		"duel-gx": 60253,
		"duel-gx 2": 60254,
		"duel-gx ii": 60254,
		"duel-sgx": 60255,
		"maxwell": 50525,
		"xenon": 60723,
		"xestia": 50724
	};
	if (name in UNIT_EXCEPTIONS) return unitDataJP[UNIT_EXCEPTIONS[name]];
	var isID = !!(name.match(/^\d{5}\d?$/));
	if (isID) {
		var unit = unitDataJP[name];
		if (unit) return unit;
		return null;
	}
	var isGuideID = !!(name.match(/^#(\d{3}\d?)$/));
	if (isGuideID) {
		var rqid = Number(name.substr(1));
		for (var id in unitDataJP) {
			if (unitDataJP[id]['guide_id'] === rqid) return unitDataJP[id];
		}
		return null;
	}
	var possibleMatchesGL = [];
	var globalUnit;
	if (!!name.match(/[a-z]/)) {
		// See if the name is a unit in global
		var globalUnit = BFData.getUnit(name) || BFData.findUnit(name);
		// var possibleMatchesGL = findUnit(name, true);
		name = toKatakana(name);
	}
	var primaryMatches = [];
	var possibleMatches = [];
	// return name;
	for (var id in unitDataJP) {
		var unit = unitDataJP[id];
		if (name === unit.name.substr(-name.length)) {
			primaryMatches.push(unit); // possibleMatches.push(unit);
		} else if (unit.name.toLowerCase().indexOf(name.toLowerCase()) >= 0) {
			possibleMatches.push(unit);
		}
	}
	primaryMatches.sort(function(a,b){return b.rarity - a.rarity});
	if (primaryMatches.length) return primaryMatches[0];
	possibleMatches.sort(function(a,b){return b.rarity - a.rarity})
	if (!possibleMatches.length) {
		if (globalUnit && unitDataJP[globalUnit.id]) {
			return unitDataJP[globalUnit.id];
		}
		return false;
	}
	if (returnAll) return possibleMatches;
	return possibleMatches[0] || false;
};
BFData.KR.findUnit = function (name, returnAll) {
	if (!name) return null;
	var data = BFData.KR, unitData = data.Units;
	var name = name.toLowerCase();
	var isID = !!(name.match(/^\d{5}\d?$/));
	if (isID) {
		var unit = unitData[name];
		if (unit) return unit;
		return null;
	}
	var isGuideID = !!(name.match(/^#(\d{3}\d?)$/));
	if (isGuideID) {
		var rqid = Number(name.substr(1));
		for (var id in unitData) {
			if (unitData[id]['guide_id'] === rqid) return unitData[id];
		}
		return null;
	}
	var globalUnit;
	if (!!name.match(/[a-z]/)) {
		// See if the name is a unit in global
		var globalUnit = BFData.getUnit(name) || BFData.findUnit(name);
	}
	var possibleMatches = [];
	// return name;
	for (var id in unitData) {
		var unit = unitData[id];
		if (name === unit.name.substr(-name.length)) {
			possibleMatches.push(unit);
		} else if (unit.name.toLowerCase().indexOf(name.toLowerCase()) >= 0) {
			possibleMatches.push(unit);
		}
	}
	possibleMatches.sort(function(a,b){return b.rarity - a.rarity})
	if (!possibleMatches.length) {
		if (globalUnit && unitData[globalUnit.id]) {
			return unitData[globalUnit.id];
		}
		return false;
	}
	if (returnAll) return possibleMatches;
	return possibleMatches[0] || false;
}

BFData.searchUnitMain = function (gameType, qstr) {
	if (!qstr) return null;
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU,
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], unitData = data.Units;
	var findUnit = data.findUnit, getEvoChain = data.getEvoChain; // Functions
	var rarity = qstr.match(/^([1-7])\* /) || qstr.match(/ ([1-7])\*$/);
	if (rarity) {
		qstr = qstr.substr(0,3) === rarity[0] ? qstr.substr(3) : qstr.substr(0, qstr.length-3);
		rarity = Number(rarity[1]);
	}
	var name = qstr;
	var unit = findUnit(name);
	if (!unit) return false;
	if (!rarity) return unit;
	if (getEvoChain(unit)) { // This condition should never be false but just in case...
		return getEvoChain(unit)[rarity] || false;
	}
	return null; // fsr couldn't find evo chain for unit
};
BFData.GL.searchUnit = BFData.searchUnit = BFData.searchUnitMain.bind(BFData, "GL");
BFData.EU.searchUnit = BFData.searchUnitMain.bind(BFData, "EU");
BFData.JP.searchUnit = BFData.searchUnitJP = BFData.searchUnitMain.bind(BFData, "JP");
BFData.KR.searchUnit = BFData.searchUnitMain.bind(BFData, "KR");

BFData.everyUnitMain = function (gameType, fn) {
	if (fn === undefined) fn = (function(){return true;});
	if (typeof fn !== 'function') return null;
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU,
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], units = data.Units, getUnit = data.getUnit;
	return Object.keys(units).map(getUnit).filter(fn);
}

BFData.GL.everyUnit = BFData.GL.allUnits = BFData.everyUnitMain.bind(BFData, "GL");
BFData.JP.everyUnit = BFData.JP.allUnits = BFData.everyUnitMain.bind(BFData, "JP");
BFData.EU.everyUnit = BFData.EU.allUnits = BFData.everyUnitMain.bind(BFData, "EU");
BFData.KR.everyUnit = BFData.KR.allUnits = BFData.everyUnitMain.bind(BFData, "KR");

BFData.everyUnit = BFData.allUnits = BFData.GL.everyUnit;

// Beta/Incomplete Functions
BFData.firstMatchUnit = function (substr) {
	substr = (substr || "").toLowerCase();
	var data = BFData, unitData = data.Units; // Data
	for (var id in unitData) {
		var unitName = unitData[id].name.toLowerCase();
		if (unitName.indexOf(substr) > -1) return unitData[id];
	}
	return null;
}
BFData.firstMatchUnitJP = BFData.JP.firstMatchUnit = function (substr) {
	substr = toKatakana(substr || "");
	var data = BFData.JP, unitDataJP = data.Units; // Data
	for (var id in unitDataJP) {
		var unitName = unitDataJP[id].name.toLowerCase();
		if (unitName.indexOf(substr) > -1) return unitData[id];
	}
	return null;
}

/*
Query Obj
{
	plus:	{} Has These Properties
	minus:	{} Does Not Have These Properties
}
Properties:
element - "element"
bb or sbb - { type: "type", has: {buff1: {}, buff2: {}}, hits: {min: N, max: N}, dc: {min: N, max: N} }
rarity - {min: N, max: N}
dc/dropchecks - {min: N, max: N}
hits - {min: N, max: N}
cost - {min: N, max: N}
ls/leaderskill - 
es/extraskill - 
stats - {hp: {min: N, max: N}, atk: {min: N, max: N}, def: {min: N, max: N}, rec: {min: N, max: N}}
*/
BFData.queryUnitsMain = function (gameType, queryObj) {
	if (!queryObj || typeof queryObj !== 'object') return null;
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU,
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType]
	var unitWith = queryObj.plus || {};
	var unitNone = queryObj.minus || {};
	var unitFilter = function (unit) {
		// Element
		if (unitWith['element'] && unit.element !== unitWith['element']) return false;
		if (unitNone['element'] && unit.element === unitNone['element']) return false;
		// Rarity
		if (unitWith['rarity']) {
			if (unitWith['rarity'].min && unit.rarity < unitWith['rarity'].min) return false;
			if (unitWith['rarity'].max && unit.rarity > unitWith['rarity'].max) return false;
		}
		if (unitNone['rarity']) {
			if (unitNone['rarity'].min && unit.rarity >= unitNone['rarity'].min) return false;
			if (unitNone['rarity'].max && unit.rarity <= unitNone['rarity'].max) return false;
		}
		// Cost
		if (unitWith['cost']) {
			if (unitWith['cost'].min && unit.cost < unitWith['cost'].min) return false;
			if (unitWith['cost'].max && unit.cost > unitWith['cost'].max) return false;
		}
		if (unitNone['cost']) {
			if (unitNone['cost'].min && unit.cost >= unitNone['cost'].min) return false;
			if (unitNone['cost'].max && unit.cost <= unitNone['cost'].max) return false;
		}
		// Hits
		if (unitWith['hits']) {
			if (unitWith['hits'].min && unit.hits < unitWith['hits'].min) return false;
			if (unitWith['hits'].max && unit.hits > unitWith['hits'].max) return false;
		}
		if (unitNone['hits']) {
			if (unitNone['hits'].min && unit.hits >= unitNone['hits'].min) return false;
			if (unitNone['hits'].max && unit.hits <= unitNone['hits'].max) return false;
		}
		// Drop Checks
		if (unitWith['dc']) {
			if (unitWith['dc'].min && unit['max bc generated'] < unitWith['dc'].min) return false;
			if (unitWith['dc'].max && unit['max bc generated'] > unitWith['dc'].max) return false;
		}
		if (unitNone['dc']) {
			if (unitNone['dc'].min && unit['max bc generated'] >= unitNone['dc'].min) return false;
			if (unitNone['dc'].max && unit['max bc generated'] <= unitNone['dc'].max) return false;
		}
		if ((unitWith.bb || unitNone.bb) && !unit.bb) return false;
		if ((unitWith.sbb || unitNone.sbb) && !unit.sbb) return false;
		if ((unitWith.ubb || unitNone.ubb) && !unit.ubb) return false;
		if (unitWith.bb || unitNone.bb) {
			var bb = unit.bb, minbb = bb.levels[0], maxbb = bb.levels[9];
			var unitWithBB = unitWith.bb || {};
			var unitNoneBB = unitNone.bb || {};
			// Type
			var procid = maxbb.effects[0]["proc id"];
			var bbtype = "support";
			if (maxbb.effects[0]["bb atk%"]) bbtype = "attack";
			else if (procid === "2" || procid === "3") bbtype = "heal";
			if (unitWithBB['type'] && bbtype !== unitWithBB['type']) return false;
			if (unitNoneBB['type'] && bbtype === unitNoneBB['type']) return false;
			// BB Mod
			if ((unitWithBB['mod'] || unitNoneBB['mod']) && bbtype !== "attack") return false;
			if (unitWithBB['mod']) {
				if (unitWithBB['mod'].min && maxbb.effects[0]["bb atk%"] < unitWithBB['mod'].min) return false;
				if (unitWithBB['mod'].max && maxbb.effects[0]["bb atk%"] > unitWithBB['mod'].max) return false;
			}
			if (unitNoneBB['mod']) {
				if (unitNoneBB['mod'].min && maxbb.effects[0]["bb atk%"] >= unitNoneBB['mod'].min) return false;
				if (unitNoneBB['mod'].max && maxbb.effects[0]["bb atk%"] <= unitNoneBB['mod'].max) return false;
			}
			// Hits
			if (unitWithBB['hits']) {
				if (unitWithBB['hits'].min && bb.hits < unitWithBB['hits'].min) return false;
				if (unitWithBB['hits'].max && bb.hits > unitWithBB['hits'].max) return false;
			}
			if (unitNoneBB['hits']) {
				if (unitNoneBB['hits'].min && bb.hits >= unitNoneBB['hits'].min) return false;
				if (unitNoneBB['hits'].max && bb.hits <= unitNoneBB['hits'].max) return false;
			}
			// Drop Checks
			if (unitWithBB['dc']) {
				if (unitWithBB['dc'].min && bb['max bc generated'] < unitWithBB['max bc generated'].min) return false;
				if (unitWithBB['dc'].max && bb['max bc generated'] > unitWithBB['max bc generated'].max) return false;
			}
			if (unitNoneBB['dc']) {
				if (unitNoneBB['dc'].min && bb['max bc generated'] >= unitNoneBB['max bc generated'].min) return false;
				if (unitNoneBB['dc'].max && bb['max bc generated'] <= unitNoneBB['max bc generated'].max) return false;
			}
			// Cost (BC)
			if (unitWithBB['cost']) {
				if (unitWithBB['cost'].min && maxbb['bc cost'] < unitWithBB['cost'].min) return false;
				if (unitWithBB['cost'].max && maxbb['bc cost'] > unitWithBB['cost'].max) return false;
			}
			if (unitNoneBB['cost']) {
				if (unitNoneBB['cost'].min && maxbb['bc cost'] >= unitNoneBB['cost'].min) return false;
				if (unitNoneBB['cost'].max && maxbb['bc cost'] <= unitNoneBB['cost'].max) return false;
			}
			// Has Buffs
			if (unitWithBB['has'] || unitNoneBB['has']) {
				var unitBBHas = unitWithBB['has'] || {};
				var unitBBNot = unitNoneBB['has'] || {};
				var buffids = {}, effects = maxbb.effects;
				/* In order to figure out what buffs a bb has.
				 * We loop through the effects and check each effect property for a buff id "(N)"
				 * Then add that effect to the list, alongside the index of its parent effect. */
				effects.forEach(function (eff, index) {
					for (var prop in eff) {
						if (prop.charAt(prop.length-1) !== ')') continue;
						var i = prop.lastIndexOf('(');
						// var buffid = prop.substr(i+1, prop.length - i - 2);
						var buffid = prop.substr(i);
						buffids[buffid] = index; // Which effect it is located in.
					}
				});
				var buffmap = {
					'atk': { name: "atk% buff (1)", id: "(1)" },
					'def': { name: "def% buff (3)", id: "(3)" },
					'rec': { name: "rec% buff (5)", id: "(5)" },
					'spark': { name: "spark dmg% buff (40)", id: "(40)" },
					'crit': { name: "crit% buff (7)", id: "(7)" },
					'mit': { name: "dmg% reduction", id: "(36)" },
					'bcbuff': { name: "bc drop rate% buff (10)", id: "(10)" },
					'hcbuff': { name: "hc drop rate% buff (9)", id: "(9)" }
				}
				for (var buff in unitBBHas) {
					var buffData = buffmap[buff];
					if (!buffData) continue;
					if (!buffids[buffData.id]) return false;
					if (unitBBHas[buff].min && effects[buffids[buffid]][buffData.name] < unitBBHas[buff].min) return false;
					if (unitBBHas[buff].max && effects[buffids[buffid]][buffData.name] > unitBBHas[buff].max) return false;
				}
				for (var buff in unitBBNot) {
					var buffData = buffmap[buff];
					if (!buffData) continue;
					if (buffids[buffData.id]) return false;
					if (unitBBNot[buff].min && effects[buffids[buffid]][buffData.name] >= unitBBNot[buff].min) return false;
					if (unitBBNot[buff].max && effects[buffids[buffid]][buffData.name] <= unitBBNot[buff].max) return false;
				}
			}
		}
		if (unitWith.sbb || unitNone.sbb) {
			var bb = unit.sbb, minbb = bb.levels[0], maxbb = bb.levels[9];
			var unitWithBB = unitWith.sbb || {};
			var unitNoneBB = unitNone.sbb || {};
			// Type
			var procid = maxbb.effects[0]["proc id"];
			var bbtype = "support";
			if (procid === "1" || procid === "13" || procid === "29") bbtype = "attack";
			else if (procid === "2" || procid === "3") bbtype = "heal";
			if (unitWithBB['type'] && bbtype !== unitWithBB['type']) return false;
			if (unitNoneBB['type'] && bbtype === unitNoneBB['type']) return false;
			// BB Mod
			if ((unitWithBB['mod'] || unitNoneBB['mod']) && bbtype !== "attack") return false;
			if (unitWithBB['mod']) {
				if (unitWithBB['mod'].min && maxbb.effects[0]["bb atk%"] < unitWithBB['mod'].min) return false;
				if (unitWithBB['mod'].max && maxbb.effects[0]["bb atk%"] > unitWithBB['mod'].max) return false;
			}
			if (unitNoneBB['mod']) {
				if (unitNoneBB['mod'].min && maxbb.effects[0]["bb atk%"] >= unitNoneBB['mod'].min) return false;
				if (unitNoneBB['mod'].max && maxbb.effects[0]["bb atk%"] <= unitNoneBB['mod'].max) return false;
			}
			// Hits
			if (unitWithBB['hits']) {
				if (unitWithBB['hits'].min && bb.hits < unitWithBB['hits'].min) return false;
				if (unitWithBB['hits'].max && bb.hits > unitWithBB['hits'].max) return false;
			}
			if (unitNoneBB['hits']) {
				if (unitNoneBB['hits'].min && bb.hits >= unitNoneBB['hits'].min) return false;
				if (unitNoneBB['hits'].max && bb.hits <= unitNoneBB['hits'].max) return false;
			}
			// Drop Checks
			if (unitWithBB['dc']) {
				if (unitWithBB['dc'].min && bb['max bc generated'] < unitWithBB['max bc generated'].min) return false;
				if (unitWithBB['dc'].max && bb['max bc generated'] > unitWithBB['max bc generated'].max) return false;
			}
			if (unitNoneBB['dc']) {
				if (unitNoneBB['dc'].min && bb['max bc generated'] >= unitNoneBB['max bc generated'].min) return false;
				if (unitNoneBB['dc'].max && bb['max bc generated'] <= unitNoneBB['max bc generated'].max) return false;
			}
			// Cost (BC)
			if (unitWithBB['cost']) {
				if (unitWithBB['cost'].min && maxbb['bc cost'] < unitWithBB['cost'].min) return false;
				if (unitWithBB['cost'].max && maxbb['bc cost'] > unitWithBB['cost'].max) return false;
			}
			if (unitNoneBB['cost']) {
				if (unitNoneBB['cost'].min && maxbb['bc cost'] >= unitNoneBB['cost'].min) return false;
				if (unitNoneBB['cost'].max && maxbb['bc cost'] <= unitNoneBB['cost'].max) return false;
			}
			// Has Buffs
			if (unitWithBB['has'] || unitNoneBB['has']) {
				var unitBBHas = unitWithBB['has'] || {};
				var unitBBNot = unitNoneBB['has'] || {};
				var buffids = {}, effects = maxbb.effects;
				/* In order to figure out what buffs a bb has.
				 * We loop through the effects and check each effect property for a buff id "(N)"
				 * Then add that effect to the list, alongside the index of its parent effect. */
				effects.forEach(function (eff, index) {
					for (var prop in eff) {
						if (prop.charAt(prop.length-1) !== ')') continue;
						var i = prop.lastIndexOf('(');
						// var buffid = prop.substr(i+1, prop.length - i - 2);
						var buffid = prop.substr(i);
						buffids[buffid] = index; // Which effect it is located in.
					}
				});
				var buffmap = {
					'atk': { name: "atk% buff (1)", id: "(1)" },
					'def': { name: "def% buff (3)", id: "(3)" },
					'rec': { name: "rec% buff (5)", id: "(5)" },
					'spark': { name: "spark dmg% buff (40)", id: "(40)" },
					'crit': { name: "crit% buff (7)", id: "(7)" },
					'mit': { name: "dmg% reduction", id: "(36)" },
					'bcbuff': { name: "bc drop rate% buff (10)", id: "(10)" },
					'hcbuff': { name: "hc drop rate% buff (9)", id: "(9)" }
				}
				for (var buff in unitBBHas) {
					var buffData = buffmap[buff];
					if (!buffData) continue;
					if (!buffids[buffData.id]) return false;
					if (unitBBHas[buff].min && effects[index][buffData.name] < unitBBHas[buff].min) return false;
					if (unitBBHas[buff].max && effects[index][buffData.name] > unitBBHas[buff].max) return false;
				}
				for (var buff in unitBBNot) {
					var buffData = buffmap[buff];
					if (!buffData) continue;
					if (buffids[buffData.id]) return false;
					if (unitBBNot[buff].min && effects[index][buffData.name] >= unitBBNot[buff].min) return false;
					if (unitBBNot[buff].max && effects[index][buffData.name] <= unitBBNot[buff].max) return false;
				}
			}
		}
		return true;
	}
	return data.everyUnit(unitFilter);
};
BFData.GL.queryUnits = BFData.queryUnits = BFData.queryUnitsMain.bind(BFData, "GL");
BFData.JP.queryUnits = BFData.queryUnitsJP = BFData.queryUnitsMain.bind(BFData, "JP");
BFData.EU.queryUnits = BFData.queryUnitsMain.bind(BFData, "EU");
BFData.KR.queryUnits = BFData.queryUnitsMain.bind(BFData, "KR");

/*
Runs each query in an array of queries and returns the final results.
Query Structure
{
	op: "and" "or" "not", // Denotes how we are fufilling the conditions
	type: "String", // Denotes what we are looking for / testing
	paramaters: {} // Data used in testing
}
*/
BFData.queryUnits2Main = function (gameType, queries) {
	if (!queries || typeof queryObj !== 'object') return null;
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU,
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType];
	if (!Array.isArray(queries)) queries = [ queries ];
	var results = data.everyUnit();
	var runQuery = function (units, query) { // Runs a query on an array of units. Returns the results.
		if (Array.isArray) return units;
		var type = query['type'], params = query['parameters'], op = query['op'] || "and";
		/* Three kinds of query types
		 * Range - Check if property is within a certain range (Numbers) parameters: { min: N , max: N }
		 * Value - Check if the value of the property is equal to a specified value (strings/booleans) parameters: { value:"" } or "value"
		 * Super - More Complex parameters: { subType: "", subName: "" , subParams: { ... } } */
		var queryType = "";
		switch (type) {
			case 'element': var queryType = "value", propName = "element"; break;
			case 'rarity': var queryType = "range", propName = "rarity"; break;
			case 'cost': var queryType = "range", propName = "cost"; break;
			case 'dc': var queryType = "range", propName = "max bc generated"; break;
			case 'hits': var queryType = "range", propName = "hits"; break;
			// Supers
			case 'bb': case 'sbb':
		}
		if (!queryType) return units;
		units = units.slice();
		var filterFunctions = {
			'range': function (unit) {
				if (params.min && unit[propName] < params.min) return false;
				if (params.max && unit[propName] > params.max) return false;
			},
			'value': function (unit) {
				
			}
		};
		units.filter(filterFunctions[queryType]);
		if (queryType === "range") {
			units = units.filter(function (unit) {
			
			});
		} else if (queryType === "value") {
		}
		return units;
	}
	queries.forEach(function (query) {
		results = runQuery(results, query);
	});
	return results;
};
BFData.GL.queryUnits2 = BFData.queryUnits2 = BFData.queryUnits2Main.bind(BFData, "GL");

// Evo Data Functions
BFData.getEvoDataEnglish = function (gameType, rqid) {
	rqid = rqid || "";
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], evoData = data.Evos; // Data
	if (evoData[rqid]) return evoData[rqid];
	if (typeof rqid !== 'string') return null;
	for (var id in evoData) {
		if (rqid.toLowerCase() === evoData[id].name.toLowerCase()) return evoData[id];
	}
	return null;
};
BFData.getEvoDataForeign = function (gameType, rqid) {
	rqid = rqid || "";
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], evoData = data.Evos; // Data
	if (evoData[rqid]) return evoData[rqid];
	return null;
};

BFData.GL.getEvoData = BFData.getEvoData = BFData.getEvoDataEnglish.bind(BFData, "GL");
BFData.EU.getEvoData = BFData.getEvoDataEnglish.bind(BFData, "EU");
BFData.getEvoDataJP = BFData.JP.getEvoData = BFData.getEvoDataForeign.bind(BFData, "JP");
BFData.KR.getEvoData = BFData.getEvoDataForeign.bind(BFData, "KR");


// Evo Tracking
var evoChainCacheDict = {
	"GL": {},
	"JP": {},
	"EU": {},
	"KR": {}
};
BFData.getEvoChainMain = function (gameType, unit) {
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU,
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType];
	var getUnit = data.getUnit;
	var getNextRare = getNextRarity.bind(BFData, gameType), getPrevRare = getPrevRarity.bind(BFData, gameType);
	if (typeof unit in {'string':true, 'number':true}) unit = getUnit(unit);
	if (!unit || !unit.id) return null;
	var unitID = unit.id;
	var evoChainCache = evoChainCacheDict[gameType];
	if (evoChainCache[unitID]) return evoChainCache[unitID];
	var family = {};
	family[unit.rarity] = unit;
	var nextEvo = getNextRare(unitID); // If it evolves into anything, continue going forward to get the end of the chain.
	while (nextEvo) {
		family[nextEvo.rarity] = nextEvo;
		nextEvo = getNextRare(nextEvo.id);
	}
	
	// Search for a unit that evolves into this one... (So much looping ;-;)
	var prevEvo = getPrevRare(unitID);
	while (prevEvo) {
		family[prevEvo.rarity] = prevEvo;
		prevEvo = getPrevRare(prevEvo.id);
	}
	
	// Cache chain by ID
	for (var rare in family) evoChainCache[family[rare].id] = family;
	
	return family;
};
BFData.GL.getEvoChain = BFData.getEvoChain = BFData.getEvoChainMain.bind(BFData, "GL");
BFData.JP.getEvoChain = BFData.getEvoChainJP = BFData.getEvoChainMain.bind(BFData, "JP");
BFData.EU.getEvoChain = BFData.getEvoChainMain.bind(BFData, "EU");
BFData.KR.getEvoChain = BFData.getEvoChainMain.bind(BFData, "KR");

// -------------------- Items

BFData.getItemEnglish = function (gameType, rqid) {
	rqid = rqid || "";
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], itemData = data.Items; // Data
	if (itemData[rqid]) return itemData[rqid];
	for (var id in itemData) {
		if (rqid.toLowerCase() === itemData[id].name.toLowerCase()) return itemData[id];
	}
	return null;
};
BFData.getItemForeign = function (gameType, rqid) {
	rqid = rqid || "";
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], itemData = data.Items; // Data
	if (itemData[rqid]) return itemData[rqid];
	return null;
};

BFData.GL.getItem = BFData.getItem = BFData.getItemEnglish.bind(BFData, "GL");
BFData.EU.getItem = BFData.getItemEnglish.bind(BFData, "EU");
BFData.JP.getItem = BFData.getItemJP = BFData.getItemForeign.bind(BFData, "JP");
BFData.KR.getItem = BFData.getItemForeign.bind(BFData, "KR");

BFData.findItemEnglish = function (gameType, name, returnAll) {
	if (!name) return null;
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], itemData = data.Items; // Data
	var isID = !!(name.match(/^\d{5}\d?$/));
	if (isID) {
		var item = itemData[name];
		if (item) return item;
		return null;
	}
	var possibleMatches = [];
	name = (""+name).toLowerCase();
	for (var id in itemData) {
		var item = itemData[id], itemName = item.name.toLowerCase();
		if (name === itemName) return item;
		if (itemName.indexOf(name) >= 0) possibleMatches.push(item);
	}
	possibleMatches.sort(function(a,b){return b.rarity - a.rarity})
	if (returnAll) return possibleMatches;
	return possibleMatches[0];
};
BFData.GL.findItem = BFData.findItem = BFData.findItemEnglish.bind(BFData, "GL");
BFData.EU.findItem = BFData.findItemEnglish.bind(BFData, "EU");

BFData.findItemJP = BFData.JP.findItem = function (name, returnAll) {
	if (!name) return null;
	var data = BFData.JP, itemDataJP = data.Items;
	var name = name.toLowerCase();
	var isID = !!(name.match(/^\d{5}\d?$/));
	if (isID) {
		var item = itemDataJP[name];
		if (item) return item;
		return null;
	}
	var possibleMatchesGL = [];
	var globalitem;
	if (!!name.match(/[a-z]/)) {
		// See if the name is a item in global
		var globalItem = BFData.getItem(name) || BFData.findItem(name);
		// var possibleMatchesGL = finditem(name, true);
		name = toKatakana(name);
	}
	var possibleMatches = [];
	// return name;
	for (var id in itemDataJP) {
		var item = itemDataJP[id];
		if (name === item.name.substr(-name.length)) {
			possibleMatches.push(item);
		} else if (item.name.indexOf(name) >= 0) {
			possibleMatches.push(item);
		}
	}
	possibleMatches.sort(function(a,b){return b.rarity - a.rarity});
	if (!possibleMatches.length) {
		if (globalItem && itemDataJP[globalItem.id]) {
			return itemDataJP[globalItem.id];
		}
		return false;
	}
	if (returnAll) return possibleMatches;
	return possibleMatches[0] || false;
};

// Internal functions only. Do Not Export.
/* var getNextRare = function (rqid) {
	var data = BFData, getUnit = data.getUnit, evoData = data.Evos;
	var unit = getUnit(rqid);
	if (!unit) return null;
	if (!evoData[unit.id]) return null;
	return getUnit(evoData[unit.id].evo.id);
};
var getNextRareJP = function (rqid) {
	var data = BFData.JP, getUnit = data.getUnit, evoData = data.Evos;
	var unit = getUnit(rqid);
	if (!unit) return null;
	if (!evoData[unit.id]) return false;
	return getUnit(evoData[unit.id].evo.id);
};
var getPrevRare = function (rqid) {
	var data = BFData, getUnit = data.getUnit, evoData = data.Evos;
	var unit = getUnit(rqid);
	if (!unit) return null;
	for (var id in evoData) {
		if (evoData[id].evo.id === unit.id) {
			return getUnit(id);
		}
	}
};
var getPrevRareJP = function (rqid) {
	var data = BFData.JP, getUnit = data.getUnit, evoData = data.Evos;
	var unit = getUnit(rqid);
	if (!unit) return null;
	for (var id in evoData) {
		if (evoData[id].evo.id === unit.id) {
			return getUnit(id);
		}
	}
};
 */
var getNextRarity = function (gameType, rqid) {
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU,
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], getUnit = data.getUnit, evoData = data.Evos;
	var unit = getUnit(rqid);
	if (!unit) return null;
	if (!evoData[unit.id]) return null;
	return getUnit(evoData[unit.id].evo.id);
}
var getPrevRarity = function (gameType, rqid) {
	gameType = (gameType || "GL").toUpperCase();
	var dataTypes = {
		GL: BFData.GL,
		EU: BFData.EU,
		JP: BFData.JP,
		KR: BFData.KR
	}
	if (!dataTypes[gameType]) return null;
	var data = dataTypes[gameType], getUnit = data.getUnit, evoData = data.Evos;
	var unit = getUnit(rqid);
	if (!unit) return null;
	for (var id in evoData) {
		if (evoData[id].evo.id === unit.id) {
			return getUnit(id);
		}
	}
}

module.exports = BFData;