
sap.ui.define([
    "sap/ui/base/Object",
    "./AppManager",
    "sap/ui/core/theming/Parameters",
    "./ColorUtils"
], function (BaseObject, AppManager, Parameters, ColorUtils) {
    "use strict";

    return BaseObject.extend("shellpoc.utils.KeyUserPersonalization", {
        constructor: function (oController) {
            this._oController = oController;
            this.colorUtils = ColorUtils.getInstance();
            this.appManagerInstance = AppManager.getInstance();

            var oAdaptationCustomData = this._oController.byId("sectionWrapper") && this._oController.byId("sectionWrapper").getAggregation("adaptationData");
            if (oAdaptationCustomData) {
                this._oController._oAdaptationData = oAdaptationCustomData.getValue();
                //Parse Adaptation Data if String
                if (typeof this._oController._oAdaptationData === "string") {
                    this._oController._oAdaptationData = JSON.parse(this._oController._oAdaptationData);
                    oAdaptationCustomData.setValue(this._oController._oAdaptationData);
                }
            }
        },

        addAdaptUIBtn: function (oRenderer) {
            sap.ui.getCore()
                .loadLibrary("sap.ui.fl", {
                    async: true
                })
                .then(function () {
                    sap.ui.require(["sap/ui/fl/write/api/FeaturesAPI"], function (FeaturesAPI) {
                        FeaturesAPI.isKeyUser()
                            .then(function (bIsKeyUser) {
                                if (bIsKeyUser) {
                                    var sAdaptUIModeText = this._oController.i18Bundle.getText("adaptUIBtn"),
                                        sAdaptUIBtnId = this._oController.createId("s4MyHomeAdaptUIBtn"),
                                        oAdaptUIBtn = {
                                            controlType: "sap.ushell.ui.launchpad.ActionItem",
                                            oControlProperties: {
                                                id: sAdaptUIBtnId,
                                                icon: "sap-icon://wrench",
                                                text: sAdaptUIModeText,
                                                tooltip: sAdaptUIModeText,
                                                press: [this.triggerRTA, this]
                                            },
                                            bIsVisible: true,
                                            bCurrentState: false,
                                            aStates: ["home"]
                                        };
                                    oRenderer.addUserAction(oAdaptUIBtn);
                                }
                            }.bind(this));
                    }.bind(this));
                }.bind(this));
        },

        triggerRTA: function() {
            sap.ui.getCore()
                .loadLibrary("sap.ui.rta", {
                    async: true
                })
                .then(function () {
                    sap.ui.require(["sap/ui/rta/api/startKeyUserAdaptation", "sap/ui/thirdparty/hasher"], function (startKeyUserAdaptation, hasher) {
                        sap.ushell.Container.getServiceAsync("URLParsing")
                            .then(function(URLParsingService) {
                                startKeyUserAdaptation({
                                    rootControl: this.getOwnerComponent().getAggregation("rootControl")
                                })
                                .catch(function () {
                                    //Trigger Manual Reload of Application in case of failure
                                    var oShellHash = URLParsingService.parseShellHash(hasher.getHash()),
                                        oHashParams = oShellHash && oShellHash.params || {},
                                        sRTAKey = "sap-ui-fl-max-layer",
                                        sValue = "CUSTOMER";

                                    if (!oHashParams.hasOwnProperty(sRTAKey)) {
                                        oHashParams[sRTAKey] = sValue;
                                        hasher.replaceHash(URLParsingService.constructShellHash(oShellHash));
                                    }

                                    /* eslint-disable fiori-custom/sap-no-location-reload */
                                    window.location.reload();
                                });
                            }.bind(this));
                    }.bind(this));
                }.bind(this._oController));
        },

        applyPagePersonalizations: function() {
            if (this._oController._oAdaptationData) {
                this.appManagerInstance.fetchAllAvailableSpaces()
                    .then(function(aSpaces) {
                        var aPages = this.byId("pagesBox").getItems(),
                            aPagePersData, aSpacePersData;

                        //Apply Page Color
                        aPagePersData = this._oAdaptationData.pageColorPersonalizations || [];
                        aPagePersData.forEach(function (oPersData) {
                            //Apply Personalization to Visible Pages, if any
                            var oExistingPage = aPages.find(function (oPage) {
                                var oBoundObj = oPage.getBindingContext("view").getObject();
                                return oBoundObj.pageId === oPersData.pageId;
                            });
                            if (oExistingPage) {
                                var oContext = oExistingPage.getBindingContext("view");
                                this.colorUtils.removeColor(oContext.getObject().BGColor).addColor(oPersData.BGColor);
                                this._oViewModel.setProperty("BGColor", oPersData.BGColor, oContext);
                                this._oViewModel.setProperty("isPagePersonalization", true, oContext);
                            }

                            //Apply Personalization to Spaces and Pages
                            var oSpaceObj = aSpaces.find(function (oSpace) {
                                return oSpace.id === oPersData.spaceId;
                            });

                            if (oSpaceObj) {
                                var oPageObj = oSpaceObj.children.find(function (oPage) {
                                    return oPage.id === oPersData.pageId;
                                });

                                if (oPageObj) {
                                    oPageObj.BGColor = {
                                        key: oPersData.BGColor,
                                        value: Parameters.get(oPersData.BGColor)
                                    };
                                    oPageObj.PersistedColor = oPersData.BGColor;
                                    oPageObj.isPagePersonalization = true;
                                }
                            }
                        }.bind(this));

                        //Apply Space Color
                        aSpacePersData = this._oAdaptationData.spaceColorPersonalizations || [];
                        aSpacePersData.forEach(function (oPersData) {
                            //Apply Personalization to Spaces and Pages
                            var oSpaceObj = aSpaces.find(function (oSpace) {
                                return oSpace.id === oPersData.spaceId;
                            });

                            if (oSpaceObj) {
                                //Update Space Color
                                oSpaceObj.applyColorToAllPages = oPersData.applyColorToAllPages;
                                oSpaceObj.BGColor = {
                                    key: oPersData.BGColor,
                                    value: Parameters.get(oPersData.BGColor)
                                };

                                if (oPersData.applyColorToAllPages) {
                                    //Change Color of Each Page inside Space
                                    oSpaceObj.children.forEach(function (oPage) {
                                        //Apply Personalization to Visible Pages, if any
                                        var oExistingPage = aPages.find(function (oVisiblePage) {
                                            var oBoundObj = oVisiblePage.getBindingContext("view").getObject();
                                            return oBoundObj.pageId === oPage.id;
                                        });
                                        if (oExistingPage) {
                                            var oContext = oExistingPage.getBindingContext("view");
                                            this.colorUtils.removeColor(oContext.getObject().BGColor).addColor(oPersData.BGColor);
                                            this._oViewModel.setProperty("BGColor", oPersData.BGColor, oContext);
                                        }

                                        //Apply Personalization to all other Pages in Space
                                        oPage.BGColor = {
                                            key: oPersData.BGColor,
                                            value: Parameters.get(oPersData.BGColor)
                                        };
                                    }.bind(this));
                                }
                            }
                        }.bind(this));

                        //Apply Space Icon
                        aSpacePersData = this._oAdaptationData.spaceIconPersonalizations || [];
                        aSpacePersData.forEach(function (oPersData) {
                            //Apply Personalization to Spaces and Pages
                            var oSpaceObj = aSpaces.find(function (oSpace) {
                                return oSpace.id === oPersData.spaceId;
                            });

                            if (oSpaceObj) {
                                //Update Space Icon
                                oSpaceObj.icon = oPersData.icon;

                                //Change Icon of Each Page inside Space
                                oSpaceObj.children.forEach(function (oPage) {
                                    //Apply Personalization to Visible Pages, if any
                                    var oExistingPage = aPages.find(function (oVisiblePage) {
                                        var oBoundObj = oVisiblePage.getBindingContext("view").getObject();
                                        return oBoundObj.pageId === oPage.id;
                                    });
                                    if (oExistingPage) {
                                        var oContext = oExistingPage.getBindingContext("view");
                                        this._oViewModel.setProperty("icon", oPersData.icon, oContext);
                                        this._oViewModel.setProperty("isIconLoaded", true, oContext);
                                    }

                                    //Apply Personalization to all other Pages in Space
                                    oPage.icon = oPersData.icon;
                                    oPage.isIconLoaded = true;
                                }.bind(this));
                            }
                        }.bind(this));

                        //Apply Page Icon
                        aPagePersData = this._oAdaptationData.pageIconPersonalizations || [];
                        aPagePersData.forEach(function (oPersData) {
                            //Apply Personalization to Visible Pages, if any
                            var oExistingPage = aPages.find(function (oPage) {
                                var oBoundObj = oPage.getBindingContext("view").getObject();
                                return oBoundObj.pageId === oPersData.pageId;
                            });
                            if (oExistingPage) {
                                var oContext = oExistingPage.getBindingContext("view");
                                this._oViewModel.setProperty("icon", oPersData.icon, oContext);
                                this._oViewModel.setProperty("isPageIconPersonalization", true, oContext);
                                this._oViewModel.setProperty("isIconLoaded", true, oContext);
                            }

                            //Apply Personalization to Spaces and Pages
                            var oSpaceObj = aSpaces.find(function (oSpace) {
                                return oSpace.id === oPersData.spaceId;
                            });

                            if (oSpaceObj) {
                                var oPageObj = oSpaceObj.children.find(function (oPage) {
                                    return oPage.id === oPersData.pageId;
                                });

                                if (oPageObj) {
                                    oPageObj.icon = oPersData.icon;
                                    oPageObj.isPageIconPersonalization = true;
                                    oPageObj.isIconLoaded = true;
                                }
                            }
                        }.bind(this));

                    }.bind(this._oController));
            }
        }
    });
});
