sap.ui.define(["sap/ui/core/theming/Parameters"], function (Parameters) {
    "use strict";

    var fnFetchLegendColor = function (sLegendName) {
        return {
            key: sLegendName,
            value: Parameters.get({
                name: sLegendName
            }),
            assigned: false
        };
    };
    return {
        FALLBACK_ICON: "sap-icon://document",
        FALLBACK_ICON_RECENT_FREQUENT: "sap-icon://product",
        MYINSIGHT_SECTION_ID: "AZHJGRIT78TG7Y65RF6EPFJ9U",
        MYAPPS_SECTION_ID: "3WO90XZ1DX1AS32M7ZM9NBXEF",
        MYHOME_SPACE_ID : "MYMEDISET_SP_UI_MYHOME",
        MYHOME_PAGE_ID : "MYMEDISET_PG_UI_MYHOME",
        MYHOME_VIEW_ID : "myhome",
        MYHOME_URL_HASH: "Shell-home",
        MYHOME_URL_HASH_EXPANDED: "?expanded=",
        DEFAULT_BG_COLOR: function () {
            return fnFetchLegendColor("sapLegendColor9");
        },
        LEGEND_COLORS: function () {
            return [
                "sapLegendColor6",
                "sapLegendColor3",
                "sapLegendColor1",
                "sapLegendColor10",
                "sapLegendColor12",
                "sapLegendColor7",
                "sapLegendColor5",
                "sapLegendColor8",
                "sapLegendColor18",
                "sapLegendColor9"
            ].map(fnFetchLegendColor);
        },
        NEW_LEGEND_COLORS: function () {
            return [
                "sapLegendColor19",
                "sapLegendColor13",
                "sapLegendColor11",
                "sapLegendColor20",
                "sapLegendColor2",
                "sapLegendColor17",
                "sapLegendColor15",
                "sapLegendColor14",
                "sapLegendColor16",
                "sapLegendColor4"
            ].map(fnFetchLegendColor);
        },
        ChangeTypes: {
            Move: "moveControls",
            Unhide: "unhideControl",
            Hide: "hideControl",
            PageColor: "applyPageColor",
            SpaceColor: "applySpaceColor",
            PageIcon: "applyPageIcon",
            SpaceIcon: "applySpaceIcon",
            NewsURL: "changeNewsFeedURL",
            NewsVisibility: "setNewsFeedVisibility",
            ExpandSection: "expandSection",
            SelectToDoKey: "selectToDoKey",
            SelectAppKey: "selectAppKey"
        },
        AppTypes: {
            FAVORITE: "FAVORITE",
            RECENT: "RECENT",
            FREQUENT: "FREQUENT"
        },
        AppPaths: {
            FAVORITE: "/favoriteApps/tiles/",
            RECENT: "/recentApps/tiles/",
            FREQUENT: "/frequentApps/tiles/"
        },
        AppPathsMobile: {
            FAVORITE: "/favoriteMobileApps/tiles/",
            RECENT: "/recentMobileApps/tiles/",
            FREQUENT: "/frequentMobileApps/tiles/"
        },
        TODO_SECTION_LIMIT: 6,
        DESKTOP_STYLES: {
            "/slideTileWidth": "100%",
            "/slideTileHeight": "17rem",
            "/flexDirection": "Row",
            "/ParentVerticalLayoutWidth": "100%",
            "/hBoxJustifyContent": "Start",
            "/sizeBehavior": "Responsive",
            "/isPhoneScreen": false,
            "/insightsCardWidth": "19rem",
            "/insightsCardHeight": "33rem",
            "/insightsCardWidthOverflow":"19rem",
            "/insightsCardHeightOverflow": "2rem",
            "/pagesDropAreaOffset": 8,
            "/appsDropAreaOffset": 4
        },
        TABLET_STYLES: {
            "/flexDirection": "Column",
            "/slideTileWidth": "calc(100vw - 64px)",
            "/slideTileHeight": "18rem",
            "/VerticalLayoutWidth": "calc(100vw - 64px)",
            "/ParentVerticalLayoutWidth": "calc(100vw - 64px)",
            "/hBoxJustifyContent": "Start",
            "/sizeBehavior": "Responsive",
            "/isPhoneScreen": false,
            "/insightsCardWidth": "19rem",
            "/insightsCardHeight": "33rem",
            "/insightsCardWidthOverflow":"19rem",
            "/insightsCardHeightOverflow": "2rem",
            "/pagesDropAreaOffset": 8,
            "/appsDropAreaOffset": 4
        },
        MOBILE_STYLES: {
            "/flexDirection": "Column",
            "/slideTileWidth": "100%",
            "/slideTileHeight": "11rem",
            "/VerticalLayoutWidth": "100%",
            "/ParentVerticalLayoutWidth": "100%",
            "/hBoxJustifyContent": "Start",
            "/sizeBehavior": "Small",
            "/isPhoneScreen": true,
            "/insightsCardWidth": "17rem",
            "/insightsCardHeight": "23.5rem",
            "/insightsCardWidthOverflow":"17rem",
            "/insightsCardHeightOverflow": "2rem",
            "/pagesDropAreaOffset": 4,
            "/appsDropAreaOffset": 4
        },
        DEVICE_TYPES : {
            Desktop: "Desktop",
            Tablet: "Tablet",
            Mobile: "Mobile"
        },PLACEHOLDER_ITEMS_COUNT: 5,
        RECOMMENDED_APPS_LIMIT: 8,
        DEFAULT_CARD_RANK: 500,
        TODO_CARDS_LIMIT: 100,
        PAGE_SELECTION_LIMIT: 8,
        SECTIONS: {
            TODOS: "TODOS",
            PAGES: "PAGES",
            APPS: "APPS",
            LAYOUT: "LAYOUT",
            INSIGHTS: "INSIGHTS",
            INSIGHTS_TILES: "INSIGHTS_TILES",
            INSIGHTS_CARDS: "INSIGHTS_CARDS",
            NEWS_FEED: "NEWS_FEED"
        },
        SECTION_PARAMS: {
            TODOS: "ST1",
            INSIGHTS_TILES: "SI1",
            INSIGHTS_CARDS: "SI2"
        },
        DisplayFormat: {
            Standard: "standard",
            StandardWide: "standardWide"
        },
        DynamicAppsLength: "/dynamicApps/length",
        MyInsightStatus: "/myInsights/status",
        SECTIONS_ID:{
            "TODOS": "forMeToday",
            "PAGES": "myInterest",
            "APPS": "myApps",
            "INSIGHTS": "myInsights"
        },
    };
});