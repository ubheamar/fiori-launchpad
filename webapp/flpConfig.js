sap.ui.define([
	"sap/base/util/ObjectPath",
	"sap/ushell/services/Container",
	"sap/ushell/iconfonts"
], function (ObjectPath,Container,iconfonts) {
	"use strict";

	// define ushell config
	ObjectPath.set(["sap-ushell-config"], {
		defaultRenderer: "fiori2",
		ushell: {
			home: {
				tilesWrappingType: "Hyphenated"
			},
			homeApp: {
				enabled : true,
				component: {
					name: "shellpoc",
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
			AllMyApps: {
				config: {
					enabled: true,
					showHomePageApps: true,
					showCatalogApps: true
				}
			},
			Menu: {
				adapter: {
					config: {
						enabled: true
					}
				}
			},
			CommonDataModel : {
				adapter : {
					module: "sap.ushell.adapters.cdm.PagesCommonDataModelAdapter"
				}
			},
			"LaunchPage": {
				"adapter": {
					"config": {
						"groups": [{
							"tiles": [{
								"tileType": "sap.ushell.ui.tile.StaticTile",
								"properties": {
									"title": "App Title",
									"targetURL": "#shellpoc-display"
								}
							}]
						}]
					}
				}
			},
			"ClientSideTargetResolution": {
				"adapter": {
					"config": {
						"inbounds": {
							"shellpoc-display": {
								"semanticObject": "shellpoc",
								"action": "display",
								"description": "An SAP Fiori application.",
								"title": "App Title",
								"signature": {
									"parameters": {}
								},
								"resolutionResult": {
									"applicationType": "SAPUI5",
									"additionalInformation": "SAPUI5.Component=shellpoc",
									"url": sap.ui.require.toUrl("shellpoc")
								}
							}
						}
					}
				}
			}
		},
		
	});

	var oFlpSandbox = {
		init: function () {
			/**
			 * Initializes the FLP sandbox
			 * @returns {Promise} a promise that is resolved when the sandbox bootstrap has finshed
			 */

			// sandbox is a singleton, so we can start it only once
			if (!this._oBootstrapFinished) {
				this._oBootstrapFinished = sap.ushell.bootstrap("local");
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