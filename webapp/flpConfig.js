sap.ui.define([
	"sap/base/util/ObjectPath",
	"sap/ushell/services/Container",
	"sap/ushell/iconfonts",
	"./utils/AppConstants"
], function (ObjectPath,Container,iconfonts,AppConstants) {
	"use strict";

	// define ushell config
	ObjectPath.set(["sap-ushell-config"], {
		defaultRenderer: "fiori2",
		startupConfig : {
			spacesMyhomeSpaceid : AppConstants.MYHOME_SPACE_ID,
			spacesMyhomePageid : AppConstants.MYHOME_PAGE_ID
		},
		apps : {
			insights : {
				enabled : true
			}
		},
		ushell: {
			home: {
				tilesWrappingType: "Hyphenated"
			},
			homeApp: {
				enabled : true,
				component: {
					//TODO : dont change this as it cards insight error
					name: "ux.eng.s4producthomes1",
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
		bootstrapPlugins: {
			"RuntimeAuthoringPlugin": {
				component: "sap.ushell.plugins.rta",
				config: {
					validateAppVersion: false
				}
			},
			"PersonalizePlugin": {
				component: "sap.ushell.plugins.rta-personalize",
				config: {
					validateAppVersion: false
				}
			}
		},
		services: {
			AppState: {
				adapter: {
					module: "sap.ushell.adapters.local.AppStateAdapter"
				},
				config: {
					transient: true
				}
			},
			Personalization: {
			    adapter: {
					module: "sap.ushell.adapters.local.PersonalizationAdapter"
				}
			},
			PersonalizationV2: {
			    adapter: {
					module: "sap.ushell.adapters.local.PersonalizationAdapter"
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
				},
				adapter: {
                	module: "sap.ushell.adapters.local.NavTargetResolutionAdapter"
            	}
			},
			ShellNavigation: {
				config: {
					reload: false
				}
			},
			AllMyApps: {
				config: {
					enabled: true,
					showHomePageApps: true,
					showCatalogApps: true
				}
			},
			NavigationDataProvider: {
				adapter: {
					module: "sap.ushell.adapters.cdm.ClientSideTargetResolutionAdapter"
				}
			},
			FlpLaunchPage: {
				adapter: {
					module: "sap.ushell.adapters.cdm.v3.FlpLaunchPageAdapter"
				}
			},
			VisualizationDataProvider: {
				adapter: {
					module: "sap.ushell.adapters.cdm.v3.FlpLaunchPageAdapter"
				}
			},
			Search: {
				adapter: {
					module: "sap.ushell.adapters.local.SearchAdapter"
				}
			},
			UserDefaultParameterPersistence: {
				adapter: {
					module: "sap.ushell.adapters.local.UserDefaultParameterPersistenceAdapter"
				}
			},
			UserInfo: {
				adapter: {
					module: "sap.ushell.adapters.local.UserInfoAdapter"
				}
			},
			/*Menu: {
				adapter: {
					config: {
						enabled: true
					},
					module: "shellpoc.ushell_cloud.adapters.MenuAdapter"
				}
			},
			CommonDataModel : {
				adapter : {
					module: "sap.ushell.adapters.cdm.PagesCommonDataModelAdapter"
				}
			}*/
			CommonDataModel : {
				adapter : {
					config: {
						ignoreSiteDataPersonalization: true,
						siteDataUrl: "CloudSiteData.json",
						allowSiteSourceFromURLParameter: true
					}
				}
			}
		},
		ui5: {
			libs: {
				"sap.ui.core": true,
				"sap.m": true,
				"sap.ushell": true
			}
		}
		
	});

	var oFlpSandbox = {
		init: function () {
			/**
			 * Initializes the FLP sandbox
			 * @returns {Promise} a promise that is resolved when the sandbox bootstrap has finshed
			 */

			// sandbox is a singleton, so we can start it only once
			if (!this._oBootstrapFinished) {
				this._oBootstrapFinished = sap.ushell.bootstrap("cdm");
				this._oBootstrapFinished.then(function () {
					window.sap.ushell.Container.createRendererInternal("fiori2").then(function (oContent) {
						iconfonts.registerFiori2IconFont();
						oContent.placeAt("content", "only");
					});
				});
			}

			return this._oBootstrapFinished;
		}
	};

	return oFlpSandbox;
});