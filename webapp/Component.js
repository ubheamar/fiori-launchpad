/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "shellpoc/model/models",
    "sap/base/util/ObjectPath"
],
    function (UIComponent, Device, models, ObjectPath) {
        "use strict";

        return UIComponent.extend("shellpoc.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                if (
                    ObjectPath.get("sap-ushell-config.ushell.spaces.enabled") &&
                    ObjectPath.get("sap-ushell-config.ushell.spaces.myHome.enabled")
                ) {
                    // call the base component's init function
                    UIComponent.prototype.init.apply(this, arguments);

                    // enable routing
                    this.getRouter().initialize();

                    // set the device model
                    this.setModel(models.createDeviceModel(), "device");
                }
            }
        });
    }
);