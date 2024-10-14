(function () {
    "use strict";
    var sAsyncLoader = document.getElementById("sap-ui-bootstrap").getAttribute("data-sap-ui-async");
    if (sAsyncLoader && sAsyncLoader.toLowerCase() === "true") {
        sap.ui.require(["shellpoc/ushell_cloud/cloud-def"])
        return;
    }
    sap.ui.requireSync("shellpoc/ushell_cloud/cloud-def")

})();