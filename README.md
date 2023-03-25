# Forby HTML5 Open Tibia Server

# Example

Visit https://inconcessus.nl for an example server & client. The client software can be found [here](https://github.com/Inconcessus/html5-tibia-client).

# Installation

The server runs on NodeJS and is lightweight. It requires only two NPM modules that can be installed using `npm install`. The client directory needs to be hosted and accessible over HTTP e.g., `cd client; python3 -m http.server`. It does not have to be Python but can also be done using Node, NGINX or Apache, or even GitHub pages. 

# Running

The server can be started by running `node engine.js`.
The login server can be started by running `node login.js`.
The IPC client can be started using `node ipcclient.js`.

# Server Engine

This is the main engine for the server. It runs over the WebSocket protocol and required a valid login token from the login server to upgrade HTTP connections to the WebSocket protocol.

# Login Server

The login server is responsible for creating and managing player accounts. If the player succesfully logs in with a valid account number and password an SHA256-HMAC token is returned including a pointer to the data to load. This token is automatically passed to the gameserver by the game client and has its signature verified. The verification is done by a shared secret in the configuration file.

# IPC Client

Windows named pipes and Unix domain sockets are used to communicate with the gameserver locally. For example for getting the number of players online, broadcasting a message, or shutting down the server. The IPC client is exposed through an HTTP API (`node ipcclient.js`). In config.json the HTTP API will be exposed on the configured host/port. The socket represents the name of the Unix Domain Socket or Named Pipe (windows) and is arbitrary.

    "IPC": {
      "HOST": "0.0.0.0",
      "PORT": 2000,
      "SOCKET": "game.sock"
    }
    
Example calls to the HTTP API:

    http://127.0.0.1:2000/status # Returns the status of the server
    http://127.0.0.1:2000/shutdown?seconds=10 # Shuts the server down gracefully after 10 seconds
    http://127.0.0.1:2000/broadcast?message=hello # Broadcast a message to all players
    
Additional paths and methods should be implemented in `src/ipchttpapi.js`. The IPC packets constructed by the API should be handled by the gameserver too in `src/ipcsocket.js`.

# Completed Features

- [x] Support for Tibia versions:
  - [x] 740
  - [x] 1098

- [ ] Damage types (e.g., physical, fire, energy)
- [ ] Necklaces
- [ ] Guilds
- [ ] Trade system
- [ ] Skill advancing

- [x] Mailboxes for sending parcels and letters
- [x] Mailbox for receiving items either in inventory or depot
- [x] Keyring (container) that automatically opens doors with available keys
- [x] Player houses (preliminary)
- [x] Tibia walking speed handling
- [x] Books and writeables
- [x] Client auto-scaling screen window & support for fixed resolutions
- [x] Anti-aliasing feature
- [x] Doors of expertise
- [x] Doors against unwanted intruders
- [x] Depot
- [x] Programmable action events 
- [x] Programmable unique events 
- [x] World clock
- [x] Friendlist

- [x] Chats
  - [x] Default chat
  - [x] Global chats
  - [x] Private chats

- [x] Changeable outfits
- [x] Lighting (e.g., dark in underground or arbitrary RGBA)
- [x] Support for different world zones (e.g., "Now entering Borne")
- [x] Weather effects (e.g., clouds)
- [x] Regeneration (Default or modified; e.g., Life Ring, Ring of Healing)
- [x] Experience and leveling

- [x] Spells and spellbook
  - [x] Learn new spells
  - [x] Spells with cooldowns
  - [x] Spell hotbar with key shortcuts

- [x] Conditions (e.g., Poision, Burning, Electrified, Drunk, Healing)
- [x] Drunk Suppression (e.g., Dwarven Ring)
- [x] Invisibility
- [x] Distance weapons
- [x] Runes
- [x] Ground walking speed
- [x] Client auto-walk (Within visible chunks)
- [x] Protection Zones

- [x] Monsters
  - [x] A* Pathfinding
  - [x] Targeting
  - [x] Loot
  - [x] Spells
  - [x] Attacks
  - [x] Sounds
  - [x] Behaviour
    - [x] Open doors
    - [x] Different behaviours (e.g., flee on attack, neutral, hostile, hostile on attack)
    - [ ] Kill weaker creatures
    - [ ] Push or destroy items

- [x] NPCs
  - [x] Talk actions
  - [x] Trades
  - [x] Cutscenes
  - [x] World time sensitive behaviour (e.g., move indoors at night)

- [ ] Vocations
- [ ] PvP