sap.ui.define([

], function () {
    "use strict";

    return {
        defaultUshellConfig: {
            defaultRenderer: "fiori2",
            ushell: {
                home: {
                    tilesWrappingType: "Hyphenated"
                },
                homeApp : {
                    enabled : true,
                    component : {
                        name : "shellpoc",
                        url: "../"
                    }
                },
                darkMode: {
                    enabled: true
                },
                spaces: {
                    enabled : true,
                    myHome: {
                        enabled: true
                    }
                },
                customPreload: {
                    enabled: true,
                    coreResources: [
                        "sap/ushell/bootstrap/core-min-0.js",
                        "sap/ushell/bootstrap/core-min-1.js",
                        "sap/ushell/bootstrap/core-min-2.js",
                        "sap/ushell/bootstrap/core-min-3.js"
                    ],
                    coreResourcesComplement: [
                        "sap/ushell/preload-bundles/core-ext-light-0.js",
                        "sap/ushell/preload-bundles/core-ext-light-1.js",
                        "sap/ushell/preload-bundles/core-ext-light-2.js",
                        "sap/ushell/preload-bundles/core-ext-light-3.js"
                    ]
                }
            },
            renderers: {
                fiori2: {
                    componentData: {
                        config: {
                            sessionTimeoutReminderInMinutes: 5,
                            sessionTimeoutIntervalInMinutes: -1,
                            sessionTimeoutTileStopRefreshIntervalInMinutes: 15,
                            enableContentDensity: true,
                            enableAutomaticSignout: true,
                            enablePersonalization: true,
                            enableAbout: true,
                            enableTagFiltering: false,
                            enableSearch: true,
                            enableSetTheme: true,
                            enableSetLanguage: true,
                            enableAccessibility: true,
                            enableHelp: false,
                            enableUserDefaultParameters: true,
                            preloadLibrariesForRootIntent: false,
                            enableNotificationsUI: false,
                            enableRecentActivity: true,
                            tilesWrappingType: "Hyphenated",
                            applications: {
                                "Shell-home": {
                                    enableEasyAccess: true,
                                    enableHideGroups: false,
                                    homePageGroupDisplay: "scroll",
                                    enableTileActionsIcon: false
                                }
                            },
                            rootIntent: "Shell-home"
                        }
                    }
                }
            },
            services: {
                Personalization: {
                    config: {
                        appVariantStorage: {
                            enabled: true,
                            adapter: {
                                module: "sap.ushell.adapters.AppVariantPersonalizationAdapter"
                            }
                        }
                    }
                },
                CrossApplicationNavigation: {
                    config: {
                        "sap-ushell-enc-test": false
                    }
                },
                NavTargetResolution: {
                    config: {
                        enableClientSideTargetResolution: true
                    }
                },
                ShellNavigation: {
                    config: {
                        reload: false
                    }
                },
                UserDefaultParameterPersistence: {
                    adapter: {
                        module: "sap.ushell.adapters.local.UserDefaultParameterPersistenceAdapter"
                    }
                },
                Notifications: {
                    config: {
                        enabled: false,
                       // serviceUrl: "/sap/opu/odata4/iwngw/notification/default/iwngw/notification_srv/0001",
                       // webSocketUrl: "/sap/bc/apc/iwngw/notification_push_apc",
                        pollingIntervalInSeconds: 30,
                        enableNotificationsPreview: false
                    }
                },
                AllMyApps: {
                    config: {
                        enabled: true,
                        showHomePageApps: true,
                        showCatalogApps: true
                    }
                },
                // NavigationDataProvider: {
                //     adapter: {
                //         module: "sap.ushell_abap.adapters.abap.ClientSideTargetResolutionAdapter"
                //     }
                // },
                Menu: {
                    adapter: {
                        config: {
                            enabled: false
                        }
                    }
                }
            },
            xhrLogon: {
                // Configuration for XHR-Logon mode. See SAP Note 2193513 for details.
                mode: "frame"
            },
            bootstrapPlugins: {
                UiAdaptationPersonalization: {
                    component: "sap.ushell.plugins.rta-personalize",
                    enabled: false
                }
            },
            ui5: {
                libs: {
                    "sap.ui.core": true,
                    "sap.m": true,
                    "sap.ushell": true
                },
                timeZoneFromServerInUI5: false
            },
            // default values for parameters used by SAPUI5 apps
            // the default values are evaluated from "Manage Launchpad Settings"
            // app via ConfigurationDefaults service and must therefore be defined in client constants
            apps: {
                // UI5_PLACEHOLDER_SCREEN parameter
                // (was false in 2111)
                // this setting is only evaluated by Fiori Elements framework and shall be removed in a future release
                placeholder: {
                    enabled: true
                },
                // INPUTFIELD_SUGGESTIONS parameter
                inputFieldSuggestions: {
                    enabled: true
                }
            }
        }
    };

});
