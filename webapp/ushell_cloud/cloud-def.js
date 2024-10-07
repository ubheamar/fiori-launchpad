sap.ui.define([
    "./cloud.configure.ushell",
    "./cloud.load.launchpad",
    "./boottask",
    "sap/ushell/bootstrap/common/common.configure.ui5",
    "sap/ushell/bootstrap/common/common.configure.ui5.extractLibs",
    "sap/ushell/bootstrap/common/common.load.bootstrapExtension",
    "sap/ushell/bootstrap/common/common.debug.mode",
    "sap/ushell/bootstrap/common/common.load.core-min"
], function (
    fnConfigureUshell,
    fnLoadLaunchpad,
    oBoottask,
    fnConfigureUi5,
    fnExtractUi5LibsFromUshellConfig,
    fnLoadBootstrapExtension,
    oDebugMode,
    oCoreMinLoader
) {
    "use strict";

    var oUShellConfig;

    window["sap-ui-debug"] = oDebugMode.isDebug(); //use in LaunchPageAdapter
    oUShellConfig = fnConfigureUshell();
    fnConfigureUi5({
        ushellConfig: oUShellConfig,
        libs: fnExtractUi5LibsFromUshellConfig(oUShellConfig),
        theme: "sap_belize",
        bootTask: oBoottask.start,
        onInitCallback: fnLoadLaunchpad
    });

    oCoreMinLoader.load([]);
    fnLoadBootstrapExtension(oUShellConfig);
});
