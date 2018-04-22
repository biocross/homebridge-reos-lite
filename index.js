var noble = require('noble');

const TURN_ON = '0f0d0300ff2b1bd0a00101000000bbffff';
const TURN_OFF = '0f0a0d000000000005000013ffff';
const BRIGHTNESS_FULL = "0f0d0300ffffffac2e0101000000ddffff";
const BRIGHTNESS_MEDIUM_HIGH = "0f0d0300ffffff862a0101000000b3ffff";
const BRIGHTNESS_MEDIUM = "0f0d0300ffffff5422010100000079ffff";
const BRIGHTNESS_LOW = "0f0d0300ffffff1e2a01010000004bffff";

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
		"on": false,
		"brightness": 100
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

		switchService
			.getCharacteristic(Characteristic.Brightness)
			.on('get', this.getBrightness.bind(this))
			.on('set', this.setBrightness.bind(this));

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
					that.control = control;
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
	},
	getBrightness: function(next) {
		next(null, this.ledsStatus.brightness);
	},
	setBrightness: function(brightness, next) {
		this.ledsStatus.brightness = brightness;
		this.log(brightness);
		let valueToSet = BRIGHTNESS_FULL;

		if (brightness >= 85) {
			this.log("Full");
			valueToSet = BRIGHTNESS_FULL
		} else if (brightness < 85 && brightness >= 60) {
			this.log("med_high");
			valueToSet = BRIGHTNESS_MEDIUM_HIGH;
		} else if (brightness < 60 && brightness > 40) {
			this.log("med");
			valueToSet = BRIGHTNESS_MEDIUM;
		} else {
			this.log("low");
			value = BRIGHTNESS_LOW;
		}

		var that = this;
		if (this.control) {
			this.control.write(new Buffer.from(String(valueToSet), "hex"), true, function(error) {
				if (error) {
					that.log(error);
					next(error);
				} else {
					that.log('Bulb Brightness Changed');
					next();
				}
			});
		} else {
			that.log("Control Not Found");
			var brightnessClosure = function(res) {
				if (!that.peripheral || !res) {
					callback(new Error());
					return;
				}
				that.peripheral.discoverServices(['fff0'], function(error, services) {
					var deviceInformationService = services[0];
					deviceInformationService.discoverCharacteristics(null, function(error, characteristics) {
						var control = characteristics[2];
						that.control = control;
						control.write(new Buffer.from(valueToSet, "hex"), true, function(error) {
							if (error) {
								that.log(error);
								next(error);
							} else {
								that.log('Bulb Brightness Changed');
								next();
							}
						});
					});
				});
			};
			this.attemptConnect(brightnessClosure);
		}
	}
};