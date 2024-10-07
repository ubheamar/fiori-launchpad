// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define([
    "./boottask",
], function (
    Boottask
) {
    "use strict";
    return function () {
        sap.ui.require([
            "sap/ushell/iconfonts",
            "sap/ushell/Config"
        ], function (IconFonts, Config) {
            window.sap.ushell.Container.createRendererInternal("fiori2").then(function (oContent) {
                oContent.placeAt("canvas", "only");
                var oSystem = sap.ushell.Container.getLogonSystem();
                var sCurrentState = Config.last("/core/shell/model/currentState/stateName");

                if (!oSystem.getSysInfoBar() || sCurrentState === "headerless" || sCurrentState === "headerless-home") {
                    return;
                }

                sap.ui.require([
                    "sap/ushell/renderer/ShellLayout",
                    "sap/ushell/ui/shell/SysInfoBar"
                ], function (ShellLayout, SysInfoBar) {
                    var sSystemInfoHtml = "<div id='systemInfo-shellArea'></div>";
                    var oShellHeaderShellArea = document.getElementById(ShellLayout.LAYOUT_MAPPING.ShellHeader);
                    oShellHeaderShellArea.insertAdjacentHTML("beforebegin", sSystemInfoHtml);

                    new SysInfoBar({
                        icon: oSystem.getSysInfoBarIcon(),
                        text: oSystem.getSysInfoBarMainText(),
                        subText: oSystem.getSysInfoBarSecondaryText(),
                        color: oSystem.getSysInfoBarColor()
                    }).placeAt("systemInfo-shellArea");
                });
            });
            IconFonts.registerFiori2IconFont();
        });
        Boottask.afterBootstrap();
    };
});
