sap.ui.define([], function () {
    "use strict";
    var CloudPersonalizer = function (oComponent, oPersonalizationService, sItemID) {
           
        this.oComponent = oComponent;

        var oScope = {
            keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
            writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
            clientStorageAllowed: true
        };

        var oPersId = {
            container: "shellpoc",
            item: sItemID
        };

        this.oPersonalizer = oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);
    };

    CloudPersonalizer.prototype.write = function (oData) {
        return this.oPersonalizer.setPersData(oData).then(function(){
            return "success";
        });
    };

    CloudPersonalizer.prototype.read = function () {
        return this.oPersonalizer.getPersData().then(function (oData) {
            return oData;
        });
    };

    return {
        create: function (oComponent, itemID) {
            return sap.ushell.Container.getServiceAsync("Personalization").then(function (oPersonalizationService) {
                return new CloudPersonalizer(oComponent, oPersonalizationService, itemID);
            });
        }
    };
});

