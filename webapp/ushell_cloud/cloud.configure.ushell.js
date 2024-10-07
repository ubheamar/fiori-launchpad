sap.ui.define([
    "./cloud.constants",
    "sap/ushell/bootstrap/common/common.configure.ushell",
    "sap/base/util/ObjectPath",
    "sap/base/Log"
], function (oCloudConstants, fnConfigureUshellCommon, ObjectPath, Log) {
    "use strict";
    //ushell_abap

    function addContainerStartupConfig (config) {
        if (config.startupConfig) {
            var oSystemProperties = ObjectPath.get("services.Container.adapter.config.systemProperties", config);
            var oContainerAdapter = ObjectPath.create("services.Container.adapter", config);
            oContainerAdapter.config = config.startupConfig;
            if (oSystemProperties) {
                oContainerAdapter.config.systemProperties = oSystemProperties;
            }
        }
    }

    /**
     * Activates FLP spaces (based on pages and sections therein)
     * or the classical home page mode (based on app groups)
     * by setting the configuration switch <code>config.ushell.spaces.enabled</code> .
     *
     * For the decision it's first checked if the user is allowed to configure spaces mode
     * (<code>config.ushell.spaces.configurable</code>) and if so, uses the user setting
     * (<code>config.startupConfig.userProfile.SPACES_ENABLEMENT</code>).
     * If there's no permission, the admin's configuration passed from the back end is kept.
     *
     * @param {object} config FLP Configuration passed from back end
     */
    function setSpacesOrHomepageMode (config) {
        // Check if user is allowed to configure FLP spaces or homepage mode, and if so consider it
        var bSpacesConfigurableByUser = ObjectPath.get("ushell.spaces.configurable", config);
        if (bSpacesConfigurableByUser) {
            // Check if spaces have been activated by the user
            var aUserProfile = ObjectPath.get("startupConfig.userProfile", config) || [];
            var oSpacesProfile = aUserProfile.filter(function (property) {
                return property.id === "SPACES_ENABLEMENT";
            })[0];
            var sSpacesEnabledByUser = oSpacesProfile && oSpacesProfile.value;

            // If the user hasn't chosen any setting yet the personalization is undefined
            // and the admin setting isn't overwritten
            if (sSpacesEnabledByUser === "true") {
                ObjectPath.set("ushell.spaces.enabled", true, config);
            } else if (sSpacesEnabledByUser === "false") {
                ObjectPath.set("ushell.spaces.enabled", false, config);
            }
        }
    }

    function adaptConfigForFLPPages (config) {
        var oCDMAdapterConfig = ObjectPath.create("services.CommonDataModel.adapter", config);
        oCDMAdapterConfig.module = "sap.ushell.adapters.cdm.PagesCommonDataModelAdapter";
    }

    function adaptPluginsConfiguration (oConfig) {
        var oPlugins = ObjectPath.get("bootstrapPlugins", oConfig) || {};
        Object.keys(oPlugins).forEach(function (sPluginId) {
            var oPluginConfig = oPlugins[sPluginId];
            //some plugins don't have formFactors configuration and should be loaded for any device type
            if (oPluginConfig.hasOwnProperty("formFactors")) {
                var oFormFactors = oPluginConfig.formFactors,
                    oDeviceTypes = {};
                oDeviceTypes.desktop = oFormFactors.desktop || false;
                oDeviceTypes.tablet = oFormFactors.tablet || false;
                oDeviceTypes.phone = oFormFactors.phone || false;
                oPluginConfig.deviceTypes = oDeviceTypes;
                delete oPluginConfig.formFactors;
            }
        });
    }

    function addContainerStartupConfig (config) {
        if (config.startupConfig) {
            var oSystemProperties = ObjectPath.get("services.Container.adapter.config.systemProperties", config);
            var oContainerAdapter = ObjectPath.create("services.Container.adapter", config);
            oContainerAdapter.config = config.startupConfig;
            if (oSystemProperties) {
                oContainerAdapter.config.systemProperties = oSystemProperties;
            }
        }
    }

    function adaptLanguageConfig (oConfig) {
        var aUserProfile = ObjectPath.get("startupConfig.userProfile", oConfig) || [];
        var oPreferredLanguage = aUserProfile.filter(function (oProfile) {
            return oProfile.id === "PREFERRED_LOGON_LANGUAGE";
        })[0];
        if (oPreferredLanguage && oPreferredLanguage.value !== undefined) {
            var bIsLanguagePersonalized = oPreferredLanguage.value !== "";
            oConfig.startupConfig.isLanguagePersonalized = bIsLanguagePersonalized;
        }
    }

    function configureUshell () {
        // Use default configuration
        var oConfig = fnConfigureUshellCommon(oCloudConstants);

        // Set isLanguagePersonalized from userProfile
        adaptLanguageConfig(oConfig);

        // Add start_up configuration if provided by server (formerly retrieved by separate round trip to start_up service)
        addContainerStartupConfig(oConfig);

        // Set FLP spaces or homepage mode (ushell.spaces.enabled)
        // depending on global and user configuration retrieved from the back end
        setSpacesOrHomepageMode(oConfig);

        // Use CDM adapters in case the user views a sap ushell page
        if (ObjectPath.get("ushell.spaces.enabled", oConfig)) {
            adaptConfigForFLPPages(oConfig);
        }

        adaptPluginsConfiguration(oConfig);
        return oConfig;
    }

    
    return configureUshell;
});