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

                sap.ushell.Container.getServiceAsync("URLParsing").then(function (URLParsing) {
                    this.oUrlParsing = URLParsing;
                }.bind(this));

                //Update View Model
                this._oViewModel.setProperty("/myApps/editVisible", Config.last("/core/shell/enablePersonalization") || Config.last("/core/catalog/enabled"));
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

            _isNewsTileVisible: function () {
                return (this.getView().byId("idNewsSlide") && this.getView().byId("idNewsSlide").getProperty("visible"))
                    || (this._oViewModel.getProperty("/newsFeed/showCustom") && this._oViewModel.getProperty("/news/error") && this._oViewModel.getProperty("/newsFeedVisibility"));
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
