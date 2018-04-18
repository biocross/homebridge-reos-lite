var noble = require('noble');

const TURN_ON = '0f0d0300ff2b1bd0a00101000000bbffff';
const TURN_OFF = '0f0a0d000000000005000013ffff';

var Registered = false;
var Service, Characteristic;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	if (!Registered) {
		console.log("CALLLEDDD");
		homebridge.registerAccessory("reos-lite-plugin", "ReosLite", ReosLite);
		Registered = true
	}
};

function ReosLite(log, config) {
	this.log = log;
}

ReosLite.prototype = {
	getServices: function() {
		let informationService = new Service.AccessoryInformation();
		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Reos")
			.setCharacteristic(Characteristic.Model, "Lite")
			.setCharacteristic(Characteristic.SerialNumber, "123-456-789");

		let switchService = new Service.Switch("Reos Lite");
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
		me.log("Reading Status");
		// noble.on('discover', function(peripheral) {
		// 	if (peripheral.advertisement.serviceUuids == "fff0") {
		// 		peripheral.connect(function(error) {
		// 			console.log('Connected to Reos-Lite: ' + peripheral.uuid);
		// 			peripheral.discoverServices(['fff0'], function(error, services) {
		// 				var deviceInformationService = services[0];
		// 				deviceInformationService.discoverCharacteristics(null, function(error, characteristics) {
		// 					var controlChar = characteristics[2];
		// 					controlChar.write(new Buffer.from(TURN_OFF, "hex"), true, function(error) {
		// 						if (error) {
		// 							me.log(error);
		// 							return next(error);
		// 						} else {
		// 							me.log('Turned: Off');
		// 							return next(null, false);
		// 						}
		// 					});
		// 				});
		// 			});
		// 		});
		// 	}
		// });


		// noble.on('stateChange', function(state) {
		// 	if (state === 'poweredOn') {
		// 		noble.startScanning();
		// 	} else {
		// 		noble.stopScanning();
		// 	}
		// });
		me.log('Return False');
		return next(null, false);
	},

	setSwitchOnCharacteristic: function(on, next) {
		const me = this;
		me.log("Starting Noble");
		noble.on('discover', function(peripheral) {
			if (peripheral.advertisement.serviceUuids == "fff0") {
				peripheral.connect(function(error) {
					console.log('Connected to Reos-Lite: ' + peripheral.uuid);
					peripheral.discoverServices(['fff0'], function(error, services) {
						var deviceInformationService = services[0];
						deviceInformationService.discoverCharacteristics(null, function(error, characteristics) {
							var controlChar = characteristics[2];
							var toWrite = on ? TURN_OFF : TURN_OFF;
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


		noble.on('stateChange', function(state) {
			if (state === 'poweredOn') {
				noble.startScanning();
			} else {
				noble.stopScanning();
			}
		});
	}
};