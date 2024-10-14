
sap.ui.define(
    [
        "sap/ui/base/Object",
        "sap/base/Log",
        "./AppConstants",
        "./PagesIconsConstants",
        "./DataFormatUtils",
        "sap/ushell/Config",
        "sap/ushell/utils/WindowUtils"
    ],
    function (BaseObject, Log, AppConstants, PagesIcons, DataFormatUtils, Config, WindowUtils) {
        "use strict";

        var isSmartBusinessTile = function(oVisualization) {
            return oVisualization.vizType.startsWith("X-SAP-UI2-CHIP:SSB");
        };

        var  InstanceProviderClass =  BaseObject.extend("shellpoc.utils.AppManager.Implementation", {

            /**
             * Returns all apps inside pages passed as parameter
             *
             * @param {object} mParams - map containing supported options
             * @param {string[]} mParams.pages - pages from where apps should be fetched
             * @param {boolean} mParams.fetchDistinctPages - when true, the distinct apps are returned
             * @param {boolean} mParams.reload - when true, reloads all apps
             * @returns {Promise} - returns a promise which resolves with all the apps inside the pages
             */
            getAllFavPageApps: function (mParams) {
                if (mParams && mParams.pages) {
                    this.aFavPageVisualizations = this.aFavPageVisualizations || [];
                    //Check to ensure that missing visualization data is loaded, if any
                    var aLoadedPages = this.aFavPageVisualizations.reduce(function(aPageIDs, oVisualization) {
                            if (!aPageIDs.includes(oVisualization.pageId)) {
                                aPageIDs.push(oVisualization.pageId);
                            }
                            return aPageIDs;
                        }, []),
                        bLoadMissingApps = aLoadedPages.filter(function(oPage) {
                            return !mParams.pages.includes(oPage.pageId);
                        }).length > 0 || aLoadedPages.length === 0;

                    if (!mParams.reload && !bLoadMissingApps) {
                        return Promise.resolve(this.aFavPageVisualizations);
                    } else {
                        return this.loadAllPageVisualizations(mParams);
                    }
                } else {
                    return Promise.resolve([]);
                }
            },

            /**
             * Loads all apps inside pages passed as parameter
             *
             * @param {object} mParams - map containing supported options
             * @param {string[]} mParams.pages - pages from where apps should be fetched
             * @param {boolean} mParams.fetchDistinctPages - when true, the distinct apps are returned
             * @returns {Promise} - returns a promise which resolves with all the apps inside the pages
             */
            loadAllPageVisualizations: function(mParams) {
                if (mParams && Array.isArray(mParams.pages)) {
                    var aFavPageVisualizations = [];
                    return this._loadPages(mParams.pages.map(function (oPage) { return oPage.pageId; }))
                        .then(function(oPageData) {
                            Object.values(oPageData).forEach(function(oPage) {
                                (oPage.sections || []).forEach(function(oSection) {
                                    oSection.visualizations.forEach(function(oVisualization) {
                                        var oVizConfig = oVisualization.vizConfig["sap.app"] || { title: "?" },
                                            bIsAppInArray = false,
                                            oApp = {
                                                title: oVisualization.title || this._getAppTitleSubTitle(oVizConfig, oVisualization).title,
                                                subtitle: oVisualization.subtitle || this._getAppTitleSubTitle(oVizConfig, oVisualization).subTitle,
                                                oldAppId: this._getAppId(
                                                    oVisualization.vizConfig["sap.flp"]
                                                ),
                                                appId: oVisualization.targetURL,  // Using targetURL as unique identifier as in certian scenario vizConfig can be empty.
                                                pageId: oPage.id,
                                                icon: oVisualization.icon,
                                                vizId: oVisualization.vizId,
                                                BGColor: mParams.pages.find(function(oRequestedPage) { return oRequestedPage.pageId === oPage.id; }).BGColor || AppConstants.DEFAULT_BG_COLOR().key,
                                                visualization: oVisualization,
                                                isSmartBusinessTile: isSmartBusinessTile(oVisualization)
                                            };

                                        if (oVisualization.indicatorDataSource) {
                                            oApp.isCount = true;
                                        }

                                        if (mParams && mParams.fetchDistinctPages) {
                                            // If the app is already in the array, don't add it again
                                            bIsAppInArray = aFavPageVisualizations.some(function(oVizApp) {
                                                return oVizApp.appId === oApp.appId;
                                            });
                                        }

                                        if (!bIsAppInArray) {
                                            aFavPageVisualizations.push(oApp);
                                        }
                                    }.bind(this));
                                }.bind(this));
                            }.bind(this));

                            this.aFavPageVisualizations = aFavPageVisualizations;
                            return aFavPageVisualizations;
                        }.bind(this))
                        .catch(function(oError) {
                            Log.error(oError);
                        });
                } else {
                    return Promise.resolve([]);
                }
            },

            /**
             * Returns page load promise from the request queue if it exists, adds it to the queue if it doesn't
             *
             * @param {string} sPageId - page id
             * @param {boolean} bForceRefresh - force reload page
             * @returns {Promise} - returns a promise which resolves with the requested page data
             */
            _fetchRequestFromQueue: function(sPageId, bForceRefresh) {
                return sap.ushell.Container.getServiceAsync("SpaceContent")
                    .then(function(oSpaceContentService) {
                        var oPageLoadPromise;
                        this.aRequestQueue = this.aRequestQueue || [];

                        //Check if request already exists in the queue, if not add it
                        var oRequestedPage = this.aRequestQueue.find(function(oRequest) { return oRequest.pageId === sPageId; });
                        if (!oRequestedPage || bForceRefresh === true) {
                            oPageLoadPromise = oSpaceContentService.getPage(sPageId);
                            if (oRequestedPage) {
                                oRequestedPage.pageLoadPromise = oPageLoadPromise;
                            } else {
                                this.aRequestQueue.push({
                                    pageId: sPageId,
                                    pageLoadPromise: oPageLoadPromise
                                });
                            }
                        } else {
                            oPageLoadPromise = oRequestedPage.pageLoadPromise;
                        }

                        return oPageLoadPromise;
                    }.bind(this));
            },

            /**
             * Batched loading of multiple paeges at once.
             *
             * @param {string[]} aPageIDs - array of pages ids to be loaded
             * @returns {Promise} resolves after loading all pages
             */
            _loadPages: function (aPageIDs) {
                return sap.ushell.Container.getServiceAsync("SpaceContent")
                    .then(function (spaceContentService) {
                        return spaceContentService.getPages(aPageIDs);
                    });
            },

            /**
             * Returns all the sections that are available in the MyHome page
             *
             * @param {boolean} bForceRefresh - force reload page
             * @returns {Promise} - resolves to return all sections available in MyHome page
             */
            getSections: function (bForceRefresh) {
                return this._fetchRequestFromQueue(AppConstants.MYHOME_PAGE_ID, bForceRefresh)
                .then(function (oPage) {
                    //Ensure that 'Recently added apps' is at the top
                    var aSections = oPage && oPage.sections || [],
                        iRecentAppSectionIndex = aSections.findIndex(function (oSection) { return oSection.default; });

                    if (iRecentAppSectionIndex > 0) {
                        if (!this._oMoveAppsPromise) {
                            this._oMoveAppsPromise = this.moveSection(AppConstants.MYHOME_PAGE_ID, iRecentAppSectionIndex, 0).then(this.getSections.bind(this, true));
                        }
                        return this._oMoveAppsPromise;
                    } else {
                        return aSections;
                    }
                }.bind(this))
                .catch(function (oError) {
                    Log.error(oError);
                });
            },

            /**
             * Models and returns all visualizations available in MyHome page
             *
             * @param {bool} bForceRefresh - force reload page
             * @returns {Promise} - resolves to return all apps available in MyHome page
             */
            _fetchMyHomeApps: function (bForceRefresh) {
                var aApps = [];
                return this.getSections(bForceRefresh)
                    .then(function (aSections) {
                        aSections.forEach(
                            function (oSection, iSectionIndex) {
                                oSection.visualizations.forEach(
                                    function (oVisualization, iVisualizationIndex) {
                                        var vizConfig = oVisualization.vizConfig,
                                            oAppInfo = vizConfig["sap.app"] || { title: "?" },
                                            oApp = {};

                                            oApp.oldAppId = this._getAppId(
                                            vizConfig["sap.flp"]
                                        );
                                        oApp.appId = oVisualization.targetURL;  // Using targetURL as unique identifier as in certian scenario vizConfig can be empty.
                                        oApp.url = oVisualization.targetURL;
                                        if(!oApp.url && isSmartBusinessTile(oVisualization)){
                                            oApp.url = this._getTargetUrl(vizConfig["sap.flp"]);
                                        }
                                        oApp.leanURL = WindowUtils.getLeanURL(oApp.url);
                                        oApp.title = oVisualization.title || this._getAppTitleSubTitle(oAppInfo, oVisualization).title;
                                        oApp.subtitle = oVisualization.subtitle || this._getAppTitleSubTitle(oAppInfo, oVisualization).subTitle;
                                        oApp.BGColor = AppConstants.DEFAULT_BG_COLOR().key;
                                        oApp.isFav = true;
                                        oApp.isSection = false;
                                        oApp.icon =
                                            vizConfig["sap.ui"] &&
                                            vizConfig["sap.ui"].icons &&
                                            vizConfig["sap.ui"].icons.icon
                                                ? vizConfig["sap.ui"].icons.icon
                                                : AppConstants.FALLBACK_ICON;
                                        if (oVisualization.indicatorDataSource) {
                                            oApp.isCount = true;
                                            oApp.indicatorDataSource = oVisualization.indicatorDataSource.path;
                                            oApp.contentProviderId = oVisualization.contentProviderId;
                                        }
                                        oApp.isSmartBusinessTile = isSmartBusinessTile(oVisualization);
                                        // Add FLP Personalization Config
                                        oApp.persConfig = {
                                            pageId: AppConstants.MYHOME_PAGE_ID,
                                            sectionTitle: oSection.title,
                                            sectionId: oSection.id,
                                            sectionIndex: iSectionIndex,
                                            visualizationIndex: iVisualizationIndex,
                                            isDefaultSection: oSection.default,
                                            isPresetSection: oSection.preset,
                                            duplicateApps: []
                                        };
                                        oApp.visualization = oVisualization;
                                        // Title and Subtitle in visualization are required in Insights Dialog.
                                        oApp.visualization.title = oApp.title;
                                        oApp.visualization.subtitle = oApp.subtitle;
                                        aApps.push(oApp);
                                    }.bind(this)
                                );
                            }.bind(this)
                        );
                        return aApps;
                    }.bind(this))
                    .catch(function(oErr) {
                        Log.error(oErr);
                        return aApps;
                    });
            },

            /**
             * Add Grouping Information to apps list, and return concatenated list.
             *
             * @param {object[]} aFavoriteApps - list of all favorite apps
             * @returns {object[]} - concatenated list contaning grouping information as well
             */
            _addGroupInformation: function (aFavoriteApps) {
                var aRecentApps = [], aSections = [], oExistingSection;

                this._linkDuplicateApps(aFavoriteApps).forEach(function (oApp) {
                    if (oApp.persConfig.isDefaultSection) {
                        aRecentApps.push(oApp);
                    } else {
                        oExistingSection = aSections.find(function (oSection) { return oSection.isSection && oSection.id === oApp.persConfig.sectionId; });

                        if (!oExistingSection) {
                            aSections.push({
                                id: oApp.persConfig.sectionId,
                                index: oApp.persConfig.sectionIndex,
                                title: oApp.persConfig.sectionTitle,
                                badge: "1",
                                BGColor: AppConstants.DEFAULT_BG_COLOR().key,
                                icon: "sap-icon://folder-full",
                                isSection: true,
                                isPresetSection: oApp.persConfig.isPresetSection,
                                apps: [ oApp ]
                            });
                        } else {
                            oExistingSection.apps.push(oApp);
                            oExistingSection.badge = oExistingSection.apps.length.toString();
                        }
                    }
                });

                //filter out duplicate apps only from recent apps list
                return aSections.concat(this.filterDuplicateApps(aRecentApps, false));
            },

            /**
             * Link Duplicate Apps to a single app
             *
             * @param {object[]} aApps - array of apps
             * @returns {object[]} arry of apps after linking duplicate apps
             */
            _linkDuplicateApps: function (aApps) {
                // var aDuplicateApps = this.filterDuplicateApps(aApps, true);
                aApps.forEach(function(oDuplicateApp) {
                    aApps.filter(function(oApp) {
                        return oApp.appId === oDuplicateApp.appId
                            && oApp.visualization.id !== oDuplicateApp.visualization.id
                            && oApp.persConfig.sectionIndex === oDuplicateApp.persConfig.sectionIndex;
                    }).forEach(function(oApp) {
                        oApp.persConfig.duplicateApps.push(oDuplicateApp);
                    });
                });

                return aApps;
            },

            /**
             * Returns a list of all apps in MyHome page
             *
             * @param {boolean} bForceRefresh - force reload page
             * @param {boolean} bPreventGrouping - prevent app grouping
             * @returns {Promise} - resolves to return all apps in MyHome page
             */
            fetchFavApps: function (bForceRefresh, bPreventGrouping) {
                return this._fetchMyHomeApps(bForceRefresh).then(function (aMyHomeApps) {
                    var aVisibleFavApps = aMyHomeApps.filter(function (oApp) {
                        return oApp.persConfig && oApp.persConfig.sectionId !== AppConstants.MYINSIGHT_SECTION_ID && oApp.url && oApp.title;
                    });

                    if (bPreventGrouping) {
                        return this.filterDuplicateApps(this._linkDuplicateApps(aVisibleFavApps), false);
                    } else {
                        return this._addGroupInformation(aVisibleFavApps);
                    }
                }.bind(this))
                .catch(function(oError){
                    Log.error(oError);
                });
            },

            /**
             * Returns all apps present in the Insights Section
             *
             * @param {boolean} bForceRefresh - force reload page
             * @param {string} sSectionTitle - optional, section title
             * @returns {Promise} - resolves to return all apps in Insights section
             */
            fetchInsightApps: function (bForceRefresh, sSectionTitle) {
                var fnFetchInsightsApps = function () {
                    return this._fetchMyHomeApps(bForceRefresh)
                        .then(function (aApps) {
                            return aApps.filter(function (oApp) {
                                return oApp.persConfig && oApp.persConfig.sectionId === AppConstants.MYINSIGHT_SECTION_ID && oApp.url && oApp.title;
                            });
                        });
                }.bind(this);

                if (!this.bInsightsSectionPresent) {
                    if (!this._pFetchInsightsApps) {
                        //TODO: utilize createInsightSection function
                        this._pFetchInsightsApps = this.getSections(bForceRefresh)
                            .then(function (aSections) {
                                var iMyInsightSectionIndex = aSections.findIndex(function(oSection) {
                                        return oSection.id === AppConstants.MYINSIGHT_SECTION_ID;
                                    }),
                                    pCreateSectionPromise = Promise.resolve();

                                //check if myinsight section exists, if not create one and copy dynamic apps
                                if (iMyInsightSectionIndex === -1 && (Config.last("/core/shell/enablePersonalization") || Config.last("/core/catalog/enabled"))) {
                                    pCreateSectionPromise = this.addSection({
                                            pageId: AppConstants.MYHOME_PAGE_ID,
                                            sectionIndex: aSections.length,
                                            sectionProperties: {
                                                id: AppConstants.MYINSIGHT_SECTION_ID,
                                                title: sSectionTitle,
                                                visible: true
                                            }
                                        })
                                        .then(function () {
                                            this.bInsightsSectionPresent = true;
                                            return this._copyDynamicApps();
                                        }.bind(this))
                                        .catch(function(err){
                                            Log.error(err);
                                        });
                                } else {
                                    this.bInsightsSectionPresent = true;
                                }

                                return pCreateSectionPromise;
                            }.bind(this));
                    }

                    return this._pFetchInsightsApps
                        .then(function() {
                            return fnFetchInsightsApps(true);
                        });
                } else {
                    return fnFetchInsightsApps();
                }
            },

            /**
             * Create Insight Section if not already present
             *
             * @param {boolean} bForceRefresh - force reload page
             * @param {string} sSectionTitle - optional, section title
             * @returns {Promise} - resolves to insight section created
             */
            createInsightSection: function(bForceRefresh, sSectionTitle){
                if(!this.bInsightsSectionPresent){
                    return this.getSections(bForceRefresh).then(function(aSections){
                        var iMyInsightSectionIndex = aSections.findIndex(function(oSection) {
                            return oSection.id === AppConstants.MYINSIGHT_SECTION_ID;
                        }),
                        pCreateSectionPromise = Promise.resolve();
                        //check if myinsight section exists, if not create one
                        if(iMyInsightSectionIndex === -1 && (Config.last("/core/shell/enablePersonalization") || Config.last("/core/catalog/enabled"))){
                            pCreateSectionPromise = this.addSection({
                                pageId: AppConstants.MYHOME_PAGE_ID,
                                sectionIndex: aSections.length,
                                sectionProperties: {
                                    id: AppConstants.MYINSIGHT_SECTION_ID,
                                    title: sSectionTitle,
                                    visible: true
                                }
                            })
                            .then(function () {
                                this.bInsightsSectionPresent = true;
                            }.bind(this))
                            .catch(function(err){
                                Log.error(err);
                            });
                        }
                        return pCreateSectionPromise;
                    }.bind(this));
                }
                return Promise.resolve();
            },

            /**
             * Returns all dynamic apps present in MyHome page
             *
             * @param {boolean} bForceRefresh - force reload page
             * @returns {Promise} - resolves to return all dynamic apps in MyHome page
             */
            fetchDynamicApps: function (bForceRefresh) {
                return this.fetchFavApps(bForceRefresh, true)
                    .then(function (aFavApps) {
                        return aFavApps.filter(function (oDynApp) {
                            return oDynApp.isCount || oDynApp.isSmartBusinessTile;
                        });
                    });
            },

            /**
             * Copies all Dynamic Apps to Insights section
             *
             * @returns {Promise} - resolves after copying all the apps
             */
            _copyDynamicApps: function () {
                return this.fetchDynamicApps(true)
                    .then(function (aDynamicApps) {
                        return Promise.all(aDynamicApps.map(function (oDynApp) {
                                return this.addApps(oDynApp.visualization.vizId, AppConstants.MYINSIGHT_SECTION_ID);
                            }.bind(this)));
                    }.bind(this))
                    .catch(function (oError) {
                        Log.error(oError);
                    });
            },

            /**
             * Filters out a list of apps from duplicate apps
             *
             * @param {object[]} aVisibleFavoriteApps - array of apps
             * @param {boolean} bReturnDuplicateApps - flag when set to true, returns only the duplicate apps
             * @returns {object[]} filtered array
             */
            filterDuplicateApps: function (aVisibleFavoriteApps, bReturnDuplicateApps) {
                return aVisibleFavoriteApps.filter(function (
                    oApp,
                    iAppIndex,
                    aApps
                ) {
                    var iFirstIndex = aApps.findIndex(function (oTempApp) {
                        return oTempApp.appId === oApp.appId;
                    });
                    return bReturnDuplicateApps ? iFirstIndex !== iAppIndex : iFirstIndex === iAppIndex;
                });
            },

            _ProcessAppArray: function (aApps, sAppType) {
                var aFilteredApps = aApps.filter(function (app) {
                    return app.appType === "Application";
                });

                // As targetURL is used as appId hence changing the appId for recent and frequent app to the same.
                var aUpdatedApps = aFilteredApps.map(function(oApp) {
                    oApp.orgAppId = oApp.appId;
                    oApp.appId = oApp.url;
                    oApp.leanURL = WindowUtils.getLeanURL(oApp.url);
                    //isolate only date information by having common time information
                    oApp.dateStamp = new Date(oApp.timestamp).setHours(12, 0, 0, 0);
                    oApp.isRecentApp = sAppType === AppConstants.AppTypes.RECENT;
                    if (sAppType === AppConstants.AppTypes.RECENT && Object.keys(this.oRecentUsageAppMap).length) {
                        //get UsageArray of the corresponding app from aRecentUsageArray
                        oApp.usageArray = this.oRecentUsageAppMap[oApp.orgAppId];
                    }
                    return oApp;
                }.bind(this));

                return aUpdatedApps;
            },

            _getVizConfig: function (sAppId) {
                this._mVizCatalog = this._mVizCatalog || {};
                if (this._mVizCatalog) {
                    return this._mVizCatalog[sAppId];
                }
            },

            _updateActivityVisualization: function (oActivity, oUpdatedVizConfig) {
                this._mVizCatalog = this._mVizCatalog || {};
                oActivity.targetURL = oUpdatedVizConfig.targetURL;
                oActivity.vizId = oUpdatedVizConfig.vizId;
                this._mVizCatalog[oActivity.orgAppId] = oUpdatedVizConfig;
                return oActivity;
            },

            _convertToVisualization: function (oApp, aAllVisualizations, URLParsingService) {
                if (this._getVizConfig(oApp.orgAppId)) {
                    return this._updateActivityVisualization(oApp,this._mVizCatalog[oApp.orgAppId]);
                } else {
                    var aMatchingVisualizations = aAllVisualizations.filter(function (oVizConfig) {
                        return "#" + oVizConfig.target.semanticObject + "-" + oVizConfig.target.action === oApp.orgAppId && oVizConfig.vizId;
                    });

                    if (aMatchingVisualizations.length > 1) {
                        //if there are multiple matching apps, compare the target urls
                        var oMatchedVisualization = aMatchingVisualizations.find(function (oMatchedApp) {
                            return oMatchedApp.targetURL === oApp.url;
                        });

                        if (oMatchedVisualization) {
                            return this._updateActivityVisualization(oApp, oMatchedVisualization);
                        } else {
                            //edge cases, when no exact targetUrl match
                            var oAppHash = URLParsingService.parseShellHash(oApp.url);
                            var oAppParams = oAppHash.params;
                            var aAppParamKeys = Object.keys(oAppParams);
                            var oMatchedVizMap = {};
                            var aMatchedViz = [];

                            aMatchingVisualizations.forEach(function (oViz) {
                                if (!oMatchedVizMap[oViz.targetURL]) {
                                    oMatchedVizMap[oViz.targetURL] = {
                                        "viz": oViz,
                                        "params": URLParsingService.parseShellHash(oViz.targetURL).params
                                    };
                                    aMatchedViz.push(oMatchedVizMap[oViz.targetURL]);
                                }
                            });

                            var aFilterMatchedViz = aMatchedViz.filter(this._filterMatchingViz.bind(this, aAppParamKeys, oAppParams));
                            return this._findBestMatchedViz(oApp, aFilterMatchedViz);
                        }
                    } else if (aMatchingVisualizations.length === 1) {
                        return this._updateActivityVisualization(oApp, aMatchingVisualizations[0]);
                    }
                }
            },

            _convertActivityToApps: function (aApps) {
                return Promise.all([
                    this._getAllAvailableVisualizations(),
                    sap.ushell.Container.getServiceAsync("URLParsing")
                ])
                .then(function (aResults) {
                    return aApps.map(function (oApp) { return this._convertToVisualization(oApp, aResults[0], aResults[1]); }.bind(this));
                }.bind(this))
                .then(this._filterUndefinedApps.bind(this) || [])
                .catch(function(oErr) {
                    Log.error(oErr);
                    return [];
                });
            },

            //filter out visualizations that match the url parameters
            _filterMatchingViz: function (aAppParamKeys, oAppParams, oVizData) {
                //filter keys other than 'allItems', for myinbox tasks allItems key is a generally common key hence filter that
                var aVizParamKeys = Object.keys(oVizData.params).filter(function (oKey) {
                    return oKey !== "allItems";
                });
                if (aVizParamKeys.length === aAppParamKeys.length) {
                    var bMatch = aAppParamKeys.every(function (sKey) {
                        return aVizParamKeys.includes(sKey) && oVizData.params[sKey][0] === oAppParams[sKey][0];
                    });
                    if (bMatch) {
                        oVizData.prio = 1;
                        return true;
                    }
                    return false;

                } else if (!aVizParamKeys.length) {
                    //this could mean either aVizParamKeys did not have any key or the only key present was 'allItems'
                    //if 'allItems' present give prio 2 else prio 3
                    oVizData.prio = Object.keys(oVizData.params).length ? 2 : 3;
                    return true;
                } else {
                    //filtered aVizParamKeys length doesnt match aAppParamKeys length & aVizParamKeys length is not 0
                    return false;
                }
            },

            //sort the matched visualizations based on prio order
            _findBestMatchedViz: function (oApp, aFilterMatchedViz) {
                if (aFilterMatchedViz.length > 1) {
                    // more than 1 matching condition for unique targetUrls
                    // this could be either because there is exact match and/or also allItems true and/or no params in VizData param keys
                    // then find best match possible, based on prio
                    var aFinalMatchedViz = aFilterMatchedViz.sort( function (val1,val2) { return  (val1.prio - val2.prio); } );
                    return this._updateActivityVisualization(oApp, aFinalMatchedViz[0].viz);
                } else if (aFilterMatchedViz.length) {
                    return this._updateActivityVisualization(oApp, aFilterMatchedViz[0].viz);
                }
            },

            _filterUndefinedApps: function (updatedApps) {
                return updatedApps.filter(function (app) {
                    return app;
                });
            },

            _getAllAvailableVisualizations: function () {
                if (!this._allAvailableVisualizations) {
                    return sap.ushell.Container.getServiceAsync("SearchableContent").then(function (SearchableContent) {
                        return SearchableContent.getApps({ includeAppsWithoutVisualizations: false }).then(function (aAppCatalog) {
                            this._allAvailableVisualizations = aAppCatalog.reduce(function (aAllVizConfigs, oAppCatalog) {
                                return aAllVizConfigs.concat(oAppCatalog.visualizations || []);
                            }, []);

                            return this._allAvailableVisualizations;
                        }.bind(this));
                    }.bind(this));
                } else {
                    return Promise.resolve(this._allAvailableVisualizations);
                }
            },

            _updateAppAvailability: function (aRecentApps) {
                return this.fetchFavApps(/* forceRefresh*/ true, /* preventGrouping*/ true)
                    .then(function (aFavApps) {
                        aRecentApps.forEach(function (oRecentApp) {
                            var bAppAddedInFavorites = aFavApps.findIndex(function (oFavApp) { return oFavApp.oldAppId === oRecentApp.orgAppId; }) > -1;
                            oRecentApp.appAddedInFavorites = bAppAddedInFavorites;
                        });

                        return aRecentApps;
                    });
            },

            fetchApps: function (sAppType, bForceRefresh) {
                var oUserRecentService;
                var aRecentUsageArray = [];
                this.oRecentUsageAppMap = {};
                if (sAppType === AppConstants.AppTypes.FAVORITE) {
                    return this.fetchFavApps(bForceRefresh);
                } else if (sAppType === AppConstants.AppTypes.RECENT || sAppType === AppConstants.AppTypes.FREQUENT) {
                    return sap.ushell.Container.getServiceAsync("UserRecents")
                        .then(function (UserRecentsService) {
                            oUserRecentService = UserRecentsService;
                            return sAppType === AppConstants.AppTypes.RECENT ? UserRecentsService.getRecentActivity() : UserRecentsService.getFrequentActivity();
                        })
                        .then(function (aApps) {

                            if (sAppType === AppConstants.AppTypes.RECENT) {
                                try {
                                    //get recentUsageArray from oUserRecentService
                                    aRecentUsageArray = oUserRecentService.oRecentActivity.oRecentActivities.recentUsageArray;
                                    this.recentDay = oUserRecentService.oRecentActivity.oRecentActivities.recentDay;
                                    //create map of appid: usageArray
                                    aRecentUsageArray.map(function(oApp) {
                                        this.oRecentUsageAppMap[oApp.oItem.appId] = oApp.aUsageArray;
                                    }.bind(this));
                                } catch (oErr) {
                                    this.oRecentUsageAppMap = {};
                                    this.recentDay = undefined;
                                    Log.error(oErr);
                                }
                            }
                            var aProcessedApps = this._ProcessAppArray(aApps, sAppType);
                            return this._convertActivityToApps(aProcessedApps);
                        }.bind(this))
                        .then(this._updateAppAvailability.bind(this))
                        .catch(function(oErr) {
                            Log.error(oErr);
                            return [];
                        });
                } else {
                    return [];
                }
            },

            //return this.recentDay value
            getRecentDayTimeStamp: function () {
                return this.recentDay;
            },

            fetchAllAvailableSpaces: function () {
                return this._aSpaces
                    ? Promise.resolve(this._aSpaces)
                    : sap.ushell.Container.getServiceAsync("Bookmark")
                        .then(function (bookMarkService) {
                            return bookMarkService.getContentNodes();
                        })
                        .then(function (oSpaces) {
                            //Filter MyHome Space from Spaces
                            this._aSpaces = oSpaces.filter(function(oSpace) {
                                return oSpace.id !== AppConstants.MYHOME_SPACE_ID;
                            });

                            //Add Initial Default Color for Spaces
                            this._aSpaces.forEach(function(oSpace) {
                                oSpace.BGColor = AppConstants.DEFAULT_BG_COLOR();
                                oSpace.applyColorToAllPages = false;
                            });

                            return this._aSpaces;
                        }.bind(this));
            },

            fetchAllAvailablePages: function (bFetchDistinctPages) {
                return this._aPages
                    ? Promise.resolve(this._aPages)
                    : this.fetchAllAvailableSpaces()
                        .then(function (aSpaces) {
                            this._aPages = [];
                            aSpaces.forEach(function (oSpace) {
                                if (Array.isArray(oSpace.children)) {
                                    oSpace.children.forEach(function (oPage) {
                                        if (!bFetchDistinctPages || (bFetchDistinctPages && !this._aPages.find(function (oExistingPage) { return oExistingPage.id === oPage.id; }))) {
                                            this._aPages.push({
                                                title: oPage.label,
                                                icon: AppConstants.FALLBACK_ICON,
                                                isIconLoaded: false,
                                                pageId: oPage.id,
                                                spaceId: oSpace.id,
                                                spaceTitle: oSpace.label,
                                                url: "#Launchpad-openFLPPage?pageId=" + oPage.id + "&spaceId=" + oSpace.id
                                            });
                                        }
                                    }.bind(this));
                                }
                            }.bind(this));

                            return this._aPages;
                        }.bind(this));
            },

            //Get icons from icon constants file
            getIconForPage: function (oFavPage) {
                //Check for icon in page icon constants file
                var oIcon = PagesIcons.PAGES.find(function (oPage) {
                        return oFavPage.pageId.includes(oPage.id);
                    });

                if (!oIcon) {
                    //Check for icon in space icon constants file
                    oIcon = PagesIcons.SPACES.find(function (oSpace) {
                        return oFavPage.spaceId.includes(oSpace.id);
                    });
                }

                oFavPage.icon = oIcon ? oIcon.icon : AppConstants.FALLBACK_ICON;
                oFavPage.isIconLoaded = true;
            },

            _parseSBParameters: function (oParam) {
                var oParsedParams = {};
                if (oParam) {
                    if (typeof oParam === "object") {
                        oParsedParams = oParam;
                    } else {
                        try {
                            oParsedParams = JSON.parse(oParam);
                        } catch (oError) {
                            oParsedParams = undefined;
                        }
                    }
                }
                return oParsedParams;
            },

            //Created AppId using semanticObject and semanticAction
            _getAppId: function (vizConfigFLP) {
                var sAppId = "";
                var oTileProperties = {};
                if (vizConfigFLP) {
                    if (vizConfigFLP.target && vizConfigFLP.target.semanticObject && vizConfigFLP.target.action) {
                        sAppId = "#" + vizConfigFLP.target.semanticObject + "-" + vizConfigFLP.target.action;
                    } else if (
                        vizConfigFLP._instantiationData &&
                        vizConfigFLP._instantiationData.chip &&
                        vizConfigFLP._instantiationData.chip.configuration
                    ) {
                        oTileProperties = this._getTileProperties(vizConfigFLP);
                        if(oTileProperties.semanticObject && oTileProperties.semanticAction){
                            sAppId = "#" + oTileProperties.semanticObject + "-" + oTileProperties.semanticAction;
                        }
                    }
                }
                return sAppId;
            },

            _getTileProperties: function(vizConfigFLP){
                var oTileProperties = {};
                if(vizConfigFLP && vizConfigFLP._instantiationData && vizConfigFLP._instantiationData.chip && vizConfigFLP._instantiationData.chip.configuration){
                  var oConfig = this._parseSBParameters(vizConfigFLP._instantiationData.chip.configuration);
                  if (oConfig && oConfig.tileConfiguration) {
                    var oTileConfig = this._parseSBParameters(oConfig.tileConfiguration);
                    if (oTileConfig) {
                        oTileProperties = this._parseSBParameters(oTileConfig.TILE_PROPERTIES);
                    }
                  }
                }
                return oTileProperties;
            },

            _getTargetUrl: function(vizConfigFLP){
                var sTargetURL = this._getAppId(vizConfigFLP) || "";
                var oTileProperties = this._getTileProperties(vizConfigFLP);
                if(oTileProperties.evaluationId){
                  sTargetURL += "?EvaluationId=" + oTileProperties.evaluationId;
                }
                return sTargetURL;
            },

            // get App Title in case of value not present at root level
            _getAppTitleSubTitle: function (oApp, vizConfigFLP) {
                var oAppTitleSubTitle = {};
                var oAppTileInfo = vizConfigFLP &&
                vizConfigFLP._instantiationData &&
                vizConfigFLP._instantiationData.chip &&
                vizConfigFLP._instantiationData.chip.bags &&
                vizConfigFLP._instantiationData.chip.bags.sb_tileProperties &&
                vizConfigFLP._instantiationData.chip.bags.sb_tileProperties.texts;

                if(oApp.title) {
                    oAppTitleSubTitle.title = oApp.title;
                }else{
                    oAppTitleSubTitle.title = oAppTileInfo && oAppTileInfo.title || "";
                }

                if(oApp.subTitle){
                    oAppTitleSubTitle.subTitle = oApp.subTitle;
                }else{
                    oAppTitleSubTitle.subTitle = oAppTileInfo && oAppTileInfo.description || "";
                }

                return oAppTitleSubTitle;
            },

            // Move Apps between sections
            moveApps: function (moveConfigs) {
                return sap.ushell.Container.getServiceAsync("SpaceContent").then(function (spaceContentService) {
                    return spaceContentService.moveVisualization(
                        moveConfigs.pageId,
                        moveConfigs.sourceSectionIndex,
                        moveConfigs.sourceVisualizationIndex,
                        moveConfigs.targetSectionIndex,
                        moveConfigs.targetVisualizationIndex
                    );
                });
            },

            /**
             * Add apps to a section
             *
             * @param {string} sVizId - viz id
             * @param {string} sSectionId - section id
             * @returns {Promise} resolves after adding apps to a section
             */
            addApps: function (sVizId, sSectionId) {
                return sap.ushell.Container.getServiceAsync("SpaceContent")
                    .then(function (spaceContentService) {
                        return spaceContentService.addVisualization(
                            AppConstants.MYHOME_PAGE_ID,
                            sSectionId,
                            sVizId
                        );
                });
            },

            addBookMark: function(oBookMark, oMovingConfig) {
                return sap.ushell.Container.getServiceAsync("Bookmark").then(function (bookmarkService) {
                    return this._getMyHomeContentNode(bookmarkService).then(function(contentNode){
                        return bookmarkService.addBookmark(
                            DataFormatUtils.createBookMarkData(oBookMark),
                            contentNode
                        ).then(function () {
                            return oMovingConfig ? this.moveApps(oMovingConfig) : Promise.resolve();
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            },

            _getMyHomeContentNode: function (bookmarkService) {
                return bookmarkService.getContentNodes().then(function (aContentNodes) {
                    var oMyHomeSpace = aContentNodes.find(function (contentNode) {
                        return contentNode.id === AppConstants.MYHOME_SPACE_ID;
                    });

                    return oMyHomeSpace && oMyHomeSpace.children.find(function (contentNode) {
                        return contentNode.id === AppConstants.MYHOME_PAGE_ID;
                    });
                });
            },

            /**
             * Deletes one or more apps for a user.
             *
             * @param {object[]} aApps - array of apps to be deleted
             * @returns {Promise} resolves after all apps are deleted
             */
            removeApps: function (aApps) {
                return aApps.reduce(function (pRemoveApp, oApp) {
                    return pRemoveApp
                        .then(function () {
                            var oPersConfig, oTargetSection, iVisualizationIndex, oTargetSectionIndex;
                            return this.getSections(true)
                                .then(function (aSections) {
                                    oPersConfig = oApp.persConfig;
                                    oTargetSectionIndex = aSections.findIndex(function(oSection){
                                        return oSection.id === oPersConfig.sectionId;
                                    });
                                    oTargetSection = aSections[oTargetSectionIndex];
                                    iVisualizationIndex = oTargetSection.visualizations.findIndex(function (oVisualization) {
                                        return oVisualization.id === oApp.visualization.id;
                                    });

                                    return sap.ushell.Container.getServiceAsync("SpaceContent")
                                        .then(function (spaceContentService) {
                                            return spaceContentService.deleteVisualization(
                                                oPersConfig.pageId,
                                                oTargetSectionIndex,
                                                iVisualizationIndex
                                            );
                                        });
                                })
                                .catch(function (oError) {
                                    Log.error(oError);
                                });
                        }.bind(this));
                }.bind(this), Promise.resolve());
            },

            updateApps: function (updateConfigs) {
                return sap.ushell.Container.getServiceAsync("SpaceContent").then(function (spaceContentService) {
                    return spaceContentService.updateVisualization(
                        updateConfigs.pageId,
                        updateConfigs.sourceSectionIndex,
                        updateConfigs.sourceVisualizationIndex,
                        updateConfigs.oVisualizationData
                    );
                });
            },

            /**
             * Adds a section
             *
             * @param {object} mProperties - map of properties
             * @param {string} mProperties.pageId - page id
             * @param {string} mProperties.sectionIndex - section index
             * @param {object} mProperties.sectionProperties - section properties
             * @returns {Promise} resolves to create a section
             */
            addSection: function (mProperties) {
                return sap.ushell.Container.getServiceAsync("SpaceContent")
                    .then(function (spaceContentService) {
                        return spaceContentService.addSection(
                            mProperties.pageId,
                            mProperties.sectionIndex,
                            mProperties.sectionProperties
                        );
                    });
            },

            /**
             * Deletes a section
             *
             * @param {string} sPageId - page id
             * @param {string} sSectionId - section id
             * @returns {Promise} resolves after deletion of the section
             */
            deleteSection: function(sPageId, sSectionId) {
                return sap.ushell.Container.getServiceAsync("Pages")
                    .then(function (oPagesService) {
                        var iPageIndex = oPagesService.getPageIndex(sPageId),
                            aSections = oPagesService.getModel().getProperty("/pages/" + iPageIndex + "/sections/"),
                            iSectionIndex = aSections.findIndex(function(section){
                                return section.id === sSectionId;
                            });

                        oPagesService.deleteSection(iPageIndex, iSectionIndex);
                    });
            },

            /**
             * Renames a section
             *
             * @param {string} sPageId - page id
             * @param {string} sSectionId - section id
             * @param {string} sNewTitle - new title
             * @returns {Promise} resolves after renaming the section
             */
            renameSection: function (sPageId, sSectionId, sNewTitle) {
                return sap.ushell.Container.getServiceAsync("Pages")
                    .then(function (oPagesService) {
                        var iPageIndex = oPagesService.getPageIndex(sPageId),
                            aSections = oPagesService.getModel().getProperty("/pages/" + iPageIndex + "/sections/"),
                            iSectionIndex = aSections.findIndex(function(section) {
                                return section.id === sSectionId;
                            });

                        return oPagesService.renameSection(iPageIndex, iSectionIndex, sNewTitle);
                    });
            },

            /**
             * Move a section
             *
             * @param {string} sPageId - page id
             * @param {number} iSourceSectionIndex - source index
             * @param {number} iTargetSectionIndex - target index
             * @returns {Promise} resolves after moving the section
             */
            moveSection: function (sPageId, iSourceSectionIndex, iTargetSectionIndex) {
                return sap.ushell.Container.getServiceAsync("Pages")
                    .then(function(oPagesService) {
                        var iPageIndex = oPagesService.getPageIndex(sPageId);
                        return oPagesService.moveSection(iPageIndex, iSourceSectionIndex, iTargetSectionIndex);
                    });
            }
        });

        var appManagerInstance = new InstanceProviderClass();

        return {
            getInstance : function(){
                return appManagerInstance;
            }
        };
    }
);