const fs = require("fs");
const otb2json = require("../lib/otb2json");

var parseString = require('xml2js').parseString;


// Libraries

var xml = fs.readFileSync("items-xml/740-items.xml").toString();

let collection = new Array();

function loadOTB(filename) {

  /*
   * Function Database.__loadOTB
   * Loads the items.otb file to map server id to client id
   */

  let map = new Object();

  // Call otb2json library to read the file
  let otb = otb2json.read(filename);

  // Create a lookup table referencing server to client id (or itself)
  otb.children.forEach(function(node) {

    // Reference by the server identifier
    map[node.sid] = new Object({
      "id": node.cid,
      "flags": node.flags,
      "group": node.group,
      "node": node,
      "properties": null
    });

  }, this);

  return map;

}

parseString(xml, function(error, result) {

  otb = loadOTB("items-otb/740-items.otb");

  if(error !== null) {
    throw(error);
  }

  result.items.item.forEach(function(item) {

    itemSelf = item["$"];

    // Single ID
    if(itemSelf.id) {
      itemSelf.fromid = itemSelf.id;
      itemSelf.toid = itemSelf.id;
    }

    if(itemSelf.fromid && itemSelf.toid) {

      for(var i = Number(itemSelf.fromid); i <= Number(itemSelf.toid); i++) {

        let thing = {
          "article": itemSelf.article,
          "name": itemSelf.name
        }

        if(item.attribute) {

          item.attribute.forEach(function(attribute) {

            attributeSelf = attribute["$"];

            if(["absorbPercentFire", "absorbPercentPhysical", "absorbPercentEnergy", "absorbPercentPoison", "absorbPercentLifeDrain", "transformDeEquipTo", "transformEquipTo", "writeOnceItemId", "maxTextLen", "decayTo", "healthGain", "healthTicks", "manaGain", "manaTicks", "duration", "weight", "defense", "charges", "containerSize", "armor", "attack", "speed"].includes(attributeSelf.key)) {
              thing[attributeSelf.key] = Number(attributeSelf.value);
            } else if(["showduration", "allowpickupable", "blockprojectile", "writeable", "readable", "stopduration", "manashield", "showcharges", "suppressDrunk", "preventitemloss", "magicpoints", "invisible"].includes(attributeSelf.key)) {
              thing[attributeSelf.key] = Boolean(attributeSelf.value);
            } else {
              thing[attributeSelf.key] = attributeSelf.value;
            }

          });

        }

        let grp = otb[String(i)].group;
        let flags = otb[String(i)].flags;

        if(grp === 0x02) {
          if(thing.type === undefined) {
            thing.type = 'container';
          }
        }

        if(grp === 0x0B) {
          thing.type = 'splash';
        }

        if(grp === 0x0C) {
          thing.type = 'fluidContainer';
        }

        if(grp === 0x06) {
          thing.type = 'rune';
        }

        if(thing.hasOwnProperty('corpseType') && thing.hasOwnProperty("containerSize")) {
          thing.type = 'corpse';
        }

        if([1227, 1228, 1229, 1230, 1245, 1246, 1247, 1248, 1259, 1260, 1261, 1262].includes(Number(itemSelf.id))) {
          thing.expertise = true;
        }

        if([1223, 1224, 1225, 1226].includes(Number(itemSelf.id))) {
          thing.unwanted = true;
        }

        // Vertical
        if([2037, 2038, 1818, 2060, 2061, 2066, 2067].includes(Number(itemSelf.id))) {
          otb[String(i)].flags += 131072;
        }

        // Horizontal
        if([2039, 2040, 1811, 2058, 2059, 2068, 2069].includes(Number(itemSelf.id))) {
          otb[String(i)].flags += 262144;
        }

        // Add mailbox
        if(Number(itemSelf.id) === 2593) {
          thing.type = 'mailbox';
        }

        // Fix stamped letter
        if(Number(itemSelf.id) === 2598) {
          delete thing.readable;
          thing.type = 'readable';
        }

        if([1811, 1818].includes(Number(itemSelf.id))) {
          otb[String(i)].flags += 1048576;
        }

        // These are readables..
        if((flags & (1 << 14)) || (flags & (1 << 20))) {
          thing.type = 'readable';
        }

        otb[String(i)].properties = thing;

        if(otb[String(i)].node.speed) otb[String(i)].properties.friction = otb[String(i)].node.speed;
        delete otb[String(i)].node;

      }
    }

  });
 
  fs.writeFileSync("definitions.json", JSON.stringify(otb, null, 4));

});

