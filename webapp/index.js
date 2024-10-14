(function () {
    "use strict";

    if (true) {
        window["sap-ui-config"] = {
            "xx-bootTask": function (fnCallback) {
                init().then(() => {
                    fnCallback();
                });
            }
        };

        function init () {
            return new Promise(function (resolve) {
                sap.ui.require([
                    "cloud_shell/cloud"
                ], function (
                    cloudShell
                ) {
                    cloudShell.bootstrap().then(resolve);
                });
            });
        }
        return;
    }

   

}());