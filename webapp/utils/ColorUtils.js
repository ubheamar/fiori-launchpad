sap.ui.define([
    "./AppConstants"
], function (AppConstants) {

    var ColorUtils = function () {
        return {
            /**
             * Prepare Color List
             * @public
             */
            initColors: function () {
                this._oColorList = AppConstants.LEGEND_COLORS().slice(0, AppConstants.PAGE_SELECTION_LIMIT);
            },

            /**
             * Returns first unassigned color from the list
             *
             * @public
             * @returns {string} color key of unassigned color
             */
            getFreeColor: function () {
                var oColor = this._oColorList.find(function (oColour) { return !oColour.assigned; }),
                    sColor = AppConstants.DEFAULT_BG_COLOR().key;

                if (oColor) {
                    oColor.assigned = true;
                    sColor = oColor.key;
                }
                return sColor;
            },

            /**
             * Marks color as assigned in the list
             *
             * @public
             * @param {string} sKey color key
             * @returns {object} color list instance for chaining
             */
            addColor: function (sKey) {
                this._fetchColor(sKey).assigned = true;
                return this;
            },

            /**
             * Marks color as unassigned in the list
             *
             * @public
             * @param {string} sKey color key
             * @returns {object} color list instance for chaining
             */
            removeColor: function (sKey) {
                this._fetchColor(sKey).assigned = false;
                return this;
            },

            /**
             * Fetch Color Object from the list
             *
             * @private
             * @param {string} sKey color key
             * @returns {object} color Object, if found
             */
            _fetchColor: function (sKey) {
                return this._oColorList.find(function (oColour) { return oColour.key === sKey; }) || {};
            },

            /**
             * Getter for Color List
             *
             * @private
             * @returns {object} color list object
             */
            _getColorMap: function () {
                return this._oColorList;
            }
        };
    };

    var instance;

    return {
        getInstance: function () {
            if (!instance) {
                instance = new ColorUtils();
                delete instance.constructor;
            }

            return instance;
        }
    };
});