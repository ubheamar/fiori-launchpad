
sap.ui.define([
    "sap/ushell/EventHub",
    "sap/ui/performance/trace/initTraces",
    "sap/base/util/ObjectPath",
    "sap/base/Log",
],
    function (

        EventHub,
        initTraces,
        ObjectPath,
        Log
    ) {
        "use strict";

        var oBoottask = {};

        /**
        * Performs a start-up request and synchronizes it with the SAPUI5 boot task.
        * @Param {object} fnCallback To be called for UI5 Core during boot process
         */
        function start(fnContinueUI5Boot) {
            fnContinueUI5Boot();
        }

        function afterBootstrap() {
            
        }

        oBoottask.start = start;
        oBoottask.afterBootstrap = afterBootstrap;

        return oBoottask;
    });
