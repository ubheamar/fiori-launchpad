sap.ui.define(
    [
        "sap/ui/core/library",
        "sap/m/library",
        "sap/ui/base/Object",
        "sap/ui/core/format/DateFormat"
    ],
    function (coreLib, mLib, BaseObject, DateFormat) {
        var ValueColor = mLib.ValueColor;
        var Priority = mLib.Priority ? mLib.Priority : coreLib.Priority;

        var oRelativeDateTimeFormatter = DateFormat.getDateTimeInstance({
            style: "medium",
            relative: true,
            relativeStyle:"short"
        });

        var oRelativeDateFormatter = DateFormat.getDateInstance({
            relative: true
        });

        var oDateGroupPatternFormatter = DateFormat.getDateInstance({
            pattern: "MMMM d, yyyy"
        });

        var DataFormatUtils = BaseObject.extend("shellpoc.utils.DataFormatUtils", {});

        DataFormatUtils.toPriority = function (oTask) {
            switch (oTask.criticality) {
                case ValueColor.Error:
                    return 1;
                case ValueColor.Critical:
                    return 2;
                case ValueColor.Neutral:
                    return 3;
                default:
                    return 99;
            }
        };

        DataFormatUtils.toTaskPriority = function (sPriority) {
            switch (sPriority) {
                case "VERY_HIGH":
                    return (Priority.VeryHigh ? Priority.VeryHigh : Priority.None);
                case "HIGH":
                    return Priority.High;
                case "MEDIUM":
                    return Priority.Medium;
                case "LOW":
                    return Priority.Low;
                default:
                    return Priority.None;
            }
        };

        DataFormatUtils.toTaskPriorityText = function (sPriority) {
            switch (sPriority) {
                case "VERY_HIGH":
                    return "veryHighPriority";
                case "HIGH":
                    return "highPriority";
                case "MEDIUM":
                    return "mediumPriority";
                case "LOW":
                    return "lowPriority";
                default:
                    return "nonePriority";
            }
        };

        /**
         * Formats a given date as a relative date and time string.
         *
         * @param {Date} oDate - The input date to format as a relative date and time string.
         * @returns {string} A string representing the input date in a relative date and time format.
         */
        DataFormatUtils.toRelativeDateTime = function (oDate) {
            return oRelativeDateTimeFormatter.format(new Date(oDate));
        };

        DataFormatUtils.toGroupDate = function (oDate) {
            return oDateGroupPatternFormatter.format(new Date(oDate));
        };

        //set the time part same to get just the date info
        DataFormatUtils.setConstantTimeInDate = function (date) {
            return new Date(date).setHours(12, 0, 0, 0);
        };

        //get days before a given date
        // get the timestamp of a date, nDays before the oCurrentDate, eg. if 12/11/23 is oCurrentDate and nDays is 1, function should return
        // timestamp of 11/11/23
        DataFormatUtils.getDaysBefore = function (oCurrentDate, nDays) {
           return this.setConstantTimeInDate(new Date(oCurrentDate).setDate(oCurrentDate.getDate() - nDays));
        };
        /**
         * function to calculate the start and end dates for a specific week based on the current date
         *
         * @param {Number} weekOffset - The offset indicating which week to calculate, eg. for this week
         * weekOffset will be 0, last week will be 1 and so on
         * @returns {Object} with startDate and endDate
         */
        DataFormatUtils.getWeekRangeValues = function (weekOffset) {
            var currentDate = new Date();
            // Calculate the start of the current week (with sunday as the first day of the week)
            var startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - currentDate.getDay() - 7 * weekOffset);

            // Calculate the end of the week
            var endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            return { startDate: startDate, endDate: endDate };
        };
        /**
         * Converts a given date to a relative date string.
         *
         * @param {Date} iTimeStamp - The input timestamp to convert to a relative date string.
         * @returns {string} A relative date string with the first letter capitalized.
         */
        DataFormatUtils.toRelativeDate = function (iTimeStamp) {
            var sRelativeDate = oRelativeDateFormatter.format(new Date(iTimeStamp));
            return sRelativeDate.charAt(0).toUpperCase() + sRelativeDate.slice(1);
        };

        DataFormatUtils.createBookMarkData = function (oBookMark) {
            var finalBookMarkData = {
                title: oBookMark.title,
                url: oBookMark.targetURL,
                icon: oBookMark.icon,
                info: oBookMark.info,
                subtitle: oBookMark.subtitle,
                serviceUrl: oBookMark.indicatorDataSource && oBookMark.indicatorDataSource.path,
                numberUnit: oBookMark.numberUnit,
                vizType: oBookMark.vizType,
                vizConfig: oBookMark.vizConfig
            };
            return finalBookMarkData;
        };

        return DataFormatUtils;
    }
);