const fs = require("fs");

const NODE_ESC = 0xFD;
const NODE_INIT = 0xFE;
const NODE_TERM = 0xFF;

exports.read = function readOTBM(__INFILE__) {

    var Node = function (data, children) {

        data = this.removeEscapeCharacters(data);

        this.group = data.readUInt8(0);
        this.flags = data.readUInt32LE(1);

        let attributeData = data.slice(5);

        while(attributeData.length) {

            const attrType = attributeData.readUInt8(0);
            const dataLen = attributeData.readUInt16LE(1);

            if(attrType === 0x10) {
              this.sid = attributeData.readUInt16LE(3);
            } else if(attrType === 0x11) {
              this.cid = attributeData.readUInt16LE(3);
            } else if(attrType === 0x14) {
              this.speed = attributeData.readUInt16LE(3);
            }

            attributeData = attributeData.slice(3 + dataLen);
        }

        if(children.length) {
          this.setChildren(children);
        }

    };

    Node.prototype.removeEscapeCharacters = function (nodeData) {

        /* FUNCTION removeEscapeCharacter
         * Removes 0xFD escape character from the byte string
         */

        var iEsc = 0;
        var index;

        while (true) {

            // Find the next escape character
            index = nodeData.slice(++iEsc).indexOf(NODE_ESC);

            // No more: stop iteration
            if (index === -1) {
                return nodeData;
            }

            iEsc = iEsc + index;

            // Remove the character from the buffer
            nodeData = Buffer.concat([
                nodeData.slice(0, iEsc),
                nodeData.slice(iEsc + 1)
            ]);

        }

    };

    Node.prototype.setChildren = function (children) {
        this.children = children;
    };

    function readASCIIString16LE(data) {

        /* FUNCTION readASCIIString16LE
         * Reads a string of N bytes with its length
         * deteremined by the value of its first two bytes
         */

        return data.slice(2, 2 + data.readUInt16LE(0)).toString("ASCII");

    }


    function readNode(data) {

        /* FUNCTION readNode
         * Recursively parses OTBM nodal tree structure
         */

        // Cut off the initializing 0xFE identifier
        data = data.slice(1);

        var i = 0;
        var children = new Array();
        var nodeData = null;
        var child;

        // Start reading the array
        while (i < data.length) {

            var cByte = data.readUInt8(i);

            // Data belonging to the parent node, between 0xFE and (OxFE || 0xFF)
            if (nodeData === null && (cByte === NODE_INIT || cByte === NODE_TERM)) {
                nodeData = data.slice(0, i);
            }

            // Escape character: skip reading this and following byte
            if (cByte === NODE_ESC) {
                i = i + 2;
                continue;
            }

            // A new node is started within another node: recursion
            if (cByte === NODE_INIT) {
                child = readNode(data.slice(i));
                children.push(child.node);

                // Skip index over full child length
                i = i + 2 + child.i;
                continue;
            }

            // Node termination
            if (cByte === NODE_TERM) {
                return {
                    "node": new Node(nodeData, children),
                    "i": i
                }
            }

            i++;

        }

    }

    const data = fs.readFileSync(__INFILE__);


    if (data.readUInt8(10) !== 1 && data.readUInt16LE(11) !== 140) {
        console.log('wrong file');
        return;
    }

    return readNode(data.slice(4)).node;

};
