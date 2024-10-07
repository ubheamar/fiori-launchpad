sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/Device",
    "./AppConstants"
  ], function (BaseObject, Device, AppConstants) {
    "use strict";
  
    var ScreenSizes = {
      phone: 240,
      tablet: 600,
      desktop: 1024,
      xxsmall: 240,
      xsmall: 320,
      small: 480,
      medium: 560,
      large: 768,
      xlarge: 960,
      xxlarge: 1120,
      xxxlarge: 1440
    };
  
    var DeviceType = BaseObject.extend("shellpoc.utils.DeviceType", {});
  
    DeviceType.getDeviceType = function() {
        var sDeviceType;
        if (Device.resize.width >= ScreenSizes.xsmall && Device.resize.width < ScreenSizes.tablet) {
            //Screen between 320 - 600
            sDeviceType = AppConstants.DEVICE_TYPES.Mobile;
        } else if (Device.resize.width >= ScreenSizes.tablet && Device.resize.width < ScreenSizes.desktop) {
            //Screen between 600 - 1024
            sDeviceType = AppConstants.DEVICE_TYPES.Tablet;
        } else {
            //Screen greater than 1024
            sDeviceType = AppConstants.DEVICE_TYPES.Desktop;
        }
        return sDeviceType;
      };
  
    DeviceType.getDeviceWidth = function() {
      return Device.resize.width;
    };
    
    return DeviceType;
  });