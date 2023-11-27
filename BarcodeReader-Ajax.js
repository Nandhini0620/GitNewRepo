/**
* BarcodeReader-Ajax.js
* @file BarcodeReader implementation for Swift decoder on Android.
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
    HoneywellBarcodeReaderAjax = function (scannerName, onComplete)
    {
        // Saves the 'this' context to a local varaiable so you may pass it
        // to a inner function (if any).
        var brContext = this;

        if (scannerName &&
            !HoneywellBarcodeReaderUtils.stdParamCheck (scannerName,
            "scannerName", "string", onComplete))
        {
            return;
        }

        // Connects to the scanner
        var requestConnect = new Object();
        requestConnect.method = "scanner.connect";
        if (scannerName)
        {
            requestConnect.params = new Object();
            requestConnect.params.scanner = scannerName;
        }

        HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
            requestConnect, function(connectResponse) {
            if ( HoneywellBarcodeReaderUtils.hasProperty(connectResponse, "result", true) )
            {
                if (HoneywellBarcodeReaderUtils.hasProperty(connectResponse.result, "session", true))
                {
                    brContext.sessionId = connectResponse.result.session;

                    // Claims the scanner
                    var request = new Object();
                    request.method = "scanner.claim";
                    request.params = new Object();
                    request.params.session = brContext.sessionId;
                    HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                        request, function(response) {
                        if ( HoneywellBarcodeReaderUtils.hasProperty(response, "result", true) )
                        {
                            if (HoneywellBarcodeReaderUtils.hasProperty(response.result, "filter", true))
                            {
                                brContext.filter = response.result.filter;

                                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                                {
                                    // Delivers successful result to the callback function
                                    setTimeout(function(){onComplete({
                                        "status": 0,
                                        "message": HoneywellBarcodeReaderUtils.MSG_OPERATION_COMPLETED});},0);
                                }
                            }
                            else
                            {
                                // Return error to the onComplete callback
                                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                                {
                                    setTimeout(function(){onComplete({
                                        "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                                        "message":"JSON-RPC parsing error in response, missing filter parameter."});},0);
                                }
                            }
                        }
                        else if ( HoneywellBarcodeReaderUtils.hasJsonRpcError(response) )
                        {
                            // Return error to the onComplete callback
                            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                            {
                                setTimeout(function(){onComplete({"status":response.error.code,
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
                    });
                }
                else
                {
                    // Return error to the onComplete callback
                    if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                    {
                        setTimeout(function(){onComplete({
                            "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                            "message":"JSON-RPC parsing error in response, missing session parameter."});},0);
                    }
                }
            }
            else if ( HoneywellBarcodeReaderUtils.hasJsonRpcError(connectResponse) )
            {
                // Return error to the onComplete callback
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({"status":connectResponse.error.code,
                        "message":connectResponse.error.message});},0);
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
        });
    }; //endof HoneywellBarcodeReaderAjax constructor

    /**
     * Defines public method and properties that are available to every
     * instance of HoneywellBarcodeReaderAjax.
     */
    HoneywellBarcodeReaderAjax.prototype =
    {
        version: "1.00.00.0",  // Will be replaced during build
        sessionId : null,
        filter : null,
        eventDispatcher : null,
        barcodeDataReadyListeners : [],
        batchGetBuffer : [],
        batchSetBuffer : [],

        /**
         * Activates or deactivates the reader to start or stop decoding barcodes.
         * Note: On Android platform, hardware trigger needs to be enabled for this
         * method to work. It also has a side effect on Android that is after
         * activating the scanner and a successful read the first hardware trigger
         * will not turn on the aimer. That is because the lack of trigger state
         * change since the trigger state was already on.
         * @param {boolean} on A boolean true activates the reader and false
         * deactivate the reader.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        activate : function (on, onComplete)
        {
            var brContext = this;

            if (!this.verifyActiveConnection(onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheck (on, "on", "boolean", onComplete))
            {
                return;
            }

            if (on)
            {
                // Turns off trigger first to ensure we can turn it on.
                var request = new Object();
                request.method = "internal.setTrigger";
                request.params = new Object();
                request.params.session = brContext.sessionId;
                request.params.state = false;

                HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                    request, function(response) {
                    // Checks if the response contains a result property (null is acceptable).
                    if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", false))
                    { // Successfully truned off the trigger
                        // Sends the JSON-RPC request to turns on the trigger.
                        var request2 = new Object();
                        request2.method = "internal.setTrigger";
                        request2.params = new Object();
                        request2.params.session = brContext.sessionId;
                        request2.params.state = true;

                        HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                            request2, function(response2) {
                            HoneywellBarcodeReaderUtils.stdErrorCheck(response2, onComplete);
                        });
                    }
                    else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(response))
                    {
                        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                        {
                            // Return error to the onComplete callback
                            setTimeout(function(){onComplete({
                                "status":response.error.code,
                                "message":response.error.message});},0);
                        }
                    }
                    else
                    {
                        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                        {
                            // Return error to the onComplete callback
                            setTimeout(function(){onComplete({
                                "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                                "message":"JSON-RPC parsing error in response."});},0);
                        }
                    }
                });
            }
            else
            {
                // Sends the JSON-RPC request to turns off the trigger.
                var request = new Object();
                request.method = "internal.setTrigger";
                request.params = new Object();
                request.params.session = brContext.sessionId;
                request.params.state = false;

                HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                    request, function(response) {
                    HoneywellBarcodeReaderUtils.stdErrorCheck(response, onComplete);
                });
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
            var brContext = this;

            if (brContext.filter)  // Scanner was successfully claimed
            {
                var eventSessionSettings = {
                    error : null,
                    event : barcodeReaderEventCallback,
                    filter : brContext.filter
                };

                if (eventType === "barcodedataready")
                {
                    if (!brContext.eventDispatcher)
                    {
                        brContext.eventDispatcher = HoneywellBarcodeReaderWebEventDispatcher.create("datacollection");
                        brContext.eventDispatcher.startSession(eventSessionSettings);
                    }

                    if (typeof (brContext.barcodeDataReadyListeners[brContext.filter]) === "undefined")
                    {
                        // Creates a new array of barcodedataready event listeners for
                        // the specific filter.
                        brContext.barcodeDataReadyListeners[brContext.filter] = [];
                    }

                    brContext.barcodeDataReadyListeners[brContext.filter].push(eventHandler);
                }
            }

            /**
             * This function is called when a barcode reader event is received.
             * @param {string} eventMethod A string containing a method name
             * to identify the event type.
             * @param {Object} eventParams An object containing the event
             * parameters.
             */
            function barcodeReaderEventCallback (eventMethod, eventParams, eventFilter)
            {
                if ( eventMethod === "scanner.barcodeEvent" && eventParams && eventFilter)
                {
                    var sData = null, sSymbName = null, sTimestamp = null;
                    var honeywellId, aimId;

                    if (HoneywellBarcodeReaderUtils.hasProperty(eventParams,
                        "barcode", true))
                    {
                        if (HoneywellBarcodeReaderUtils.hasProperty(eventParams.barcode,
                            "data", true))
                        {
                            sData = eventParams.barcode.data;
                        }

                        if (HoneywellBarcodeReaderUtils.hasProperty(eventParams.barcode,
                            "honeywellId", true))
                        {
                            honeywellId = eventParams.barcode.honeywellId;
                        }
                        if (HoneywellBarcodeReaderUtils.hasProperty(eventParams.barcode,
                            "aimId", true))
                        {
                            aimId = eventParams.barcode.aimId;
                        }
                        sSymbName = HoneywellBarcodeReaderUtils.getSymbologyName(honeywellId, aimId);

                        if (HoneywellBarcodeReaderUtils.hasProperty(eventParams.barcode,
                            "timestamp", true))
                        {
                            sTimestamp = eventParams.barcode.timestamp;
                        }

                        // Finds the barcodeDataReady listeners list for the proper device.
                        if (brContext.barcodeDataReadyListeners[eventFilter] instanceof Array)
                        {
                            var listeners = brContext.barcodeDataReadyListeners[eventFilter];

                            for (var i=0, len=listeners.length; i < len; i++)
                            {
                                listeners[i](sData, sSymbName, sTimestamp);
                            }
                        }
                    } //endif eventParams.barcode exists and not null
                } //endif ( eventMethod === "scanner.barcodeEvent" )
            } //endof function barcodeReaderEventCallback
        },

        /**
         * Clears the internal buffer that stores the batch get and/or set
         * requests.
         */
        clearBuffer : function ()
        {
            this.batchGetBuffer.length = 0;
            this.batchSetBuffer.length = 0;
        },

        /**
         * Disconnects the scanner and/or releases the claimed scanner.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        close : function (onComplete)
        {
            var brContext = this;

            if (this.sessionId === null)
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete({
                        "status": 0,
                        "message": "BarcodeReader already closed"});},0);
                }
                return;
            }

            // Releases the scanner claim.
            var releaseRequest = new Object();
            releaseRequest.method = "scanner.release";
            releaseRequest.params = new Object();
            releaseRequest.params.session = brContext.sessionId;
            HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                releaseRequest, function(releaseResponse) {
                HoneywellBarcodeReaderUtils.stdErrorCheck(releaseResponse, function (releaseResult) {
                    if (releaseResult.status === 0)
                    {
                        brContext.filter = null;

                        // Disconnects the scanner.
                        var request = new Object();
                        request.method = "scanner.disconnect";
                        request.params = new Object();
                        request.params.session = brContext.sessionId;
                        HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                            request, function(response) {
                            HoneywellBarcodeReaderUtils.stdErrorCheck(response, function (disconResult) {
                                if (disconResult.status === 0)
                                {
                                    brContext.sessionId = null;
                                    if (brContext.eventDispatcher)
                                    {
                                        brContext.eventDispatcher.stopSession();
                                    }
                                }
                                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                                {
                                    setTimeout(function(){onComplete(disconResult);}, 0);
                                }
                            });
                        });
                    }
                    else
                    {
                        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                        {
                            setTimeout(function(){onComplete(releaseResult);}, 0);
                        }
                    }
                });
            });
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
            var commitGetBuffer = [];
            var resultArray = [];

            if ( this.sessionId === null || this.filter === null )
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

            if (this.batchSetBuffer.length === 0 && this.batchGetBuffer.length === 0)
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
            // Saves a local copy of batchSetBuffer and batchGetBuffer to
            // prevent the buffers from being overwritten during processing.
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
            }
            for (var i=0, len=brContext.batchGetBuffer.length; i < len; i++)
            {
                var settingDef = brContext.batchGetBuffer[i];
                if (settingDef.status === 0)
                {
                    commitGetBuffer.push(settingDef);
                }
                else
                {
                    var result = new Object();
                    result.method = "getBuffered";
                    result.family = settingDef.family;
                    result.key = settingDef.key;
                    result.option = settingDef.option;
                    result.status = settingDef.status;
                    result.message = settingDef.message;

                    resultArray.push(result);
                }
            }

            // Apply batch set requests first.
            if (commitSetBuffer.length > 0)
            {
                var commandArray = [];
                var request = new Object();
                request.method = "scanner.setProperties";
                request.params = new Object();
                request.params.session = brContext.sessionId;
                request.params.values = new Object();

                for (var i=0, len=commitSetBuffer.length; i < len; i++)
                {
                    var settingDef = commitSetBuffer[i];

                    request.params.values[settingDef.command] = settingDef.value;
                    commandArray.push(settingDef.command);
                }
                brContext.logVar("Batch set request.params.values", request.params.values, false);

                HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                    request, function(response) {
                    if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                    {
                        // Checks if the response contains a result property (null is acceptable).
                        if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", false))
                        {
                            // The Swift scanner does not indicate whether the set is
                            // successful or not. So we need to do a get and compare
                            // the result.
                            var getRequest = new Object();
                            getRequest.method = "scanner.getProperties";
                            getRequest.params = new Object();
                            getRequest.params.session = brContext.sessionId;
                            getRequest.params.names = commandArray;

                            HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                                getRequest, function(getResponse) {
                                brContext.logVar("Batch set's get response", getResponse, false);
                                if (HoneywellBarcodeReaderUtils.hasProperty(getResponse, "result", true) &&
                                    HoneywellBarcodeReaderUtils.hasProperty(getResponse.result, "values", true))
                                {
                                    for (var i=0, len=commitSetBuffer.length; i < len; i++)
                                    {
                                        var settingDef = commitSetBuffer[i];
                                        var result = new Object();

                                        result.method = "setBuffered";
                                        result.family = settingDef.family;
                                        result.key = settingDef.key;
                                        result.option = settingDef.option;

                                        if (HoneywellBarcodeReaderUtils.hasProperty(
                                            getResponse.result.values, settingDef.command, true))
                                        {
                                            if (getResponse.result.values[settingDef.command] === settingDef.value)
                                            {
                                                result.status = 0;
                                                result.message = HoneywellBarcodeReaderUtils.MSG_OPERATION_COMPLETED;
                                                resultArray.push(result);
                                            }
                                            else
                                            {
                                                result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                                result.message = "Scanner rejects the setting value.";
                                                resultArray.push(result);
                                            }
                                        }
                                        else
                                        {
                                            result.status = HoneywellBarcodeReaderErrors.INVALID_PARAMETER;
                                            result.message = "Invalid scanner property: " + settingDef.command;
                                            resultArray.push(result);
                                        }
                                    } //endfor
                                }
                                else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(getResponse))
                                {
                                    var result = new Object();
                                    result.method = "setBuffered";
                                    result.family = null;
                                    result.key = null;
                                    result.option = null;
                                    result.status = getResponse.error.code;
                                    result.message = getResponse.error.message;
                                    resultArray.push(result);
                                }
                                else
                                {
                                    var result = new Object();
                                    result.method = "setBuffered";
                                    result.family = null;
                                    result.key = null;
                                    result.option = null;
                                    result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                                    result.message = "JSON-RPC parsing error in response.";
                                    resultArray.push(result);
                                }

                                processGetBuffer();
                            });
                        }
                        else
                        {
                            if (HoneywellBarcodeReaderUtils.hasJsonRpcError(response))
                            {
                                var result = new Object();
                                result.method = "setBuffered";
                                result.family = null;
                                result.key = null;
                                result.option = null;
                                result.status = response.error.code;
                                result.message = response.error.message;
                                resultArray.push(result);
                            }
                            else
                            {
                                var result = new Object();
                                result.method = "setBuffered";
                                result.family = null;
                                result.key = null;
                                result.option = null;
                                result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                                result.message = "JSON-RPC parsing error in response.";
                                resultArray.push(result);
                            }
                            processGetBuffer();
                        }
                    } //endif (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                });
            } //endif (commitSetBuffer.length > 0)
            else
            {
                processGetBuffer();
            }

            function processGetBuffer()
            {
                // Apply batch get requests.
                if (commitGetBuffer.length > 0)
                {
                    var request = new Object();
                    request.method = "scanner.getProperties";
                    request.params = new Object();
                    request.params.session = brContext.sessionId;
                    request.params.names = [];

                    for (var i=0, len=commitGetBuffer.length; i < len; i++)
                    {
                        var settingDef = commitGetBuffer[i];
                        request.params.names.push(settingDef.command);
                    }
                    brContext.logVar("Batch get request.params.names", request.params.names, false);

                    HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                        request, function(response) {
                        brContext.logVar("Batch get's response", response, false);

                        if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                        {
                            // Checks if the response contains a non-null result property.
                            if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", true))
                            {
                                if (HoneywellBarcodeReaderUtils.hasProperty(response.result, "values", true))
                                {
                                    for (var i=0, len=commitGetBuffer.length; i < len; i++)
                                    {
                                        var settingDef = commitGetBuffer[i];
                                        var result = new Object();

                                        result.method = "getBuffered";
                                        result.family = settingDef.family;
                                        result.key = settingDef.key;
                                        result.option = settingDef.option;
                                        if (HoneywellBarcodeReaderUtils.hasProperty(
                                            response.result.values, settingDef.command, true))
                                        {
                                            if (HoneywellBarcodeReaderUtils.convertScannerSettingValue(
                                                settingDef, response.result.values[settingDef.command], result))
                                            {
                                                result.status = 0;
                                                result.message = HoneywellBarcodeReaderUtils.MSG_OPERATION_COMPLETED;
                                                resultArray.push(result);
                                            }
                                            else
                                            {
                                                result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                                result.message = "Unexpected scanner setting value";
                                                resultArray.push(result);
                                            }
                                        }
                                        else
                                        {
                                            result.status = HoneywellBarcodeReaderErrors.INVALID_PARAMETER;
                                            result.message = "Invalid scanner property: " + settingDef.command;
                                            resultArray.push(result);
                                        }
                                    } //endfor
                                }
                                else
                                {
                                    var result = new Object();
                                    result.method = "getBuffered";
                                    result.family = null;
                                    result.key = null;
                                    result.option = null;
                                    result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                                    result.message = "JSON-RPC parsing error in response.";
                                    resultArray.push(result);
                                }
                            }
                            else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(response))
                            {
                                var result = new Object();
                                result.method = "getBuffered";
                                result.family = null;
                                result.key = null;
                                result.option = null;
                                result.status = response.error.code;
                                result.message = response.error.message;
                                resultArray.push(result);
                            }
                            else
                            {
                                var result = new Object();
                                result.method = "getBuffered";
                                result.family = null;
                                result.key = null;
                                result.option = null;
                                result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                                result.message = "JSON-RPC parsing error in response.";
                                resultArray.push(result);
                            }

                            setTimeout(function(){onComplete(resultArray);}, 0);
                        } //endif (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                    });
                } //endif (commitGetBuffer.length > 0)
                else
                {
                    if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                    {
                        setTimeout(function(){onComplete(resultArray);}, 0);
                    }
                }
            } //endof function processGetBuffer
        },

        /**
         * Enables or disables the hardware trigger (scanner) button. If the button
         * is enabled, pressing the button activates the reader to start decoding
         * barcodes. If the button is disabled, pressing the button has no effect.
         * Note: On Android platform, disabling the trigger disables both hardware
         * and software trigger. In other words, the activate method has no effect
         * if enableTrigger(false) has been called earlier.
         * @param {boolean} enabled A boolean true enables the hardware trigger
         * button and false disables the trigger button.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        enableTrigger : function (enabled, onComplete)
        {
            var brContext = this;

            if (!this.verifyActiveConnection(onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheck (enabled, "enabled", "boolean", onComplete))
            {
                return;
            }

            var request = new Object();
            request.method = "scanner.setProperties";
            request.params = new Object();
            request.params.session = brContext.sessionId;
            request.params.values = new Object();
            request.params.values["TRIG_CONTROL_MODE"] = enabled ? "autoControl" : "disable";

            HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                request, function(response) {
                HoneywellBarcodeReaderUtils.stdErrorCheck(response, onComplete);
            });
        },


/*  Notification code here  */
			notify: function(a, c) {
						if (this.verifyActiveConnection(c) && HoneywellBarcodeReaderUtils.stdParamCheck(a, "notification", "string", c)) {
							var e = {
								method: "scanner.notify",
								params: {}
							};
							e.params.session = this.sessionId;
							e.params.notification = a;
							HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys("datacollection", e, function(a) {
								HoneywellBarcodeReaderUtils.stdErrorCheck(a, c)
							})
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
            var brContext = this;
            var settingDef, result;

            result = new Object();
            result.family = family;
            result.key = key;
            result.option = option;

            if (!HoneywellBarcodeReaderUtils.isFunction(onComplete))
            {
                // Since this is a query function, do nothing if the callback
                // function is not specified to receive the query result.
                return;
            }
            if (typeof(HowneywellBarcodeReaderSwiftSettings) === "undefined")
            {
                result.status = HoneywellBarcodeReaderErrors.MISSING_SETTINGS_DEF;
                result.message = "Missing settings definition HowneywellBarcodeReaderSwiftSettings.";
                setTimeout(function(){onComplete(result);},0);
                return;
            }
            if ( this.sessionId === null || this.filter === null )
            {
                result.status = HoneywellBarcodeReaderErrors.NO_CONNECTION;
                result.message = "No scanner connection";
                setTimeout(function(){onComplete(result);},0);

                return;
            }
            if (!HoneywellBarcodeReaderUtils.stdParamCheckResult (family, "family", "string", result, onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheckResult (key, "key", "string", result, onComplete) ||
                !HoneywellBarcodeReaderUtils.stdParamCheckResult (option, "option", "string", result, onComplete))
            {
                return;
            }

            settingDef = HoneywellBarcodeReaderUtils.getSettingDef(
                HowneywellBarcodeReaderSwiftSettings, family, key, option, null, false);

            if (settingDef.status === 0)
            {
                var request = new Object();
                request.method = "scanner.getProperties";
                request.params = new Object();
                request.params.session = brContext.sessionId;
                request.params.names = [];
                request.params.names.push(settingDef.command);
                brContext.logVar("get settingDef", settingDef, false);

                HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                    request, function(response) {
                    // Checks if the response contains a non-null result property.
                    if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", true))
                    {
                        if (HoneywellBarcodeReaderUtils.hasProperty(response.result, "values", true))
                        {
                            var scannerSettingValue = response.result.values[settingDef.command];
                            brContext.logVar("get response scannerSettingValue", scannerSettingValue, true);

                            if (HoneywellBarcodeReaderUtils.convertScannerSettingValue(
                                    settingDef, scannerSettingValue, result))
                            {
                                result.status = 0;
                                result.message = HoneywellBarcodeReaderUtils.MSG_OPERATION_COMPLETED;
                            }
                            else
                            {
                                result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                result.message = "Unexpected scanner setting value";
                            }

                            setTimeout(function(){onComplete(result);},0);
                        }
                        else
                        {
                            result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                            result.message = "JSON-RPC parsing error in response.";
                        }
                    }
                    else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(response))
                    {
                        result.status = response.error.code;
                        result.message = response.error.message;
                        setTimeout(function(){onComplete(result);},0);
                    }
                    else
                    {
                        result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                        result.message = "JSON-RPC parsing error in response.";
                        setTimeout(function(){onComplete(result);},0);
                    }
                });
            } //endif (settingDef.status === 0)
            else
            {
                result.status = settingDef.status;
                result.message = settingDef.message;
                setTimeout(function(){onComplete(result);},0);
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
            var brContext = this;
            var settingDef, result;

            result = new Object();
            result.family = family;
            result.key = key;
            result.option = option;

            if (typeof(HowneywellBarcodeReaderSwiftSettings) === "undefined")
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    result.status = HoneywellBarcodeReaderErrors.MISSING_SETTINGS_DEF;
                    result.message = "Missing settings definition HowneywellBarcodeReaderSwiftSettings.";
                    setTimeout(function(){onComplete(result);},0);
                }
                return;
            }
            if ( this.sessionId === null || this.filter === null )
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
                !HoneywellBarcodeReaderUtils.stdParamCheckResult (option, "option", "string", result, onComplete))
            {
                return;
            }

            settingDef = HoneywellBarcodeReaderUtils.getSettingDef(
                HowneywellBarcodeReaderSwiftSettings, family, key, option, null, false);
            brContext.logVar("getBuffered settingDef", settingDef, false);

            // Stores the setting definition.
            brContext.batchGetBuffer.push(settingDef);

            if (settingDef.status === 0)
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    result.status = 0;
                    result.message = "Get request successfully buffered.";
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

        /**
         * Gets the license information.
         * @param {function} onComplete A callback function to receive the
         * execution result of this method.
         */
        getLicenseInfo : function (onComplete)
        {
            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
            {
                var request = new Object();
                request.method = "license.getLicenseInfo";
                request.params = new Object();
                request.params.subsystem = "datacollection";

                HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('license',
                    request, function(response) {
                    // Checks if the response object has a non-null result property.
                    if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", true))
                    {
                        response.result.status = 0;
                        response.result.message = "Get license info completed successfully.";
                        setTimeout(function(){onComplete(response.result);},0);
                    }
                    else if ( HoneywellBarcodeReaderUtils.hasJsonRpcError(response) )
                    {
                        setTimeout(function(){onComplete({
                            "status":response.error.code,
                            "message":response.error.message});},0);
                    }
                    else
                    {
                        setTimeout(function(){onComplete({
                            "status":HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR,
                            "message":"JSON-RPC parsing error in response."});},0);
                    }
                });
            }
        },

        /**
         * Logs a message following by the variable value and the variable
         * type if logType is true.
         * @param {string} aMsg A string containing the beginning log message.
         * @param {*} aVar The variable to be logged.
         * @param {boolean} logType A boolean value indicating whether to log
         * the variable type.
         */
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
            var brContext = this;

            if (this.filter)
            {
                if (eventType === "barcodedataready")
                {
                    if (this.barcodeDataReadyListeners[this.filter] instanceof Array)
                    {
                        var listeners = this.barcodeDataReadyListeners[this.filter];

                        for (var i=0, len=listeners.length; i < len; i++)
                        {
                            if (listeners[i] === eventHandler)
                            {
                                listeners.splice(i, 1);
                                break;
                            }
                        }
                    }
                } //endif (eventType === "barcodedataready")
            } //endif (this.filter)
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
            var brContext = this;
            var settingDef, result;

            result = new Object();
            result.family = family;
            result.key = key;
            result.option = option;

            if (typeof(HowneywellBarcodeReaderSwiftSettings) === "undefined")
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    result.status = HoneywellBarcodeReaderErrors.MISSING_SETTINGS_DEF;
                    result.message = "Missing settings definition HowneywellBarcodeReaderSwiftSettings.";
                    setTimeout(function(){onComplete(result);},0);
                }
                return;
            }
            if ( this.sessionId === null || this.filter === null )
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
                HowneywellBarcodeReaderSwiftSettings, family, key, option, value, true);

            if (settingDef.status === 0)
            {
                var request = new Object();
                request.method = "scanner.setProperties";
                request.params = new Object();
                request.params.session = brContext.sessionId;
                request.params.values = new Object();
                request.params.values[settingDef.command] = settingDef.value;
                brContext.logVar("set settingDef", settingDef, false);
                brContext.logVar("set request.params.values", request.params.values, false);

                HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                    request, function(response) {
                    if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                    {
                        // Checks if the response contains a result property (null is acceptable).
                        if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", false))
                        {
                            // The Swift scanner does not indicate whether the set is
                            // successful or not. So we need to do a get and compare
                            // the result.
                            var getRequest = new Object();
                            getRequest.method = "scanner.getProperties";
                            getRequest.params = new Object();
                            getRequest.params.session = brContext.sessionId;
                            getRequest.params.names = [];
                            getRequest.params.names.push(settingDef.command);

                            HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                                getRequest, function(getResponse) {
                                brContext.logVar("set function get response", getResponse, false);
                                if (HoneywellBarcodeReaderUtils.hasProperty(getResponse, "result", true) &&
                                    HoneywellBarcodeReaderUtils.hasProperty(getResponse.result, "values", true))
                                {
                                    if (HoneywellBarcodeReaderUtils.hasProperty(
                                        getResponse.result.values, settingDef.command, true))
                                    {
                                        if (getResponse.result.values[settingDef.command] === settingDef.value)
                                        {
                                            result.status = 0;
                                            result.message = HoneywellBarcodeReaderUtils.MSG_OPERATION_COMPLETED;
                                            setTimeout(function(){onComplete(result);},0);
                                        }
                                        else
                                        {
                                            result.status = HoneywellBarcodeReaderErrors.INVALID_SETTING_VALUE;
                                            result.message = "Scanner rejects the setting value.";
                                            setTimeout(function(){onComplete(result);},0);
                                        }
                                    }
                                    else
                                    {
                                        result.status = HoneywellBarcodeReaderErrors.INVALID_PARAMETER;
                                        result.message = "Invalid scanner property: " + settingDef.command;
                                        setTimeout(function(){onComplete(result);},0);
                                    }
                                }
                                else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(getResponse))
                                {
                                    result.status = getResponse.error.code;
                                    result.message = getResponse.error.message;
                                    setTimeout(function(){onComplete(result);},0);
                                }
                                else
                                {
                                    result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                                    result.message = "JSON-RPC parsing error in response.";
                                    setTimeout(function(){onComplete(result);},0);
                                }
                            });
                        }
                        else if (HoneywellBarcodeReaderUtils.hasJsonRpcError(response))
                        {
                            result.status = response.error.code;
                            result.message = response.error.message;
                            setTimeout(function(){onComplete(result);},0);
                        }
                        else
                        {

                            result.status = HoneywellBarcodeReaderErrors.JSON_PARSE_ERROR;
                            result.message = "JSON-RPC parsing error in response.";
                            setTimeout(function(){onComplete(result);},0);
                        }
                    } //endif (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                });
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
            var settingDef, result;

            result = new Object();
            result.family = family;
            result.key = key;
            result.option = option;

            if (typeof(HowneywellBarcodeReaderSwiftSettings) === "undefined")
            {
                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    result.status = HoneywellBarcodeReaderErrors.MISSING_SETTINGS_DEF;
                    result.message = "Missing settings definition HowneywellBarcodeReaderSwiftSettings.";
                    setTimeout(function(){onComplete(result);},0);
                }
                return;
            }
            if ( this.sessionId === null || this.filter === null )
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
                HowneywellBarcodeReaderSwiftSettings, family, key, option, value, true);
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
            if ( this.sessionId === null || this.filter === null )
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
    }; //endof HoneywellBarcodeReaderAjax.prototype

    /**
     * Manages multiple barcode readers.
     * @constructor
     * @param {function(Object)} onComplete A callback function to receive the
     * execution result of this method.
     */
    HoneywellBarcodeReadersAjax = function (onComplete)
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
     * instance of HoneywellBarcodeReadersAjax.
     */
    HoneywellBarcodeReadersAjax.prototype =
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
            var scanners = [];
            var request = new Object();
            request.method = "scanner.listConnectedScanners";

            if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
            {
                HoneywellBarcodeReaderUtils.sendJsonRpcRequestSubSys('datacollection',
                    request, handleResponse);
            }
            else
            {
                // For backward compatibility, if the onComplete callback is
                // not specified, it sends synchronous XMLHTTP request and
                // returns the array of scanner names to the caller.
                var xmlhttp;
                request.id = HoneywellBarcodeReaderUtils.getRandomInt(10000, 99999);
                request.jsonrpc = "2.0";

                if (window.XMLHttpRequest)
                {
                    xmlhttp = new XMLHttpRequest(); // code for IE7+, Firefox, Chrome, Opera, Safari
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
                                    handleResponse(response);
                                }
                                catch (err) {}
                            }
                        }
                    }
                    xmlhttp.open("POST", "http://127.0.0.1:8080/jsonrpc/datacollection",
                            false); //true (asynchronous) or false (synchronous)
                    xmlhttp.send(JSON.stringify(request));
                }
            }

            function handleResponse(response)
            {
                // Checks if the response contains a non-null result property.
                if (HoneywellBarcodeReaderUtils.hasProperty(response, "result", true) &&
                    HoneywellBarcodeReaderUtils.hasProperty(response.result, "scanners", true) &&
                    response.result.scanners instanceof Array)
                {
                    for (var i=0, len=response.result.scanners.length; i<len; i++)
                    {
                        if (HoneywellBarcodeReaderUtils.hasProperty(response.result.scanners[i],
                            "scanner", true))
                        {
                            scanners.push(response.result.scanners[i].scanner);
                        }
                    }
                }
                if (scanners.length === 0)
                {
                    scanners.push("dcs.scanner.imager"); // internal scanner
                }

                if (HoneywellBarcodeReaderUtils.isFunction(onComplete))
                {
                    setTimeout(function(){onComplete(scanners);},0);
                }
            }

            return scanners;
        },
    }; //endof HoneywellBarcodeReadersAjax.prototype

})();