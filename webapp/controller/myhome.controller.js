sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ushell/Config",
    "sap/ushell/utils",
    "sap/fe/navigation/SelectionVariant",
    "sap/ui/core/theming/Parameters",
    "sap/ushell/EventHub",
    "sap/ui/integration/Host",
    "sap/m/MessageToast",
    "sap/f/GridContainerItemLayoutData",
    "sap/ui/core/EventBus",
    "../utils/AppConstants",
    "../utils/DeviceType",
    "../utils/AppManager",
    "../utils/ColorUtils",
   
],
    function (BaseController, JSONModel, Log, Config, utils, SelectionVariant, Parameters, EventHub, Host, MessageToast, GridContainerItemLayoutData, EventBus, AppConstants, DeviceType,AppManager,ColorUtils) {
        "use strict";

        var maxTileSize = 15;
        var minTileSize = 7;

        return BaseController.extend("shellpoc.controller.myhome", {
            onInit: function () {
                //Set Initial Mark
                utils.setPerformanceMark("FLP-TTI-Homepage-Custom-Start", {
                    bUseUniqueMark: true,
                    bUseLastMark: true
                });

                //Configure Global Variables
                this.i18Bundle = this.getResourceBundle();
                this.appManagerInstance = AppManager.getInstance();
                this.colorUtils = ColorUtils.getInstance();
                this.oEventBus = EventBus.getInstance();
                this._sectionItems = [
                    {
                        id: "myInterest",
                        completeId: this.byId("myInterest").getId(),
                        title: this.i18Bundle.getText("myInterestMsg"),
                        isNavigationEnabled: true
                    },
                    {
                        id: "myInsights",
                        completeId: this.byId("myInsights").getId(),
                        title: this.i18Bundle.getText("insightLayoutSectionTitle")
                    }
                ];
                this._initializeViewModel();
                this._initTitleInformation();
                this._initializeCardProvider();
                this._checkAllSectionsVisibility();
                this._appendThemeVariables();
                this._addEventListeners();
                this.colorUtils.initColors();
                this.setFavoritePages().then(function(){
                    //this._createUserActionButtons();
                    //this._adjustLayoutStyles();
                }.bind(this));

                sap.ushell.Container.getServiceAsync("URLParsing").then(function (URLParsing) {
                    this.oUrlParsing = URLParsing;
                }.bind(this));

                //Update View Model
                this._oViewModel.setProperty("/myApps/editVisible", Config.last("/core/shell/enablePersonalization") || Config.last("/core/catalog/enabled"));
            },

            _arrangeManageSectionsTable: function () {
                var aElements = this.byId("sectionWrapper").getItems(),
                    tempArr = [];

                aElements.forEach(
                    function (element) {
                        var sId = element.getId();
                        var oItem = this._sectionItems.find(
                            function (sectionItem) {
                                return this.byId(sectionItem.id).getId() === sId;
                            }.bind(this)
                        );

                        if (oItem) {
                            var bIsPageSection = oItem.id === "myInterest",
                                bIsToDoSection = oItem.id === "forMeToday";
                            oItem.visible = element.getProperty("visible");
                            oItem.blocked = false;
                            oItem.completeId = sId;
                            tempArr.push(oItem);
                        }
                        var bIsNewsPagesVisible = this._oViewModel.getProperty("/newsFeedVisibility"),
                        bAppsAvailable = this._oViewModel.getProperty("/availablePages/length") > 0,
                        bToDoSupported = this._oViewModel.getProperty("/todoVisible");
                        if(bIsPageSection && !bAppsAvailable && !bIsNewsPagesVisible) {
                            oItem.visible = true;
                            oItem.blocked = true;
                        }
                        if (bIsToDoSection && !bToDoSupported){
                            oItem.visible = true;
                            oItem.blocked = true;
                        }
                    }.bind(this)
                );

                this._aOrderedSections = tempArr;
                this._oViewModel.setProperty("/sectionsOrder", tempArr);
            },

            _arrangeMyInterestSectionsList: function () {
                var oNewsSlide = this.byId("idNewsSlide"),
                    tempArr = [];

                var oItem = this._myInterestSectionItems.find(
                    function (myInterestSectionItem) {
                        return this.byId(myInterestSectionItem.id).getId() === oNewsSlide.getId();
                    }.bind(this)
                );
                if (oItem) {
                    oItem.visible = oNewsSlide.getProperty("visible");
                    tempArr.push(oItem);
                }
                this._aOrderedSections = tempArr;

                this._oViewModel.setProperty("/myInterestSectionsOrder", tempArr);
            },

            _initializeViewModel: function () {
                var fnGeneratePlaceHolderTiles = function (iCount, oTemplate) {
                    return new Array(iCount).fill(oTemplate ? oTemplate : {});
                },
                    fnGeneratePlaceholderTiles = function (bIsMobileDevice) {
                        return {
                            tiles: bIsMobileDevice ? [{
                                cards: fnGeneratePlaceHolderTiles(AppConstants.PLACEHOLDER_ITEMS_COUNT, { status: "Loading" })
                            }] : fnGeneratePlaceHolderTiles(AppConstants.PLACEHOLDER_ITEMS_COUNT, { status: "Loading" }),
                            status: "Loading",
                            header: "",
                            scope: "Display",
                            isError: false,
                            illustrationType: "sapIllus-NoTasks",
                            illustrationTitle: "",
                            illustrationDescription: "",
                            isSupported: false,
                            viewAllVisible: false
                        };
                    },
                    oSections = {};
                this._oViewModel = new JSONModel({
                    user: "",
                    showLoader: true,
                    isAllSectionsVisible: true,
                    pages: {
                        tiles: fnGeneratePlaceHolderTiles(8, { BGColor: Parameters.get("sapUiTileBackground"), icon: AppConstants.FALLBACK_ICON }),
                        status: "Loading"
                    },
                    spacePages: {
                        tiles: fnGeneratePlaceHolderTiles(AppConstants.PLACEHOLDER_ITEMS_COUNT)
                    },
                    availablePages: fnGeneratePlaceHolderTiles(AppConstants.PLACEHOLDER_ITEMS_COUNT),
                    dynamicApps: fnGeneratePlaceholderTiles(),
                    myInsights: {
                        status: "Loading",
                        editVisible: false,
                        viewAllVisible: false,
                        editCards: []
                    },
                    myApps: {
                        editVisible: false
                    },
                    sectionsOrder: [],
                    myInterestSectionsOrder: [],
                    allDynamicApps: [],
                    selectedApp: {},
                    editIntrestIconList: [],
                    expandedSection: {
                        expanded: false,
                        name: ""
                    },
                    insightsSectionLoaded: false
                });
                this._oViewModel.setDefaultBindingMode("OneWay");

                // Initializing Sections
                Object.keys(AppConstants.SECTIONS).forEach(function (sSectionName) {
                    oSections[sSectionName] = {
                        name: sSectionName,
                        expanded: false
                    };
                });
                this._oViewModel.setProperty("/sections", oSections);

                var oView = this.getView();
                oView.setModel(this._oViewModel, "view");
            },
            _initTitleInformation: function () {
                sap.ushell.Container.getServiceAsync("UserInfo")
                    .then(function (userInfoService) {
                        var sUserName = userInfoService.getFullName() || "Development User",
                            greetingHTMLText = this.i18Bundle.getText("XMSG_Loader_Text", [sUserName]);

                        this._oViewModel.setProperty("/loadingText", greetingHTMLText);
                    }.bind(this)
                    );
            },
            _refreshAllApps: function () {
                this._setDynamicApps();
                //if apps section is visible then refresh apps
                var oAppsSection = this.getRootView().byId("myApps");
                if(oAppsSection && oAppsSection.getVisible()){
                    EventHub.emit("refreshApps", Date.now());
                }
            },


            /**
            * Initialize the app as cards provider for SAP Collaboration Manager.
            */
            _initializeCardProvider: function () {

            },

            _addEventListeners: function () {
               

                EventHub.on("CustomHomeRendered").do(this._observeInsightsSection.bind(this));

                EventHub.on("renderComponent").do(function () {
                    this.onBeforeRendering();
                    this.onAfterRendering();
                }.bind(this));
            },

            _checkAllSectionsVisibility: function () {
                var bIsPageEmpty = ["myInterest", "myInsights"].every(function (sID) {
                    return this.byId(sID) && !this.byId(sID).getProperty("visible");
                }.bind(this));
                this._oViewModel.setProperty("/isAllSectionsVisible", bIsPageEmpty);
                this._adjustLayoutStyles();
            },
            _arrangeManageSectionsTable: function () {
                var aElements = this.byId("sectionWrapper").getItems(),
                    tempArr = [];

                aElements.forEach(
                    function (element) {
                        var sId = element.getId();
                        var oItem = this._sectionItems.find(
                            function (sectionItem) {
                                return this.byId(sectionItem.id).getId() === sId;
                            }.bind(this)
                        );

                        if (oItem) {
                            var bIsPageSection = oItem.id === "myInterest",
                                bIsToDoSection = oItem.id === "forMeToday";
                            oItem.visible = element.getProperty("visible");
                            oItem.blocked = false;
                            oItem.completeId = sId;
                            tempArr.push(oItem);
                        }
                        var bIsNewsPagesVisible = this._oViewModel.getProperty("/newsFeedVisibility"),
                        bAppsAvailable = this._oViewModel.getProperty("/availablePages/length") > 0,
                        bToDoSupported = this._oViewModel.getProperty("/todoVisible");
                        if(bIsPageSection && !bAppsAvailable && !bIsNewsPagesVisible) {
                            oItem.visible = true;
                            oItem.blocked = true;
                        }
                        if (bIsToDoSection && !bToDoSupported){
                            oItem.visible = true;
                            oItem.blocked = true;
                        }
                    }.bind(this)
                );

                this._aOrderedSections = tempArr;
                this._oViewModel.setProperty("/sectionsOrder", tempArr);
            },

            onPageTilePress: function (pageId, spaceId) {
                if(this._oViewModel.getProperty("/pages/status") !== "Loading") {
                    sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oService) {
                        var sHref =
                            oService.hrefForExternal({
                                target: {
                                    semanticObject: "Launchpad",
                                    action: "openFLPPage"
                                },
                                params: {
                                    pageId: pageId,
                                    spaceId: spaceId
                                }
                            }) || "";
                        oService.toExternal({
                            target: {
                                shellHash: sHref
                            }
                        });
                    });
                }
            },

            _adjustLayoutStyles: function () {
                var iFavPagesCount = this._oViewModel.getProperty("/pages/tiles").length,
                    bIsNewsTileVisible = this._isNewsTileVisible(),
                    sDeviceType = DeviceType.getDeviceType();

                if (sDeviceType === AppConstants.DEVICE_TYPES.Mobile) {
                    //Apply Mobile-Specific Styles
                    this._applyDeviceStyles(AppConstants.MOBILE_STYLES);
                    this._oViewModel.setProperty("/flexBoxAlignment", iFavPagesCount === 1 ? "Start" : "Center");
                } else if (sDeviceType === AppConstants.DEVICE_TYPES.Tablet) {
                    //Apply Tablet-Specific Styles
                    this._applyDeviceStyles(AppConstants.TABLET_STYLES);
                    this._oViewModel.setProperty("/flexBoxAlignment", iFavPagesCount === 1 ? "Start" : "Baseline");
                } else {
                    //Apply Desktop-Specific Styles
                    this._applyDeviceStyles(AppConstants.DESKTOP_STYLES);
                    if (bIsNewsTileVisible) {
                        this._oViewModel.setProperty("/VerticalLayoutWidth", "50vw");
                    }
                    this._oViewModel.setProperty("/flexBoxAlignment", iFavPagesCount === 1 ? "Start" : "Center");
                }

                //Add/Remove 'sapMHoxMargin' class to 'pagesBox' if News Tile is visible/invisible
                if (sDeviceType === AppConstants.DEVICE_TYPES.Tablet || sDeviceType === AppConstants.DEVICE_TYPES.Mobile) {
                    this.getView().byId("pagesBox").toggleStyleClass("sapMHoxMargin", bIsNewsTileVisible);
                }

                setTimeout(this._setPagesContainerWidth.bind(this, iFavPagesCount));

                if (this._oViewModel.getProperty(AppConstants.MyInsightStatus) === "Loaded" || this._oViewModel.getProperty("/dynamicApps/status") === "Loaded") {
                    this._adjustInsightsLayout();
                }
                EventHub.emit("adjustLayoutStyles", undefined);
            },

            _applyDeviceStyles: function (oCustomStyles) {
                Object.keys(oCustomStyles).forEach(function(sStyleKey) {
                    this._oViewModel.setProperty(sStyleKey, oCustomStyles[sStyleKey]);
                }.bind(this));
            },

            _calculateInsightsCardCount: function() {
                var oPageDomRef = this.byId("mainPage").getDomRef(),
                    aInsightsCards = !this._oViewModel.getProperty("/myInsights/disabled") && this.getView().getModel("insights") && this.getView().getModel("insights").getProperty("/cards") || [],
                    iCount;

                if (oPageDomRef && aInsightsCards.length) {
                    var oPageSectionDomRef = oPageDomRef.childNodes[0],
                        oSectionProperties = this._fetchElementProperties(oPageSectionDomRef, ["width", "padding-left", "padding-right"]),
                        iAvailableWidth = oSectionProperties["width"] - oSectionProperties["padding-left"] - oSectionProperties["padding-right"],
                        iCardWidth = 304 + 14; //19rem + Margin

                   iCount = Math.floor(iAvailableWidth / iCardWidth);
                   iCount = iCount > 0 ? iCount : 1;
                }
                return iCount || 1;
            },
            _observeInsightsSection: function () {
                var oInsightsSectionDomRef = this.byId("myInsights").getDomRef();
                var oInsightsExpandedDomRef = this.byId("myInsightsExpanded").getDomRef();
                if (oInsightsSectionDomRef && oInsightsExpandedDomRef) {
                    //Ensure that only one observer instance is active
                    if (this._insightsIntersectionObserver) {
                        this._insightsIntersectionObserver.unobserve(oInsightsSectionDomRef);
                        this._insightsIntersectionObserver.unobserve(oInsightsExpandedDomRef);
                    }

                    if (!this.insightsLoaded) {
                        this._insightsIntersectionObserver = new window.IntersectionObserver(function (aEntries) {
                            aEntries.forEach(function (oEntry) {
                                if (oEntry.isIntersecting && !this.insightsLoaded) {
                                    this._initMyInsightCards();
                                }
                            }.bind(this));
                        }.bind(this), { threshold: [0.1] });
                        this._insightsIntersectionObserver.observe(oInsightsSectionDomRef);
                        this._insightsIntersectionObserver.observe(oInsightsExpandedDomRef);
                    }
                }
            },

            _setPagesContainerWidth: function (iFavPagesCount) {
                try {
                    var bIsNewsTileVisible = this._isNewsTileVisible(),
                        sDeviceType = DeviceType.getDeviceType(),
                        domRef = bIsNewsTileVisible ? this.byId("pagesContent").getDomRef() : this.byId("flexBoxWrapper").getDomRef();

                    if(!domRef) {
                        return false;
                    }

                    this.pageTilesStylesApplied = true;
                    window.removeEventListener("focus", this.applyPageTileStyleOnWindowFocus, true);

                    if(sDeviceType === AppConstants.DEVICE_TYPES.Mobile){
                        this._oViewModel.setProperty("/hBoxWidth", "100%");
                        this._oViewModel.setProperty("/pagesTileWidth", "auto");
                        return true;
                    }

                    var wrapperWidth = (domRef.clientWidth) / 16,   // Divide by 16 to convert to rem,
                        flexWrapperWidth = this.byId("flexBoxWrapper").getDomRef().clientWidth;

                    if(bIsNewsTileVisible && flexWrapperWidth >= 1520){  // As newsTile will grow till 40.75 rem, calculating the remaining width
                        wrapperWidth = (flexWrapperWidth / 16) - 40.75;
                    }
                    if(this._oViewModel.getProperty("/pages/status") === "Loading") {
                        var hBoxLoadingWidth = bIsNewsTileVisible ? "100%" : domRef.clientWidth + "px";
                        this._oViewModel.setProperty("/hBoxWidth", hBoxLoadingWidth);
                        this._oViewModel.setProperty("/pagesTileWidth", "100%");
                        return true;
                    }
                    if(iFavPagesCount > 0) {
                        // If Space available display all tiles in a single row
                        var oPageWrapperConfig = {
                            "iFavPagesCount": iFavPagesCount,
                            "wrapperWidth": wrapperWidth
                        };
                        this._setPagesTilesStyles(oPageWrapperConfig);
                        return true;
                    }
                    this._oViewModel.setProperty("/VerticalLayoutWidth", (wrapperWidth) + "rem");
                    return true;
                } catch (oErr) {
                    return false;
                }
            },

            _adjustInsightsLayout: function () {
                // Insights Tile
                var aDynamicApps = Object.values(this.orgMyInsightAppsContents || {});
                var oDynAppContainer = this.getView().byId("insightsFragment--dynAppsFlexContainer");
                if (this.orgMyInsightAppsContents && oDynAppContainer
                    && !this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS + "/expanded")
                    && !this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS_TILES + "/expanded")) {

                    var oDynHeaderContainer = this.getView().byId("insightsFragment--dynAppHeaderContainer"),
                        bIsMobileDevice = this._oViewModel.getProperty("/isPhoneScreen");

                    if (bIsMobileDevice) {
                        var aContents = oDynHeaderContainer.getContent(),
                            isPlaceHolderContentPresent = aContents.some(function (oControl) { return oControl.isA("sap.m.GenericTile"); }) || false;

                        if (!aContents.length || isPlaceHolderContentPresent) {
                            oDynAppContainer.removeAllItems();
                            oDynHeaderContainer.removeAllContent();
                            aDynamicApps.forEach(function (oApp) {
                                oDynHeaderContainer.addContent(oApp);
                            });
                        }
                    } else {
                        this._calculateDynamicTileCount()
                            .then(function (iCount) {
                                oDynHeaderContainer.removeAllContent();
                                oDynAppContainer.removeAllItems();
                                aDynamicApps.slice(0, iCount).forEach(function (oApp) {
                                    oDynAppContainer.addItem(oApp);
                                });
                                this._oViewModel.setProperty("/dynamicApps/viewAllVisible", iCount < aDynamicApps.length);
                            }.bind(this));
                    }
                }

                // Insights Cards
                if (this.insightsLoaded && oDynAppContainer) {
                    var aInsightCards = !this._oViewModel.getProperty("/myInsights/disabled") && this.getView().getModel("insights") && this.getView().getModel("insights").getProperty("/cards") || [],
                        bIsInsightsSectionExpanded = this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS + "/expanded"),
                        bIsInsightsCardsExpanded = this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS_CARDS + "/expanded");

                    if (aInsightCards.length && !bIsInsightsSectionExpanded && !bIsInsightsCardsExpanded) {
                        var iVisibleCardCount = this._calculateInsightsCardCount();
                        this._oViewModel.setProperty("/myInsights/flexCards", aInsightCards.slice(0, this._calculateInsightsCardCount()));
                        this._oViewModel.setProperty("/myInsights/viewAllVisible", iVisibleCardCount < aInsightCards.length);
                    } else if (bIsInsightsSectionExpanded || bIsInsightsCardsExpanded) {
                        this._oViewModel.setProperty("/myInsights/flexCards", aInsightCards);
                    }

                    oDynAppContainer.toggleStyleClass("sapUiSmallMarginBottom sapUiMediumMarginBottom", aInsightCards.length > 0);
                    this._adjustInsightsTileCardLayout(aDynamicApps);
                }
            },

            _adjustInsightsTileCardLayout: function(aDynamicApps) {
                var iDynamicAppLength = aDynamicApps.length,
                    bInsightsLoaded = this._oViewModel.getProperty(AppConstants.MyInsightStatus) === "Loaded",
                    insightHeaderVisibility = "/insightHeaderVisibility";

                if(bInsightsLoaded && iDynamicAppLength > 0){
                    this._oViewModel.setProperty(insightHeaderVisibility, true);
                } else {
                    this._oViewModel.setProperty(insightHeaderVisibility, false);
                }
                this.cardProvider.onViewUpdate(this.oView.isActive());
            },

            _calculateDynamicTileCount: function() {
                return this.oDynAppsLoad.then(function() {
                    var oPageDomRef = this.getView().byId("mainPage").getDomRef(),
                        aApps = Object.values(this.orgMyInsightAppsContents),
                        iCount = 0;
                    if (oPageDomRef && aApps.length) {
                        var oPageSectionDomRef = oPageDomRef.childNodes[0],
                            oSectionProperties = this._fetchElementProperties(oPageSectionDomRef, ["width", "padding-left", "padding-right"]),
                            iAvailableWidth = oSectionProperties["width"] - oSectionProperties["padding-left"] - oSectionProperties["padding-right"],
                            oWidthMap = {};

                        oWidthMap[AppConstants.DisplayFormat.Standard] = 176 + 16; // Width + Gap
                        oWidthMap[AppConstants.DisplayFormat.StandardWide] = 368 + 16; // Width + Gap

                        var iNextTileWidth = oWidthMap[aApps[iCount].getDisplayFormat() || AppConstants.DisplayFormat.Standard];
                        do {
                            iAvailableWidth -= iNextTileWidth;
                            ++iCount;
                            iNextTileWidth = oWidthMap[aApps[iCount] && aApps[iCount].getDisplayFormat() || AppConstants.DisplayFormat.Standard];
                        } while (iAvailableWidth > iNextTileWidth);
                    }
                    return iCount || 1;
                }.bind(this));
            },

            adjustInsightTilesAlign: function(oApp) {
                oApp.setLayoutData(
                    new GridContainerItemLayoutData({
                        minRows: 2,
                        columns: oApp.getDisplayFormat() === AppConstants.DisplayFormat.Standard ? 2 : 4
                    })
                );
            },

            _setDynamicApps: function () {
                return this.appManagerInstance.fetchInsightApps(this._bAppLoaded, this.i18Bundle.getText("insightsTitle"))
                    .then(function (aMyInsightApps) {
                        var bIsMobileDevice = this._oViewModel.getProperty("/isPhoneScreen"),
                            aDynAppContainers = this._getDynamicTileContainer(),
                            aExistingVisualizationIDs = this.orgMyInsightAppsContents ? Object.keys(this.orgMyInsightAppsContents) : [],
                            bReloadIfNecessary = aExistingVisualizationIDs.length !== aMyInsightApps.length || aExistingVisualizationIDs.filter(function (sID) {
                                var oExistingApp = aMyInsightApps.find(function (oApp) {
                                    return oApp.visualization.vizId === sID || oApp.visualization.targetURL === sID;
                                });
                                return !oExistingApp;
                            }).length > 0;

                        if (!this.orgMyInsightAppsContents || bReloadIfNecessary) {
                            this.oDynAppsLoad = this._smartTileVisualizationFactory(aMyInsightApps)
                                .then(function(oMyInsightAppsContents) {
                                    this._clearInsightsTileCache();
                                    this.orgMyInsightAppsContents = Object.assign({}, oMyInsightAppsContents);
                                    var aDynamicApps = Object.values(this.orgMyInsightAppsContents);
                                    aDynAppContainers.forEach(function (oDynAppContainer) {
                                        oDynAppContainer.removeAllApps();
                                        if (bIsMobileDevice) {
                                            // Mobile View
                                            aDynamicApps.forEach(function(oApp) {
                                                oDynAppContainer.addApp(oApp);
                                            });
                                        } else {
                                            // Desktop and Tablet View
                                            this._calculateDynamicTileCount()
                                                .then(function(iCount) {
                                                    aDynamicApps = this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS + "/expanded")
                                                        || this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS_TILES + "/expanded")
                                                        ? aDynamicApps
                                                        : aDynamicApps.slice(0, iCount);

                                                    aDynamicApps.forEach(function(oApp) {
                                                        oDynAppContainer.addApp(oApp);
                                                    });
                                                    this._oViewModel.setProperty("/dynamicApps/viewAllVisible", iCount < aMyInsightApps.length);
                                                }.bind(this));
                                        }
                                    }.bind(this));
                                    this._adjustInsightsLayout();
                                }.bind(this));
                        }

                        this._oViewModel.setProperty(AppConstants.DynamicAppsLength, aMyInsightApps.length);
                        this._oViewModel.setProperty("/dynamicApps/status", "Loaded");
                        this._handleExpandTiles(aMyInsightApps.length);

                        this._setAllDynamicApps(aMyInsightApps);
                    }.bind(this))
                    .finally(function(){
                        this.markPerformance(AppConstants.SECTIONS_ID.INSIGHTS);
                    }.bind(this));
            },

            _handleExpandTiles: function(iDynamicAppLength){
                if (this._expandParam && this._expandParam === AppConstants.SECTIONS.INSIGHTS_TILES) {
                    if (iDynamicAppLength) {
                        this.expandSection({isSectionExpanded:true, expandType:this._expandParam, isHashChangeTrigger:true});
                        this._expandParam = null;
                    } else {
                        this.getHashChanger().replaceHash(AppConstants.MYHOME_URL_HASH);
                    }
                }
            },

            _expandDynamicAppsContainer: function(bIsSectionExpanded) {
                return this.oDynAppsLoad && this.oDynAppsLoad.then(function() {
                    var oDynAppContainer = this.getView().byId("insightsFragmentExpanded--dynAppsFlexContainer"),
                        aContents = this.orgMyInsightAppsContents ? Object.values(this.orgMyInsightAppsContents) : [];

                    oDynAppContainer.removeAllApps();

                    aContents.forEach(function(oContent) {
                        oDynAppContainer.addItem(oContent);
                    });

                    if (!bIsSectionExpanded) {
                        this._adjustInsightsLayout();
                    }
                }.bind(this));
            },

            _setAllDynamicApps: function (aMyInsightApps) {
                return this.appManagerInstance.fetchFavApps(this._bAppLoaded, true)
                    .then(function(aFavApps) {
                        var aDynamicApps = aFavApps.filter(function (oDynApp) {
                            return oDynApp.isCount || oDynApp.isSmartBusinessTile;
                        });

                        // Filter out duplicate apps from favApps
                        var aFilteredDynApps = aDynamicApps.filter(function (oDynApp) {
                            var iAppIndex = aMyInsightApps.findIndex(function (oInsightApps) {
                                return !oDynApp.visualization.isBookmark && oInsightApps.visualization.vizId === oDynApp.visualization.vizId
                                || oDynApp.visualization.isBookmark && oInsightApps.visualization.targetURL === oDynApp.visualization.targetURL;
                            });
                            return iAppIndex === -1;
                        });

                        aFilteredDynApps.forEach(function (oFilteredApp) {
                            oFilteredApp.isConvertEnabled = false;
                            oFilteredApp.selected = false;
                        });
                        var aFavEnabledApps = [];

                        aMyInsightApps.forEach(function (oInsightsApp) {
                            oInsightsApp.isConvertEnabled = false;
                            oInsightsApp.isAddFavEnabled = false;
                            var aSupportedDisplayFormats = oInsightsApp.visualization.supportedDisplayFormats;

                            // Check if static tile
                            if (!oInsightsApp.isCount && !oInsightsApp.isSmartBusinessTile) {
                                // Check if App is not present in Fav Apps
                                var iAppIndex = aFavApps.findIndex(function (oFavApp) {
                                    return oFavApp.visualization.vizId === oInsightsApp.visualization.vizId || oFavApp.appId === oInsightsApp.appId;
                                });
                                if (iAppIndex === -1) {
                                    oInsightsApp.isAddFavEnabled = true;
                                    aFavEnabledApps.push(oInsightsApp);
                                }
                            }

                            //if both standard and standard wide display formats are available
                            //then provide option to convert
                            else if(aSupportedDisplayFormats.length > 1
                                && aSupportedDisplayFormats.indexOf(AppConstants.DisplayFormat.Standard) > -1
                                && aSupportedDisplayFormats.indexOf(AppConstants.DisplayFormat.StandardWide) > -1
                            ){
                                oInsightsApp.isConvertEnabled = true;
                            }
                        });
                        aFavEnabledApps = this.appManagerInstance.filterDuplicateApps(aFavEnabledApps,false);
                        var allDynamicApps = aMyInsightApps.concat(aFilteredDynApps);
                        this._oViewModel.setProperty("/allDynamicApps", allDynamicApps);
                        this._oViewModel.setProperty("/allInsightApps", aMyInsightApps);
                        this._oViewModel.setProperty("/allSuggestedApps", aFilteredDynApps);
                        this._oViewModel.setProperty("/allAppFavEnabledApps", aFavEnabledApps);
                    }.bind(this))
                    .catch(function (oError) {
                        Log.error(oError);
                    });
            },

            addSuggTiles : function () {
                this._suggestedTileDialog.setBusy(true);
                var oDialogProps = this.getDialogProperties();
                var aAllMoveElements = this.getModel("view").getProperty(oDialogProps.allApps);
                var aSelectedApps = sap.ui.core.Element.getElementById(oDialogProps.dialogId).getSelectedItems();
                return this.appManagerInstance.getSections().then(function(aSections){
                    return aSelectedApps.reduce(function(pApp, oApp){
                        return pApp.then(function(){
                            var index = oApp.getBindingContextPath().split("/")[2];
                            var oSelectedApp = aAllMoveElements[index];
                            var iMyInsightSectionIndex = aSections.findIndex(function(oSection){
                                return oSection.id === AppConstants.MYINSIGHT_SECTION_ID;
                            });
                            var oMovingConfig = {
                                pageId: AppConstants.MYHOME_PAGE_ID,
                                sourceSectionIndex: oSelectedApp.persConfig.sectionIndex,
                                sourceVisualizationIndex: oSelectedApp.persConfig.visualizationIndex,
                                targetSectionIndex: iMyInsightSectionIndex,
                                targetVisualizationIndex: -1
                            };
                            if (oSelectedApp.visualization.displayFormatHint !== "standard" && oSelectedApp.visualization.displayFormatHint !== "standardWide") {
                                if (oSelectedApp.visualization.supportedDisplayFormats.includes("standard")){
                                    oSelectedApp.visualization.displayFormatHint = "standard";
                                } else if (oSelectedApp.visualization.supportedDisplayFormats.includes("standardWide")){
                                    oSelectedApp.visualization.displayFormatHint = "standardWide";
                                }
                            }
                            // Add Selected App to Insights Section
                            var checkBookMarkPromise = oSelectedApp.visualization.isBookmark === true ?
                            this.appManagerInstance.addBookMark(oSelectedApp.visualization, oMovingConfig)
                                : this.appManagerInstance.addApps(oSelectedApp.visualization.vizId, AppConstants.MYINSIGHT_SECTION_ID);
                            if (!oSelectedApp.visualization.vizId) {
                                oSelectedApp.visualization.vizId = oSelectedApp.visualization.targetURL;
                            }
                            return checkBookMarkPromise.then(function() {
                                var aDynAppContainers = this._getDynamicTileContainer();
                                return this._smartTileVisualizationFactory([oSelectedApp])
                                    .then(function(oMyInsightAppsContents) {
                                        this.orgMyInsightAppsContents[oSelectedApp.visualization.vizId] = oMyInsightAppsContents[oSelectedApp.visualization.vizId];
                                        aDynAppContainers.forEach(function (oDynAppContainer) {
                                            oDynAppContainer.addApp(oMyInsightAppsContents[oSelectedApp.visualization.vizId]);
                                        });
                                    }.bind(this));
                            }.bind(this));
                        }.bind(this));
                    }.bind(this), Promise.resolve()).
                    then(function(){
                        this._refreshAllApps();
                        this._adjustInsightsLayout();
                        this._suggestedTileDialog.setBusy(false);
                        this._suggestedTileDialog.close();
                        var count = aSelectedApps.length;
                        var msgToastTextKey = count === 1 ? "oneSmartTileAddCount" : "smartTileAddCount";
                        MessageToast.show(this.i18Bundle.getText(msgToastTextKey, [count]));
                    }.bind(this));
                }.bind(this));
            },

            navigateToInsightsAppFinder: function () {
                if(this._suggestedTileDialog){
                    this._suggestedTileDialog.close();
                }
                this.navigateToAppFinder({
                    pageID: encodeURIComponent(AppConstants.MYHOME_PAGE_ID),
                    sectionID: encodeURIComponent(AppConstants.MYINSIGHT_SECTION_ID)
                });
            },

          

            _setFavPages: function (aFavPages, bUpdatePersonalisation) {
                var bArePagesEmpty;
                aFavPages.forEach(function (oPage) {
                    oPage.selected = true;
                    if (!oPage.BGColor) {
                        oPage.BGColor = this.colorUtils.getFreeColor();
                    } else {
                        this.colorUtils.addColor(oPage.BGColor);
                    }
                }.bind(this));

                //Update View Model with favorite pages
                this._oViewModel.setProperty("/pages/status", "Loaded");
                this._oViewModel.setProperty("/pages/tiles", aFavPages);
                this._oViewModel.setProperty("/pages/tiles/length", aFavPages.length);
               // this._arrangeMyInterestSectionsList();

                //Update the Personalisation model
                if (bUpdatePersonalisation) {
                    this.getPersonalization().then(function(oPersonalization){
                        var oPersModel = oPersonalization.oPersModel;
                        var oPersonalizer = oPersonalization.oPersonalizer;
                        oPersModel.setProperty("/favouritePages", aFavPages);
                        var oPersData = oPersModel.getData();
                        oPersonalizer.write(oPersData);
                    });
                }

                //Display pages container if there are pages
                bArePagesEmpty = !aFavPages.length;
                this._oViewModel.setProperty("/displayVerticalLayout", bArePagesEmpty ? false : true);
                this._oViewModel.setProperty("/displayHBox", bArePagesEmpty ? false : true);
                this.byId("pagesBox").removeStyleClass("sapMPagesLoader");

                if (!bArePagesEmpty) {
                    //Fetch and apply Icons for Favorite Pages
                    this._applyIconsForFavPages();
                }

                //Adjust layout accordingly
                window.addEventListener("focus", this.applyPageTileStyleOnWindowFocus.bind(this), true);
                this._adjustLayoutStyles();
            },

            _setDefaultPages: function (aAvailablePages) {
                var aFavoritePages = aAvailablePages.slice(0, AppConstants.PAGE_SELECTION_LIMIT) || [];
                this._setFavPages(aFavoritePages);
            },

            setFavoritePages: function (bForceUpdate) {
                return this.getPersonalization().then(function(oPersonalization){
                    var oPersModel = oPersonalization.oPersModel;
                    var oPersonalizer = oPersonalization.oPersonalizer;
                    var aFavoritePages = oPersModel ? oPersModel.getProperty("/favouritePages") : undefined;
                    return this.appManagerInstance.fetchAllAvailablePages(true).then(function(aAvailablePages) {
                        //Set first 8 available pages are favorite if no favorite page data is present
                        if (!aFavoritePages) {
                            this._setDefaultPages(aAvailablePages);
                        }
                        else {
                            var aPages = [], oExistingPage;
                            aFavoritePages.forEach(function(oPage) {
                                oExistingPage = aAvailablePages.find(function(oAvailablePage) {
                                    return oAvailablePage.pageId === oPage.pageId;
                                });
                                if (oExistingPage) {
                                    oExistingPage.BGColor = oPage.BGColor;
                                    aPages.push(oExistingPage);
                                }
                            });
                            //To send Maximum of 8 Pages (BCP incident: 2270169293)
                            aPages = aPages.slice(0, AppConstants.PAGE_SELECTION_LIMIT);
                            if (aPages.length || !aFavoritePages.length) {
                                this._setFavPages(aPages, aPages.length !== aFavoritePages.length || bForceUpdate);
                            } else if (!aPages.length && aFavoritePages.length) {
                                //Clean unaccessible page data
                                oPersModel.setProperty("/favouritePages", undefined);
                                var oPersData = oPersModel.getData();
                                oPersonalizer.write(oPersData);
                                this._setDefaultPages(aAvailablePages);
                            }
                        }

                        //Update available pages list
                        this._oViewModel.setProperty("/availablePages", aAvailablePages);
                    }.bind(this));
                }.bind(this))
                .finally(function(){
                    this.markPerformance(AppConstants.SECTIONS_ID.PAGES);
                }.bind(this));
            },

            applyPageTileStyleOnWindowFocus: function() {
                //Added the extra condition of bPageSectionVisibleCheck as a Fix for BCP Internal Incident: 2270166900
                var bPageSectionVisibleCheck = this.byId('myInterest') && this.byId('myInterest').getVisible() && this._oViewModel.getProperty("/pages/tiles/length");
                if(!this.pageTilesStylesApplied && bPageSectionVisibleCheck){
                    this._adjustLayoutStyles();
                }
            },

            onBeforeRendering: function () {
                //Apply Personalization Changes to Favorite Pages
                this.byId("pagesBox").getBinding("items").attachChange(function() {
                    this.oKeyUserPersonalization.applyPagePersonalizations();
                },this);

                //reset expand parameter after navigating back from appFinder
                this._expandParam = null;

                // Open Edit Insights Dialog if navigated back from AppFinder
                if(this.openMyInsightsDialog){
                    this.editInsightclearFilter();
                    this._showManageSectionsDialog(this._oSettingsView.getModel("settings").getProperty("/myHomeSettingsSelectedItem"));
                    this.openMyInsightsDialog = false;
                }

                this._refreshDataModel();
            },

            _isNewsTileVisible: function () {
                return (this.getView().byId("idNewsSlide") && this.getView().byId("idNewsSlide").getProperty("visible"))
                    || (this._oViewModel.getProperty("/newsFeed/showCustom") && this._oViewModel.getProperty("/news/error") && this._oViewModel.getProperty("/newsFeedVisibility"));
            },

            _refreshDataModel: function () {
                this._refreshAllApps();
                this._arrangeManageSectionsTable();
            },

            _applyIconsForFavPages: function() {
                this._oViewModel.getProperty("/pages/tiles")
                    .filter(function(oPage) {
                        return !oPage.isIconLoaded;
                    })
                    .map(function(oPage) {
                        return this.appManagerInstance.getIconForPage(oPage);
                    }.bind(this));
            },

            _appendThemeVariables: function() {
                //Fetch all theme-specific parameter values
                var aVars = [
                        "sapUiTileBackground",
                        "_sap_f_Card_BoxShadow",
                        "_sap_f_Card_BorderRadius",
                        "sapUiTileBorderColor",
                        "sapContent_ImagePlaceholderBackground",
                        "sapUiShellBackgroundImage",
                        "sapList_Background",
                        "sapUiGroupTitleBorderColor",
                        "sapUiToolbarBackground",
                        "sapUiGlobalBackgroundColor",
                        "sapUiBaseText",
                        "sapUiContentForegroundColor",
                        "sapUiObjectHeaderSubtitleTextColor",
                        "sapUiHighlight",
                        "sapUiListSelectionBackgroundColor"
                    ],
                    //Append them to the document as custom variables for use in stylesheet
                    fnAddVars = function(params) {
                        if (params) {
                            Object.keys(params).forEach(function(sParam) {
                                document.body.style.setProperty("--" + sParam, params[sParam]);
                            });
                        }
                    },
                    oPage = this.getView().byId("page"),
                    mParams = Parameters.get({
                        name: aVars,
                        scopeElement: oPage,
                        //callback function to be called when the parameters are fetched
                        callback: function (params) {
                            fnAddVars(params);
                        }
                    });

                //mParams would be populated if the parameters were already fetched
                if (mParams) {
                    fnAddVars(mParams);
                }
            },


            _formatTitle: function (sTitle, value) {
                if (value > 0) {
                    return sTitle + " (" + value + ")";
                } else if (value === 0) {
                    return sTitle;
                }
            },
            /**
            * Exit lifecycle method
            */
            onExit: function () {
                this.oEventBus.unsubscribe("sap.ushell", "navigated", this._onShellNavigated, this);
            }
        });
    });
