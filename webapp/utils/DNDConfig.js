sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/core/dnd/DragDropInfo",
    "./AppConstants",
    "./AppManager",
    "sap/base/Log",
    "sap/m/MessageToast"
], function (BaseObject, DragDropInfo, AppConstants, AppManager, Log, MessageToast) {
    "use strict";

    return BaseObject.extend("shellpoc.utils.DNDConfig", {
        /**
         * Constuctor
         *
         * @param {shellpoc.controller.Apps} oController - Apps controller
         */
        constructor: function (oController) {
            this._oController = oController;
            this.appManagerInstance = AppManager.getInstance();
            this.mConfigMap = {
                "appsFragment--idFavAppsContainer": {
                    dropPosition: "OnOrBetween",
                    dropLayout: "Horizontal",
                    drop: this._onFavAppsDrop
                },
                "sectionDetailDialog--sectionApps": {
                    dropPosition: "Between",
                    dropLayout: "Horizontal",
                    drop: this._onFavAppsDrop
                },
                "pagesBox": {
                    dropPosition: "Between",
                    dropLayout: "Horizontal",
                    drop: this._onPageDrop
                }
            };
        },

        /**
         * Adds DND Config to the array of elements ids passed in as argument
         *
         * @param {string[]} aElemId - array of element ids
         */
        addDndConfig: function (aElemId) {
            aElemId.forEach(function (sElemId) {
                var oControl = this._oController.byId(sElemId) || sap.ui.getCore().byId(sElemId);
                if (oControl) {
                    oControl.addDragDropConfig(this._getDragDropConfig(sElemId));
                }
            }.bind(this));
        },

        /**
         * Returns DND Configuration of an element from the stored map.
         *
         * @param {string} sElemId - element id
         * @returns {sap.ui.core.dnd.DragDropInfo} - DND Config associated with the element
         */
        _getDragDropConfig: function (sElemId) {
            var configDetails = this.mConfigMap[sElemId];
            if (configDetails) {
                return new DragDropInfo({
                    sourceAggregation: "items",
                    targetAggregation: "items",
                    dropPosition: configDetails.dropPosition || "On",
                    dropLayout: configDetails.dropLayout || "Default",
                    drop: configDetails.drop.bind(this)
                });
            }
            return null;
        },

        /**
         * Event Handler for DND in Fav Apps Section
         *
         * @param {object} oEvent - control event
         */
        _onFavAppsDrop: function (oEvent) {
            var oDragItem = oEvent.getParameter ? oEvent.getParameter("draggedControl") : oEvent.draggedControl,
                oDropItem = oEvent.getParameter ? oEvent.getParameter("droppedControl") : oEvent.droppedControl,
                sDropPosition = oEvent.getParameter ? oEvent.getParameter("dropPosition") : oEvent.dropPosition,
                bIsOperationBetween = sDropPosition === "Before" || sDropPosition === "After",
                oDNDInfo = {
                    insertPosition: sDropPosition,

                    //Dragged Control Details
                    dragItem: oDragItem,
                    dragItemIndex: oDragItem.getParent().indexOfItem(oDragItem),
                    draggedApp: oDragItem.getBindingContext().getObject(),

                    //Dropped Control Details
                    dropItem: oDropItem,
                    dropItemIndex: oDragItem.getParent().indexOfItem(oDropItem),
                    droppedApp: oDropItem.getBindingContext().getObject()
                };

            //Process DND Info, if required
            this._processInfoIfRequired(oDNDInfo);

            if (!oDNDInfo.draggedApp.isSection && !oDNDInfo.droppedApp.isSection && bIsOperationBetween) {
                this._onAppsDND(oDNDInfo);
            } else if (oDNDInfo.draggedApp.isSection && bIsOperationBetween) {
                this._onSectionDND(oDNDInfo);
            } else if (sDropPosition === "On" && oDNDInfo.dragItemIndex !== oDNDInfo.dropItemIndex) {
                this._onAppSectionDND(oDNDInfo);
            }
        },

        /**
         * Process and adjust DND Info, if required
         *
         * @param {object} mProperties - object containing supported properties
         * @param {string} mProperties.insertPosition - insert position
         * @param {object} mProperties.dragItem - dragged control
         * @param {number} mProperties.dragItemIndex - dragged item index
         * @param {object} mProperties.draggedApp - dragged app information
         * @param {object} mProperties.dropItem - dropped control
         * @param {number} mProperties.dropItemIndex - dropped item index
         * @param {object} mProperties.droppedApp - dropped app information
         */
        _processInfoIfRequired: function (mProperties) {
            if (mProperties.dragItemIndex !== mProperties.dropItemIndex) {
                if (!mProperties.draggedApp.isSection && !mProperties.droppedApp.isSection) {
                    this._adjustAppDNDInfo(mProperties);
                } else if (mProperties.draggedApp.isSection) {
                    this._adjustSectionDNDInfo(mProperties);
                }
            }
        },

        /**
         * Process and adjust App DND Info, if required
         *
         * @param {object} mProperties - object containing supported properties
         * @param {string} mProperties.insertPosition - insert position
         * @param {number} mProperties.dragItemIndex - dragged item index
         * @param {number} mProperties.dropItemIndex - dropped item index
         */
        _adjustAppDNDInfo: function (mProperties) {
            var bChangeFlag = false;
            if (mProperties.insertPosition === "Before") {
                if (mProperties.dragItemIndex === mProperties.dropItemIndex - 1) {
                    mProperties.dropItemIndex--;
                }
                if (mProperties.dragItemIndex < mProperties.dropItemIndex && mProperties.draggedApp.persConfig.sectionIndex === mProperties.droppedApp.persConfig.sectionIndex) {
                    mProperties.dropItemIndex--;
                    bChangeFlag = true;
                }
            } else if (mProperties.insertPosition === "After") {
                if (mProperties.dragItemIndex === mProperties.dropItemIndex + 1) {
                    mProperties.dropItemIndex++;
                }
                if (mProperties.dragItemIndex > mProperties.dropItemIndex && mProperties.draggedApp.persConfig.sectionIndex === mProperties.droppedApp.persConfig.sectionIndex) {
                    mProperties.dropItemIndex++;
                    bChangeFlag = true;
                }
            }

            if (bChangeFlag) {
                mProperties.dropItem = mProperties.dragItem.getParent().getItems()[mProperties.dropItemIndex];
                mProperties.droppedApp = mProperties.dropItem.getBindingContext().getObject();
            }
        },

        /**
         * Process and adjust Section DND Info, if required
         *
         * @param {object} mProperties - object containing supported properties
         * @param {string} mProperties.insertPosition - insert position
         * @param {object} mProperties.dragItem - dragged control
         * @param {number} mProperties.dragItemIndex - dragged item index
         * @param {object} mProperties.draggedApp - dragged app information
         * @param {number} mProperties.dropItemIndex - dropped item index
         * @param {object} mProperties.droppedApp - dropped app information
         */
        _adjustSectionDNDInfo: function (mProperties) {
            mProperties.dragItemIndex = mProperties.draggedApp.index;

            //If dropped app is the first ungrouped app, put the group at the end
            if (!mProperties.droppedApp.isSection) {
                var oContainer = mProperties.dragItem.getParent(),
                    iLastSectionIndex = oContainer.getItems().filter(function (oApp) {
                        return oApp.getBindingContext().getProperty("isSection");
                    }).length;

                mProperties.dropItemIndex = mProperties.dropItemIndex === iLastSectionIndex
                    && mProperties.dragItemIndex !== iLastSectionIndex && mProperties.insertPosition === "Before"
                    ? iLastSectionIndex + 1
                    : mProperties.draggedApp.index;
            } else {
                mProperties.dropItemIndex = mProperties.droppedApp.index;
            }

            //Adjust drag or drop item indexes
            if (
                mProperties.insertPosition === "Before" &&
                mProperties.dragItemIndex === mProperties.dropItemIndex - 1
            ) {
                mProperties.dropItemIndex--;
            } else if (
                mProperties.insertPosition === "After" && (
                mProperties.dragItemIndex !== mProperties.dropItemIndex ||
                mProperties.dropItemIndex >= mProperties.droppedApp.index
            )) {
                mProperties.dropItemIndex++;
            }
        },

        /**
         * Checks if drag and drop item indexes are unequal to continue DnD operation.
         * Removes active state from the selected tile if otherwise.
         *
         * @param {object} mProperties - object containing supported properties
         * @param {object} mProperties.dragItem - dragged control
         * @param {number} mProperties.dragItemIndex - dragged item index
         * @param {number} mProperties.dropItemIndex - dropped item index
         * @returns {boolean} indicating whether to continue DnD operation
         */
        _continueDnD: function (mProperties) {
            var bContinueDnD = mProperties.dragItemIndex !== mProperties.dropItemIndex;
            if (!bContinueDnD) {
                mProperties.dragItem.removeStyleClass("sapMGTPressActive");
            }

            return bContinueDnD;
        },

        /**
         * Normal DND 'Between' favorite apps - switch positions
         *
         * @param {object} mProperties - object containing supported properties
         * @param {string} mProperties.insertPosition - insert position
         * @param {object} mProperties.dragItem - dragged control
         * @param {number} mProperties.dragItemIndex - dragged item index
         * @param {object} mProperties.draggedApp - dragged app information
         * @param {object} mProperties.dropItem - dropped control
         * @param {number} mProperties.dropItemIndex - dropped item index
         * @param {object} mProperties.droppedApp - dropped app information
         */
        _onAppsDND: function (mProperties) {
            if (this._continueDnD(mProperties)) {
                this._oController._setAppsSectionBusy(true);
                this.appManagerInstance.moveApps({
                    pageId: AppConstants.MYHOME_PAGE_ID,
                    sourceSectionIndex: mProperties.draggedApp.persConfig.sectionIndex,
                    sourceVisualizationIndex: mProperties.draggedApp.persConfig.visualizationIndex,
                    targetSectionIndex: mProperties.droppedApp.persConfig.sectionIndex,
                    targetVisualizationIndex: mProperties.droppedApp.persConfig.visualizationIndex
                })
                .then(function () {
                    this._oController._setAppsSectionBusy(false);
                    this._oController._setFavApps();
                }.bind(this));
            }
        },

        /**
         * Normal DND 'Between' groups - switch group positions
         *
         * @param {object} mProperties - object containing supported properties
         * @param {string} mProperties.insertPosition - insert position
         * @param {object} mProperties.dragItem - dragged control
         * @param {number} mProperties.dragItemIndex - dragged item index
         * @param {object} mProperties.draggedApp - dragged app information
         * @param {object} mProperties.dropItem - dropped control
         * @param {number} mProperties.dropItemIndex - dropped item index
         * @param {object} mProperties.droppedApp - dropped app information
         */
        _onSectionDND: function (mProperties) {
            if (this._continueDnD(mProperties)) {
                this._oController._setAppsSectionBusy(true);
                this.appManagerInstance.moveSection(AppConstants.MYHOME_PAGE_ID, mProperties.dragItemIndex, mProperties.dropItemIndex)
                    .then(function () {
                        this._oController._setAppsSectionBusy(false);
                        this._oController._setFavApps();
                    }.bind(this));
            }
        },

        /**
         * Drag App 'On' to Group - Move App to Section
         *
         * @param {object} mProperties - object containing supported properties
         * @param {string} mProperties.insertPosition - insert position
         * @param {object} mProperties.dragItem - dragged control
         * @param {number} mProperties.dragItemIndex - dragged item index
         * @param {object} mProperties.draggedApp - dragged app information
         * @param {object} mProperties.dropItem - dropped control
         * @param {number} mProperties.dropItemIndex - dropped item index
         * @param {object} mProperties.droppedApp - dropped app information
         */
        _onAppSectionDND: function (mProperties) {
            if (!mProperties.draggedApp.isSection && !mProperties.droppedApp.isSection) {
                    this._oController.onPressCreateGroup(true, [mProperties.draggedApp, mProperties.droppedApp]);
                } else if (!mProperties.draggedApp.isSection && mProperties.droppedApp.isSection) {
                    this._addAppToSection(mProperties);
            } else {
                mProperties.dragItem.removeStyleClass("sapMGTPressActive");
            }
        },

        /**
         * Drag App 'On' to Group - Move App to Section
         *
         * @param {object} mProperties - object containing supported properties
         * @param {string} mProperties.insertPosition - insert position
         * @param {object} mProperties.dragItem - dragged control
         * @param {number} mProperties.dragItemIndex - dragged item index
         * @param {object} mProperties.draggedApp - dragged app information
         * @param {object} mProperties.dropItem - dropped control
         * @param {number} mProperties.dropItemIndex - dropped item index
         * @param {object} mProperties.droppedApp - dropped app information
         */
        _addAppToSection: function (mProperties) {
            //App to Section - Add to Section
            this._oController._setAppsSectionBusy(true);
            Promise.all([
                this.appManagerInstance.removeApps(mProperties.draggedApp.persConfig.duplicateApps),
                this.appManagerInstance.moveApps({
                    pageId: AppConstants.MYHOME_PAGE_ID,
                    sourceSectionIndex: mProperties.draggedApp.persConfig.sectionIndex,
                    sourceVisualizationIndex: mProperties.draggedApp.persConfig.visualizationIndex,
                    targetSectionIndex: mProperties.droppedApp.index,
                    targetVisualizationIndex: -1 // adds to the end of the list
                })
            ])
            .then(function () {
                return this._oController._updatePersonalizationIfRequired({
                    isTargetSectionRecent: false,
                    selectedApp: mProperties.draggedApp,
                    targetSectionId: mProperties.droppedApp.id
                });
            }.bind(this))
            .then(function () {
                MessageToast.show(this._oController.getResourceBundle().getText("appMoved", mProperties.droppedApp.title));
                this._oController._setAppsSectionBusy(false);
                this._oController._setFavApps();
            }.bind(this))
            .catch(function (oErr) {
                Log.error(oErr.message);
            });
        },

        /**
         * Update End-user Personalization, if required
         *
         * @param {string} sAppId - app id
         * @param {string} sSourceSectionId - source section id
         * @param {string} sTargetSectionId - target section id
         * @returns {Promise} resolves after updating personalization, if required
         */
        _updatePersonalizationIfRequired: function (sAppId, sSourceSectionId, sTargetSectionId) {
            return this._oController._getFavAppPersonalization()
                .then(function (oFavAppsPersData) {
                    // Update Personalization if required
                    var oExistingPersonalization = oFavAppsPersData.find(function (oPersonalization) {
                        return oPersonalization.appId === sAppId && oPersonalization.isRecentlyAddedApp;
                    });

                    if (oExistingPersonalization) {
                        oExistingPersonalization.sectionId = sTargetSectionId;
                        oExistingPersonalization.isRecentlyAddedApp = false;
                        this._oController._setFavAppPersonalization(oFavAppsPersData);
                    }
                }.bind(this));
        },

        /**
         * Event Handler for DND among Favorite Pages
         *
         * @param {object} oEvent - control event
         */
        _onPageDrop: function (oEvent) {
            var sInsertPosition = oEvent.getParameter ? oEvent.getParameter("dropPosition") : oEvent.dropPosition,
                oDragItem = oEvent.getParameter ? oEvent.getParameter("draggedControl") : oEvent.draggedControl,
                iDragItemIndex = oDragItem.getParent().indexOfItem(oDragItem),
                oDropItem = oEvent.getParameter ? oEvent.getParameter("droppedControl") : oEvent.droppedControl,
                iDropItemIndex = oDragItem.getParent().indexOfItem(oDropItem),
                aPages = this._oController._oViewModel.getProperty("/pages").tiles;

            if (sInsertPosition === "Before" && iDragItemIndex === iDropItemIndex - 1) {
                iDropItemIndex--;
            }
            else if (sInsertPosition === "After" && iDragItemIndex === iDropItemIndex + 1) {
                iDropItemIndex++;
            }

            if (iDragItemIndex !== iDropItemIndex) {
                if (sInsertPosition === "Before" && iDragItemIndex < iDropItemIndex) {
                    iDropItemIndex--;
                }
                else if (sInsertPosition === "After" && iDragItemIndex > iDropItemIndex) {
                    iDropItemIndex++;
                }
                // take the moved item from dragIndex and add to dropindex
                var oItemMoved = aPages.splice(iDragItemIndex, 1)[0];
                aPages.splice(iDropItemIndex, 0, oItemMoved);

                this._oController._oViewModel.setProperty("/pages/tiles",aPages);
                var aPageIds = aPages.map(function(oPage) {return oPage.pageId;});
                this._oController.saveFavoritePages(aPageIds);
            }
        }
    });
});