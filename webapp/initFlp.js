sap.ui.define([
	"./flpConfig",
	"sap/ui/fl/FakeLrepConnectorLocalStorage",
	"sap/m/MessageBox"
], function (flpConfig, FakeLrepConnectorLocalStorage, MessageBox) {
	"use strict";

	flpConfig.init().then(function () {
		FakeLrepConnectorLocalStorage.enableFakeConnector();
	}, function (oError) {
		MessageBox.error(oError.message);
	});
});