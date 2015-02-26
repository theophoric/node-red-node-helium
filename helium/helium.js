module.exports = function(RED) {
    "use strict";

    var helium = require('nodehelium'),
        msgpack = require('msgpack');

    function HeliumAtom(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.mac = config.mac;
        if (this.credentials) {
            this.token = this.credentials.token;
        }
    }

    RED.nodes.registerType('helium-atom', HeliumAtom, {
        credentials: {
            token: {type: 'text'}
        }
    });

    function HeliumIn(config) {
        RED.nodes.createNode(this, config);

        this.atom = config.atom;
        this.atomConfig = RED.nodes.getNode(this.atom);


        if (this.atomConfig) {

            this.client = new helium.Helium();

            var node = this;

            this.client.open();

            this.client.on('message', function(data){
                var msg = {atom_mac: node.atomConfig.mac};
                try {
                    msg.payload = msgpack.unpack(new Buffer(data.message));
                    node.send(msg);
                }
                catch (e) {
                    node.warn("Malformed msgpack buffer");
                }
            });
            try {
                this.client.subscribe(this.atomConfig.mac, this.atomConfig.token);
            } catch (e) {
                node.warn("Unable to subscribe to atom :: " + e.message);
            }

            this.on("close", function() {
                node.client.unsubscribe(node.atomConfig.mac);
                node.client.close();
            });
        } else {
            this.error("Atom is not configured");
        }
    }

    RED.nodes.registerType("helium-in", HeliumIn);

    function HeliumOut(config) {
        RED.nodes.createNode(this, config);

        this.atom = config.atom;
        this.atomConfig = RED.nodes.getNode(this.atom);

        if (this.atomConfig) {

            this.client = new helium.Helium();

            var node = this;

            this.client.open();

            this.on('input', function (msg) {
                var packedPayload = msgpack.pack(msg.payload);
                try {
                    node.client.send(node.atomConfig.mac, node.atomConfig.token, packedPayload.toString());
                } catch(e) {
                    console.log(e)
                    node.warn("Error sending message: " + e.message);
                }
            });

            this.on("close", function() {
                node.client.close();
            });
        } else {
            this.error("Atom is not configured");
        }
    }    

    RED.nodes.registerType("helium-out", HeliumOut);
}
