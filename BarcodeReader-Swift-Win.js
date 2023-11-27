/**
* BarcodeReader-Swift-Win.js
* @file BarcodeReader implementation for Swift decoder on Windows.
* @version 1.00.00.0
*/

// Uses self-invoking anonymous function to provide closure and
// prevent global variables collision.
(function () {
    // Variables you would like share among the methods in this module
    // shall be defined here.

    /**
     * Connects to the scanner, claims and enables the scanner.
     * @constructor
     * @param {string} scannerName A string to identify the barcode reader.
     * @param {function} onComplete A callback function to receive the
     * execution result of this method.
     */
    HoneywellBarcodeReaderSwiftWin = function (scannerName, onComplete)
    {
        // Saves the 'this' context to a local varaiable so you may pass it
        // to a inner function.
        var brContext = this;
        var reqId, browserPortalSeqNum;

        // Checks the parameter data type.
        if (scannerName && typeof scannerName !== 'string')
        {
            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
            {
                setTimeout(function(){onComplete(
                    {"status":HoneywellBarcodeReaderErrors.INVALID_PARAMETER,
                     "message":"Invalid parameter: scannerName, must be string"});},0);
            }
        }
        else
        {
            // Check the scannerName value. If the value is null or empty, set
            // the name to "default"; otherwise, keep the original name and let
            // the browser determine whether it is valid.
            if (!scannerName)
            {
                this.scannerName = "default";
            }
            else
            {
                this.scannerName = scannerName;
            }

            reqId = HoneywellBarcodeReaderUtils.getRandomInt(10000, 99999);
            // Gets the sequence number indicating which browser portal the current page
            // is running on.
            browserPortalSeqNum = win10EnterpriseBrowserInfo.getBrowserPortalSeqNum();

            // Calls the native WinRT method openAsync() within the win10ScannerBridge.
            // Defines the then clause to process the returned JSON-RPC result from the
            // method.
            win10ScannerBridge.openAsync(reqId, this.scannerName, browserPortalSeqNum).then(
                function (jsonrpcResponse)
                {
                    if (jsonrpcResponse)
                    {
                        brContext.logVar("win10ScannerBridge.openAsync response", jsonrpcResponse, false);
                        var response;
                        try
                        {
                            response = JSON.parse(jsonrpcResponse);
                        }
                        catch (err)
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                                    "message":"JSON-RPC parsing error in response."});},0);
                            }
                            return;
                        }

                        // Checks if the response contains a non-null result property.
                        if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", true))
                        {
                            if (HoneywellBarcodeReaderUtils.hasProperty(response.result, "scannerHandle", true) &&
                                HoneywellBarcodeReaderUtils.hasProperty(response.result, "interface", true) &&
                                HoneywellBarcodeReaderUtils.hasProperty(response.result, "modelName", true))
                            {
                                // Saves the scannerHandle for future method calls.
                                brContext.scannerHandle = response.result.scannerHandle;
                                // Saves the interface and modelName for scanner type identification
                                brContext.scannerInterface = response.result.interface;
                                brContext.scannerModelName = response.result.modelName;

                                // Unregisters the event handler dataReadyEventHandler
                                // which may be previously registered with the browser
                                // for the barcodedataready event.
                                var eventCallbackFuncName = "dataReadyEventHandler" + brContext.scannerHandle;
                                win10ScannerBridge.removeEventListener("barcodedataready", window[eventCallbackFuncName]);
                                brContext.barcodeDataReadyHandlersRegistered[brContext.scannerHandle] = false;

                                // Return a successful status to the onComplete callback
                                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                                {
                                    setTimeout(function(){onComplete({
                                        "status":0,
                                        "message":brContext.MSG_OPERATION_COMPLETED});},0);
                                }
                            }
                            else
                            {
                                // Return error to the onComplete callback
                                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                                {
                                    setTimeout(function(){onComplete({
                                        "status":HoneywellBarcodeReaderErrors.FUNCTION_FAILED,
                                        "message":"Missing scanner handle or interface or modelName in response."});},0);
                                }
                            }
                        }
                        else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(response))
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":response.error.code,
                                    "message":response.error.message});},0);
                            }
                        }
                        else
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                                    "message":"JSON-RPC parsing error in response."});},0);
                            }
                        }
                    } //endif (jsonrpcResponse)
                    else
                    {
                        // Return error to the onComplete callback
                        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                        {
                            setTimeout(function(){onComplete({
                                "status":HoneywellBarcodeReaderErrors.FUNCTION_FAILED,
                                "message":"Null or empty response."});},0);
                        }
                    }
                }); //endof win10ScannerBridge.openReaderAsync()
        }
    };

    /**
     * Defines public method and properties that are available to every
     * instance of HoneywellBarcodeReaderSwiftWin.
     */
    HoneywellBarcodeReaderSwiftWin.prototype =
    {
        version: "1.00.00.0",  // Will be replaced during build
        scannerName : null,
        scannerHandle : null,
        scannerInterface : null,
        scannerModelName : null,
        barcodeDataReadyListeners : [],
        barcodeDataReadyHandlersRegistered : [],
        MSG_OPERATION_COMPLETED : "Operation completed successfully.",
        MSG_READER_CLOSED : "Barcode reader already closed.",
        batchSetBuffer : [],

        /**
         * Activates or deactivates the reader to start or stop decoding barcodes.
         * @param {boolean} on A boolean true activates the reader and false
         * deactivate the reader.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        activate : function (on, onComplete)
        {
            // Saves the 'this' context to a local varaiable so you may pass it
            // to a inner function.
            var brContext = this;
            var reqId;

            if (!this.verifyActiveConnection(onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheck (on, "on", "boolean", onComplete))
            {
                return;
            }

            reqId = HoneywellBarcodeReaderUtils.getRandomInt(10000, 99999);

            // Calls the native WinRT method activateAsync() within the win10ScannerBridge.
            // Defines the then clause to process the returned JSON-RPC result from the method.
            win10ScannerBridge.activateAsync(reqId, this.scannerHandle, on).then(
                function (jsonrpcResponse)
                {
                    if (jsonrpcResponse)
                    {
                        brContext.logVar("win10ScannerBridge.activateAsync response", jsonrpcResponse, false);
                        var response;
                        try
                        {
                            response = JSON.parse(jsonrpcResponse);
                        }
                        catch (err)
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                                    "message":"JSON-RPC parsing error in response."});},0);
                            }
                            return;
                        }

                        HoneywellBarcodeReaderUtils.stdErrorCheck(response, onComplete);
                    } //endif (jsonrpcResponse)
                    else
                    {
                        // Return error to the onComplete callback
                        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                        {
                            setTimeout(function(){onComplete({
                                "status":HoneywellBarcodeReaderErrors.FUNCTION_FAILED,
                                "message":"Null or empty response."});},0);
                        }
                    }
                }); //endof win10ScannerBridge.activateAsync()
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
            if (eventType === "barcodedataready" && this.scannerHandle)
            {
                // Saves the 'this' context to a local varaiable so you may pass it
                // to a inner function.
                var brContext = this;
                var eventCallbackFuncName = "dataReadyEventHandler" + brContext.scannerHandle;

                if (typeof (brContext.barcodeDataReadyListeners[brContext.scannerHandle]) === "undefined")
                {
                    // Creates a new array of barcodedataready event listeners for
                    // the specific scannerHandle.
                    brContext.barcodeDataReadyListeners[brContext.scannerHandle] = [];
                }

                var eventHandlerExisted = false;
                var listeners = brContext.barcodeDataReadyListeners[brContext.scannerHandle];

                // Checks if the listeners already contains the eventHandler.
                for (var i=0, len=listeners.length; i < len; i++)
                {
                    if (listeners[i] === eventHandler)
                    {
                        eventHandlerExisted = true;
                        break;
                    }
                }

                // Pushes the eventHandler if it doesn't exist in the listeners.
                if (!eventHandlerExisted)
                {
                    listeners.push(eventHandler);
                }

                // Defines the function body for the dataReadyEventHandler callback.
                // The Enterprise Browser will raise the barcodedataready event and
                // deliver the barcode data in JSON-RPC format to this callback function.
                window[eventCallbackFuncName] = function (jsonEventData)
                {
                    var eventData;
                    var symbology = null, timestamp = null;
                    if (jsonEventData)
                    {
                        try
                        {
                            eventData = JSON.parse(jsonEventData);
                        }
                        catch (err)
                        {
                            brContext.log("Failed to parse event data: " + jsonEventData);
                        }
                        if (eventData)
                        {
                            // Checks if the eventData.params contains a non-null scannerHandle property.
                            if (HoneywellBarcodeReaderUtils.hasProperty(eventData.params, "scannerHandle", true))
                            {
                                if (eventData.params.scannerHandle === brContext.scannerHandle)
                                {
                                    if (HoneywellBarcodeReaderUtils.hasProperty(
                                            eventData.params, "data", true))
                                    {
                                        if (HoneywellBarcodeReaderUtils.hasProperty(
                                            eventData.params, "symbology", true))
                                        {
                                            symbology = eventData.params.symbology;
                                        }
                                        if (HoneywellBarcodeReaderUtils.hasProperty(
                                            eventData.params, "timestamp", true))
                                        {
                                            timestamp = eventData.params.timestamp;
                                        }
                                        // Delivers the data to the event listeners
                                        if (brContext.barcodeDataReadyListeners[brContext.scannerHandle] instanceof Array)
                                        {
                                            var listeners = brContext.barcodeDataReadyListeners[brContext.scannerHandle];

                                            for (var i=0, len=listeners.length; i < len; i++)
                                            {
                                                listeners[i](eventData.params.data, symbology, timestamp);
                                            }
                                        }
                                    }
                                }
                                else
                                {
                                    brContext.log(eventCallbackFuncName +
                                                  " receives Unexpected scanner handle: " +
                                                  eventData.params.scannerHandle);
                                }
                            }
                        } //endif (eventData)
                    } //endif (jsonEventData)
                };
            }

            if (brContext.barcodeDataReadyHandlersRegistered[brContext.scannerHandle] === false)
            {
                // Register the event handler dataReadyEventHandler for the barcodedataready
                // event within win10ScannerBridge.
                win10ScannerBridge.addEventListener("barcodedataready", window[eventCallbackFuncName]);
                brContext.barcodeDataReadyHandlersRegistered[brContext.scannerHandle] = true;
            }
        },

        /**
         * Clears the internal buffer that stores the batch get and/or set
         * requests.
         */
        clearBuffer : function ()
        {
            this.batchSetBuffer.length = 0;
        },

        /**
         * Disconnects the scanner and/or releases the claimed scanner.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        close : function (onComplete)
        {
            // Saves the 'this' context to a local varaiable so you may pass it
            // to a inner function.
            var brContext = this;
            var reqId;

            if (!this.scannerHandle)
            {
                setTimeout(function(){onComplete({
                    "status":0,
                    "message":this.MSG_READER_CLOSED});},0);
                return;
            }

            reqId = HoneywellBarcodeReaderUtils.getRandomInt(10000, 99999);

            // Calls the native WinRT method closeAsync() within the win10ScannerBridge.
            // Defines the then clause to process the returned JSON-RPC result from the method.
            win10ScannerBridge.closeAsync(reqId, this.scannerHandle).then(
                function (jsonrpcResponse)
                {
                    if (jsonrpcResponse)
                    {
                        brContext.logVar("win10ScannerBridge.closeAsync response", jsonrpcResponse, false);
                        var response;
                        try
                        {
                            response = JSON.parse(jsonrpcResponse);
                        }
                        catch (err)
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                                    "message":"JSON-RPC parsing error in response."});},0);
                            }
                            return;
                        }

                        // Checks if the response contains a result property.
                        if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", false))
                        {
                            if (brContext.barcodeDataReadyHandlersRegistered[brContext.scannerHandle] === true)
                            {
                                var eventCallbackFuncName = "dataReadyEventHandler" + brContext.scannerHandle;

                                // Unregisters the event handler dataReadyEventHandler which was previously
                                // registered for the barcodedataready event.
                                win10ScannerBridge.removeEventListener("barcodedataready", window[eventCallbackFuncName]);
                                brContext.barcodeDataReadyHandlersRegistered[brContext.scannerHandle] = false;
                            }

                            // Return a successful status to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":0,
                                    "message":brContext.MSG_OPERATION_COMPLETED});},0);
                            }
                        }
                        else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(response))
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":response.error.code,
                                    "message":response.error.message});},0);
                            }
                        }
                        else
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                                    "message":"JSON-RPC parsing error in response."});},0);
                            }
                        }
                    } //endif (jsonrpcResponse)
                    else
                    {
                        // Return error to the onComplete callback
                        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                        {
                            setTimeout(function(){onComplete({
                                "status":HoneywellBarcodeReaderErrors.FUNCTION_FAILED,
                                "message":"Null or empty response."});},0);
                        }
                    }
                }); //endof win10ScannerBridge.closeReaderAsync()
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
            var brContext = this;
            var commitSetBuffer = [];
            var resultArray = [];
            var reqId;
            var fileName = "HoneywellDecoderSettingsV2.exm";
            var profileID = "WebSDKConfig";
            var exmStr;

            if ( this.scannerHandle === null )
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    var result = new Object();
                    result.status = HoneywellBarcodeReaderErrors.NO_CONNECTION;
                    result.message = "No scanner connection";
                    result.method = null;
                    result.family = null;
                    result.key = null;
                    result.option = null;

                    resultArray.push(result);
                    setTimeout(function(){onComplete(resultArray);}, 0);
                }
                return;
            }

            if (brContext.batchSetBuffer.length === 0)
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    var result = new Object();
                    result.status = HoneywellBarcodeReaderErrors.EMPTY_COMMIT_BUFFER;
                    result.message = "The commit buffer is empty, nothing to commit.";
                    result.method = null;
                    result.family = null;
                    result.key = null;
                    result.option = null;

                    resultArray.push(result);
                    setTimeout(function(){onComplete(resultArray);}, 0);
                }
                return;
            }

            // Apply batch set requests.
            for (var i=0, len=brContext.batchSetBuffer.length; i < len; i++)
            {
                var settingDef = brContext.batchSetBuffer[i];

                if (settingDef.status === 0)
                {
                    commitSetBuffer.push(settingDef);
                }
                else
                {
                    var result = new Object();
                    result.method = "setBuffered";
                    result.family = settingDef.family;
                    result.key = settingDef.key;
                    result.option = settingDef.option;
                    result.status = settingDef.status;
                    result.message = settingDef.message;

                    resultArray.push(result);
                }
            } //endfor

            if (resultArray.length > 0)
            { // The batchSetBuffer contains one or more error status.
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete(resultArray);}, 0);
                }
                return;
            }

            exmStr = createExmString(commitSetBuffer, profileID);
            reqId = HoneywellBarcodeReaderUtils.getRandomInt(10000, 99999);

            // Calls the native WinRT method writeExmFileAsync() within the win10ScannerBridge.
            // Defines the then clause to process the returned JSON-RPC result from the method.
            win10ScannerBridge.writeExmFileAsync(reqId, brContext.scannerHandle, exmStr, fileName, profileID).then(
                function (jsonrpcResponse)
                {
                    var result = new Object();
                    result.method = "setBuffered";
                    result.family = null;
                    result.key = null;
                    result.option = null;

                    if (jsonrpcResponse)
                    {
                        brContext.logVar("scanner.writeExmFile response", jsonrpcResponse, false);
                        var response;
                        try
                        {
                            response = JSON.parse(jsonrpcResponse);
                        }
                        catch (err)
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                                result.message = "JSON-RPC parsing error in response.";
                                resultArray.push(result);
                                setTimeout(function(){onComplete(resultArray);}, 0);
                            }
                            return;
                        }

                        // Checks if the response contains a result property.
                        if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", false))
                        {
                            result.status = 0;
                            result.message = brContext.MSG_OPERATION_COMPLETED;
                        }
                        else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(response))
                        {
                            result.status = response.error.code;
                            result.message = response.error.message;
                        }
                        else
                        {
                            result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                            result.message = "JSON-RPC parsing error in response.";
                        }
                    } //endif (jsonrpcResponse)
                    else
                    {
                        result.status = HoneywellBarcodeReaderErrors.FUNCTION_FAILED;
                        result.message = "Null or empty response.";
                    }

                    if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                    {
                        resultArray.push(result);
                        setTimeout(function(){onComplete(resultArray);}, 0);
                    }
                }); //endof win10ScannerBridge.writeExmFileAsync()

            function createExmString(settingDefArray, profileID)
            {
                var firstInList;
                var deviceType = brContext.scannerInterface.toUpperCase().indexOf("USB") >=0 ? "USB" : "Internal";
                var exmStr = "<?xml version=\"1.0\"?>\r\n<ConfigDoc name=\"Data Collection Profiles\">\r\n";
                exmStr += "  <Section name=\"" + profileID + "\">\r\n";
                exmStr += "    <Key cmd=\"DEVICE\" desc=\"Specifies the scanner type\" list=\"Internal,USB\" name=\"Device Type\">" + deviceType + "</Key>\r\n";
                exmStr += "    <Key cmd=\"TYPE\">Incremental</Key>\r\n";
                exmStr += "    <Key cmd=\"APPLY\">true</Key>\r\n";
                for (var i=0, len=settingDefArray.length; i < len; i++)
                {
                    var settingDef = settingDefArray[i];
                    exmStr += "    <Key cmd=\"" + settingDef.command + "\"";
                    if (HoneywellBarcodeReaderUtils.hasProperty(settingDef, "valueType", true))
                    {
                        if (settingDef.valueType === "map")
                        {
                            // Need to write the list values. For example,
                            // list="true,false"
                            if ( HoneywellBarcodeReaderUtils.hasProperty(settingDef, "valueMap", true) &&
                                (settingDef.valueMap instanceof Array) &&
                                settingDef.valueMap.length > 0 )
                            {
                                exmStr += " list=\"";
                                firstInList = true;
                                for (var j=0, mapLen=settingDef.valueMap.length; j < mapLen; j++)
                                {
                                    // Iterate through the properties of settingDef.valueMap[j].
                                    // Note: It should only contain one property.
                                    for (var propertyName in settingDef.valueMap[j])
                                    {
                                        if (firstInList)
                                        {
                                            exmStr += settingDef.valueMap[j][propertyName];
                                            firstInList = false;
                                        }
                                        else
                                        {
                                            exmStr += "," + settingDef.valueMap[j][propertyName];
                                        }
                                    }
                                }
                                exmStr += "\"";
                            }
                        }
                        else if (settingDef.valueType === "int")
                        {
                            // Need to write the min and max range values.
                            // For example, min="1" max="60"
                            if ( HoneywellBarcodeReaderUtils.hasProperty(settingDef, "valueRange", true) &&
                                (settingDef.valueRange instanceof Array) &&
                                settingDef.valueRange.length > 0 )
                            {
                                for (var j=0, rangeLen=settingDef.valueRange.length; j < rangeLen; j++)
                                {
                                    // Iterate through the properties of settingDef.valueRange[j].
                                    // Note: It should only contain one property.
                                    for (var propertyName in settingDef.valueRange[j])
                                    {
                                        exmStr += " " + propertyName + "=\"" +
                                            settingDef.valueRange[j][propertyName] + "\"";
                                    }
                                }
                            }
                        }
                        else if (settingDef.valueType === "list")
                        {
                            // Need to write the list values. For example,
                            // list="noCheck,check,checkAndStrip"
                            if ( HoneywellBarcodeReaderUtils.hasProperty(settingDef, "values", true) &&
                                 (settingDef.values instanceof Array) &&
                                 settingDef.values.length > 0 )
                            {
                                exmStr += " list=\"";
                                firstInList = true;
                                for (var j=0, valuesLen=settingDef.values.length; j < valuesLen; j++)
                                {
                                    if (firstInList)
                                    {
                                        exmStr += settingDef.values[j];
                                        firstInList = false;
                                    }
                                    else
                                    {
                                        exmStr += "," + settingDef.values[j];
                                    }
                                }
                                exmStr += "\"";
                            }
                        }
                    } //endif (HoneywellBarcodeReaderUtils.hasProperty(settingDef, "valueType", true))
                    exmStr += ">" + settingDef.value + "</Key>\r\n";
                }
                exmStr += "  </Section>\r\n</ConfigDoc>\r\n";

                brContext.logVar("EXM string", exmStr, false);
                return exmStr;
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
            // Saves the 'this' context to a local varaiable so you may pass it
            // to a inner function.
            var brContext = this;
            var reqId;

            if (!this.verifyActiveConnection(onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheck (enabled, "enabled", "boolean", onComplete))
            {
                return;
            }

            reqId = HoneywellBarcodeReaderUtils.getRandomInt(10000, 99999);

            // Calls the native WinRT method enableHardwareTriggerAsync() within the win10ScannerBridge.
            // Defines the then clause to process the returned JSON-RPC result from the method.
            win10ScannerBridge.enableHardwareTriggerAsync(reqId, this.scannerHandle, enabled).then(
                function (jsonrpcResponse)
                {
                    if (jsonrpcResponse)
                    {
                        brContext.logVar("win10ScannerBridge.enableHardwareTriggerAsync response", jsonrpcResponse, false);
                        var response;
                        try
                        {
                            response = JSON.parse(jsonrpcResponse);
                        }
                        catch (err)
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({
                                    "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                                    "message":"JSON-RPC parsing error in response."});},0);
                            }
                            return;
                        }

                        HoneywellBarcodeReaderUtils.stdErrorCheck(response, onComplete);
                    } //endif (jsonrpcResponse)
                    else
                    {
                        // Return error to the onComplete callback
                        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                        {
                            setTimeout(function(){onComplete({
                                "status":HoneywellBarcodeReaderErrors.FUNCTION_FAILED,
                                "message":"Null or empty response."});},0);
                        }
                    }
                }); //endof win10ScannerBridge.enableHardwareTriggerAsync()
        },

        log : function (msg)
        {
            if (typeof (HoneywellBarcodeReaderUtils.log) === typeof (Function)) {
                HoneywellBarcodeReaderUtils.log(msg);
            }
        },

        logVar : function (aMsg, aVar, logType)
        {
            var logMsg;

            if (typeof (HoneywellBarcodeReaderUtils.log) === typeof (Function))
            {
                var varType = typeof(aVar);
                if (varType === "object")
                {
                    if (aVar !== null)
                    {
                        if (Object.prototype.toString.call(aVar) === "[object Array]")
                        {
                            logMsg = aMsg + "=" + aVar.toString();
                            if (logType)
                            {
                                logMsg += ", type=Array";
                            }
                        }
                        else
                        {
                            logMsg = aMsg + "=" + JSON.stringify(aVar, null, " ");
                            if (logType)
                            {
                                logMsg += ", type=object";
                            }
                        }
                    }
                    else
                    {
                        logMsg = aMsg + "=null";
                        if (logType)
                        {
                            logMsg += ", type=object";
                        }
                    }
                }
                else if (varType === "undefined")
                {
                    logMsg = aMsg + "=undefined";
                    if (logType)
                    {
                        logMsg += ", type=undefined";
                    }
                }
                else
                {
                    logMsg = aMsg + "=" + aVar.toString();
                    if (logType)
                    {
                        logMsg += ", type=" + varType;
                    }
                }
                HoneywellBarcodeReaderUtils.log(logMsg);
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
            if (eventType === "barcodedataready" && this.scannerHandle)
            {
                // Saves the 'this' context to a local varaiable so you may pass it
                // to a inner function.
                var brContext = this;

                if (this.barcodeDataReadyListeners[this.scannerHandle] instanceof Array)
                {
                    var listeners = this.barcodeDataReadyListeners[this.scannerHandle];

                    for (var i=0, len=listeners.length; i < len; i++)
                    {
                        if (listeners[i] === eventHandler)
                        {
                            listeners.splice(i, 1);
                            break;
                        }
                    }
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
            var brContext = this;
            var isArsScanner = brContext.scannerInterface.toUpperCase().indexOf("USB") >=0;
            var settingDef, result;

            result = new Object();
            result.family = family;
            result.key = key;
            result.option = option;

            if (typeof(HowneywellBarcodeReaderSwiftSettings) === "undefined" || typeof(HowneywellBarcodeReaderRingSettings) === "undefined")
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    result.status = HoneywellBarcodeReaderErrors.MISSING_SETTINGS_DEF;
                    result.message = "Missing settings definition HowneywellBarcodeReaderSwiftSettings or HowneywellBarcodeReaderRingSettings.";
                    setTimeout(function(){onComplete(result);},0);
                }
                return;
            }
            if ( this.scannerHandle === null )
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    result.status = HoneywellBarcodeReaderErrors.NO_CONNECTION;
                    result.message = "No scanner connection";
                    setTimeout(function(){onComplete(result);},0);
                }
                return;
            }
            if (!HoneywellBarcodeReaderUtils.stdParamCheckResult (family, "family", "string", result, onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheckResult (key, "key", "string", result, onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheckResult (option, "option", "string", result, onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheckResult (value, "value", "string", result, onComplete))
            {
                return;
            }

            settingDef = HoneywellBarcodeReaderUtils.getSettingDef(
                isArsScanner ? HowneywellBarcodeReaderRingSettings : HowneywellBarcodeReaderSwiftSettings, family, key, option, value, true);
            brContext.logVar("setBuffered settingDef", settingDef, false);

            // Stores the setting definition.
            brContext.batchSetBuffer.push(settingDef);

            if (settingDef.status === 0)
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    result.status = 0;
                    result.message = "Set request successfully buffered.";
                    setTimeout(function(){onComplete(result);},0);
                }
            } //endif (settingDef.status === 0)
            else
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    result.status = settingDef.status;
                    result.message = settingDef.message;
                    setTimeout(function(){onComplete(result);},0);
                }
            }
        },

        verifyActiveConnection : function (onComplete)
        {
            if ( this.scannerHandle === null )
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status":HoneywellBarcodeReaderErrors.NO_CONNECTION,
                        "message":"No scanner connection"});},0);
                }
                return false;
            }
            return true;
        }
    }; //endof HoneywellBarcodeReaderSwiftWin.prototype

    /**
     * Manages multiple barcode readers.
     * @constructor
     * @param {function(Object)} onComplete A callback function to receive the
     * execution result of this method.
     */
    HoneywellBarcodeReadersSwiftWin = function (onComplete)
    {
        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
        {
            setTimeout(function(){onComplete({
                "status":0,
                "message":HoneywellBarcodeReaderUtils.MSG_OPERATION_COMPLETED});},0);
        }
    };

    /**
     * Defines public method and properties that are available to every
     * instance of HoneywellBarcodeReadersSwiftWin.
     */
    HoneywellBarcodeReadersSwiftWin.prototype =
    {
        version: "1.00.00.0",  // Will be replaced during build

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
            var reqId;
            reqId = HoneywellBarcodeReaderUtils.getRandomInt(10000, 99999);

            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
            {
                // Calls the native WinRT asynchronous method getAvailableBarcodeReadersAsync()
                // within the win10ScannerBridge
                // Defines the then clause to process the returned JSON-RPC result from the method.
                win10ScannerBridge.getAvailableBarcodeReadersAsync(reqId).then(
                    function (jsonrpcResponse)
                    {
                        getAvailableBarcodeReadersComplete(jsonrpcResponse, true);
                    }); //endof win10ScannerBridge.getAvailableBarcodeReadersAsync()
                // Return an empty array
                return [];
            }
            else
            {
                // Calls the native WinRT synchronous method getAvailableBarcodeReaders() within
                // the win10ScannerBridge
                var jsonrpcResponse = win10ScannerBridge.getAvailableBarcodeReaders(reqId);
                var result = getAvailableBarcodeReadersComplete(jsonrpcResponse, false);
                return result;
            }

            function getAvailableBarcodeReadersComplete(jsonrpcResponse, isAsyncMode)
            {
                if (jsonrpcResponse)
                {
                    var response;
                    try
                    {
                        response = JSON.parse(jsonrpcResponse);
                    }
                    catch (err)
                    {
                        if (isAsyncMode)
                        {
                            // Return an empty array to the onComplete callback
                            setTimeout(function(){onComplete([]);},0);
                            return;
                        }
                        else
                        {
                            // Return an empty array
                            return [];
                        }
                    }

                    // Checks if the response contains a non-null result property.
                    if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", true))
                    {
                        if (HoneywellBarcodeReaderUtils.hasProperty(
                                response.result, "deviceInfoList", true))
                        {
                            if (isAsyncMode)
                            {
                                // Return the deviceInfoList within the response to the onComplete callback
                                setTimeout(function(){onComplete(response.result.deviceInfoList);},0);
                            }
                            else
                            {
                                // Return the deviceInfoList within the response
                                return response.result.deviceInfoList;
                            }
                        }
                        else
                        {
                            if (isAsyncMode)
                            {
                                // Return an empty array to the onComplete callback
                                setTimeout(function(){onComplete([]);},0);
                            }
                            else
                            {
                                // Return an empty array
                                return [];
                            }
                        }
                    }
                    else
                    {
                        if (isAsyncMode)
                        {
                            // Return an empty array to the onComplete callback
                            setTimeout(function(){onComplete([]);},0);
                        }
                        else
                        {
                            // Return an empty array
                            return [];
                        }
                    }
                } //endif (jsonrpcResponse)
                else
                {
                    if (isAsyncMode)
                    {
                        // Return an empty array to the onComplete callback
                        setTimeout(function(){onComplete([]);},0);
                    }
                    else
                    {
                        // Return an empty array
                        return [];
                    }
                }
            }
        }
    }; //endof HoneywellBarcodeReadersSwiftWin.prototype

})();
