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
		console.log("CALLLEDDD");
		homebridge.registerAccessory("reos-lite-plugin", "ReosLite", ReosLite);
		registeredAccessory = true
	}
};

function ReosLite(log, config) {
	this.log = log;
}

noble.on('stateChange', function(state) {
	if (state === 'poweredOn') {
		nobleState = 'poweredOn';
	} else {
		noble.stopScanning();
	}
});

ReosLite.prototype = {
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
		const me = this;
		me.log("Reading Status, Return False for now");
		return next(null, false);
	},

	setSwitchOnCharacteristic: function(on, next) {
		const me = this;
		me.log("Starting Noble");
		noble.startScanning();
		noble.on('discover', function(peripheral) {
			if (peripheral.advertisement.serviceUuids == "fff0") {
				peripheral.connect(function(error) {
					console.log('Connected to Reos-Lite: ' + peripheral.uuid);
					peripheral.discoverServices(['fff0'], function(error, services) {
						var deviceInformationService = services[0];
						deviceInformationService.discoverCharacteristics(null, function(error, characteristics) {
							var controlChar = characteristics[2];
							var toWrite = 1 ? TURN_ON: TURN_OFF;
							controlChar.write(new Buffer.from(toWrite, "hex"), true, function(error) {
								if (error) {
									me.log(error);
									noble.stopScanning();
									return next(error);
								} else {
									me.log('Turned: On');
									noble.stopScanning();
									return next();
								}
							});
						});
					});
				});
			}
		});



	}
};