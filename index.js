var noble = require('noble');

const TURN_ON = '0f0d0300ff2b1bd0a00101000000bbffff';
const TURN_OFF = '0f0a0d000000000005000013ffff';

var registeredAccessory = false;
var nobleState = "unkwown";
var Service, Characteristic;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	if (!registeredAccessory) {
		homebridge.registerAccessory("homebridge-reos-lite", "ReosLite", ReosLite);
		registeredAccessory = true
	}
};

function ReosLite(log, config) {
	this.log = log;
	this.ledsStatus = {
		"on": false
	};
	this.findBulb();
}

ReosLite.prototype = {
	findBulb: function(callback) {
		var that = this;
		noble.on('stateChange', function(state) {
			if (state === 'poweredOn') {
				noble.startScanning();
			} else {
				noble.stopScanning();
			}
		});

		noble.on('discover', function(peripheral) {
			if (peripheral.advertisement.serviceUuids == "fff0") {
				that.log("Found the Bulb!");
				that.peripheral = peripheral;
				noble.stopScanning();
				that.log("Stopped Scanning");
			}
		});
	},

	attemptConnect: function(callback) {
		this.log("Attempting to Connect to the Bulb");
		if (this.peripheral && this.peripheral.state == "connected") {
			callback(true);
		} else if (this.peripheral && this.peripheral.state == "disconnected") {
			this.log("Lost connection to bulb. Attempting Reconnection...");
			var that = this;
			this.peripheral.connect(function(error) {
				if (!error) {
					that.log("Reconnection was Successful");
					callback(true);
				} else {
					that.log("Reconnection was Unsuccessful");
					callback(false);
				}
			});
		}
	},

	getServices: function() {
		let informationService = new Service.AccessoryInformation();
		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Reos")
			.setCharacteristic(Characteristic.Model, "Lite")
			.setCharacteristic(Characteristic.SerialNumber, "123-456-789");

		let switchService = new Service.Lightbulb("Reos Lite");
		switchService
			.getCharacteristic(Characteristic.On)
			.on('get', this.getSwitchOnCharacteristic.bind(this))
			.on('set', this.setSwitchOnCharacteristic.bind(this));

		this.informationService = informationService;
		this.switchService = switchService;
		return [informationService, switchService];
	},

	getSwitchOnCharacteristic: function(next) {
		next(null, this.ledsStatus.on);
	},

	setSwitchOnCharacteristic: function(on, next) {
		var that = this;
		let code = on ? TURN_ON : TURN_OFF;
		var switchClosure = function(res) {
			if (!that.peripheral || !res) {
				callback(new Error());
				return;
			}
			that.peripheral.discoverServices(['fff0'], function(error, services) {
				var deviceInformationService = services[0];
				deviceInformationService.discoverCharacteristics(null, function(error, characteristics) {
					var control = characteristics[2];
					var toWrite = 1 ? TURN_ON : TURN_OFF;
					control.write(new Buffer.from(code, "hex"), true, function(error) {
						if (error) {
							that.log(error);
							next(error);
						} else {
							that.log('Bulb Switched ' + (on ? "ON" : "OFF"));
							next();
						}
					});
				});
			});
		};
		this.attemptConnect(switchClosure);
		this.ledsStatus.on = on;
	}
};