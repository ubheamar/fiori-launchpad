sap.ui.define(["sap/m/FlexBox"], function (FlexBox) {
    "use strict";

    /**
     * @private
     * @alias shellpoc.controls.Wrapper
     */
    var Wrapper = FlexBox.extend("shellpoc.controls.Wrapper", {
        metadata: {
            aggregations: {
                /**
                 * Item controls with DND enabled.
                 */
                items: {
                    type: "shellpoc.controls.WrapperItem",
                    multiple: true,
                    singularName: "item",
                    dnd: { draggable: true, droppable: true }
                },
                /**
                 * Custom Aggregation for storing adaptation data
                 */
                adaptationData: {
                    type: "sap.ui.core.CustomData",
                    multiple: false
                }
            }
        },
        renderer: {}
    });

    return Wrapper;
});
