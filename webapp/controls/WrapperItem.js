sap.ui.define(["sap/m/FlexBox"], function (FlexBox) {
    "use strict";

    /**
     * @private
     * @alias shellpoc.controls.WrapperItem
     */
    var WrapperItem = FlexBox.extend("shellpoc.controls.WrapperItem", {
        metadata: {
            aggregations: {
                /**
                 * Inner Control Items.
                 */
                items: {
                    type: "sap.ui.core.Control",
                    multiple: true,
                    singularName: "item",
                    dnd: { draggable: true, droppable: true }
                }
            }
        },
        renderer: {}
    });

    return WrapperItem;
});