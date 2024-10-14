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
    "../utils/DNDConfig",
    "../utils/KeyUserPersonalization",
    "../utils/CardProvider",

],
    function (BaseController, JSONModel, Log, Config, utils, SelectionVariant, Parameters, EventHub, Host, MessageToast, GridContainerItemLayoutData, EventBus, AppConstants, DeviceType, AppManager, ColorUtils,DNDConfig,KeyUserPersonalization,CardProvider) {
        "use strict";

        var maxTileSize = 15;
        var minTileSize = 7;

        var toggleEditButton = function (show) {
            //using this.createId() function to create correct Ids for myHomeSetting and adaptUi options.
            var oRenderer = sap.ushell.Container.getRenderer("fiori2");
            if (show) {
                oRenderer.showActionButton(this.createId("s4MyHomeEditBtn"), false, ["home"]);
                oRenderer.showActionButton(this.createId("s4MyHomeAdaptUIBtn"), false, ["home"]);
                this._hashChangeHandler();
                this._activateInsightsTiles(true);
                EventHub.emit("CloseFesrRecord", Date.now());
            } else {
                oRenderer.hideActionButton(this.createId("s4MyHomeEditBtn"), false, ["home"]);
                oRenderer.hideActionButton(this.createId("s4MyHomeAdaptUIBtn"), false, ["home"]);
                this._closeOpenDialogs();
                this._activateInsightsTiles(false);
            }
        };

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
                //this.feedAdapterInstance = FeedAdapter.getInstance();
                this.colorUtils = ColorUtils.getInstance();
                this.oKeyUserPersonalization = new KeyUserPersonalization(this);
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
                this._myInterestSectionItems = [
                    {
                        id: "idNewsSlide",
                        title: this.i18Bundle.getText("myInterestNews"),
                        groupHeader: this.i18Bundle.getText("myInterestGroupHeader")
                    }
                ];

                this._initializeViewModel();
                this._initTitleInformation();
                //this._initNewsInformation();
                this._initializeCardProvider();
                this._checkAllSectionsVisibility();
                this._appendThemeVariables();
                this._addEventListeners();
                this._addInsightsRuntimeHost();
                this.colorUtils.initColors();
                this.setFavoritePages().then(function () {
                    this._createUserActionButtons();
                    this._adjustLayoutStyles();
                }.bind(this));
                this.DNDConfig = new DNDConfig(this);
                this.DNDConfig.addDndConfig(["pagesBox"]);
                sap.ushell.Container.getServiceAsync("URLParsing").then(function (URLParsing) {
                    this.oUrlParsing = URLParsing;
                }.bind(this));

                //Update View Model
                this._oViewModel.setProperty("/myApps/editVisible", Config.last("/core/shell/enablePersonalization") || Config.last("/core/catalog/enabled"));
            },

            /**
             * Activates or deactivates the insights tiles based on whether the user is in my home page or not.
             *
             * @private
             * @param {boolean} activate - Determines whether to activate or deactivate the insights tiles.
             */
            _activateInsightsTiles: function (activate) {
                Object.values(this.orgMyInsightAppsContents || {}).forEach(function (oVizInstance) {
                    if (oVizInstance.setActive) {
                        oVizInstance.setActive(activate);
                    }
                });
            },

            /**
             * Initialize the app as cards provider for SAP Collaboration Manager.
             */
            _initializeCardProvider: function () {
                this.cardProvider = new CardProvider();
                this.cardProvider.init(this.getOwnerComponent()._oManifest.getComponentName(), this._oViewModel);
            },

            _addEventListeners: function () {
                //Adjust Layout on News Feed Visiblity Change from RTA
                EventHub.on("newsFeedVisibilityChanged").do(function () {
                    this._adjustLayoutStyles();
                }.bind(this));

                EventHub.on("showNewsFeedError").do(function (bShowNewsError) {
                    this._oViewModel.setProperty("/news/error", bShowNewsError);
                    this._adjustLayoutStyles();
                }.bind(this));

                EventHub.on("CustomHomeRendered").do(this._observeInsightsSection.bind(this));

                EventHub.on("renderComponent").do(function () {
                    this.onBeforeRendering();
                    this.onAfterRendering();
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

            _addInsightsRuntimeHost: function () {
                var sRuntimeHostId = this.createId("runtimeHost");
                var sPreviewHostId = this.createId("previewHost");
                var sRefreshText = this.i18Bundle.getText("refresh");
                var sViewFilteredByText = this.i18Bundle.getText("viewFilteredBy");
                var sNavigateToParentText = this.i18Bundle.getText("navigateToParent");
                var runtimeHost = new Host(sRuntimeHostId, {
                    action: function (oEvent) {
                        var sType = oEvent.getParameter("type");
                        var oParameters = oEvent.getParameter("parameters") || {};

                        if (sType === "Navigation" && oParameters.ibnTarget) {
                            oEvent.preventDefault();
                            var oCard = oEvent.getParameter("card") || {},
                                oIntegrationCardManifest = oCard && oCard.getManifestEntry("sap.card") || {},
                                aHeaderActions = oIntegrationCardManifest.header && oIntegrationCardManifest.header.actions || [],
                                aContentActions = [];

                            if (oIntegrationCardManifest.type === 'List') {
                                aContentActions = (oIntegrationCardManifest.content && oIntegrationCardManifest.content.item && oIntegrationCardManifest.content.item.actions) || [];
                            } else if (oIntegrationCardManifest.type === "Table") {
                                aContentActions = (oIntegrationCardManifest.content && oIntegrationCardManifest.content.row && oIntegrationCardManifest.content.row.actions) || [];
                            } else {
                                aContentActions = oIntegrationCardManifest.content && oIntegrationCardManifest.content.actions || [];
                            }

                            var oHeaderAction = aHeaderActions[0] || {},
                                oContentAction = aContentActions[0] || {};

                            var bOldCardExtension = (oHeaderAction && oHeaderAction.parameters && typeof oHeaderAction.parameters === 'string' && oHeaderAction.parameters.indexOf("{= extension.formatters.addPropertyValueToAppState") > -1) ||
                                (oContentAction && oContentAction.parameters && typeof oContentAction.parameters === 'string' && oContentAction.parameters.indexOf("{= extension.formatters.addPropertyValueToAppState") > -1);

                            if (bOldCardExtension) {
                                var oCardSV = new SelectionVariant();
                                var oCardParams = oEvent.getParameter("card").getCombinedParameters();
                                oCardParams._relevantODataParameters.forEach(function (sParamName) {
                                    oParameters.ibnParams[sParamName] = oCardParams[sParamName];
                                });
                                oCardParams._relevantODataFilters.forEach(function (sFilterName) {
                                    var oTempSV = new SelectionVariant(oCardParams[sFilterName]);
                                    var aRanges = oTempSV.getSelectOption(sFilterName);
                                    if (aRanges && aRanges.length === 1 && aRanges[0].Sign === "I" && aRanges[0].Option === "EQ") {
                                        oParameters.ibnParams[sFilterName] = aRanges[0].Low;
                                    } else if (aRanges && aRanges.length > 0) {
                                        oCardSV.massAddSelectOption(sFilterName, aRanges);
                                    }
                                });
                                var oTempParam = JSON.parse(oParameters.ibnParams["sap-xapp-state-data"]);
                                oTempParam.selectionVariant = oCardSV.toJSONObject();
                                oParameters.ibnParams["sap-xapp-state-data"] = JSON.stringify(oTempParam);
                            }

                            sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (CrossApplicationNavigationService) {
                                CrossApplicationNavigationService.toExternal({
                                    target: oParameters.ibnTarget,
                                    params: oParameters.ibnParams
                                });
                            });
                        }
                    },
                    actions: [
                        {
                            type: "Custom",
                            text: sRefreshText,
                            icon: "sap-icon://refresh",
                            action: function (oCard, oButton) {
                                oCard.refreshData();
                            }
                        },
                        {
                            type: "Custom",
                            text: sViewFilteredByText,
                            icon: "sap-icon://filter",
                            action: function (oCard) {
                                this.navigateToPreview = oCard.getManifestEntry("sap.app").id;
                                this._showManageSectionsDialog(AppConstants.SECTIONS.INSIGHTS_CARDS);
                            }.bind(this),
                            visible: function (oCard) {
                                return new Promise(function (resolve) {
                                    try {
                                        var oCardParams = oCard.getManifestEntry("sap.card").configuration.parameters;
                                        var aRelevantFilters = oCardParams ? oCardParams._relevantODataFilters && oCardParams._relevantODataFilters.value : [];
                                        var bRelevantFilters = aRelevantFilters && aRelevantFilters.length;
                                        var aRelevantParams = oCardParams ? oCardParams._relevantODataParameters && oCardParams._relevantODataParameters.value : [];
                                        var bRelevantParams = aRelevantParams && aRelevantParams.length;
                                        var oCardDataSource = oCard.getManifestEntry("sap.app").dataSources;
                                        var oFilterService = oCardDataSource && oCardDataSource.filterService;
                                        var oDataSourceSettings = oFilterService && oFilterService.settings;
                                        // show ViewFilteredBy Option only if relevantFilters or relevantParameters are there and is OdataV2 version
                                        resolve(!!((bRelevantFilters || bRelevantParams) && (oDataSourceSettings && oDataSourceSettings.odataVersion === "2.0")));
                                    } catch (error) {
                                        resolve(false);
                                    }
                                });
                            }
                        },
                        {
                            type: "Custom",
                            text: sNavigateToParentText,
                            icon: "sap-icon://display-more",
                            visible: function (oCard) {
                                return this.oCardHelperServiceInstance.getParentAppDetails({ descriptorContent: oCard.getManifestEntry("/") }).then(function (oParentApp) {
                                    // If else To Be Removed once insights service codes are merged
                                    if (oParentApp.semanticObject && oParentApp.action) {
                                        return sap.ushell.Container.getServiceAsync("CrossApplicationNavigation")
                                            .then(function (crossApplicationNavigationService) {
                                                return crossApplicationNavigationService.isNavigationSupported([{
                                                    target: {
                                                        semanticObject: oParentApp.semanticObject,
                                                        action: oParentApp.action
                                                    }
                                                }]);
                                            })
                                            .then(function (aResponses) {
                                                return aResponses[0].supported || false;
                                            });
                                    }
                                    else {
                                        return true;
                                    }
                                });
                            }.bind(this),
                            action: function (oCard) {
                                this.oCardHelperServiceInstance.getParentAppDetails({ descriptorContent: oCard.getManifestEntry("/") }).then(function (oParentApp) {
                                    var sShellHash = oParentApp.semanticURL || oParentApp.semanticObject;   // || oParentApp.semanticObject To be removed once insights service codes are merged
                                    this.navigateToPage(sShellHash);
                                }.bind(this));
                            }.bind(this)
                        }
                    ]
                });

                //Set Host for all the card containers - both in collapsed, expanded and mobile views
                [
                    "insightsFragment--insightsCard",
                    "insightsFragment--insightsCardFC",
                    "insightsFragmentExpanded--insightsCard",
                    "insightsFragmentExpanded--insightsCardFC"
                ].forEach(function (sID) {
                    if (this.byId(sID)) {
                        this.byId(sID).setHost(runtimeHost);
                    }
                }.bind(this));

                var previewHost = new Host(sPreviewHostId, {
                    action: function (oEvent) {
                        oEvent.preventDefault();
                    }
                });
                this.getView().addDependent(previewHost);
            },

            setOverFlowVisible: function (oEvent) {
                var sType = oEvent.getSource().getManifestEntry("sap.card").type;
                var oOverFlowBox = oEvent.getSource().getParent().getItems()[1];
                oOverFlowBox.setVisible(sType === "Table" || sType === "List");
            },

            _checkAllSectionsVisibility: function () {
                var bIsPageEmpty = ["forMeToday", "myInterest", "myApps", "myInsights"].every(function (sID) {
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
                        if (bIsPageSection && !bAppsAvailable && !bIsNewsPagesVisible) {
                            oItem.visible = true;
                            oItem.blocked = true;
                        }
                        if (bIsToDoSection && !bToDoSupported) {
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
                    todoVisible: true,
                    newsFeedURL: "",
                    isRTAMode: false,
                    newsFeedVisibility: false,
                    newsUrlVisibility: false,
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
                    unGroupedFavApps: true,
                    sectionsOrder: [],
                    myInterestSectionsOrder: [],
                    allDynamicApps: [],
                    selectedApp: {},
                    editIntrestIconList: [],
                    expandedSection: {
                        expanded: false,
                        name: ""
                    },
                    news: {
                        bNewsAvailable: true,
                        error: false
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

            _initNewsInformation: function () {
                try {
                    var sUrl;
                    var bShowCustomNewsFeed;
                    var sCustomNewsFeedKey;
                    if (this._oAdaptationData) {
                        sUrl = this._oAdaptationData.newsFeedURL;
                        bShowCustomNewsFeed = this._oAdaptationData.showCustomNewsFeed;
                        sCustomNewsFeedKey = this._oAdaptationData.customNewsFeedKey;

                        this._oViewModel.setProperty("/newsFeedURL", sUrl);
                        this._oViewModel.setProperty("/newsFeedVisibility", this._oAdaptationData.isNewsFeedVisible);
                        this._oViewModel.setProperty("/newsFeed", {
                            showCustom: bShowCustomNewsFeed,
                            customFeedKey: sCustomNewsFeedKey,
                            customNewsFeedFileName: this._oAdaptationData.customNewsFeedFileName || ""
                        });
                    }
                    this.feedAdapterInstance.setNewsTile(this.byId("idNewsSlide"));
                    // if show custom feed flag is true show custom feed else show feed from url
                    if (bShowCustomNewsFeed && sCustomNewsFeedKey && this._oViewModel.getProperty("/newsFeedVisibility")) {
                        this.getPersonalizationProperty(AppConstants.PERSONALIZATION.FAVORITE_NEWS_FEED).then(function (oFavNewsFeed) {
                            this._oViewModel.setProperty("/favoriteNewsFeed", oFavNewsFeed);
                            this.feedAdapterInstance.setCustomNewsFeed(sCustomNewsFeedKey);
                        }.bind(this));
                    }
                    else {
                        this.feedAdapterInstance.setNewsUrl(sUrl);
                    }
                } catch (err) {
                    Log.error(err);
                }
            },

            _fetchElementProperties: function (oDOMRef, aProperties) {
                var oElement = {},
                    fnFetchDOMValue = function (oDomRef, sPropertyName) {
                        return parseFloat(window.getComputedStyle(oDomRef, null).getPropertyValue(sPropertyName));
                    };
                aProperties.forEach(function (sPropertyName) {
                    oElement[sPropertyName] = fnFetchDOMValue(oDOMRef, sPropertyName);
                });

                return oElement;
            },

            _refreshAllApps: function () {
                this._setDynamicApps();
                //if apps section is visible then refresh apps
                var oAppsSection = this.getRootView().byId("myApps");
                if (oAppsSection && oAppsSection.getVisible()) {
                    EventHub.emit("refreshApps", Date.now());
                }
            },

            _smartTileVisualizationFactory: function (aMyInsightApps) {
                var bIsSmartBusinessTilePresent = aMyInsightApps.some(function (oApp) {
                    return oApp.isSmartBusinessTile;
                }),
                    aPromises = [sap.ushell.Container.getServiceAsync("SpaceContent")];

                if (bIsSmartBusinessTilePresent) {
                    aPromises.push(sap.ui.getCore().loadLibrary("sap.cloudfnd.smartbusiness.lib.reusetiles", { async: true }));
                }

                return Promise.all(aPromises).then(function (aResults) {
                    var oSpaceContentService = aResults[0],
                        oMyInsightAppsContents = {},
                        oLoadPromise = aMyInsightApps.reduce(function (oPromise, oDynApp) {
                            return oPromise.then(function () {
                                return oSpaceContentService
                                    .instantiateVisualization(oDynApp.visualization)
                                    .then(function (oVisualization) {
                                        oVisualization.setActive(true);
                                        this.adjustInsightTilesAlign(oVisualization);
                                        if (oDynApp.visualization.isBookmark) {
                                            oMyInsightAppsContents[oDynApp.visualization.targetURL] = oVisualization;
                                        } else {
                                            oMyInsightAppsContents[oDynApp.visualization.vizId] = oVisualization;
                                        }
                                    }.bind(this));
                            }.bind(this));
                        }.bind(this), Promise.resolve());

                    return oLoadPromise.then(function () {
                        return oMyInsightAppsContents;
                    });
                }.bind(this));
            },

            _adjustInsightsTileCardLayout: function (aDynamicApps) {
                var iDynamicAppLength = aDynamicApps.length,
                    bInsightsLoaded = this._oViewModel.getProperty(AppConstants.MyInsightStatus) === "Loaded",
                    insightHeaderVisibility = "/insightHeaderVisibility";

                if (bInsightsLoaded && iDynamicAppLength > 0) {
                    this._oViewModel.setProperty(insightHeaderVisibility, true);
                } else {
                    this._oViewModel.setProperty(insightHeaderVisibility, false);
                }
                this.cardProvider.onViewUpdate(this.oView.isActive());
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

            _calculateDynamicTileCount: function () {
                return this.oDynAppsLoad.then(function () {
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

            adjustInsightTilesAlign: function (oApp) {
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
                                .then(function (oMyInsightAppsContents) {
                                    this._clearInsightsTileCache();
                                    this.orgMyInsightAppsContents = Object.assign({}, oMyInsightAppsContents);
                                    var aDynamicApps = Object.values(this.orgMyInsightAppsContents);
                                    aDynAppContainers.forEach(function (oDynAppContainer) {
                                        oDynAppContainer.removeAllApps();
                                        if (bIsMobileDevice) {
                                            // Mobile View
                                            aDynamicApps.forEach(function (oApp) {
                                                oDynAppContainer.addApp(oApp);
                                            });
                                        } else {
                                            // Desktop and Tablet View
                                            this._calculateDynamicTileCount()
                                                .then(function (iCount) {
                                                    aDynamicApps = this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS + "/expanded")
                                                        || this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS_TILES + "/expanded")
                                                        ? aDynamicApps
                                                        : aDynamicApps.slice(0, iCount);

                                                    aDynamicApps.forEach(function (oApp) {
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
                    .finally(function () {
                        this.markPerformance(AppConstants.SECTIONS_ID.INSIGHTS);
                    }.bind(this));
            },

            _handleExpandTiles: function (iDynamicAppLength) {
                if (this._expandParam && this._expandParam === AppConstants.SECTIONS.INSIGHTS_TILES) {
                    if (iDynamicAppLength) {
                        this.expandSection({ isSectionExpanded: true, expandType: this._expandParam, isHashChangeTrigger: true });
                        this._expandParam = null;
                    } else {
                        this.getHashChanger().replaceHash(AppConstants.MYHOME_URL_HASH);
                    }
                }
            },

            _expandDynamicAppsContainer: function (bIsSectionExpanded) {
                return this.oDynAppsLoad && this.oDynAppsLoad.then(function () {
                    var oDynAppContainer = this.getView().byId("insightsFragmentExpanded--dynAppsFlexContainer"),
                        aContents = this.orgMyInsightAppsContents ? Object.values(this.orgMyInsightAppsContents) : [];

                    oDynAppContainer.removeAllApps();

                    aContents.forEach(function (oContent) {
                        oDynAppContainer.addItem(oContent);
                    });

                    if (!bIsSectionExpanded) {
                        this._adjustInsightsLayout();
                    }
                }.bind(this));
            },

            _setAllDynamicApps: function (aMyInsightApps) {
                return this.appManagerInstance.fetchFavApps(this._bAppLoaded, true)
                    .then(function (aFavApps) {
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
                            else if (aSupportedDisplayFormats.length > 1
                                && aSupportedDisplayFormats.indexOf(AppConstants.DisplayFormat.Standard) > -1
                                && aSupportedDisplayFormats.indexOf(AppConstants.DisplayFormat.StandardWide) > -1
                            ) {
                                oInsightsApp.isConvertEnabled = true;
                            }
                        });
                        aFavEnabledApps = this.appManagerInstance.filterDuplicateApps(aFavEnabledApps, false);
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

            addSuggTiles: function () {
                this._suggestedTileDialog.setBusy(true);
                var oDialogProps = this.getDialogProperties();
                var aAllMoveElements = this.getModel("view").getProperty(oDialogProps.allApps);
                var aSelectedApps = sap.ui.core.Element.getElementById(oDialogProps.dialogId).getSelectedItems();
                return this.appManagerInstance.getSections().then(function (aSections) {
                    return aSelectedApps.reduce(function (pApp, oApp) {
                        return pApp.then(function () {
                            var index = oApp.getBindingContextPath().split("/")[2];
                            var oSelectedApp = aAllMoveElements[index];
                            var iMyInsightSectionIndex = aSections.findIndex(function (oSection) {
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
                                if (oSelectedApp.visualization.supportedDisplayFormats.includes("standard")) {
                                    oSelectedApp.visualization.displayFormatHint = "standard";
                                } else if (oSelectedApp.visualization.supportedDisplayFormats.includes("standardWide")) {
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
                            return checkBookMarkPromise.then(function () {
                                var aDynAppContainers = this._getDynamicTileContainer();
                                return this._smartTileVisualizationFactory([oSelectedApp])
                                    .then(function (oMyInsightAppsContents) {
                                        this.orgMyInsightAppsContents[oSelectedApp.visualization.vizId] = oMyInsightAppsContents[oSelectedApp.visualization.vizId];
                                        aDynAppContainers.forEach(function (oDynAppContainer) {
                                            oDynAppContainer.addApp(oMyInsightAppsContents[oSelectedApp.visualization.vizId]);
                                        });
                                    }.bind(this));
                            }.bind(this));
                        }.bind(this));
                    }.bind(this), Promise.resolve()).
                        then(function () {
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
                if (this._suggestedTileDialog) {
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
                //this._arrangeMyInterestSectionsList();

                //Update the Personalisation model
                if (bUpdatePersonalisation) {
                    this.getPersonalization().then(function (oPersonalization) {
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
                return this.getPersonalization().then(function (oPersonalization) {
                    var oPersModel = oPersonalization.oPersModel;
                    var oPersonalizer = oPersonalization.oPersonalizer;
                    var aFavoritePages = oPersModel ? oPersModel.getProperty("/favouritePages") : undefined;
                    return this.appManagerInstance.fetchAllAvailablePages(true).then(function (aAvailablePages) {
                        //Set first 8 available pages are favorite if no favorite page data is present
                        if (!aFavoritePages) {
                            this._setDefaultPages(aAvailablePages);
                        }
                        else {
                            var aPages = [], oExistingPage;
                            aFavoritePages.forEach(function (oPage) {
                                oExistingPage = aAvailablePages.find(function (oAvailablePage) {
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
                    .finally(function () {
                        this.markPerformance(AppConstants.SECTIONS_ID.PAGES);
                    }.bind(this));
            },

            /**
             * Save Favorite Pages in the receiving order
             *
             * @param {string []} aPageIDs array of Page IDs to be saved
             * @returns promise for chaining
             */
            saveFavoritePages: function (aPageIDs) {
                return this.appManagerInstance.fetchAllAvailablePages(true)
                    .then(function (aAvailablePages) {
                        var aFavoritePages = aAvailablePages.reduce(function (aFavPages, oPage) {
                            if (aPageIDs.includes(oPage.pageId)) {
                                aFavPages[aPageIDs.indexOf(oPage.pageId)] = oPage;
                            } else if (oPage.BGColor) {
                                //Clear existing color, if any
                                this.colorUtils.removeColor(oPage.BGColor);
                                delete oPage.BGColor;
                            }
                            return aFavPages;
                        }.bind(this), []);

                        return this.getPersonalization()
                            .then(function (oPersonalization) {
                                var oPersModel = oPersonalization.oPersModel;
                                oPersModel.setProperty("/favouritePages", aFavoritePages);
                                return this.setFavoritePages(true);
                            }.bind(this))
                            .then(function () {
                                this.oKeyUserPersonalization.applyPagePersonalizations();
                                EventHub.emit("spacePageColorChanged", aFavoritePages);
                            }.bind(this));
                    }.bind(this));
            },

            applyPageTileStyleOnWindowFocus: function () {
                //Added the extra condition of bPageSectionVisibleCheck as a Fix for BCP Internal Incident: 2270166900
                var bPageSectionVisibleCheck = this.byId('myInterest') && this.byId('myInterest').getVisible() && this._oViewModel.getProperty("/pages/tiles/length");
                if (!this.pageTilesStylesApplied && bPageSectionVisibleCheck) {
                    this._adjustLayoutStyles();
                }
            },

            onBeforeRendering: function () {
                //Apply Personalization Changes to Favorite Pages
                this.byId("pagesBox").getBinding("items").attachChange(function () {
                    this.oKeyUserPersonalization.applyPagePersonalizations();
                }, this);

                //reset expand parameter after navigating back from appFinder
                this._expandParam = null;

                // Open Edit Insights Dialog if navigated back from AppFinder
                if (this.openMyInsightsDialog) {
                    this.editInsightclearFilter();
                    this._showManageSectionsDialog(this._oSettingsView.getModel("settings").getProperty("/myHomeSettingsSelectedItem"));
                    this.openMyInsightsDialog = false;
                }

                this._refreshDataModel();
            },

            /**
             * Checks the visible tiles in expanded mode and if no tiles present navigate to collapsed mode
             */
            checkExpandedTiles: function () {
                var iTilesCount = this._oViewModel.getProperty("/dynamicApps/length");
                var bIsTilesExpanded = this._oViewModel.getProperty("/sections/INSIGHTS_TILES/expanded");
                if (iTilesCount === 0 && bIsTilesExpanded) {
                    this.getHashChanger().replaceHash(AppConstants.MYHOME_URL_HASH);
                }
            },

            _isValidExpandParam: function (sExpandParam) {
                if (sExpandParam) {
                    if (sExpandParam === AppConstants.SECTION_PARAMS.TODOS) {
                        return this.byId("forMeToday").getProperty("visible");
                    } else if (sExpandParam === AppConstants.SECTION_PARAMS.INSIGHTS_TILES) {
                        return this.byId("myInsights").getProperty("visible");
                    } else if (sExpandParam === AppConstants.SECTION_PARAMS.INSIGHTS_CARDS) {
                        return this.byId("myInsights").getProperty("visible");
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            },

            _hashChangeHandler: function () {
                var aParams = this.oUrlParsing.parseShellHash(this.getHashChanger().getHash()).params["expanded"];
                var sExpandParam = aParams ? aParams[0] : null;
                var sExpandedSection = this._oViewModel.getProperty("/expandedSection/name");
                var isSectionExpanded = this._oViewModel.getProperty("/expandedSection/expanded");
                if (!this._oViewModel.getProperty("/hashChanged")) {
                    if (sExpandParam && this._isValidExpandParam(sExpandParam)) {
                        // this is when expand happens by url from one expanded section to another expanded section
                        if (!isSectionExpanded || sExpandedSection !== this._getSectionFromHash(sExpandParam)) {
                            this.expandSection({ isSectionExpanded: true, expandType: this._getSectionFromHash(sExpandParam), isHashChangeTrigger: true });
                        }
                    } else if (!this._isValidExpandParam(sExpandParam)) {
                        this.getHashChanger().replaceHash(AppConstants.MYHOME_URL_HASH);
                    } else if (sExpandedSection) {
                        if (!this._oViewModel.getProperty("/sections/" + sExpandedSection + "/expanded")) {
                            sExpandedSection = null;
                        }
                        this.expandSection({ isSectionExpanded: false, expandType: sExpandedSection, isHashChangeTrigger: true });
                    }
                }
                this._oViewModel.setProperty("/hashChanged", false);
            },

            _getSectionFromHash: function (sUrlHash) {
                var sSectionId = Object.keys(AppConstants.SECTION_PARAMS).find(function (key) {
                    if (AppConstants.SECTION_PARAMS[key] === sUrlHash) {
                        return key;
                    }
                });
                return sSectionId;
            },

            _closeOpenDialogs: function () {
                if (this.openMyInsightsDialog) {
                    this._myhomeSettingsDialog.close();
                }
            },

            _createUserActionButtons: function () {
                var oRenderer = sap.ushell.Container.getRenderer("fiori2"),
                    oRouter = oRenderer.getRouter(),
                    sCurrentHash = oRouter.getHashChanger().getHash(),
                    oRoute = oRenderer.getRouter().getRoute("home"),
                    bIsHomeRoute = oRoute === oRouter.getRouteByHash(sCurrentHash),
                    sEditModeText = this.i18Bundle.getText("editCurrentPage"),
                    sEditButtonId = this.createId("s4MyHomeEditBtn"),
                    oEditModeButton = {
                        controlType: "sap.ushell.ui.launchpad.ActionItem",
                        oControlProperties: {
                            id: sEditButtonId,
                            icon: "sap-icon://edit",
                            text: sEditModeText,
                            tooltip: sEditModeText,
                            press: this._showManageSectionsDialog.bind(this, AppConstants.SECTIONS.LAYOUT)
                        },
                        bIsVisible: bIsHomeRoute,
                        bCurrentState: false,
                        aStates: ["home"]
                    };
                Log.info("S4MYHOMEAPP: UserAction was added");
                oRenderer.addUserAction(oEditModeButton);

                // Add Adapt UI Action if Key User
                this.oKeyUserPersonalization.addAdaptUIBtn(oRenderer);

                oRoute.attachMatched(toggleEditButton.bind(this, true), this);
                oRoute.attachEvent("switched", toggleEditButton.bind(this, false), this);
                this.oEventBus.subscribe("sap.ushell", "navigated", this._onShellNavigated, this);
            },

            /**
             * Handler for Shell Navigation event.
             * Deactivates Insights Tiles when Shell is navigated to a different application.
             */
            _onShellNavigated: function () {
                var sHash = window.hasher.getHash();
                if (!utils.isFlpHomeIntent(sHash)) {
                    this._activateInsightsTiles(false);
                }
            },

            /**
             * Clears the Insights Tile cache.
             */
            _clearInsightsTileCache: function () {
                //destroy all cached viz instances
                Object.values(this.orgMyInsightAppsContents || {}).forEach(function (oVizInstance) {
                    if (oVizInstance.destroy) {
                        oVizInstance.destroy();
                    }
                });

                this.orgMyInsightAppsContents = null;
            },

            onAfterRendering: function () {
                EventHub.emit("trackHashChange");                   //Fix for FESR related issues, to create 'oStatisticalRecord' from ShellAnalytics.js
                EventHub.emit("CustomHomeRendered", true);          //Fix for FESR related issues, to map the Home Page to "F6252"
                this._bAppLoaded = true;
                this.insightsLoaded = false;
                this._observeInsightsSection();
                this.attachResizeHandler(this._adjustLayoutStyles.bind(this));
                this.attachKeyboardHandler("pagesBox", this.DNDConfig._onPageDrop.bind(this.DNDConfig));
                this.attachKeyboardHandler("insightsFragment--dynAppsFlexContainer");

                var aParams = this.oUrlParsing.parseShellHash(this.getHashChanger().getHash()).params["expanded"];
                var sExpandParam = aParams ? aParams[0] : null;
                if (!this._isValidExpandParam(sExpandParam)) {
                    this.getHashChanger().replaceHash(AppConstants.MYHOME_URL_HASH);
                } else if (sExpandParam === AppConstants.SECTION_PARAMS.TODOS) {
                    this.expandSection({ isSectionExpanded: true, expandType: this._getSectionFromHash(sExpandParam), isHashChangeTrigger: true });
                } else if (sExpandParam === AppConstants.SECTION_PARAMS.INSIGHTS_CARDS) {
                    this._expandParam = this._getSectionFromHash(sExpandParam);
                    this._initMyInsightCards();
                } else {
                    this._expandParam = this._getSectionFromHash(sExpandParam);
                }
            },

            editMyHomeSettings: function () {
                this._showManageSectionsDialog(AppConstants.SECTIONS.LAYOUT);
            },

            navigateToInsightTilesAppFinder: function () {
                this.navigateToAppFinder({
                    pageID: encodeURIComponent(AppConstants.MYHOME_PAGE_ID),
                    sectionID: encodeURIComponent(AppConstants.MYINSIGHT_SECTION_ID)
                });
            },

            _showManageSectionsDialog: function (sSelectedKey) {
                if (sSelectedKey === AppConstants.SECTIONS.TODOS || sSelectedKey === AppConstants.SECTIONS.APPS ||
                    (sSelectedKey === "NEWS_FEED" && !this._oViewModel.getProperty("/newsFeed/showCustom"))) {
                    sSelectedKey = AppConstants.SECTIONS.LAYOUT;
                }
                this._arrangeManageSectionsTable();
                this.getRootView().setBusy(true);
                if (!this._myhomeSettingsDialog) {
                    this.loadXMLView({
                        id: "myhomeSettingsView",
                        viewName: "ux.eng.s4producthomes1.view.myhomeSettings"
                    }).then(function (oSettingsView) {
                        this._oSettingsView = oSettingsView;
                        this._myhomeSettingsDialog = oSettingsView.byId("myhomeSettingsDialog");
                        this.getView().addDependent(oSettingsView);

                        if (this.navigateToPreview && sSelectedKey === AppConstants.SECTIONS.INSIGHTS_CARDS) {
                            this._oSettingsView.getModel("view").setProperty("/navigateToPreview", this.navigateToPreview);
                            this.navigateToPreview = null;
                        }
                        this._oSettingsView.getModel("settings").setProperty("/myHomeSettingsSelectedItem", sSelectedKey || AppConstants.SECTIONS.LAYOUT);
                        this._myhomeSettingsDialog.open();
                    }.bind(this));
                } else {
                    this._oSettingsView.getModel("settings").setProperty("/myHomeSettingsSelectedItem", sSelectedKey || AppConstants.SECTIONS.LAYOUT);
                    if (!this._oViewModel.getProperty("/myInsights/disabled") && this.insightsLoaded) {
                        if (this.navigateToPreview && sSelectedKey === AppConstants.SECTIONS.INSIGHTS_CARDS) {
                            this._oSettingsView.getModel("view").setProperty("/navigateToPreview", this.navigateToPreview);
                            this.navigateToPreview = null;
                        }
                        this._myhomeSettingsDialog.open();
                    } else {
                        this._myhomeSettingsDialog.open();
                    }
                }
            },

            onPageTilePress: function (pageId, spaceId) {
                if (this._oViewModel.getProperty("/pages/status") !== "Loading") {
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
                Object.keys(oCustomStyles).forEach(function (sStyleKey) {
                    this._oViewModel.setProperty(sStyleKey, oCustomStyles[sStyleKey]);
                }.bind(this));
            },

            _calculateInsightsCardCount: function () {
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

            _initMyInsightCards: function () {
                this._oViewModel.setProperty(AppConstants.MyInsightStatus, "Loading");
                sap.ui.require(["sap/insights/utils/AppConstants", "sap/insights/CardHelper"], function (CardAppConstants,InsightsCardHelper) {
                    CardAppConstants.CARD_READ_URL = AppConstants.CARD_READ_URL;
                    InsightsCardHelper.getServiceAsync(this.getOwnerComponent()).then(
                        function (oCardHelperServiceInstance) {
                            this.oCardHelperServiceInstance = oCardHelperServiceInstance;
                            return oCardHelperServiceInstance._getUserVisibleCardModel().then(function (oDataModel) {
                                this.getView().setModel(oDataModel, "insights");
                            }.bind(this));
                        }.bind(this)
                    ).then(
                        function () {
                            var oInsightsModel = this.getView().getModel("insights");
                            var aManifest = oInsightsModel.getProperty("/cards");
                            this._oViewModel.setProperty("/myInsights/disabled", false);
                            if (aManifest.length) {
                                this._oViewModel.setProperty(AppConstants.MyInsightStatus, "Loaded");
                                if (this._expandParam && this._expandParam === AppConstants.SECTIONS.INSIGHTS_CARDS) {
                                    this.expandSection({ isSectionExpanded: true, expandType: this._expandParam, isHashChangeTrigger: true });
                                    this._expandParam = null;
                                }
                            } else {
                                this._oViewModel.setProperty(AppConstants.MyInsightStatus, "NoCard");
                                this.getHashChanger().replaceHash(AppConstants.MYHOME_URL_HASH);
                            }
                            //Set Visible Insights Cards
                            var iVisibleCardCount = this._calculateInsightsCardCount(),
                                aVisibleCards = this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS + "/expanded")
                                    || this._oViewModel.getProperty("/sections/" + AppConstants.SECTIONS.INSIGHTS_CARDS + "/expanded")
                                    ? aManifest
                                    : aManifest.slice(0, iVisibleCardCount);
                            this._oViewModel.setProperty("/myInsights/flexCards", aVisibleCards);
                            this._oViewModel.setProperty("/myInsights/viewAllVisible", iVisibleCardCount < aManifest.length);
                        }.bind(this)
                    ).catch(
                        function () {
                            this._oViewModel.setProperty(AppConstants.MyInsightStatus, "NoCard");
                            this._oViewModel.setProperty("/myInsights/disabled", true);
                        }.bind(this)
                    ).finally(
                        function () {
                            this._oViewModel.setProperty("/myInsights/editVisible", true);
                            this._oViewModel.setProperty("/insightsSectionLoaded", true);
                            this.insightsLoaded = true;
                            this.markPerformance(AppConstants.SECTIONS_ID.INSIGHTS);
                            this._adjustInsightsLayout();
                            // Added for resolving issue loader not closing because of exception in Cards.js
                            this.byId("myInsights").rerender();
                        }.bind(this));
                }.bind(this));
            },

            _setPagesTilesStyles: function (oPageWrapperConfig) {
                var gap = 1,
                    bIsNewsTileVisible = this._isNewsTileVisible(),
                    sDeviceType = DeviceType.getDeviceType(),
                    pagesPerRow,
                    tileWidth,
                    hBoxWidth;
                if (!bIsNewsTileVisible) {
                    var spaceRequired = (oPageWrapperConfig.iFavPagesCount * minTileSize) + ((oPageWrapperConfig.iFavPagesCount - 1) * gap);
                    if (spaceRequired <= oPageWrapperConfig.wrapperWidth) {
                        pagesPerRow = oPageWrapperConfig.iFavPagesCount;
                        tileWidth = (oPageWrapperConfig.wrapperWidth - ((pagesPerRow - 1) * gap)) / pagesPerRow;
                        tileWidth = tileWidth <= maxTileSize ? tileWidth : maxTileSize;
                        this._oViewModel.setProperty("/hBoxWidth", oPageWrapperConfig.wrapperWidth + "rem");
                        this._oViewModel.setProperty("/pagesTileWidth", tileWidth + "rem");
                        this._oViewModel.setProperty("/VerticalLayoutWidth", (oPageWrapperConfig.wrapperWidth) + "rem");
                        return true;
                    }
                }
                if (sDeviceType === AppConstants.DEVICE_TYPES.Desktop) {
                    if (bIsNewsTileVisible) {
                        pagesPerRow = Math.ceil(oPageWrapperConfig.iFavPagesCount >= 8 ? 4 : oPageWrapperConfig.iFavPagesCount / 2);
                    } else {
                        pagesPerRow = oPageWrapperConfig.iFavPagesCount <= 4 ? oPageWrapperConfig.iFavPagesCount : Math.ceil(oPageWrapperConfig.iFavPagesCount >= 8 ? 4 : oPageWrapperConfig.iFavPagesCount / 2);
                    }
                }
                else if (sDeviceType === AppConstants.DEVICE_TYPES.Tablet) {
                    pagesPerRow = oPageWrapperConfig.iFavPagesCount <= 4 ? oPageWrapperConfig.iFavPagesCount : Math.ceil(oPageWrapperConfig.iFavPagesCount >= 8 ? 4 : oPageWrapperConfig.iFavPagesCount / 2);
                }

                tileWidth = (oPageWrapperConfig.wrapperWidth - ((pagesPerRow - 1) * gap)) / pagesPerRow;
                tileWidth = tileWidth <= maxTileSize ? tileWidth : maxTileSize;

                hBoxWidth = (pagesPerRow * tileWidth) + (pagesPerRow * gap);
                this._oViewModel.setProperty("/hBoxWidth", hBoxWidth + "rem");
                this._oViewModel.setProperty("/pagesTileWidth", tileWidth + "rem");
                this._oViewModel.setProperty("/VerticalLayoutWidth", (oPageWrapperConfig.wrapperWidth) + "rem");
            },

            _setPagesContainerWidth: function (iFavPagesCount) {
                try {
                    var bIsNewsTileVisible = this._isNewsTileVisible(),
                        sDeviceType = DeviceType.getDeviceType(),
                        domRef = bIsNewsTileVisible ? this.byId("pagesContent").getDomRef() : this.byId("flexBoxWrapper").getDomRef();

                    if (!domRef) {
                        return false;
                    }

                    this.pageTilesStylesApplied = true;
                    window.removeEventListener("focus", this.applyPageTileStyleOnWindowFocus, true);

                    if (sDeviceType === AppConstants.DEVICE_TYPES.Mobile) {
                        this._oViewModel.setProperty("/hBoxWidth", "100%");
                        this._oViewModel.setProperty("/pagesTileWidth", "auto");
                        return true;
                    }

                    var wrapperWidth = (domRef.clientWidth) / 16,   // Divide by 16 to convert to rem,
                        flexWrapperWidth = this.byId("flexBoxWrapper").getDomRef().clientWidth;

                    if (bIsNewsTileVisible && flexWrapperWidth >= 1520) {  // As newsTile will grow till 40.75 rem, calculating the remaining width
                        wrapperWidth = (flexWrapperWidth / 16) - 40.75;
                    }
                    if (this._oViewModel.getProperty("/pages/status") === "Loading") {
                        var hBoxLoadingWidth = bIsNewsTileVisible ? "100%" : domRef.clientWidth + "px";
                        this._oViewModel.setProperty("/hBoxWidth", hBoxLoadingWidth);
                        this._oViewModel.setProperty("/pagesTileWidth", "100%");
                        return true;
                    }
                    if (iFavPagesCount > 0) {
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

            _isNewsTileVisible: function () {
                return (this.getView().byId("idNewsSlide") && this.getView().byId("idNewsSlide").getProperty("visible"))
                    || (this._oViewModel.getProperty("/newsFeed/showCustom") && this._oViewModel.getProperty("/news/error") && this._oViewModel.getProperty("/newsFeedVisibility"));
            },

            _refreshDataModel: function () {
                this._refreshAllApps();
                this._arrangeManageSectionsTable();
            },

            _applyIconsForFavPages: function () {
                this._oViewModel.getProperty("/pages/tiles")
                    .filter(function (oPage) {
                        return !oPage.isIconLoaded;
                    })
                    .map(function (oPage) {
                        return this.appManagerInstance.getIconForPage(oPage);
                    }.bind(this));
            },

            openPagesEditDialog: function () {
                this._showManageSectionsDialog(AppConstants.SECTIONS.PAGES);
            },

            openMyInsightsEditDialogTileOrCard: function (oEvent) {
                var bIsInsightsDisabled = this._oViewModel.getProperty("/myInsights/disabled"),
                    iInsightsCardCount = this.getView().getModel("insights") && this.getView().getModel("insights").getProperty("/cardCount") || 0,
                    bOpenInsightsTiles = bIsInsightsDisabled || (!bIsInsightsDisabled && !iInsightsCardCount),
                    sSelectedKey = bOpenInsightsTiles ? AppConstants.SECTIONS.INSIGHTS_TILES : AppConstants.SECTIONS.INSIGHTS_CARDS;

                this._oViewModel.setProperty("/3M", "3M"); //setting up this label for display purpose only
                this._oViewModel.setProperty("/23M", "23M"); //setting up this label for display purpose only
                this._showManageSectionsDialog(sSelectedKey);
            },

            editInsightclearFilter: function () {
                sap.ui.getCore().byId("myhomeSettingsView--editInsightTiles--editInsightsSearch").setValue("");
                sap.ui.getCore().byId("myhomeSettingsView--editInsightTiles--idEditInsightsDynAppList").getBinding("items").filter([], "Application");
            },

            _getDynamicTileContainer: function () {
                var bIsMobileDevice = this._oViewModel.getProperty("/isPhoneScreen"),
                    aControls = bIsMobileDevice
                        ? [this.getView().byId("insightsFragment--dynAppHeaderContainer")]
                        : [
                            this.getView().byId("insightsFragment--dynAppsFlexContainer"),
                            this.getView().byId("insightsFragmentExpanded--dynAppsFlexContainer")
                        ];

                // Create common helper functions
                aControls.forEach(function (oControl) {
                    oControl.addApp = oControl.addContent ? oControl.addContent : oControl.addItem;
                    oControl.removeApp = oControl.removeContent ? oControl.removeContent : oControl.removeItem;
                    oControl.removeAllApps = oControl.removeAllContent ? oControl.removeAllContent : oControl.removeAllItems;
                    oControl.getApps = oControl.getContent ? oControl.getContent : oControl.getItems;
                });

                return aControls;
            },

            _appendThemeVariables: function () {
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
                    fnAddVars = function (params) {
                        if (params) {
                            Object.keys(params).forEach(function (sParam) {
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
             * Returns UI Adaptation Information
             *
             * @returns {object} UI Adaptation information
             */
            getUIAdaptationData: function () {
                return this._oAdaptationData || {};
            },

            /**
             * Exit lifecycle method
             */
            onExit: function () {
                this.oEventBus.unsubscribe("sap.ushell", "navigated", this._onShellNavigated, this);
            }
        });
    });
