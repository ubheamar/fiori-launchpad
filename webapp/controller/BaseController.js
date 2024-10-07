/*
 * Copyright (C) 2009-2023 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/mvc/XMLView",
    "sap/base/Log",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/utils",
    "sap/ushell/EventHub",
    "sap/base/util/UriParameters",
    "sap/ui/core/routing/HashChanger",
    "sap/ui/Device"
], function (Controller,  XMLView, Log, Fragment,  JSONModel, utils, EventHub, UriParameters, HashChanger,  Device) {
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
        }
    });
});
