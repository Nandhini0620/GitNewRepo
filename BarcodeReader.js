/**
* BarcodeReader.js
* @file This is the JavaScript file the customer web application includes.
* It defines the public scanning web interfaces, utility functions, and error
* codes. Depends on the platform and decoder type, it will dynamically load
* other JavaScript files that contain platform/decoder specific implementation.
* @version 1.00.00.0
*/

/**
 * This object provides utility methods.
 */
var scripts = document.currentScript;
var fullpath = scripts.src;
fullpath = fullpath.substring(0,fullpath.lastIndexOf("/")+1);
var HoneywellBarcodeReaderUtils =
{
    BRIDGE_TYPE_AJAX : "AJAX",
    BRIDGE_TYPE_NATIVE_WINRT_OBJECT : "NativeWinRTObject",
    BRIDGE_TYPE_NPAPI : "NPAPI",
    BRIDGE_TYPE_NONE : "None",  // Unable to find a JavaScript to Native bridge.
    DECODER_TYPE_SWIFT : "Swift",
    DECODER_TYPE_INTERMEC : "In2Decode",
    MSG_OPERATION_COMPLETED : "Operation completed successfully.",
    embedNode : null,
    bridgeType : null,
    bcrPlugin : null,
    barcodeReaderObjName : null,

    checkNpapiPlugin: function()
    {
        if(!this.embedNode)
        {
            try
            {
                //Try the NPAPI Plugin
                this.embedNode = document.createElement( "embed" );
                this.embedNode.setAttribute( "id", "bcrPlugin" );
                this.embedNode.setAttribute( "width", "0" );
                this.embedNode.setAttribute( "height", "0" );
                this.embedNode.setAttribute( "type", "application/x-npBarcodeReaderPlugin" );
                document.body.appendChild( this.embedNode );

                this.bcrPlugin = document.getElementById( "bcrPlugin" );
                this.bcrPlugin.ITCLogString( "Found bcrPlugin element" );
                this.bridgeType = this.BRIDGE_TYPE_NPAPI;
            }
            catch(err)
            {
                return false;
            }
        }
        return true;
    },

    /**
     * Converts the setting value from the scanner to the value expected
     * in the Web API.
     * @param {Object} settingDef An object containing the setting definition.
     * @param {string} scannerSettingValue A string containing the scanner
     * setting value.
     * @param {Object} result An object to receive the conversion result.
     * The converted value is returned in result.value.
     * @returns {boolean} A Boolean true indicates a successful conversion.
     */
    convertScannerSettingValue : function (settingDef, scannerSettingValue, result)
    {
        var bSuccess = false;

        if (result && this.hasProperty(settingDef, "valueType", true))
        {
            if (settingDef.valueType === "map")
            {
                if (this.hasProperty(settingDef, "reverseValueMap", true) &&
                    settingDef.reverseValueMap instanceof Array)
                {
                    var asteriskValue;
                    // Uses the map to converts the scanner setting value to
                    // the value expected by the API.
                    for (var i=0, mapLen=settingDef.reverseValueMap.length; i < mapLen; i++)
                    {
                        for (var propertyName in settingDef.reverseValueMap[i])
                        {
                            if (propertyName === scannerSettingValue)
                            {
                                result.value = settingDef.reverseValueMap[i][propertyName];
                                bSuccess = true;
                                break;
                            }
                            else if (propertyName === "*") // Match all other values
                            {
                                asteriskValue = settingDef.reverseValueMap[i][propertyName];
                            }
                        }
                    } //endfor i

                    if (!bSuccess && typeof(asteriskValue) !== "undefined")
                    {
                        result.value = asteriskValue;
                        bSuccess = true;
                    }
                }
                else if (this.hasProperty(settingDef, "valueMap", true) &&
                    settingDef.valueMap instanceof Array)
                {
                    // Uses the map to converts the scanner setting value to
                    // the value expected by the API.
                    for (var i=0, mapLen=settingDef.valueMap.length; i < mapLen; i++)
                    {
                        for (var propertyName in settingDef.valueMap[i])
                        {
                            if (settingDef.valueMap[i][propertyName] === scannerSettingValue)
                            {
                                result.value = propertyName;
                                bSuccess = true;
                                break;
                            }
                        }
                    }
                }
            }
            else if (settingDef.valueType === "int")
            {
                result.value = scannerSettingValue.toString();
                bSuccess = true;
            }
            else
            {
                if (typeof(scannerSettingValue) === "string")
                {
                    result.value = scannerSettingValue;
                    bSuccess = true;
                }
            }
        }

        return bSuccess;
    },
	
    /**
    * Gets a random integer value.
    *
    * @param {integer} min floor of the random number
    * @param {integer} max max of the random number
    * @return {integer} value the random number
    */
    getRandomInt: function (min, max)
    {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
    * Gets the setting definition of the specified family, key, and option
    * parameters in the specified settings definition object. If a combination
    * of family, key and option cannot be found in settingsDef, an error code
    * is returned in the returned result object.
    *
    * @param {Object} settingsDef An object containing the settings definition.
    * @param {string} family A string containing the setting family name.
    * @param {string} key A string containing the setting key name.
    * @param {string} option A string containing the setting option name.
    * @param {string} value A string containing the setting value.
    * @param {boolean} verifyValue A boolean value indicating whether to
    * verify the value parameter.
    * @return {Object} An object containing the setting definition and the
    * execution status of this method. It has the following properties:
    *   status - 0 for success. All other values indicate error.
    *   mesage - A string containing a human readable message for the status.
    *   command - A string containing the scanner command. This property only
    *             exists if a setting matching the family, key, option is found.
    *   valueType - A string that identifies the type of the setting value.
    *   valueMap (optional) - An array of mappings between Web API setting values
    *            and scanner setting values. It is only present if the
    *            valueType is "map".
    *   values (optional) - An array of acceptable values which do not require
    *            mapping between Web API and scanner setting value.
    *   valueRange (optional) - An array of min and max integer values.
    */
    getSettingDef: function (settingsDef, family, key, option, value, verifyValue)
    {
        var result = new Object();
        var foundFamily = false;
        result.status = 0;  // Successful status
        result.message = this.MSG_OPERATION_COMPLETED;
        result.family = family;
        result.key = key;
        result.option = option;

        if (settingsDef && (settingsDef instanceof Array))
        {
            for (var i=0, len=settingsDef.length; i < len && result.status === 0; i++)
            {
                var setting = settingsDef[i];

                if (this.hasProperty(setting, "family", true) && // setting contains a non-null "family"
                    setting.family === family )
                {
                    if (!foundFamily)
                    {
                        foundFamily = true;
                    }
                    if (this.hasProperty(setting, "key", true) && // setting contains a non-null "key"
                        setting.key === key &&
                        this.hasProperty(setting, "option", true) && // setting contains a non-null "option"
                        setting.option === option)
                    { // Found the combination of family, key and option.
                        if (this.hasProperty(setting, "command", true))
                        {
                            result.command = setting.command;
                        }
                        else
                        {
                            result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                            result.message = "Setting definition missing command property.";
                            break;
                        }

                        if (this.hasProperty(setting, "valueType", true))
                        {
                            result.valueType = setting.valueType;

                            if (setting.valueType === "map")
                            {
                                if (this.hasProperty(setting, "valueMap", true))
                                {
                                    if (setting.valueMap instanceof Array)
                                    {
                                        result.valueMap = setting.valueMap;

                                        if (verifyValue)
                                        {
                                            if ( typeof(value) !== "undefined" )
                                            {
                                                // Verify the specified value is in the map and also gets the
                                                // scanner expected value.
                                                for (var j=0, mapLen=setting.valueMap.length; j < mapLen; j++)
                                                {
                                                    if (this.hasProperty(setting.valueMap[j], value, true))
                                                    {
                                                        result.value = setting.valueMap[j][value];
                                                        break;
                                                    }
                                                } //endfor j
                                                if (typeof(result.value) === "undefined")
                                                {
                                                    result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                                    result.message = "Invalid setting value.";
                                                }
                                            }
                                            else
                                            {
                                                result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                                result.message = "Invalid setting value.";
                                            }
                                        }
                                    }
                                    else
                                    {
                                        result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                                        result.message = "Settings definition has invalid valueMap property, not an array.";
                                    }
                                }
                                else
                                {
                                    result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                                    result.message = "Settings definition missing valueMap property for map type.";
                                }

                                if (this.hasProperty(setting, "reverseValueMap", true))
                                {
                                    if (setting.reverseValueMap instanceof Array)
                                    {
                                        // Saves the reverseValueMap.
                                        result.reverseValueMap = setting.reverseValueMap;
                                    }
                                    else
                                    {
                                        result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                                        result.message = "Settings definition has invalid reverseValueMap property, not an array.";
                                    }
                                }
                            }
                            else if (setting.valueType === "int")
                            {
                                if (this.hasProperty(setting, "valueRange", true))
                                {
                                    if (setting.valueRange instanceof Array)
                                    {
                                        // Saving the valueRange for generating the EXM file.
                                        // Let the decoder decide whether the value is out of range.
                                        result.valueRange = setting.valueRange;
                                        if (verifyValue)
                                        {
                                            if (value && !isNaN(value))
                                            {
                                                result.value = parseInt(value);
                                            }
                                            else
                                            {
                                                result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                                result.message = "Invalid setting value, not a number.";
                                            }
                                        }
                                    }
                                    else
                                    {
                                        result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                                        result.message = "Setting definition has invalid valueRange property, not an array.";
                                    }
                                }
                                else
                                {
                                    result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                                    result.message = "Setting definition missing valueRange property for int type.";
                                }
                            }
                            else if (setting.valueType === "string")
                            {
                                if (verifyValue)
                                {
                                    result.value = value;
                                }
                            }
                            else if (setting.valueType === "list")
                            {
                                if (this.hasProperty(setting, "values", true))
                                {
                                    if (setting.values instanceof Array)
                                    {
                                        result.values = setting.values;

                                        if (verifyValue)
                                        {
                                            if ( typeof(value) !== "undefined" )
                                            {
                                                // Verify the specified value is in the list of acceptable values.
                                                for (var j=0, valuesLen=setting.values.length; j < valuesLen; j++)
                                                {
                                                    if (setting.values[j] === value)
                                                    {
                                                        result.value = value;
                                                        break;
                                                    }
                                                } //endfor j
                                                if (typeof(result.value) === "undefined" )
                                                {
                                                    result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                                    result.message = "Invalid setting value.";
                                                }
                                            }
                                            else
                                            {
                                                result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                                result.message = "Invalid setting value.";
                                            }
                                        }
                                    }
                                    else
                                    {
                                        result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                                        result.message = "Setting definition has invalid values property, not an array.";
                                    }
                                }
                                else
                                {
                                    result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                                    result.message = "Setting definition missing values property for list type.";
                                }
                            } //endif (setting.valueType === "list")
                            else
                            {
                                result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                                result.message = "Unsupported setting value data type: " + setting.valueType;
                            }
                        } //endif (this.hasProperty(setting, "valueType", true))
                        else
                        {
                            result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
                            result.message = "Setting definition missing valueType property.";
                        }
                    } //endif found key and option
                } //endif found family
            } //endfor i

            if (result.status === 0 && !result.command) // Setting definition was not found
            {
                if (!foundFamily)
                {
                    result.status = HoneywellBarcodeReaderErrors.UNSUPPORTED_FAMILY_NAME;
                    result.message = "Unsupported family name: " + family;
                }
                else
                {
                    result.status = HoneywellBarcodeReaderErrors.UNSUPPORTED_KEY_OR_OPTION;
                    result.message = "Unsupported key or option name";
                }
            }
        } //endif (settingsDef && (settingsDef instanceof Array))
        else
        {
            result.status = HoneywellBarcodeReaderErrors.INVALID_SETTINGS_DEF;
            result.message = "Invalid settings definition object, needs to be an array.";
        }

        return result;
    },

    /**
     * Gets the symbology name based on the specified honeywellId and aimId.
     *
     * @param (string) honeywellId A string containing the honeywell symbology
     * ID (1 character).
     * @param (string) aimId A string containing the AIM ID (3 characters,
     * first character is ']').
     * @returns (string) A symbology name or null if a match is not found.
     */
    getSymbologyName: function (honeywellId, aimId)
    {
        var symbName = "";
        var len = HoneywellSymbologyIDTable.length;
        var i, symbIndex = 0;

        if (!honeywellId)
        {
            return symbName;
        }

        for (i=0; i<len; i++)
        {
            if (honeywellId === HoneywellSymbologyIDTable[i].honeywellId)
            {
                symbName = HoneywellSymbologyIDTable[i].name;
                symbIndex = i;
                break;
            }
        }

        // Honeywell ID is sufficient to differentiate most symbologies.
        // The following handles the exceptions.
        if (symbName && aimId)
        {
            if (honeywellId === "j")  // Code 128
            {
                //Attempt to find a matched aimId
                for (i=symbIndex; i<len; i++)
                {
                    // Skip the first character ']' in aimId for comparison.
                    if (aimId.indexOf(HoneywellSymbologyIDTable[i].aimId, 1) === 1)
                    {
                        symbName = HoneywellSymbologyIDTable[i].name;
                        break;
                    }
                }
            }
        }

        return symbName;
    },

    /**
     * Checks whether the specified object is a valid JSON-RPC error object.
     * @param {Object} objToCheck The object to be checked.
     * @return {boolean}
     */
    hasJsonRpcError: function (objToCheck)
    {
        if (typeof(objToCheck) === "object")
        {
            if (objToCheck.hasOwnProperty("error") && objToCheck.error)
            {
                return (objToCheck.error.hasOwnProperty("code") &&
                        objToCheck.error.hasOwnProperty("message"));
            }
        }
        return false;
    },

    /**
     * Checks whether the specified object has the specified property. If the
     * checkNull parameter is true, he returned value is true if the specified
     * property exists and is not null.
     * @param {Object} objToCheck The object to be checked.
     * @param {String} propertyName
     * @param {boolean} checkNull Specifies whether to check if the
     * result property is null.
     * @return {boolean}
     */
    hasProperty: function (objToCheck, propertyName, checkNull)
    {
        if (typeof(objToCheck) === "object")
        {
            if (objToCheck.hasOwnProperty(propertyName))
            {
                return (checkNull) ? (objToCheck[propertyName] !== null) : true;
            }
        }
        return false;
    },

    /**
    * Tests to see if the specified parameters is a function.
    *
    * @param {function} possibleFunction function to be validated
    * @return {boolean} result true if the function exists and false if it does not
    */
    isFunction: function (possibleFunction)
    {
        return (typeof(possibleFunction) == typeof(Function));
    },

    /**
     * Dynamically loads the specifed JavaScript file.
     * @param {string} url An URL specifying the location of the JavaScript file.
     * @param {function} callback A callback function to be called after the
     * JavaScript file is loaded.
     */
    loadJavaScript: function (url, callback)
    {
        var scriptElement = document.createElement('script');
        scriptElement.setAttribute("type","text/javascript");
        scriptElement.setAttribute("src", fullpath+url);

        if (this.isFunction(callback))
        {
            scriptElement.onload = callback;
        }

        document.getElementsByTagName("head")[0].appendChild(scriptElement);
    },

    /**
    * Sends a AJAX request with a JSON-RPC request message to the specified
    * subsytem.
    *
    * @param {string} subsystem A string containing the destination subsystem name.
    * @param {Object} request A object containing the properties to be used for
    * the JSON-RPC requst.
    * @param {function(Object)} onComplete A callback function to receive the
    * execution result of this method.
    */
    sendJsonRpcRequestSubSys: function (subsystem, request, onComplete)
    {
        var utilContext = this;
        var xmlhttp;
        var id = this.getRandomInt(10000, 99999);
        request.id = id;
        request.jsonrpc = "2.0";

        if (window.XMLHttpRequest)
        {
            xmlhttp = new XMLHttpRequest(); // code for IE7+, Firefox, Chrome, Opera, Safari
        }
        else
        {
            if(utilContext.isFunction(onComplete))
            {
                var response = new Object();
                response.jsonrpc = "2.0";
                response.id = id;
                response.error = new Object();
                response.error.code = HoneywellBarcodeReaderErrors.AJAX_NOT_SUPPORTED;
                response.error.message = "Browser does not support XMLHttpRequest";
                setTimeout(function(){onComplete(response);},0);
            }
            return;
        }

        xmlhttp.onreadystatechange = function()
        {
            if (xmlhttp.readyState==4)
            {
                if (xmlhttp.status==200)
                {
                    var response;
                    try
                    {
                        response = JSON.parse(xmlhttp.responseText);
                    }
                    catch (err)
                    {
                        // Return error to the onComplete callback
                        if (utilContext.isFunction(onComplete))
                        {
                            response = new Object();
                            response.jsonrpc = "2.0";
                            response.id = id;
                            response.error = new Object();
                            response.error.code = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                            response.error.message = "JSON-RPC parsing error in response.";

                            setTimeout(function(){ onComplete(response); }, 0);
                        }
                        return;
                    }

                    if (id == response.id)
                    {
                        if (utilContext.isFunction(onComplete))
                        {
                            setTimeout(function(){ onComplete(response); }, 0);
                        }
                    }
                }
                else
                {
                    if (utilContext.isFunction(onComplete))
                    {
                        var response = new Object();
                        response.jsonrpc = "2.0";
                        response.id = id;
                        response.error = new Object();
                        response.error.code = HoneywellBarcodeReaderErrors.WEB_SERVICE_NOT_RESPONDING;
                        response.error.message = "Web service not responding.";

                        setTimeout(function(){onComplete(response);},0);
                    }
                }
            }
        } //endof xmlhttp.onreadystatechange

        xmlhttp.open("POST", "http://127.0.0.1:8080/jsonrpc/" + subsystem,
                     true); //true (asynchronous) or false (synchronous)
        xmlhttp.send(JSON.stringify(request));
    }, //endof sendJsonRpcRequestSubSys method

    /**
     * Determines which JavaScript file to load for the platform specific
     * implementation.
     */
    setup: function ()
    {
        var xmlhttp;
        var utilContext = this;

        if (!utilContext.bridgeType)
        {
            if (typeof (win10EnterpriseBrowserInfo) !== 'undefined')
            {
                utilContext.bridgeType = utilContext.BRIDGE_TYPE_NATIVE_WINRT_OBJECT;

                if (typeof(HoneywellBarcodeReaderSwiftWin) === "undefined")
                {
                    utilContext.loadJavaScript(
                        "BarcodeReader-Swift-Win.js", function () {
                            // This function is invoked after BarcodeReader-Swift-Win.js is loaded.
                            utilContext.barcodeReaderObjName = "HoneywellBarcodeReaderSwiftWin";
                        });
                }

                if (typeof(HowneywellBarcodeReaderSwiftSettings) === "undefined")
                {
                    utilContext.loadJavaScript("BarcodeReader-SwiftSettings.js");
                }

                if (typeof(HowneywellBarcodeReaderRingSettings) === "undefined")
                {
                    utilContext.loadJavaScript("BarcodeReader-WinRingSettings.js");
                }
            }
            else
            {
                if (utilContext.checkNpapiPlugin() == false)
                {
                    var request = new Object();
                    // The scanner.getInfo method is only supported on the
                    // Paris/Helsinki DCS.
                    request.method = "scanner.getInfo";

                    utilContext.sendJsonRpcRequestSubSys('datacollection', request, function(response) {
                        if (utilContext.hasProperty(response, "result", true) ||
                            utilContext.hasJsonRpcError(response)) // Accept either sucess or error response
                        {
                            utilContext.bridgeType = utilContext.BRIDGE_TYPE_AJAX;
                            if (typeof (HoneywellBarcodeReaderAjax) === "undefined")
                            {
                                utilContext.loadJavaScript(
                                    "BarcodeReader-Ajax.js", function () {
                                        // This function is invoked after BarcodeReader-Ajax.js is loaded.
                                        utilContext.barcodeReaderObjName = "HoneywellBarcodeReaderAjax";
                                    });
                            }

                            if (typeof(HowneywellBarcodeReaderSwiftSettings) === "undefined")
                            {
                                utilContext.loadJavaScript("BarcodeReader-SwiftSettings.js");
                            }
                        }
                    });
                }
            }
        }
    }, //endof setup method

    /**
     * Checks parameter type and throws a message if not correct. Note: This
     * method cannot verify Array type.
     *
     * @param {Object}   param Parameter to be checked.
     * @param {string}   paramName Name of parameter for error message use.
     * @param {string}   paramType String name for parameter type expected.
     * @return {boolean} true if parameter type is correct.
     * @param {function(Object)} onComplete Function to be called on incorrect
     * type with the error message.
     */
    stdParamCheck: function (param, paramName, paramType, onComplete)
    {
        if (typeof(param) === paramType)
        {
            return true;
        }

        if (this.isFunction(onComplete))
        {
            setTimeout(function(){onComplete(
                {"status":HoneywellBarcodeReaderErrors.INVALID_PARAMETER,
                 "message":"Invalid parameter: " + paramName + ", must be " + paramType});},0);
        }
        return false;
    },

    /**
     * Checks parameter type and throws a message if not correct.
     *
     * @param {Object}   param Parameter to be checked.
     * @param {string}   paramName Name of parameter for error message use.
     * @param {string}   paramType String name for parameter type expected.
     * @param {Object}   result If present, the status and message properties
     * will be added to this object.
     * @return {boolean} true if parameter type is correct.
     * @param {function(Object)} onComplete Function to be called on incorrect
     * type with the error message.
     */
    stdParamCheckResult: function (param, paramName, paramType, result, onComplete)
    {
        if (typeof(param) === paramType)
        {
            return true;
        }

        if (this.isFunction(onComplete))
        {
            if (result)
            {
                result.status = HoneywellBarcodeReaderErrors.INVALID_PARAMETER;
                result.message = "Invalid parameter: " + paramName + ", must be " + paramType;
                setTimeout(function(){onComplete(result);},0);
            }
            else
            {
                setTimeout(function(){onComplete({
                    "status":HoneywellBarcodeReaderErrors.INVALID_PARAMETER,
                    "message":"Invalid parameter: " + paramName + ", must be " + paramType});},0);
            }
        }
        return false;
    },

    /**
     * Checks for errors with the JSON-RPC response and takes appropriate action.
     * @param {Object} jsonrpcResponse A JSON-RPC response object.
     * @param {function(Object)} onComplete A callback function to be called
     * to deliver result.
     * @returns {boolean}
     *  result true if successful response
     *  result false if error response
     */
    stdErrorCheck: function (jsonrpcResponse, onComplete)
    {
        var utilContext = this;

        // Checks if the response contains a result property (null is acceptable).
        if (this.hasProperty(jsonrpcResponse, "result", false))
        {
            if (this.isFunction(onComplete))
            {
                // Return a successful status to the onComplete callback
                setTimeout(function(){onComplete({
                    "status":0,
                    "message":utilContext.MSG_OPERATION_COMPLETED});},0);
            }
            return true;
        }
        else if (this.hasJsonRpcError(jsonrpcResponse))
        {
            if (this.isFunction(onComplete))
            {
                // Return error to the onComplete callback
                setTimeout(function(){onComplete({
                    "status":jsonrpcResponse.error.code,
                    "message":jsonrpcResponse.error.message});},0);
            }
        }
        else
        {
            if (this.isFunction(onComplete))
            {
                // Return error to the onComplete callback
                setTimeout(function(){onComplete({
                    "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                    "message":"JSON-RPC parsing error in response."});},0);
            }
        }

        return false;
    } //endof stdErrorCheck method
}; //endof var HoneywellBarcodeReaderUtils

/**
 * This object defines the error codes.
 */
var HoneywellBarcodeReaderErrors =
{
    JS_BARCODE_READER_FACILITY_CODE : 2337,  // 0x0921
    ERROR_CODE_BASE : 16500,

    JSON_PARSE_ERROR : -32700,
    FEATURE_NOT_SUPPORTED : -1994391502,
    FUNCTION_FAILED : -1994389925,  // Generic error code, usually indicates unexpected error.
    INVALID_PARAMETER : -1994391465,
    INSUFFICIENT_BUFFER_SIZE : -1994391430,
    OUT_OF_MEMORY : -1994391544,
    INVALID_SETTING_VALUE : -1994326003,
    SCANNER_NOT_FOUND : -1994375551,
    SETTING_VALUE_EXCEED_MAX_LEN : -1994309986,
    SETTING_VALUE_OUT_OF_RANGE : -1994309985,
    UNSUPPORTED_FAMILY_NAME : -1994309984,
    UNSUPPORTED_KEY_OR_OPTION : -1994309983,
    CHAR_CONVERSION_ERROR : -1994309982,

    get NO_CONNECTION () { return this.formatError(1229); },
    get NO_AVAILABLE_BRIDGE () { return this.formatError(this.ERROR_CODE_BASE + 1); },
    get AJAX_NOT_SUPPORTED () { return this.formatError(this.ERROR_CODE_BASE + 2); },
    get WEB_SERVICE_NOT_RESPONDING () { return this.formatError(this.ERROR_CODE_BASE + 3); },
    get MISSING_SETTINGS_DEF () { return this.formatError(this.ERROR_CODE_BASE + 4); },
    get INVALID_SETTINGS_DEF () { return this.formatError(this.ERROR_CODE_BASE + 5); },
    get EMPTY_COMMIT_BUFFER () { return this.formatError(this.ERROR_CODE_BASE + 6); },

    formatError : function (aErrorCode)
    {
        var retCode = 0;
        if ((aErrorCode != 0) && (aErrorCode & 0xFFFF0000) == 0)
        {
            retCode = 0x80000000 | (this.JS_BARCODE_READER_FACILITY_CODE << 16) | aErrorCode;
        }
        return retCode;
    }
}; //endof var HoneywellBarcodeReaderErrors

var HoneywellSymbologyIDTable =
[
    {
        "name" : "AUSTRALIAPOST",
        "honeywellId" : "A",
        "aimId" : "X0"
    },
    {
        "name" : "AZTEC",
        "honeywellId" : "z",
        "aimId" : "z3"
    },
    {
        "name" : "BPO",
        "honeywellId" : "B",
        "aimId" : "X0"
    },
    {
        "name" : "CANADAPOST",
        "honeywellId" : "C",
        "aimId" : "X0"
    },
    {
        "name" : "CODABAR",
        "honeywellId" : "a",
        "aimId" : "F0"
    },
    {
        "name" : "CodablockA",
        "honeywellId" : "V",
        "aimId" : "O6"
    },
    {
        "name" : "CodablockF",
        "honeywellId" : "q",
        "aimId" : "O4"
    },
    {
        "name" : "Code11",
        "honeywellId" : "h",
        "aimId" : "H1"
    },
    {
        "name" : "Code39",
        "honeywellId" : "b",
        "aimId" : "A0"
    },
    {
        "name" : "Code93",
        "honeywellId" : "i",
        "aimId" : "G0"
    },
    {
        "name" : "Code128",
        "honeywellId" : "j",
        "aimId" : "C0"
    },
    {
        "name" : "GS1_128",
        "honeywellId" : "I",
        "aimId" : "C1"
    },
    {
        "name" : "ISBT128",
        "honeywellId" : "j",
        "aimId" : "C4"
    },
    {
        "name" : "DATAMATRIX",
        "honeywellId" : "w",
        "aimId" : "d1"
    },
    {
        "name" : "DOTCODE",
        "honeywellId" : ".",
        "aimId" : "J0"
    },
    {
        "name" : "DIGIMARC",
        "honeywellId" : "|",
        "aimId" : "X0"
    },
    {
        "name" : "EAN8",
        "honeywellId" : "D",
        "aimId" : "E4"
    },
    {
        "name" : "EAN13",
        "honeywellId" : "d",
        "aimId" : "E0"
    },
    {
        "name" : "CHINAPOST",
        "honeywellId" : "Q",
        "aimId" : "X0"
    },
    {
        "name" : "DUTCHPOST",
        "honeywellId" : "K",
        "aimId" : "X0"
    },
    {
        "name" : "GridMatrix",
        "honeywellId" : "X",
        "aimId" : "g0"
    },
    {
        "name" : "GS1EX",  // Gs1DatabarType3 - GS1 DataBar Expanded
        "honeywellId" : "}",
        "aimId" : "e0"
    },
    {
        "name" : "GS1LI",  // Gs1DatabarType2 - GS1 DataBar Limited
        "honeywellId" : "{",
        "aimId" : "e0"
    },
    {
        "name" : "GS1OD",  // Gs1DatabarType1 - GS1 DataBar Omnidirectional
        "honeywellId" : "y",
        "aimId" : "e0"
    },
    {
        "name" : "HANXIN",
        "honeywellId" : "H",
        "aimId" : "X0"
    },
    {
        "name" : "INFOMAIL",
        "honeywellId" : ",",
        "aimId" : "X0"
    },
    {
        "name" : "INTELLIGENTMAIL",
        "honeywellId" : "M",
        "aimId" : "X0"
    },
    {
        "name" : "ITF",    // Interleaved 2 of 5
        "honeywellId" : "e",
        "aimId" : "I0"
    },
    {
        "name" : "ITFMatrix",  // Matrix 2 of 5
        "honeywellId" : "m",
        "aimId" : "X0"
    },
    {
        "name" : "ITFStandard",  // Standard 2 of 5
        "honeywellId" : "f",
        "aimId" : "S0"
    },
    {
        "name" : "JAPANPOST",
        "honeywellId" : "J",
        "aimId" : "X0"
    },
    {
        "name" : "KOREANPOST",
        "honeywellId" : "?",
        "aimId" : "X0"
    },
    {
        "name" : "MAXICODE",
        "honeywellId" : "x",
        "aimId" : "U0"
    },
    {
        "name" : "MICROPDF",
        "honeywellId" : "R",
        "aimId" : "L0"
    },
    {
        "name" : "MSI",
        "honeywellId" : "g",
        "aimId" : "M0"
    },
    {
        "name" : "PDF417",
        "honeywellId" : "r",
        "aimId" : "L0"
    },
    {
        "name" : "PLANET",
        "honeywellId" : "L",
        "aimId" : "X0"
    },
    {
        "name" : "POSTNET",
        "honeywellId" : "P",
        "aimId" : "X0"
    },
    {
        "name" : "QR",   // QR Code
        "honeywellId" : "s",
        "aimId" : "Q1"
    },
    {
        "name" : "SWEDENPOST",
        "honeywellId" : "[",
        "aimId" : "X0"
    },
    {
        "name" : "TELEPEN",
        "honeywellId" : "t",
        "aimId" : "B1"
    },
    {
        "name" : "TLC39",
        "honeywellId" : "T",
        "aimId" : "L2"
    },
    {
        "name" : "TRIOPTIC",
        "honeywellId" : "=",
        "aimId" : "X0"
    },
    {
        "name" : "UPCA",
        "honeywellId" : "c",
        "aimId" : "E0"
    },
    {
        "name" : "UPCCoupon",
        "honeywellId" : ";",
        "aimId" : "E0"
    },
    {
        "name" : "UPCE",
        "honeywellId" : "E",
        "aimId" : "E0"
    }
];


var HoneywellBarcodeReaderWebEventDispatcher =
{
    defaultScannerName : "dcs.scanner.imager",

    create : function(serviceName)
    {
        // Private properties
        var methodUrl = "http://127.0.0.1:8080/jsonrpc/" + serviceName;
        var eventUrl = methodUrl + "/events";
        var eventsEnabled = false;
        var session = null;
        var eventFilter = null;
        var id = 1;
        var eventCallback = function(){};
        var eventErrorCallback = function(){};
        var handleDocVisibilityChangeEvent;
        var docHiddenPropName, docVisibilityChangeEventName;

        function log(header, msg)
        {
            if (typeof (HoneywellBarcodeReaderUtils.log) === typeof (Function))
            {
                var headerStr = (header) ? header + " " : "";
                if (typeof msg === "object")
                {
                    HoneywellBarcodeReaderUtils.log(headerStr + JSON.stringify(msg));
                }
                else
                {
                    HoneywellBarcodeReaderUtils.log(headerStr + msg);
                }
            }
        }

        var addDocVisibilityChangeEventListener = function ()
        {
            if (!docHiddenPropName)
            {
                // Check whether the browser supports detection of the web page visibility.
                if (typeof document.webkitHidden !== "undefined")
                { // Android 4.4 Chrome
                  docHiddenPropName = "webkitHidden";
                  docVisibilityChangeEventName = "webkitvisibilitychange";
                }
                else if (typeof document.hidden !== "undefined")
                { // Standard HTML5 attribute
                  docHiddenPropName = "hidden";
                  docVisibilityChangeEventName = "visibilitychange";
                }
            }

            if (docHiddenPropName && typeof document.addEventListener !== "undefined")
            {
                // Only register one listener for the visibility change event.
                // If handleDocVisibilityChangeEvent has not been defined yet,
                // define the event handler function.
                if (!handleDocVisibilityChangeEvent)
                {
                    handleDocVisibilityChangeEvent = function ()
                    {
                        if (!document[docHiddenPropName])  // Web page is visible
                        {
                            // The web page may become visible because browser is
                            // brought to the foreground or waken from a sleep.
                            // When the device is suspended, the HTTP connection
                            // is closed which causes error in receiving the
                            // response of the previous XMLHttpRequest. In that case
                            // it will not retrieve any more events. The following
                            // logic attempts to restart the event pulling.
                            eventsEnabled = true;
                            requestEvents();
                            log("handleDocVisibilityChangeEvent", "requestEvents");
                        }
                    }
                    // Add an event listener for the visibility change of the web page.
                    document.addEventListener(docVisibilityChangeEventName,
                                              handleDocVisibilityChangeEvent, false);
                }
            }
        }

        var removeDocVisibilityChangeEventListener = function ()
        {
            if (handleDocVisibilityChangeEvent)
            {
                document.removeEventListener(docVisibilityChangeEventName,
                                             handleDocVisibilityChangeEvent);
                handleDocVisibilityChangeEvent = null;
            }
        }

        var enableEvents = function(enable)
        {
            if (enable != eventsEnabled)
            {
                eventsEnabled = enable;
                if (enable)
                {
                    requestEvents();
                }
            }
            // Regardless whether the new enable value matches the current
            // value, always perform the following logic.
            enable ? addDocVisibilityChangeEventListener() : removeDocVisibilityChangeEventListener();
        }

        // request events from the server
        var requestEvents = function()
        {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", eventUrl, true);
            xhr.setRequestHeader("Content-Type","application/json");

            // response to the getEvent RPC call
            xhr.onreadystatechange = function()
            {
                var resp;
                if (xhr.readyState == 4)
                {
                    if (xhr.status == 200)
                    {
                        try
                        {
                            resp = JSON.parse(xhr.responseText);

                            // Checks if the response contains a non-null result property.
                            if (HoneywellBarcodeReaderUtils.hasProperty(resp, "result", true))
                            {
                                // save the session identifier
                                var s = resp.result.session;
                                if (s)
                                {
                                    session = s;
                                }
                                if (HoneywellBarcodeReaderUtils.hasProperty(resp.result, "events", true))
                                {
                                    if( resp.result.events.length > 0 )
                                    {
                                        log("Barcode event response:",  resp);
                                    }
                                    var i, event;
                                    for (i=0; i<resp.result.events.length; i++)
                                    {
                                        event = resp.result.events[i];
                                        eventCallback(event.method, event.params, eventFilter);
                                    } //endfor
                                }

                                if (eventsEnabled)
                                {
                                    requestEvents();
                                }
                            }
                            else if (resp.error)
                            {
                                // We may get an error JSON-RPC response if a request
                                // was sent from the handleDocVisibilityChangeEvent
                                // function while the previous request was still being
                                // processed. In this case eventsEnabled shall remain
                                // true.
                                eventErrorCallback(resp.error.code, resp.error.message);
                                log("events.getNext error response:",  "code: " +
                                    resp.error.code + " message: " + resp.error.message);
                            }
                        }
                        catch(err)
                        {
                            log("Failed to handle response", xhr.responseText);
                            eventErrorCallback(-1, err.message);
                            eventsEnabled = false;
                        }
                    }
                    else
                    {
                        log("HTTP error", "status " + xhr.status + " " + xhr.statusText);
                        eventErrorCallback(xhr.status, xhr.statusText);
                        eventsEnabled = false;
                    }
                }
            } //xhr.onreadystatechange = function()

            // Compose the call to get events
            var command = {
                    id : id++,
                    jsonrpc : "2.0",
                    method : "events.getNext",
                    params : {
                        timeout : pub.eventTimeout
                    }
                };
            if (session)
            {
                command.params.session = session;
            }
            // New requirement for Helsinki
            if (eventFilter !== null)
            {
                command.params.filter = eventFilter;
            }

            // Post the call to get events
            try
            {
                //log("Post", command);
                xhr.send(JSON.stringify(command));
            }
            catch(err)
            {
                eventErrorCallback(xhr.status, xhr.statusText)
                eventsEnabled = false;
            }
        } // var requestEvents = function()

        // Public interface
        var pub = {};

        pub.eventTimeout = 60;

        // Start a session.
        // Parameters:
        //   settings - object
        //     settings.event - called when an event is received
        //       signature: function(event)
        //             event.method - string name of notification
        //             event.params:{} - parameter object for the notification
        //     settings.error - called when session stops due to error
        //       signature: function(error)
        //             error.code - integer error code from HTTP, or other
        //             error.message - text message associated with the error
        pub.startSession = function(settings) {
            eventCallback = HoneywellBarcodeReaderUtils.hasProperty(settings, "event", true) ? settings.event : function (){};
            eventErrorCallback = HoneywellBarcodeReaderUtils.hasProperty(settings, "error", true) ? settings.error : function (){};
            eventFilter = HoneywellBarcodeReaderUtils.hasProperty(settings, "filter", true) ? settings.filter : null;
            enableEvents(true);
            log(null,"Event session started");
        }

        pub.stopSession = function() {
            enableEvents(false);
            log(null, "Event session stopped");
        }
        return pub;
    } // create : function(serviceName)
}; //endof var HoneywellBarcodeReaderWebEventDispatcher

// Uses self-invoking anonymous function to provide closure and
// prevent global variables collision.
(function (namespaceObj) {
    var MAX_SETUP_WAIT_TIME = 60000;
    var _setupTime = 0;

    HoneywellBarcodeReaderUtils.setup();

    var waitForSetupToComplete = function (onSetupComplete)
    {
        if (!HoneywellBarcodeReaderUtils.barcodeReaderObjName)
        {
            if (_setupTime < MAX_SETUP_WAIT_TIME)
            {
                _setupTime += 100;
                setTimeout(function(){waitForSetupToComplete(onSetupComplete);}, 100);
            }
            else
            {
                setTimeout(function(){onSetupComplete();}, 0);
            }
        }
        else
        {
            setTimeout(function(){onSetupComplete();}, 0);
        }
    };

    /**
     * Connects to the scanner, claims and enables the scanner.
     * @constructor
     * @param {string} scannerName A string to identify the barcode reader.
     * @param {function} onComplete A callback function to receive the
     * execution result of this method.
     */
    namespaceObj.BarcodeReader = function (scannerName, onComplete)
    {
        var brContext = this;  // Saves the this context so it can be used in inner functions.

        waitForSetupToComplete(function() {
            if (HoneywellBarcodeReaderUtils.barcodeReaderObjName)
            {
                if (HoneywellBarcodeReaderUtils.barcodeReaderObjName === "HoneywellBarcodeReaderSwiftWin")
                {
                    // Creates an instance of HoneywellBarcodeReaderSwiftWin object to be used
                    // on the WE8H platform.
                    brContext.barcodeReader = new HoneywellBarcodeReaderSwiftWin(scannerName, onComplete);
                }
                else if (HoneywellBarcodeReaderUtils.barcodeReaderObjName === "HoneywellBarcodeReaderAjax")
                {
                    // Creates an instance of HoneywellBarcodeReaderAjax object to be used
                    // on the platforms supporting AJAX such as Android.
                    brContext.barcodeReader = new HoneywellBarcodeReaderAjax(scannerName, onComplete);
                }
                else
                {
                    if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                    {
                        setTimeout(function() { onComplete({
                            "status": HoneywellBarcodeReaderErrors.NO_AVAILABLE_BRIDGE,
                            "message": "No available JavaScript to Native bridge found." }); }, 0);
                    }
                }
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function() { onComplete({
                        "status": HoneywellBarcodeReaderErrors.NO_AVAILABLE_BRIDGE,
                        "message": "No available JavaScript to Native bridge found." }); }, 0);
                }
            }
        });
    };

    namespaceObj.BarcodeReader.prototype =
    {
        version: "1.00.00.0",  // Will be replaced during build
        barcodeReader : null,

        /**
         * Activates or deactivates the reader to start or stop decoding barcodes.
         * @param {boolean} on A boolean true activates the reader and false
         * deactivate the reader.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        activate : function (on, onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.activate) !== 'undefined')
            {
                this.barcodeReader.activate(on, onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Registers the specified event handler for the specified event type.
         * Multiple event handlers may be registered for the same event type.
         * @param {string} eventType A string containing the event type.
         * @param {function} eventHandler A callback function to be called when
         * the event occurs.
         * @param {boolean} eventCapturingMode A boolean true to register an event
         * handler in the capturing phase and false in the bubbling phase.
         */
        addEventListener : function (eventType, eventHandler, eventCapturingMode)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.addEventListener) !== 'undefined')
            {
                this.barcodeReader.addEventListener(eventType, eventHandler,
                                                    eventCapturingMode);
            }
        },

        /**
         * Clears the internal buffer that stores the batch get and/or set
         * requests.
         */
        clearBuffer : function ()
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.clearBuffer) !== 'undefined')
            {
                this.barcodeReader.clearBuffer();
            }
        },

        /**
         * Disconnects the scanner and/or releases the claimed scanner.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        close : function (onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.close) !== 'undefined')
            {
                this.barcodeReader.close(onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Applies and/or queries the settings currently stored in the internal
         * buffer via the getBuffered and setBuffered methods. The purpose of
         * this method is to process multiple get/set setting requests in a
         * batch to improve performance. Note: This method does not automatically
         * clear the buffer that stores the get/set requests. To clear the buffer,
         * you must call the clearBuffer method.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        commitBuffer : function (onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.commitBuffer) !== 'undefined')
            {
                this.barcodeReader.commitBuffer(onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Sends a device specific command string to the reader. If the command
         * queries the reader for certain setting, the query result is delivered
         * via the result parameter in the onDirectIOComplete callback. The
         * commandData format is vendor specific.
         * @param commandData Contains device specific command data to be sent
         * to the reader.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        directIO : function (commandData, onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.directIO) !== 'undefined')
            {
                this.barcodeReader.directIO(commandData, onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Enables or disables the hardware trigger (scanner) button. If the button
         * is enabled, pressing the button activates the reader to start decoding
         * barcodes. If the button is disabled, pressing the button has no effect..
         * @param {boolean} enabled A boolean true enables the hardware trigger
         * button and false disables the trigger button.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        enableTrigger : function (enabled, onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.enableTrigger) !== 'undefined')
            {
                this.barcodeReader.enableTrigger(enabled, onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Gets the value of the setting identified by the specified family,
         * key, and option parameters.
         * @param {string} family A string containing the family name of the setting.
         * @param {string} key A string containing the key name of the setting.
         * @param {string} option A string containing the option name of the setting.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        get : function (family, key, option, onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.get) !== 'undefined')
            {
                this.barcodeReader.get(family, key, option, onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Adds the get request to an internal buffer and gets the value of the
         * specified setting when the commitBuffer method is called.
         * @param {string} family A string containing the family name of the setting.
         * @param {string} key A string containing the key name of the setting.
         * @param {string} option A string containing the option name of the setting.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        getBuffered : function (family, key, option, onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.getBuffered) !== 'undefined')
            {
                this.barcodeReader.getBuffered(family, key, option, onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Gets the license information.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        getLicenseInfo : function (onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.getLicenseInfo) !== 'undefined')
            {
                this.barcodeReader.getLicenseInfo(onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Unregisters the specified event handler which was previously registered
         * for the specified event type.
         * @param {string} eventType A string containing the event type.
         * @param {function} eventHandler A callback function to be removed
         * from the registered event handler list of the specified event type.
         */
        removeEventListener : function (eventType, eventHandler)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.removeEventListener) !== 'undefined')
            {
                this.barcodeReader.removeEventListener(eventType, eventHandler);
            }
        },
		
		/* Notification thing here */
		
		notify: function(a, c) {
            this.barcodeReader && "undefined" !== typeof this.barcodeReader.notify ?
                this.barcodeReader.notify(a, c) : HoneywellBarcodeReaderUtils.isFunction(c) && setTimeout(function() {
                    c({
                        status: HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        message: "Method is not supported"
                    })
                }, 0)
        },

        /**
         * Sets the value of the setting identified by the specified family, key,
         * and option parameters.
         * @param {string} family A string containing the family name of the setting.
         * @param {string} key A string containing the key name of the setting.
         * @param {string} option A string containing the option name of the setting.
         * @param {string} value A string containing the new setting value.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        set : function (family, key, option, value, onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.set) !== 'undefined')
            {
                this.barcodeReader.set(family, key, option, value, onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        },

        /**
         * Adds the set request to an internal buffer and sets the value of the
         * specified setting when the commitBuffer method is called.
         * @param {string} family A string containing the family name of the setting.
         * @param {string} key A string containing the key name of the setting.
         * @param {string} option A string containing the option name of the setting.
         * @param {string} value A string containing the new setting value.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        setBuffered : function (family, key, option, value, onComplete)
        {
            if (this.barcodeReader &&
                typeof(this.barcodeReader.setBuffered) !== 'undefined')
            {
                this.barcodeReader.setBuffered(family, key, option, value, onComplete);
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.FEATURE_NOT_SUPPORTED,
                        "message":"Method is not supported"});},0);
                }
            }
        }
    }; //endof namespaceObj.BarcodeReader.prototype

    /**
     * Manages multiple barcode readers.
     * @constructor
     * @param {function(Object)} onComplete A callback function to receive the
     * execution result of this method.
     */
    namespaceObj.BarcodeReaders = function (onComplete)
    {
        var brContext = this;  // Saves the this context so it can be used in inner functions.

        waitForSetupToComplete(function() {
            if (HoneywellBarcodeReaderUtils.barcodeReaderObjName)
            {
                if (HoneywellBarcodeReaderUtils.barcodeReaderObjName === "HoneywellBarcodeReaderSwiftWin")
                {
                    // Creates an instance of HoneywellBarcodeReadersSwiftWin object to be used
                    // on the WE8H platform.
                    brContext.barcodeReaders = new HoneywellBarcodeReadersSwiftWin(onComplete);
                }
                else if (HoneywellBarcodeReaderUtils.barcodeReaderObjName === "HoneywellBarcodeReaderAjax")
                {
                    // Creates an instance of HoneywellBarcodeReadersAjax object to be used
                    // on the platforms supporting AJAX such as Android.
                    brContext.barcodeReaders = new HoneywellBarcodeReadersAjax(onComplete);
                }
                else
                {
                    if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                    {
                        setTimeout(function() { onComplete({
                            "status": HoneywellBarcodeReaderErrors.NO_AVAILABLE_BRIDGE,
                            "message": "No available JavaScript to Native bridge found." }); }, 0);
                    }
                }
            }
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function() { onComplete({
                        "status": HoneywellBarcodeReaderErrors.NO_AVAILABLE_BRIDGE,
                        "message": "No available JavaScript to Native bridge found." }); }, 0);
                }
            }
        });
    }; //endof namespaceObj.BarcodeReaders

    namespaceObj.BarcodeReaders.prototype =
    {
        version: "1.00.00.0",  // Will be replaced during build
        barcodeReaders : null,

        /**
         * Gets the names of the readers that are currently available. If the
         * onComplete callback is specified, this function returns an empty
         * array and the result is delivered to the onComplete function when
         * the operation is completed. If the onComplete callback is not
         * specified, then this function waits for the operation to complete
         * and returns the array of scanner names.
         *
         * @param {function(Array)} onComplete A callback function to receive
         * the execution result of this method.
         * @returns {Array} An array of available reader names if the
         * onComplete callback function is not specified.
         */
        getAvailableBarcodeReaders : function (onComplete)
        {
            var scanners;

            if (this.barcodeReaders &&
                typeof(this.barcodeReaders.getAvailableBarcodeReaders) !== 'undefined')
            {
                scanners = this.barcodeReaders.getAvailableBarcodeReaders(onComplete);
            }
            else
            {
                scanners = [];
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete(scanners);},0);
                }
            }

            return scanners;
        }
    }; //endof namespaceObj.BarcodeReaders.prototype
})(this); // End of anonymous function closure. The customer may replace 'this' parameter with other object for a namespace.
