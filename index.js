var reos = require('reos-lite');
var noble = require('noble');

const TURN_ON = '0f0d0300ff2b1bd0a00101000000bbffff';
const TURN_OFF = '0f0a0d000000000005000013ffff';

noble.on('discover', function(peripheral) {
	if (peripheral.advertisement.serviceUuids == "fff0") {
		peripheral.connect(function(error) {
			console.log('Connected to Reos-Lite: ' + peripheral.uuid);
			peripheral.discoverServices(['fff0'], function(error, services) {
				var deviceInformationService = services[0];
				deviceInformationService.discoverCharacteristics(null, function(error, characteristics) {
					var controlChar = characteristics[2];
					controlChar.write(new Buffer.from(TURN_OFF, "hex"), true, function(error) {
						if (error) {
							console.warn(error);
						} else {
							console.log('Turned: Off');
						}
					});

					setTimeout(function() {
						controlChar.write(new Buffer.from(TURN_ON, "hex"), true, function(error) {
							if (error) {
								console.warn(error);
							} else {
								console.log('Turned: On');
								process.exit(0)
							}
						});
					}, 2000);
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