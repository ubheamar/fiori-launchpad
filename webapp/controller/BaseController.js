
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../utils/AppConstants",
    "sap/ui/core/mvc/XMLView",
    "sap/base/Log",
    "sap/ui/core/Fragment",
    "../utils/UshellPersonalizerFactory",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/utils",
    "sap/ushell/EventHub",
    "sap/base/util/UriParameters",
    "sap/ui/core/routing/HashChanger",
    "../utils/DNDConfig",
    "sap/ui/Device"
], function (Controller, AppConstants, XMLView, Log, Fragment, UshellPersonalizerFactory, JSONModel, utils, EventHub, UriParameters, HashChanger, DNDConfig, Device) {
    "use strict";

    return Controller.extend("shellpoc.controller.BaseController", {
        /**
         * HashChanger instance for changing hash in browser url based on expanded and collapsed sections
         *
         * @public
         * @returns {sap.ui.core.routing.HashChanger} the HashChanger instance to be used in navigation
         */
        getHashChanger: function() {
            if(!this._oHashChanger){
                this._oHashChanger = new HashChanger();
            }
            return this._oHashChanger;
        },

        /**
         * Convenience method for getting the view model by name
         *
         * @public
         * @param {string} [sName] the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel : function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model
         *
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel : function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Getter for the resource bundle.
         *
         * @public
         * @returns {sap.base.i18n.ResourceBundle} the resource bundle of the component
         */
        getResourceBundle : function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Getter for the root view of the component
         *
         * @public
         * @returns {sap.ui.mvc.View} the view instance
         */
        getRootView: function() {
            if(this.getOwnerComponent()){
                return this.getOwnerComponent().getRootControl();
            }
            return null;
        },

        getToDosController: function (bInverse) {
            var bIsSectionExpanded = this.getModel("view").getProperty("/sections/TODOS/expanded"),
                oToDoMainController = this.getRootView().byId("toDoView").getController(),
                oToDoExpandController = this.getRootView().byId("toDoViewExpanded").getController(),
                oController = bIsSectionExpanded ? oToDoExpandController : oToDoMainController,
                oInverseController = oController === oToDoMainController ? oToDoExpandController : oToDoMainController;

            return bInverse ? oInverseController : oController;
        },

        /**
         * Refresh expanded or collapsed ToDos section manually
         *
         * @param {string} sKey - selected key - can be tasks or situations
         */
        refreshToDosSection: function (sKey) {
            this.getToDosController().manualRefreshSection(sKey);
        },

        /**
         * This function is for refreshing the Insight tiles section.
         */
        refreshInsightTiles: function() {
            var myHomeController = this.getRootView().getController();
            myHomeController._clearInsightsTileCache();
            myHomeController._setDynamicApps();
        },

        /**
         * This function is for refreshing the Insight Cards section.
         */
        refreshInsightCards: function () {
            var bIsPhoneScreen = this.getRootView().getModel("view").getProperty("/isPhoneScreen"),
                bIsSectionExpanded = this.getModel("view").getProperty("/sections/INSIGHTS_CARDS/expanded"),
                containerId = "",
                cardContainers = [],
                aCards = [];
                if (!bIsPhoneScreen) {
                    containerId = bIsSectionExpanded ? "insightsFragmentExpanded--cardsFlexContainer" : "insightsFragment--cardsFlexContainer";
                    cardContainers = this.getRootView().byId(containerId).getItems()[0].getList().getItems();
                    aCards = cardContainers.map(function (container) {
                        return container.getContent()[0].getItems()[0];
                    });
                } else {
                    containerId = "insightsFragment--idInsightsCardContainer";
                    cardContainers = this.getRootView().byId(containerId).getContent();
                    aCards = cardContainers.map(function (container) {
                        return container.getItems()[0];
                    });
                }
            aCards.forEach(function (oCard) {
                oCard.refreshData();
            });
        },

        /**
         * Event handler to convert the legend color into default color
         *
         * @param {string} sColor - legend color of the icon
         */

        _convertLegendToColor: function (sColor) {
            var oLegendColor = AppConstants.LEGEND_COLORS().find(function (oColor) {
                return oColor.key === sColor;
            });
            return oLegendColor ? oLegendColor.value : AppConstants.DEFAULT_BG_COLOR().value;
        },

        /**
         * Event handler to open add from favorite apps dialog
         */
        openSuggestedTileDialog: function () {
            this.getModel("view").setProperty("/isAddBtnEnable", false);
            if (!this._suggestedTileDialog) {
                Fragment.load({
                    id: "suggestedTileDialog",
                    name: "ux.eng.s4producthomes1.fragment.suggestedTileDialog",
                    controller: this
                })
                .then(function (oDialog) {

                    this._suggestedTileDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._suggestedTileDialog.open();
            }
        },

        /**
         * Event handler to get the current dialog properties
         */
        getDialogProperties: function() {
            var sDialogId,
            oDialog,
            sGetAllApps;
            if (this._suggestedTileDialog) {
                sGetAllApps = "/allSuggestedApps";
                oDialog = this._suggestedTileDialog;
                sDialogId = "suggestedTileDialog--suggTileList";
            } else if(this._addFavAppsDialog) {
                sGetAllApps = "/allAppFavEnabledApps";
                oDialog = this._addFavAppsDialog;
                sDialogId = "addFavAppsDialog--favAppsList";
            }
            var oDialogProps = {
                "allApps": sGetAllApps,
                "dialog": oDialog,
                "dialogId": sDialogId
            };
            return oDialogProps;
        },

        /**
         * Event handler to cancel add from insights and favorite apps dialog
         */
        onPressCancelDialog: function() {
            var oDialogProps = this.getDialogProperties();

            this.getModel("view").getProperty(oDialogProps.allApps).forEach(function(oApp) {
                oApp.selected = false;
            });
            oDialogProps.dialog.close();
        },

        /**
         * Event handler to enable add apps button
         */

        enableAddAppsBtn: function() {
            var oDialogProps = this.getDialogProperties(),
            aSelectedApps = sap.ui.core.Element.getElementById(oDialogProps.dialogId).getSelectedItems();
            this.getModel("view").setProperty("/isAddBtnEnable", aSelectedApps.length !== 0);
        },
        /**
         * Event handler to move apps from add from insights and favorite apps dialog
         */
        onPressMoveAppsDialog: function() {
            var oDialogProps = this.getDialogProperties();

            var aSelectedApps = sap.ui.core.Element.getElementById(oDialogProps.dialogId).getSelectedItems(),
            aAllMoveElements = this.getModel("view").getProperty(oDialogProps.allApps);

            aSelectedApps.forEach(function(oApp) {
                var index = oApp.getBindingContextPath().split("/")[2];
                this.addAppsToFavTabInsights(aAllMoveElements[index], aSelectedApps.length);
            }.bind(this));
        },

        /**
         * Event Handler for Section-related Menu Popover
         *
         * @param {string} sType - section type
         * @param {object} oEvent - event object
         */
        showMenuPopover: function(sType, oEvent) {
            //Ensure that ToDos controller referenced is in the main page
            var oController = sType === "TODOS" ? this.getToDosController() : this;
            var oView = oController.getModel("view");
            var menuBtn = oEvent.getSource();
            var sSelectedITBKey = "";
            var bShowImportApps = false;
            var bUserActivitesTrackingEnabled = false;
            var bShowRecentFreqApps = false;
            var sUpdatedType = oController._updateTypeIfRequired(sType);
            var bRecentAppsLoaded = false;
            this.getModel("view").setProperty("/moreButtonElement", menuBtn);
            var bSectionExpanded = (
                oView.getProperty("/sections/INSIGHTS_TILES/expanded") ||
                oView.getProperty("/sections/INSIGHTS_CARDS/expanded") ||
                oView.getProperty("/sections/TODOS/expanded")
            );
            var sExpandSectionName = bSectionExpanded ? oView.getProperty("/expandedSection/name") : sUpdatedType;
            var bIsPhoneScreen = oView.getProperty("/isPhoneScreen");
            var bDynamicAppsViewAllVisible = oView.getProperty("/dynamicApps/viewAllVisible");
            var bInsightAppsViewAllVisible = oView.getProperty("/myInsights/viewAllVisible");
            var aDynamicApps = oView.getProperty("/dynamicApps/length");
            if(oController.getModel()){
                bUserActivitesTrackingEnabled = oController.getModel().getProperty("/userActivitesTrackingEnabled");
                sSelectedITBKey = oController.getModel().getProperty("/selectedITBKey");
                bShowImportApps = oController.getModel().getProperty("/showImportApps");
                bShowRecentFreqApps = oController.getModel().getProperty("/showRecentFreqAppsDialog");
                bRecentAppsLoaded = oController.getModel().getProperty("/selectedAppKey") === "recentApps" && oController.getModel().getProperty("/recentApps/status") === "Loaded"
                                        && oController.getModel().getProperty("/recentApps/length") !== 0;
            }
            var bShowMoreVisible = !bIsPhoneScreen
                && (((sUpdatedType === AppConstants.SECTIONS.INSIGHTS_TILES) && bDynamicAppsViewAllVisible)
                || ((sUpdatedType === AppConstants.SECTIONS.INSIGHTS_CARDS) && bInsightAppsViewAllVisible)
                || (sUpdatedType === AppConstants.SECTIONS.TODOS && (oController.getModel().getProperty("/" + sSelectedITBKey + "/viewAllVisible")))
                || bSectionExpanded
                );
            var bAddTiles = sUpdatedType === AppConstants.SECTIONS.INSIGHTS_TILES || sUpdatedType === AppConstants.SECTIONS.INSIGHTS || ((sUpdatedType === AppConstants.SECTIONS.INSIGHTS_CARDS && aDynamicApps === 0));
            var bImportApps = ((sUpdatedType === AppConstants.SECTIONS.APPS) && (bShowImportApps));
            var oPropertyValues = {
                        "selectedSection": sUpdatedType,
                        "sectionExpanded": bSectionExpanded,
                        "expandSectionName": sExpandSectionName,
                        "isShowMoreVisible": bShowMoreVisible,
                        "isAddTilesVisible": bAddTiles,
                        "isImportAppsVisible": bImportApps,
                        "userActivitesTrackingEnabled": bUserActivitesTrackingEnabled,
                        "showRecentFreqApps": bShowRecentFreqApps,
                        "recentAppsLoaded": bRecentAppsLoaded
            };
            if(!oController._endUserMenuBarPopover){
                this.openMenuPopover(bSectionExpanded, sUpdatedType, oController, menuBtn, oPropertyValues);
            }else {
                Object.keys(oPropertyValues).forEach(function(sKey){
                    oController._endUserMenuBarPopover.getModel("menuPopover").setProperty("/" + sKey, oPropertyValues[sKey]);
                });
                oController._endUserMenuBarPopover.openBy(menuBtn);
            }
        },

        openMenuPopover: function(bSectionExpanded, sType, oController, menuBtn, oPropertyValues) {
            var sViewName = bSectionExpanded && sType === "TODOS" ? sType + "Expanded" : sType;
            Fragment.load({
                id: "endUsersMenuBar--" + sViewName,
                name: "ux.eng.s4producthomes1.fragment.showMenuPopover",
                type: "XML",
                controller: oController
            }).then(
                function (oPopover) {
                    oController._endUserMenuBarPopover = oPopover;
                    oController._endUserMenuBarPopover.setModel(new JSONModel(oPropertyValues), "menuPopover");
                    oController.getView().addDependent(oPopover);
                    oPopover.openBy(menuBtn);
                }
            );
        },

        closePopover: function(oEvent){
            var sItemType = oEvent.getParameter("listItem").getProperty("type");
            if(sItemType !== "Navigation") {
                oEvent.getSource().close();
            }
        },

        showMenuSectionDialog: function(sSelectedKey) {
            this.getRootView().getController()._showManageSectionsDialog(sSelectedKey);
        },

        /**
         * This function bring the focus back to more button after the myHomeSetting dialog is closed.
         *
         * @private
         */

        _setFocusToShowMore: function() {
            // Fix for Accessibility issue  (BCP:2370072830)
            var oMoreBtn = this.getModel("view").getProperty("/moreButtonElement");
            if(oMoreBtn){
                oMoreBtn.focus();
                this.getModel("view").setProperty("/moreButtonElement", null);
            }
        },

        /**
         * _changeExpandHash -  checks the current state of expand section based on url and modify the section
         *
         * @public
         * @param {boolean} bIsSectionExpanded - indicates whether section is pressed or not
         * @param {string} sExpandType - type of expanded section
         * @param {boolean} bIsHashChangeTrigger - indicates whether expandSection is triggered from hash change or not
         */
        _changeExpandHash: function (bIsSectionExpanded, sExpandType, bIsHashChangeTrigger) {
            var oPageDomRef = this.getRootView().byId("mainPage").getDomRef(),
                oPageSectionDomRef = oPageDomRef.childNodes[0];
            var sExpandParam = AppConstants.SECTION_PARAMS[sExpandType];
            if (!bIsHashChangeTrigger) {
                if (bIsSectionExpanded) {
                    this.getHashChanger().setHash(AppConstants.MYHOME_URL_HASH + AppConstants.MYHOME_URL_HASH_EXPANDED + sExpandParam);
                } else {
                    this.getHashChanger().setHash(AppConstants.MYHOME_URL_HASH);
                }
            }
            this.getRootView().getModel("view").setProperty("/hashChanged", !bIsHashChangeTrigger);
            if (!bIsSectionExpanded) {
                this._iPreviousScrollPosition = oPageSectionDomRef.scrollTop;
                oPageSectionDomRef.scrollTop = (
                    sExpandType === "TODOS" ? this.getRootView().byId("toDoView").getController() : this
                )._iPreviousScrollPosition;
            }
        },

        /**
         * Section Expand Button Press Event Handler
         *
         * @public
         * @param {Object} oExpandInfo object containing info settings about expand
         * @param {boolean} oExpandInfo.isSectionExpanded - indicates whether section to be expaded or not
         * @param {string} oExpandInfo.expandType - type of expanded section (id of section)
         * @param {boolean} oExpandInfo.isHashChangeTrigger - indicates whether expandSection is triggered from hash change or not
         */
        expandSection: function(oExpandInfo) {
                var oViewModel = this.getRootView().getModel("view"),
                    bIsPhoneScreen = oViewModel.getProperty("/isPhoneScreen");

                //Expand Section only in Desktop and Tablet View & type is defined
                if (!bIsPhoneScreen && oExpandInfo.expandType) {
                    this._animate(oExpandInfo.isSectionExpanded);
                    this._preserveScrollPosition(oExpandInfo.isSectionExpanded);

                    // eslint-disable-next-line fiori-custom/sap-timeout-usage
                    setTimeout(function () {
                        try {
                            var oControlMap = {}, sType = oExpandInfo.expandType;
                            oControlMap[AppConstants.SECTIONS.TODOS] = this.getRootView().byId("forMeToday");
                            oControlMap[AppConstants.SECTIONS.PAGES] = this.getRootView().byId("myInterest");
                            oControlMap[AppConstants.SECTIONS.APPS] = this.getRootView().byId("myApps");
                            oControlMap[AppConstants.SECTIONS.INSIGHTS]
                                = oControlMap[AppConstants.SECTIONS.INSIGHTS_TILES]
                                = oControlMap[AppConstants.SECTIONS.INSIGHTS_CARDS]
                                = this.getRootView().byId("myInsights");

                            sType = this._updateTypeIfRequired(sType);
                            this._setExpandedSection(oExpandInfo, sType);

                            // Re-adjust Page Tile Layout
                            if (this._adjustLayoutStyles) {
                                this._adjustLayoutStyles();
                            }

                            // change hash based on section expanded
                            setTimeout(function () {
                                this._changeExpandHash(oExpandInfo.isSectionExpanded, sType, oExpandInfo.isHashChangeTrigger);
                            }.bind(this), 0);

                            // eslint-disable-next-line fiori-custom/sap-timeout-usage
                            setTimeout(function () {
                                //Scroll Section to Top
                                this.scrollToSection(oControlMap[sType], oExpandInfo.isSectionExpanded, sType);
                                this._focusExpanded(oExpandInfo.expandType, oExpandInfo.isSectionExpanded);
                            }.bind(this), 600);
                        } catch (oError) {
                            if (sType === AppConstants.SECTIONS.TODOS && this.oToDos) {
                                var oController = this.getToDosController();
                                oController.oToDos[oController.oToDos.selectedITBKey].expanded = true;
                                oController._handleToDoError(oController.oToDos.selectedITBKey, oError);
                            }
                            Log.error("Unable to Expand Section: " + oError);
                        }
                    }.bind(this), oExpandInfo.isSectionExpanded ? 50 : 500);
                }
        },

        _setExpandedSection: function (oExpandInfo, sType) {
            var oViewModel = this.getRootView().getModel("view");
            var oSections = oViewModel.getProperty("/sections");
            oViewModel.setProperty("/expandedSection", { name: sType, expanded: oExpandInfo.isSectionExpanded });
            if(oExpandInfo.isSectionExpanded){
                Object.keys(oSections).forEach(function (sSectionKey) {
                    if (sSectionKey === sType) {
                        oViewModel.setProperty("/sections/" + sSectionKey + "/expanded", true);
                    } else {
                        oViewModel.setProperty("/sections/" + sSectionKey + "/expanded", false);
                    }
                });
            } else {
                oViewModel.setProperty("/sections/" + sType + "/expanded", oExpandInfo.isSectionExpanded);
            }
        },

        /**
         * Section specific logic for layout adjustment
         *
         * @private
         * @param {string} sType - type of expanded section
         * @param {boolean} bIsSectionExpanded - indicates whether section is pressed or not
         */
        _focusExpanded: function(sType, bIsSectionExpanded) {
            var fnFocusControl = function (aIDs) {
                aIDs.forEach(function (sId) {
                    if (this.getRootView().byId(sId).getDomRef()) {
                        this.getRootView().byId(sId).focus();
                    }
                }.bind(this));
            }.bind(this);

            if (sType === AppConstants.SECTIONS.TODOS) {
                fnFocusControl(bIsSectionExpanded ? ["toDoViewExpanded--toDosExpandBtn"] : ["toDoView--toDosExpandBtn"]);
            } else if (sType === AppConstants.SECTIONS.INSIGHTS_TILES || sType === AppConstants.SECTIONS.INSIGHTS_CARDS || sType === AppConstants.SECTIONS.INSIGHTS) {
                if (bIsSectionExpanded) {
                    fnFocusControl([
                        "insightsFragmentExpanded--tilesExpandButton",
                        "insightsFragmentExpanded--cardsExpandButton",
                        "insightsFragmentExpanded--tilesExpandBtn",
                        "insightsFragmentExpanded--cardsExpandBtn"
                    ]);
                } else {
                    if (sType === AppConstants.SECTIONS.INSIGHTS_TILES) {
                        fnFocusControl([
                            "insightsFragment--tilesExpandButton",
                            "insightsFragment--insightsExpandBtn"
                        ]);
                    } else if (sType === AppConstants.SECTIONS.INSIGHTS_CARDS) {
                        fnFocusControl([
                            "insightsFragment--cardsExpandButton",
                            "insightsFragment--insightsExpandBtn"
                        ]);
                    }
                }
            }
        },

        /**
         * Section specific logic for layout adjustment
         *
         * @private
         * @param {string} sType - type of expanded section
         * @param {boolean} bIsSectionExpanded - indicates whether section is pressed or not
         */
         _sectionSpecificLayoutAdjust: function(sType, bIsSectionExpanded) {
            //Section-specific logic
            if (sType === AppConstants.SECTIONS.TODOS) {
                var oToDoView = this.getRootView().byId("toDoView"),
                    oToDoExpandedView = this.getRootView().byId("toDoViewExpanded"),
                    sSelectedITBKey = oToDoView.getModel().getProperty("/selectedITBKey");

                oToDoView.getModel().setProperty("/" + sSelectedITBKey + "/expanded", !bIsSectionExpanded);
                if (!oToDoExpandedView.getModel().getProperty("/" + sSelectedITBKey + "/expanded")) {
                    var oExpandedController = oToDoExpandedView.getController();
                    oExpandedController._iCardCount = oExpandedController._calculateCardCount();
                    if  (oToDoView.getModel().getProperty("/" + sSelectedITBKey + "/isLoaded")) {
                        //setting isLoaded value so that show less/more button be disabled unless task/situations are loaded
                        oToDoView.getModel().setProperty("/" + sSelectedITBKey + "/isLoaded", !bIsSectionExpanded);
                        oExpandedController.manualRefreshSection(sSelectedITBKey);
                    }
                } else {
                    //setting isLoaded value because on clicking show more for second time, the button remains disabled
                    oToDoView.getModel().setProperty("/" + sSelectedITBKey + "/isLoaded", bIsSectionExpanded);
                }
                this.syncToDoControllers();
                (bIsSectionExpanded ? oToDoExpandedView : oToDoView).getController()._adjustLayout();
            } else if (sType === AppConstants.SECTIONS.INSIGHTS || sType === AppConstants.SECTIONS.INSIGHTS_TILES) {
                this._expandDynamicAppsContainer(bIsSectionExpanded);
            } else if (sType === AppConstants.SECTIONS.INSIGHTS_CARDS) {
                this._adjustInsightsLayout();
            }
        },

        syncToDoControllers: function () {
            var oActiveController = this.getToDosController(),
                oInactiveController = this.getToDosController(true),
                oInactiveModel = oInactiveController.getModel(),
                oActiveModel = oActiveController.getModel(),
                sActiveTab = oInactiveModel.getProperty("/selectedITBKey"),
                sInActiveTab = sActiveTab === "tasks" ? "situations" : "tasks",
                oInactiveRefreshFn = oInactiveModel.getProperty("/" + sActiveTab + "/refreshFn"),
                sInactiveRefreshInfo = oInactiveModel.getProperty("/" + sActiveTab + "/refreshInfo"),
                oInactiveRefreshedTime = oInactiveModel.getProperty("/" + sActiveTab + "/lastRefreshedTime"),
                oActiveRefreshedTime = oActiveModel.getProperty("/" + sActiveTab + "/lastRefreshedTime"),
                bIsActiveSectionExpanded = oActiveModel.getProperty("/" + sActiveTab + "/expanded");

            //Sync Refresh Timings
            if (bIsActiveSectionExpanded) {
                if(oActiveRefreshedTime < oInactiveRefreshedTime){
                    oActiveModel.setProperty("/" + sActiveTab + "/tiles", oInactiveModel.getProperty("/" + sActiveTab + "/tiles"));
                    oActiveModel.setProperty("/" + sActiveTab + "/displayTiles", oInactiveModel.getProperty("/" + sActiveTab + "/displayTiles"));
                } else if(oActiveRefreshedTime > oInactiveRefreshedTime) {
                    oInactiveModel.setProperty("/" + sActiveTab + "/tiles", oActiveModel.getProperty("/" + sActiveTab + "/tiles"));
                    oInactiveModel.setProperty("/" + sActiveTab + "/displayTiles", oActiveModel.getProperty("/" + sActiveTab + "/displayTiles"));
                }

                oActiveModel.setProperty("/" + sActiveTab + "/refreshFn", oInactiveRefreshFn);
                oActiveModel.setProperty("/" + sActiveTab + "/refreshInfo", sInactiveRefreshInfo);
                oActiveModel.setProperty("/" + sActiveTab + "/lastRefreshedTime", oInactiveRefreshedTime);
            }
            if(oActiveRefreshedTime < oInactiveRefreshedTime){
                oActiveModel.setProperty("/" + sActiveTab + "/length", oInactiveModel.getProperty("/" + sActiveTab + "/length"));
                oActiveController._updateToDoTitleCount(sActiveTab);
            } else if (oActiveRefreshedTime > oInactiveRefreshedTime) {
                oInactiveModel.setProperty("/" + sActiveTab + "/length", oActiveModel.getProperty("/" + sActiveTab + "/length"));
                oInactiveController._updateToDoTitleCount(sActiveTab);
            }
            oActiveModel.setProperty("/selectedITBKey", sActiveTab);
            oActiveModel.setProperty("/" + sInActiveTab + "/length", oInactiveModel.getProperty("/" + sInActiveTab + "/length"));
            oActiveModel.setProperty("/" + sActiveTab + "/isLoaded", oInactiveModel.getProperty("/" + sActiveTab + "/isLoaded"));
        },

        /**
         * Update expanded section type if required.
         *
         * @public
         * @param {string} sType - type of expanded section
         * @returns {string} indicates if changes should be saved to personalisation
         */
        _updateTypeIfRequired: function (sType) {
            var sUpdatedType = sType,
                oViewModel = this.getRootView().getModel("view"),
                insightHeaderVisibility = "/insightHeaderVisibility";
            if (sType === AppConstants.SECTIONS.INSIGHTS) {
                var iDynamicAppLength = oViewModel.getProperty("/dynamicApps/length"),
                    bInsightsLoaded = oViewModel.getProperty("/myInsights/status") === "Loaded";

                if ((iDynamicAppLength > 0 && !bInsightsLoaded ) || (bInsightsLoaded && !iDynamicAppLength)) {
                    oViewModel.setProperty(insightHeaderVisibility, false);
                    oViewModel.setProperty("/sections/" + sType + "/expanded", false);
                }

                if (iDynamicAppLength > 0) {
                    sUpdatedType = AppConstants.SECTIONS.INSIGHTS_TILES;
                } else if (bInsightsLoaded) {
                    sUpdatedType = AppConstants.SECTIONS.INSIGHTS_CARDS;
                }
            } else {
                oViewModel.setProperty(insightHeaderVisibility, true);
            }
            return sUpdatedType;
        },

        /**
         * Persists End User Personalisation Changes in Flex Layer
         *
         * @private
         * @param {object} mProperties - map containing supported options
         * @param {string} mProperties.changes - array of changes
         * @param {boolean} mProperties.appComponent - application component
         * @returns {Promise} - resolves to indicate that the changes are persisted successfully
         */
        _persistUserChanges: function (mProperties) {
            return sap.ui.getCore().loadLibrary("sap.ui.fl", { async: true })
                .then(function () {
                return new Promise(function (resolve, reject) {
                    sap.ui.require(["sap/ui/fl/write/api/ControlPersonalizationWriteAPI"], function (ControlPersonalizationWriteAPI) {
                        ControlPersonalizationWriteAPI.add({
                            changes: mProperties.changes,
                            ignoreVariantManagement: true
                        })
                        .then(function (aGeneratedChanges) {
                            return resolve(ControlPersonalizationWriteAPI.save({
                                selector: {
                                    appComponent: mProperties.appComponent
                                },
                                changes: aGeneratedChanges
                            }));
                        })
                        .catch(function (oError) {
                            Log.error("Unable to Save User Change: " + oError);
                            return reject("Unable to Save User Change: " + oError);
                        });
                    });
                });
            });
        },

        /**
         * Adjust Scroll Position and style classes of expanded/collapsed section
         *
         * @public
         * @param {ux.eng.s4producthomes1.controls.WrapperItem} oControl section control instance
         * @param {boolean} bIsSectionExpanded indicates whether section is expanded or collapsed
         * @param {boolean} sType expanded section type
         */
        scrollToSection: function(oControl, bIsSectionExpanded, sType) {
            //Section-specific logic
            if(oControl && oControl.getVisible()) {
                this._sectionSpecificLayoutAdjust(sType, bIsSectionExpanded);
            }

            //Control Expanded Section Visibility
            var oInsightsExpandedSection = this.getRootView().byId("myInsightsExpanded"),
                bInsightsExpanded = this.getRootView().getModel("view").getProperty("/sections/INSIGHTS/expanded"),
                bInsightsTilesExpanded = this.getRootView().getModel("view").getProperty("/sections/INSIGHTS_TILES/expanded"),
                bInsightsCardsExpanded = this.getRootView().getModel("view").getProperty("/sections/INSIGHTS_CARDS/expanded");

            if (oInsightsExpandedSection) {
                oInsightsExpandedSection.toggleStyleClass("todoHide", !(bInsightsExpanded || bInsightsTilesExpanded || bInsightsCardsExpanded));
            }

            var oToDosExpandedSection = this.getRootView().byId("toDosExpanded"),
                bToDosExpanded = this.getRootView().getModel("view").getProperty("/sections/TODOS/expanded");

            if (oToDosExpandedSection) {
                oToDosExpandedSection.toggleStyleClass("todoHide", !bToDosExpanded);
            }
        },

        /**
         * Preserves current scroll position before navigation to expanded view
         *
         * @param {boolean} bIsSectionExpanded - indicates whether section any section is expanded or not
         */
        _preserveScrollPosition: function (bIsSectionExpanded) {
            var oPageDomRef = this.getRootView().byId("mainPage").getDomRef(),
                oPageSectionDomRef = oPageDomRef && oPageDomRef.childNodes[0];

            if (oPageSectionDomRef) {
                //Enable smooth scrolling for main page section
                oPageSectionDomRef.style.scrollBehavior = "smooth";

                //Retain current scroll position before expand
                this._iPreviousScrollPosition = oPageSectionDomRef.scrollTop;
            }
        },

        /**
         * Controls slide animation from main page to expanded view
         *
         * @param {boolean} bIsSectionExpanded - indicates whether section any section is expanded or not
         */
        _animate: function (bIsSectionExpanded) {
            //Hide Class on expand
            this.getRootView().byId("sliderWrapper").toggleStyleClass("hideFromView", !bIsSectionExpanded);
            this.getRootView().byId("mainPage").toggleStyleClass("hideFromView", bIsSectionExpanded);
            if (!bIsSectionExpanded) {
                this.getRootView().byId("mainPage").removeStyleClass("slide_out_left");
                this.getRootView().byId("sliderWrapper").removeStyleClass("slide_in_left");

                this.getRootView().byId("sliderWrapper").addStyleClass("slide_out_right");
                this.getRootView().byId("mainPage").addStyleClass("slide_in_right");
            } else {
                this.getRootView().byId("sliderWrapper").removeStyleClass("slide_out_right");
                this.getRootView().byId("mainPage").removeStyleClass("slide_in_right");

                this.getRootView().byId("mainPage").addStyleClass("slide_out_left");
                this.getRootView().byId("sliderWrapper").addStyleClass("slide_in_left");
            }
        },

        /**
         * Section Expand Button Press Event Handler
         *
         * @public
         * @param {object} PrevData - Data before suspension
         * @param {object} newData - Data after restoration
         * @param {string} uniqueKey - Key for data comparison
         */

        isDataChanged: function (PrevData, newData, uniqueKey) {
            if (typeof PrevData !== typeof newData || PrevData === null || newData === null) {
                return true;
            }
            if (PrevData.length !== newData.length) {
                return true;
            }
            for (var key in PrevData) {
                if (PrevData[key][uniqueKey] !== newData[key][uniqueKey]) {
                    return true;
                }
            }
            return false;
        },

        /**
         * Helper function to manage the lazy loading of views
         *
         * @public
         * @param {object} options - XML View creation options
         * @returns {Promise} - resolves to create view asynchronously, under the same owner component
         */
        loadXMLView: function(options) {
			var mViews = this._mViews = this._mViews || Object.create(null);
			if (!mViews[options.id]) {
				mViews[options.id] = this.getOwnerComponent().runAsOwner(function() {
					return XMLView.create(options);
				});
			}
			return mViews[options.id];
		},

        /**
         * Helper function to navgiate to app finder
         *
         * @public
         * @param {object} oNavObj - Navigation object
         */
        navigateToAppFinder: function (oNavObj) {
            var sShellHash = "Shell-appfinder?&/catalog/" + JSON.stringify(oNavObj);
            return this.navigateToPage(sShellHash);
        },

        /**
         * Helper function to navgiate to page
         *
         * @public
         * @param {string} sShellHash - Shell Hash
         */
        navigateToPage: function(sShellHash) {
            return sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oCrossAppNavigator) {
                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: sShellHash
                    }
                });
            });
        },

        getPersonalizer: function(){
            var oPersonalization = this.getRootView().getModel("pers") && this.getRootView().getModel("pers").getData() || {};
            if(!oPersonalization.oPersonalizer){
                return UshellPersonalizerFactory.create(this.getOwnerComponent(), "settings")
                .then(function (oPersonalizer) {
                    oPersonalization.oPersonalizer = oPersonalizer;
                    this.getRootView().setModel(new JSONModel(oPersonalization), "pers");
                    return oPersonalizer;
                }.bind(this))
                .catch(function(oError){
                    Log.error("Unable to load personalizer");
                });
            }
            else{
                return Promise.resolve(oPersonalization.oPersonalizer);
            }
        },

        getPersonalization: function(){
            var oPersonalization = this.getRootView().getModel("pers") && this.getRootView().getModel("pers").getData() || {};
            if(!oPersonalization.oPersModel){
                return this.getPersonalizer()
                    .then(function(oPersonalizer){
                        oPersonalization.oPersonalizer = oPersonalizer;
                        return oPersonalizer.read();
                    })
                    .then(function(oPersData){
                        var oPersModel = new JSONModel(oPersData);
                        oPersonalization.oPersModel = oPersModel;
                        this.getRootView().setModel(new JSONModel(oPersonalization), "pers");
                        return oPersonalization;
                    }.bind(this))
                    .catch(function(oError){
                        Log.error("Unable to load personalization model");
                    });
            }
            else{
                return Promise.resolve(oPersonalization);
            }
        },

        getPersonalizationProperty: function(sPath){
            return this.getPersonalization().then(function(oPersonalization){
                var oPersModel = oPersonalization.oPersModel || {};
                return oPersModel && oPersModel.getProperty(sPath);
            });
        },

        setPersonalizationProperty: function(sPath, data){
            return this.getPersonalization().then(function(oPersonalization){
                var oPersModel = oPersonalization.oPersModel;
                var oPersonalizer = oPersonalization.oPersonalizer;
                oPersModel.setProperty(sPath, data);
                var oPersData = oPersModel.getData();
                oPersonalizer.write(oPersData);
            });
        },

        /**
         * Attach Resize Handler for root view resize.
         * Using native ResizeHandler API.
         *
         * @param {Function} fnResizeHandler - resize handler function
         */
        attachResizeHandler: function (fnResizeHandler) {
            if(Device.system.phone) {
                Device.resize.attachHandler(this._adjustLayout, this);
            }
            else {
                if (this._resizeHandler) {
                    this._resizeHandler.disconnect();
                }
                this._resizeHandler = new ResizeObserver(fnResizeHandler);
                this._resizeHandler.observe(this.getRootView().getDomRef());
            }
        },

        _isSectionVisible: function(sSection){
            var oSection = this.getRootView().byId(sSection);
            return oSection && oSection.getVisible();
        },

        _getHeroElement: function(){
            var heroElement = "";
            var aControlIds = [ AppConstants.SECTIONS_ID.APPS, AppConstants.SECTIONS_ID.INSIGHTS, AppConstants.SECTIONS_ID.PAGES ];
            var oVisibleControlIndex = aControlIds.findIndex(function(sControlId){
                return this._isSectionVisible(sControlId);
            }.bind(this));
            if(oVisibleControlIndex > -1){
                heroElement = aControlIds[oVisibleControlIndex];
            }
            return heroElement;
        },

        markPerformance: function(sSection) {
            var sHeroElement = this._getHeroElement();
            if (!this.bPerformanceMarked && ((sSection === sHeroElement) || sHeroElement === "")) {
                this.getRootView().getModel("view").setProperty("/showLoader", false);
                utils.setPerformanceMark("FLP-TTI-Homepage-Custom", {
                    bUseUniqueMark: true,
                    bUseLastMark: true
                });
                this.bPerformanceMarked = true;
                this.getRootView().getController()._adjustLayoutStyles();
                EventHub.emit("CustomHomeRendered", undefined);
            }
        },

        _getClosestElementYIndex: function(aItems, currentIndex, keyCode){
            var fnElementPositionX = function(oDomElement){
                return oDomElement.getBoundingClientRect().x;
            };

            var fnElementPositionY = function(oDomElement){
                return oDomElement.getBoundingClientRect().y;
            };

            var minIndex = currentIndex;
            var minDistance = Number.MAX_SAFE_INTEGER;
            aItems.forEach(function(oItem, index){
                var currentDist = Math.sqrt(Math.pow(fnElementPositionX(aItems[currentIndex]) - fnElementPositionX(oItem), 2)
                    + Math.pow(fnElementPositionY(aItems[currentIndex]) - fnElementPositionY(oItem), 2));
                var bAllowed = (keyCode === "ArrowDown" && index > currentIndex) || (keyCode === "ArrowUp" && index < currentIndex);
                if(bAllowed && currentDist < minDistance && fnElementPositionY(oItem) !== fnElementPositionY(aItems[currentIndex])){
                    minDistance = currentDist;
                    minIndex = index;
                }
            });
            return minIndex;
        },

        _getFocusableItems: function(oContainer){
            var fnGetItems = function(selector){
                return Array.from((oContainer && oContainer.getDomRef() && oContainer.getDomRef().querySelectorAll(selector)) || []);
            };
            // as we are later setting tab index of all items except current item to -1 to stop tab navigation, we added a class to identify all focusable items
            var aItems = fnGetItems("[tabindex='0']");
            aItems.forEach(function(oItem){
                oItem.classList.add("item-focusable");
            });
            var aFocusableItems = fnGetItems(".item-focusable");
            return aFocusableItems;
        },

        _setTabIndexForItems: function(aItems, currentIndex) {
            var fnSetTabIndex = function(oDomElement, value){
                oDomElement.tabIndex = value;
            };
            aItems.forEach(function (x, index) {
                fnSetTabIndex(x, index === currentIndex ? 0 : -1);
            });
        },

        _getKeyPressInfo: function(oContainer, callback, e) {
            var isCtrl = e.metaKey || e.ctrlKey;

            var aItems = this._getFocusableItems(oContainer);
            var oFocusItemId = sap.ui.getCore().getCurrentFocusedControlId();
            var currentIndex = aItems.findIndex(function(oItem){
              return oItem.id === oFocusItemId;
            });
            var draggedControl = null;
            if (currentIndex !== -1) {
                draggedControl = sap.ui.getCore().byId(aItems[currentIndex].id);
            }

            return {
                isCtrl: isCtrl,
                aItems: aItems,
                currentIndex: currentIndex,
                draggedControl: draggedControl
            };
        },

        _handleArrowNavigation: function(oContainer, callback, e){
            var dropPosition = ["ArrowLeft", "ArrowUp", "Home"].includes(e.key) ? "Before" : "After";
            var fnElementPositionY = function(oDomElement){
                return oDomElement.getBoundingClientRect().y;
            };
            var keyboardEventInfo = this._getKeyPressInfo(oContainer, callback, e);
            var aItems = keyboardEventInfo.aItems;
            var currentIndex = keyboardEventInfo.currentIndex;
            var draggedControl = keyboardEventInfo.draggedControl;
            var isCtrl = keyboardEventInfo.isCtrl;

            if(currentIndex > -1){
                if(e.key === "ArrowRight" && currentIndex + 1 < aItems.length
                    && fnElementPositionY(aItems[currentIndex]) === fnElementPositionY(aItems[currentIndex + 1]))
                {
                    currentIndex = currentIndex + 1;
                }else if(e.key === "ArrowLeft" && currentIndex - 1 >= 0
                    && fnElementPositionY(aItems[currentIndex]) === fnElementPositionY(aItems[currentIndex - 1]))
                {
                    currentIndex = currentIndex - 1;
                }else if(e.key === "ArrowDown" || e.key === "ArrowUp"){
                    currentIndex = this._getClosestElementYIndex(aItems, currentIndex, e.key);
                }
                if (currentIndex < 0 || currentIndex >= aItems.length) {
                    return;
                }
                if(["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)){
                        if(isCtrl){
                            var oEvent = {
                                draggedControl: draggedControl,
                                droppedControl: sap.ui.getCore().byId(aItems[currentIndex].id),
                                dropPosition: dropPosition
                            };
                            callback(oEvent);
                        }
                        aItems[currentIndex].focus();
                        e.preventDefault();
                        e.stopPropagation();
                }

                if ((e.key === "Home" || e.key === "End") && isCtrl) {
                    var isDraggedControlValid = draggedControl && draggedControl.getBindingContext();
                    var isSection = isDraggedControlValid ? !draggedControl.getBindingContext().getObject().isSection : false;
                    var targetIndex;
                    if (e.key === "Home") {
                        targetIndex = isSection ? currentIndex : 0;
                        for (var i = currentIndex - 1; i >= 0; i--) {
                            if (isDraggedControlValid && sap.ui.getCore().byId(aItems[i].id).getBindingContext().getObject().isSection) {
                                break;
                            }
                            targetIndex = i;
                        }
                    } else if (e.key === "End") {
                        targetIndex = isSection ? aItems.length - 1 : currentIndex;
                        for (i = currentIndex + 1; i < aItems.length; i++) {
                            if (isDraggedControlValid && !sap.ui.getCore().byId(aItems[i].id).getBindingContext().getObject().isSection) {
                                break;
                            }
                            targetIndex = i;
                        }
                    }
                    var droppedControl = sap.ui.getCore().byId(aItems[targetIndex].id);
                    oEvent = {
                        draggedControl: draggedControl,
                        droppedControl: droppedControl,
                        dropPosition: dropPosition
                    };
                    callback(oEvent);
                    aItems[targetIndex].focus();
                    e.preventDefault();
                    e.stopPropagation();
                }

                //set tab index of all items to -1 expect current index, so on tab focus moves to next focusable item that it out of list
                this._setTabIndexForItems(aItems, currentIndex);
            }
        },

        _handleKeyboardGroupCreation: function(oContainer, callback, e){
            this.DNDConfig = new DNDConfig(this);
            var keyboardEventInfo = this._getKeyPressInfo(oContainer, callback, e);
            var aItems = keyboardEventInfo.aItems;
            var currentIndex = keyboardEventInfo.currentIndex;
            var draggedControl = keyboardEventInfo.draggedControl;
            var isCtrl = keyboardEventInfo.isCtrl;
            var cutElement = this.getRootView().getModel("view").getProperty("/cutElement");
            var isElementCut = !!cutElement;

            // Handle Ctrl+X for removing the current focused app
            if(isCtrl && e.key === "x" && currentIndex >= 0 && currentIndex < aItems.length && !sap.ui.getCore().byId(aItems[currentIndex].id).getBindingContext().getObject().isSection) {
                if(!isElementCut){
                    var currentElement = sap.ui.core.Element.getElementById(aItems[currentIndex].id);
                    currentElement.$().css("opacity", 0.6);
                    this.getRootView().getModel("view").setProperty("/cutElement", draggedControl);
                    this.cutIndex = currentIndex;
                    currentElement._oMoreIcon.setEnabled(false);
                    this.getRootView().getModel("view").setProperty("/isElementCut", true);
                }
            }
            // Handle Ctrl+V for adding the above removed app to the group
            if (isCtrl && e.key === "v" && cutElement && this.cutIndex !== currentIndex) {
                var targetElement = sap.ui.getCore().byId(aItems[currentIndex].id);
                if (targetElement.getBindingContext().getObject().isSection) {
                    this.DNDConfig._addAppToSection({
                        draggedApp: cutElement.getBindingContext().getObject(),
                        droppedApp: targetElement.getBindingContext().getObject()
                    });
                } else {
                    this.onPressCreateGroup(true, [cutElement.getBindingContext().getObject(), targetElement.getBindingContext().getObject()]);
                }
                this._clearCutElementState();
                this.cutIndex = -1;
            }
            this._setTabIndexForItems(aItems, currentIndex);
        },

         /**
          * Attach Keyboard Handler to navigate through items using arrow keys in list items.
          *
          * @param {string} sId - container id with list items
          */
        attachKeyboardHandler: function(sId, callback, isGroup){
            var sKey = sId;
            var oContainer = this.getView().byId(sKey) || sap.ui.getCore().byId(sKey);

            // Determine the appropriate key based on the user's platform
            if(oContainer && (!this._keyboardHandler || !this._keyboardHandler[sKey])){
                this._keyboardHandler = this._keyboardHandler || {};
                this._keyboardHandler[sKey] = oContainer.attachBrowserEvent("keydown", this._handleArrowNavigation.bind(this, oContainer, callback));
                if(isGroup){
                    this._keyboardHandler[sKey] = oContainer.attachBrowserEvent("keydown", this._handleKeyboardGroupCreation.bind(this, oContainer, callback));
                }
                // add aria role, after container is loaded in DOM
                oContainer.addEventDelegate({
                    onAfterRendering: function() {
                        var oContainerDomRef = oContainer.getDomRef();
                        oContainerDomRef.setAttribute("role", "list");
                        oContainer.addStyleClass("your-keyboard-instruction");
                    }
                });
            }
        },

        /**
         * Remove Keyboard Handler
         *
         * @param {string} sId - container id with list items
         */
        removeKeyboardHandler: function(sId){
            var sKey = sId;
            var oContainer = this.getView().byId(sKey);
            if(oContainer && this._keyboardHandler && this._keyboardHandler[sKey]){
                delete this._keyboardHandler[sKey];
                oContainer.removeBrowserEvent("keydown");
            }
        },

        _attachDndHandler: function (oContainer, callback, e) {
            var isCtrl = e.metaKey || e.ctrlKey;

            if (isCtrl && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                e.preventDefault();
                var dropPosition = e.key === "ArrowUp" ? "Before" : "After";
                var aItems = oContainer.getItems();
                var sFocusItemId = sap.ui.getCore().getCurrentFocusedControlId();
                var currentIndex = aItems.findIndex(function(oItem){
                    return oItem.getId() === sFocusItemId;
                });

                if (currentIndex >= 0 && currentIndex < aItems.length) {
                    var newIndex = e.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
                    if (newIndex >= 0 && newIndex < aItems.length) {
                        var draggedControl = aItems[currentIndex];
                        var droppedControl = aItems[newIndex];
                        var oEvent = {
                            draggedControl: draggedControl,
                            droppedControl: droppedControl,
                            dropPosition: dropPosition
                        };
                        callback(oEvent);
                        droppedControl.focus();
                    }
                    this._setTabIndexForItems(aItems, newIndex);
                }
            }
        },

        /**
         * Checks if feature is enabled or not.
         *
         * @param {string} sFeature - feature
         * @returns {boolean} - returns true if feature is enabled.
         */
        isFeatureEnabled: function (sFeature) {
            var sEnableCustomNewsFlag = UriParameters.fromQuery(window.location.search).get(sFeature) || "";
            return sEnableCustomNewsFlag.toUpperCase() === "TRUE";
        },

        /**
         * Clean up End-User changes that are no longer required.
         *
         * @param {string} sProperty - property name
         * @param {string} sChangeType - change type
         */
        cleanUpPersonalization: function (sProperty, sChangeType) {
            var oRootView = this.getRootView(),
                oKeyUserPersData = oRootView && oRootView.getController().getUIAdaptationData();

            if (oKeyUserPersData.hasOwnProperty(sProperty) && oKeyUserPersData[sProperty]) {
                var oWrapper = oRootView.byId("sectionWrapper");

                if (oWrapper) {
                    sap.ui.getCore().loadLibrary("sap.ui.fl", { async: true})
                    .then(function () {
                        sap.ui.require(
                            ["sap/ui/fl/write/api/ControlPersonalizationWriteAPI"],
                            function (ControlPersonalizationWriteAPI) {
                                ControlPersonalizationWriteAPI.reset({
                                    selectors: [ oWrapper ],
                                    changeTypes: [ sChangeType ]
                                });
                            }
                        );
                    });
                }
            }
        }
    });
});
