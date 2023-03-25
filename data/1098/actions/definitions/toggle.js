const lookup = new Object({
    // Torch
    "2050": "2051",
    "2051": "2050",
    "2052": "2053",
    "2053": "2052",
    "2054": "2055",
    "2055": "2054",

    // Wall lamps
    "2058": "2059",
    "2059": "2058",
    "2060": "2061",
    "2061": "2060",

    // Lanterns
    "1479": "1480",
    "1480": "1479",
    "2044": "2045",
    "2045": "2044",

    // Wall lamps
    "2037": "2038",
    "2038": "2037",
    "2039": "2040",
    "2040": "2039",

    // Candelabrum
    "2041": "2057",
    "2057": "2041",

    // Ovens
    "1786": "1787",
    "1787": "1786",
    "1788": "1789",
    "1789": "1788",
    "1790": "1791",
    "1791": "1790",
    "1792": "1793",
    "1793": "1792"
  });

module.exports = function(player, tile, index, item) {

  /*
   * Function toggleItem
   * Script called when a shovel is used on a stone pile
   */

  // Does not exist in the table
  if(!lookup.hasOwnProperty(item.id)) {
    return;
  }

  // Replace the items
  item.replace(process.gameServer.database.createThing(Number(lookup[item.id])));

  return true;

}
