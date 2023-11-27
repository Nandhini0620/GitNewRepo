/**
* @name BarcodeReader
* @fileOverview BarcodeReader class. Version 1.00.00.0.
*/

// Uses self-invoking anonymous function to provide closure and
// prevent global variables collision.
(function (namespaceObj) {
/**
 * Creates a namespaceObj.BarcodeReader object where the default value of the
 * namespaceObj is the window object.
 * @constructor
 */
namespaceObj.BarcodeReader = function( scannerName, onComplete )
{
	var bcr = this;  // Save this to a variable so we can reference it in nested functions.
	var sDefaultReaderName = null;
	var iMaxRetries = 2;
	this.scannerName = scannerName;
	this.buffer = [];
	this.barcodeReaders = new namespaceObj.BarcodeReaders (
		function (result)
		{
			if (result.status == 0) // BarcodeReaders created successfully.
			{
				if (scannerName == null)
				{
					sDefaultReaderName = findDefaultReader(false); // Finds the internal scanner.
					if ( sDefaultReaderName === null )
					{
						// Sleeps 500 ms and finds the internal reader.
						setTimeout(function(){setDefaultReader(0, onComplete);}, 500);
					}
					else
					{
						bcr.scannerName = sDefaultReaderName;
						create (onComplete);
					}
				}
				else
				{
					create (onComplete);
				}
			}
			else // Failed to create BarcodeReaders
			{
				setTimeout(function(){onComplete(result);},0);
			}
		}); // endof new BarcodeReaders

	function setDefaultReader(iRetries, onBarcodeReaderComplete)
	{
		if (iRetries < iMaxRetries)
		{
			// Finds the internal reader.
			sDefaultReaderName = findDefaultReader(false);
			if (sDefaultReaderName === null)
			{
				iRetries++;
				if (iRetries === iMaxRetries)
				{
					// Finds the first reader.
					sDefaultReaderName = findDefaultReader(true);
					bcr.scannerName = sDefaultReaderName;
					create (onBarcodeReaderComplete);
				}
				else
				{
					// Sleeps 500 ms and finds the internal reader.
					setTimeout(function(){setDefaultReader(iRetries, onBarcodeReaderComplete);}, 500);
				}
			}
			else // Found the internal scanner.
			{
				bcr.scannerName = sDefaultReaderName;
				create (onBarcodeReaderComplete);
			}
		}
		else
		{
			bcr.scannerName = sDefaultReaderName;
			create (onBarcodeReaderComplete);
		}
	}

	function findDefaultReader (firstReader)
	{
		var sReaderName = null;
		var readerNames = bcr.barcodeReaders.getAvailableBarcodeReaders();

		if (firstReader) // Finds the first reader in the readerNames array.
		{
			if (readerNames.length > 0)
				sReaderName = readerNames[0];
		}
		else // Finds the internal reader.
		{
			for (var i=0; i<readerNames.length; i++ )
			{
				if ( readerNames[i] == "Internal" || readerNames[i] == "dcs.scanner.imager")
				{
					sReaderName = readerNames[i];
					break;
				}
			}
		}
		if (sReaderName != null){
            if(usePlugin){
                bcrPlugin.ITCLogString("findDefaultReader(" + firstReader + ") returns " + sReaderName);
            }
	    }
		else{
		      if(usePlugin){
		          bcrPlugin.ITCLogString("findDefaultReader(" + firstReader + ") returns null");
		      }
		}

		return sReaderName;
	}
	
	function create (onComplete)
	{
		if (bcr.scannerName != null)
		{
			if (usePlugin)
			{
				bcrPlugin.BarcodeReader( bcr.scannerName, onComplete ); //FIX -> Was missing ".bcr"
			}
			else if(useDCS)
			{
				setTimeout(function(){onComplete({"status":0,"message":"Operation completed successfully."});},0);
			}
		}
		else
		{
			setTimeout(function(){onComplete({"status":-1994375551,"message":"Unable to find a default scanner."});},0);
		}
	}

}; //endof BarcodeReader constructor

namespaceObj.BarcodeReader.prototype = 
{
/**
 * @this {BarcodeReader}
 * @property {string} scannerName the barcode reader's name, as provided by the underlying OS
 * @property {object} symbology the Symbology object
 * @property {object} symbologyOptions the SymbologyOptions object
 * @property {object} scannerSettings the ScannerSettings object
 * @property {object} decodeSecurity the DecodeSecurity object
 */
    version : "1.00.00.0",
    barcodeReaders : null,
    scannerName : null,
    buffer : null,

    addEventListener : function( eventType, eventHandler, eventCapturingMode )
    {
        if(usePlugin)
        {
            bcrPlugin.addEventListener( this.scannerName, eventType, eventHandler );
        }
        else if(useDCS)
        {
            var dcsSessionSettings = {
                error : null,
                event : null
            };

            bcrDCS.startSession(dcsSessionSettings);

            if (eventType === "barcodedataready")
            {
                bcrDCS.addBarcodeDataReadyListener(this.scannerName, eventHandler);
            }
        }
    },

    removeEventListener : function( eventType, eventHandler )
    {
        if(usePlugin)
        {
            bcrPlugin.removeEventListener( this.scannerName, eventType, eventHandler );
        }
        else if(useDCS)
        {
            if (eventType === "barcodedataready")
            {
                bcrDCS.removeBarcodeDataReadyListener(this.scannerName, eventHandler);
            }
    	}
    },

    ITCLogString : function( message )
    {
        if(usePlugin){
            bcrPlugin.ITCLogString( message );
        }
        else if(useDCS){
            //alert( message );
        }
    },

    enableTrigger : function( enabled, onComplete )
    {
        var sBool;
       	if (enabled)
            sBool = "true";
        else
            sBool = "false";
        this.set( "BarcodeReader", "Settings", "HardwareTrigger", sBool, onComplete);
    },

    activate : function( activated, onComplete )
    {
        var sBool;
       	if (activated)
            sBool = "true";
        else
            sBool = "false";
        this.set( "BarcodeReader", "Control", "BarcodeReaderOn", sBool, onComplete);
    },

    /**
     * directIO
     *
     * @this {BarcodeReader}
     * @param {string} commandData the command to send to the barcode reader
     * @param {callback} onComplete the callback returning the barcode reader's response
     */
    directIO : function( commandData, onComplete )
    {
        if(usePlugin){
            bcrPlugin.directIO( this.scannerName, commandData, onComplete );
        }
        else if(useDCS) {
            //barcodeReaders.ITCLogString( "Command=" + commandData );
            var id = getRandomInt(10000, 99999);
            var paramsObject = new Object();
            paramsObject.device = this.scannerName;

            var splitCommandString = commandData.split( "," );
            var numericCommand = [];
            for (var i=0; i<splitCommandString.length; i++ ) {
                numericCommand[i] = +splitCommandString[i];
            }
            paramsObject.iscp = numericCommand;

            var request = new Object();
            request.id = id;
            request.jsonrpc = "2.0";
            request.method = "scanner.iscp";
            request.params = paramsObject;

            var DCSJSON = JSON.stringify(request);

            if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                var xmlhttp=new XMLHttpRequest();
            }

            xmlhttp.onreadystatechange=function(){
                if (xmlhttp.readyState==4 && xmlhttp.status==200){
                    var resultDCS = JSON.parse(xmlhttp.responseText);

                    if(id == resultDCS.id){
                        if( resultDCS.result != null )
                        {
                         var result = new Object();
                         result.status = 0;
                         if( resultDCS.result != null ) {
                             if( resultDCS.result[0] != 80 && resultDCS.result[0] != 81) {
                                result.status = 1;
                                }
                             var valueString = "";
                             for( var i=1; i<resultDCS.result.length; i++ ){
                                if( i < resultDCS.result.length-1 ) {
                                    valueString += "0x" + resultDCS.result[i].toString(16) + ",";
                                }
                                else {
                                    valueString += "0x" + resultDCS.result[i].toString(16);
                                }
                             }
                         }

                         result.value = valueString;
                         result.message = "ISCP response";
                         }

                         setTimeout(function(){onComplete(result);},0);
                    }
                }
            }

            xmlhttp.open("POST","http://127.0.0.1:8080/jsonrpc/datacollection",true);
            xmlhttp.send(DCSJSON);
        }
    },

    /**
     * get
     *
     * @this {BarcodeReader}
     * @param {string} family the family value
     * @param {string} key the key value
     * @param {string} option the option value
     * @param {callback} onComplete the callback with result object
     */
    get : function( family, key, option, onComplete )
    {
        if(usePlugin){
            bcrPlugin.get( this.scannerName, family, key, option, onComplete );
        }
		else if(useDCS){
		    var id = getRandomInt(10000, 99999);
		    var myGetConfigRequest = getConfigCreateJSON(id, family, key, option);
		    var myMapKey = family + "." + key + "." + option;

		    //console.log("myGetConfigRequest : " + myGetConfigRequest);

            if(myGetConfigRequest == "Not Supported"){
                var result = new Object();
                result.status = -1994391502;
                result.message = "Not Supported.";
                result.family = family;
                result.key = key;
                result.option = option;

                setTimeout(function(){onComplete(result);},0);
            }
            else{
    			if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
    				var xmlhttp=new XMLHttpRequest();
    			}

    			xmlhttp.onreadystatechange=function(){
    				if (xmlhttp.readyState==4 && xmlhttp.status==200){
    				    //console.log("xmlhttp.responseText: " + xmlhttp.responseText);

    				    var resultDCS = JSON.parse(xmlhttp.responseText);

    				    if(id == resultDCS.id){
    				        if(objectLength(resultDCS.result.retrieved) > 0){
        			    		var result = new Object();
        			    		result.status = 0;
        			    		result.message = "Operation completed successfully.";
        			    		result.family = family;
        			    		result.key = key;
        			    		result.option = option;
    			    	    for( var property in resultDCS.result.retrieved ) {
    			    	        if( resultDCS.result.retrieved.hasOwnProperty(property) ) {
    			    	            var rawDCSValue = resultDCS.result.retrieved[property];

    			    	            //Convert back to our format...
    			    	            if (myMapKey in DCSCommandMap){
    			    	                if(DCSCommandMap[myMapKey].dataType == "enum"){
        			    	                for(var myMapProperty in DCSCommandMap[myMapKey]) {
        			    	                    var myMapValue = DCSCommandMap[myMapKey][myMapProperty];
        			    	                    if(myMapValue == rawDCSValue){
        			    	                        result.value = myMapProperty;
        			    	                    }
        			    	                }
    			    	                }
    			    	                else if(DCSCommandMap[myMapKey].dataType == "other"){
    			    	                    if(myMapKey == "BarcodeReader.Settings.HardwareTrigger"){
    			    	                        if(rawDCSValue == "hardware"){
    			    	                            result.value = "true";
    			    	                        }
    			    	                        else if(rawDCSValue == "emulated"){
    			    	                            result.value = "false";
    			    	                        }
    			    	                    }
    			    	                }
    			    	                else{
    			    	                    result.value = rawDCSValue.toString();
    			    	                }
    			    	            }
    			    	        }
    			    	    }

    			    		setTimeout(function(){onComplete(result);},0);

    				        }
    				        else if(objectLength(resultDCS.result.failed) > 0){
    				            var result = new Object();
    				            result.status = -1994389925;
        			    		result.message = "Function Failed.";
        			    		result.family = family;
        			    		result.key = key;
        			    		result.option = option;

        			    		setTimeout(function(){onComplete(result);},0);
    				        }
    				        else{
    				            var result = new Object();
    				            result.status = -1994389925;
    				            result.message = "Function Failed.";
    				            result.family = family;
    				            result.key = key;
    				            result.option = option;

    				            setTimeout(function(){onComplete(result);},0);
    				        }
    			        }
    				}
    			}

    			xmlhttp.open("POST","http://127.0.0.1:8080/jsonrpc/datacollection",true);
    			xmlhttp.send(myGetConfigRequest);
            }
		}
    },

    /**
     * set
     *
     * @this {BarcodeReader}
     * @param {string} family the family value
     * @param {string} key the key value
     * @param {string} option the option value
     * @param {string} value the value
     * @param {callback} onComplete the callback with result object
     */
    set : function( family, key, option, value, onComplete )
    {
    	if(usePlugin){
    		 bcrPlugin.set( this.scannerName, family, key, option, value, onComplete );
    	}
    	else if(useDCS){
            var id = getRandomInt(10000, 99999);
            var mySetConfigRequest = setConfigCreateJSON(id, family, key, option, value);
            //console.log("mySetConfigRequest: " + mySetConfigRequest);

            if(mySetConfigRequest == "Not Supported"){
                var result = new Object();
                result.status = -1994391502;
                result.message = "Not Supported.";
                result.family = family;
                result.key = key;
                result.option = option;

                setTimeout(function(){onComplete(result);},0);
            }
            else{
                if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                    var xmlhttp=new XMLHttpRequest();
                }

                xmlhttp.onreadystatechange=function(){
                    if (xmlhttp.readyState==4 && xmlhttp.status==200){
                        //console.log("xmlhttp.responseText: " +xmlhttp.responseText);

                        var resultDCS = JSON.parse(xmlhttp.responseText);

                        if(id == resultDCS.id){
                            if(objectLength(resultDCS.result.applied) > 0){
                                var result = new Object();
                                result.status = 0;
                                result.message = "Operation completed successfully.";
                                result.family = family;
                                result.key = key;
                                result.option = option;

                                setTimeout(function(){onComplete(result);},0);
                            }
                            else if(objectLength(resultDCS.result.failed) > 0){
                                var result = new Object();
                                result.status = -1994389925;
                                result.message = "Function Failed.";
                                result.family = family;
                                result.key = key;
                                result.option = option;

                                setTimeout(function(){onComplete(result);},0);
                            }
                            else{
                                 //Unknown Failure...
                                 var result = new Object();
                                 result.status = -1994389925;
                                 result.message = "Function Failed.";
                                 result.family = family;
                                 result.key = key;
                                 result.option = option;

                                 setTimeout(function(){onComplete(result);},0);
                            }
                        }
                    }
                }

                xmlhttp.open("POST","http://127.0.0.1:8080/jsonrpc/datacollection",true);
                xmlhttp.send(mySetConfigRequest);
            }
    	}
    },

    /**
     * clearBuffer
     *
     * @this {BarcodeReader}
     */
    clearBuffer : function()
    {
        //Clear JavaScript Buffer of Queued Commands
        this.buffer = [];
    },

    /**
     * setBuffered
     *
     * @this {BarcodeReader}
     * @param {string} family the family value
     * @param {string} key the key value
     * @param {string} option the option value
     * @param {string} value the value
     */
    setBuffered : function( family, key, option, value )
    {
    	if(usePlugin){
            bcrPlugin.ITCLogString( "Store set command in array" );
    	}
    	else if(useDCS){

    	}

        //Store set command in array
        var setObject = ["set", family, key, option, value];
        this.buffer.push(setObject);
    },

    /**
     * getBuffered
     *
     * @this {BarcodeReader}
     * @param {string} family the family value
     * @param {string} key the key value
     * @param {string} option the option value
     * @param {string} value the value
     */
    getBuffered : function( family, key, option )
    {
    	if(usePlugin){
            bcrPlugin.ITCLogString( "Store get command in array" );
    	}
    	else if(useDCS){

    	}

        //Store get command in array
        var getObject = ["get", family, key, option];
        this.buffer.push(getObject);
    },

    /**
     * commitBuffer
     *
     * @this {BarcodeReader}
     * @param {callback} onCommitComplete the callback with result object
     */
    commitBuffer : function( onCommitComplete )
    {
    	if(usePlugin){
            bcrPlugin.ITCLogString( "Commit Stored Commands" );
            bcrPlugin.commit( this.scannerName, this.buffer, onCommitComplete );
    	}
    	else if(useDCS){
    	    //console.log(this.buffer.toString());

    	    var getBuffer = [];
    	    var setBuffer = [];
    	    var getSettingNameDCS;
    	    var setSettingNameDCS;
    	    var setSettingValueDCS;
    	    var setValuesObject = new Object();
    	    var getId = getRandomInt(10000, 99999);
    	    var setId = getRandomInt(10000, 99999);
    	    var getDCSJSON;
    	    var setDCSJSON;
    	    var getResultDCS;
    	    var setResultDCS;
    	    var resultArray = [];

            //
            //Create DCS JSON
            //
    	    for (var i = 0; i < this.buffer.length; i++) {
    	        if(this.buffer[i][0] === "get"){
    	            //console.log("get - family: '" + this.buffer[i][1] + "' key: '" + this.buffer[i][2] + "' option: '" + this.buffer[i][3] + "'")

    	            var myGetKey = this.buffer[i][1] + "." + this.buffer[i][2] + "." + this.buffer[i][3];
    	            if (myGetKey in DCSCommandMap){
    	                //console.log("found key: " + DCSCommandMap[myGetKey].name)
    	                getSettingNameDCS = DCSCommandMap[myGetKey].name;
    	                getBuffer.push(getSettingNameDCS);
    	            }
    	            else{
    	                var result = new Object();
    	                result.method = "getBuffered";
    	                result.status = -1994391502;
    	                result.message = "Not Supported.";
    	                result.family = this.buffer[i][1];
    	                result.key = this.buffer[i][2];
    	                result.option = this.buffer[i][3];

    	                resultArray.push(result);
    	            }
    	        }
    	        else if(this.buffer[i][0] === "set"){
                    //console.log("set - family: '" + this.buffer[i][1] + "' key: '" + this.buffer[i][2] + "' option: '" + this.buffer[i][3] + "'")

                    var mySetKey = this.buffer[i][1] + "." + this.buffer[i][2] + "." + this.buffer[i][3];
                    var value = this.buffer[i][4];
                    if (mySetKey in DCSCommandMap){
                        setSettingNameDCS = DCSCommandMap[mySetKey].name;

                        if(DCSCommandMap[mySetKey].dataType == "boolean"){
                            //convert to boolean
                            if(value == "true"){
                                setSettingValueDCS = true;
                            }
                            else if(value == "false"){
                                setSettingValueDCS = false;
                            }
                            else{
                                var result = new Object();
                                result.method = "setBuffered";
                                result.status = -1994391502;
                                result.message = "Not Supported.";
                                result.family = this.buffer[i][1];
                                result.key = this.buffer[i][2];
                                result.option = this.buffer[i][3];

                                resultArray.push(result);
                            }
                        }
                        else if(DCSCommandMap[mySetKey].dataType == "int"){
                            //convert to int
                            setSettingValueDCS = parseInt(value);
                        }
                        else if(DCSCommandMap[mySetKey].dataType == "enum"){
                            //convert to proper enum name
                            if(DCSCommandMap[mySetKey].hasOwnProperty(value)){
                                setSettingValueDCS = DCSCommandMap[mySetKey][value];
                            }
                        }
                        else if(DCSCommandMap[mySetKey].dataType == "other"){
                            if(mySetKey == "BarcodeReader.Settings.HardwareTrigger"){
                                if(value == "true"){
                                    setSettingValueDCS = "hardware";
                                }
                                else if(value == "false"){
                                    setSettingValueDCS = "emulated";
                                }
                            }
                        }
                        else{
                            //must be string...do nothing...
                            setSettingValueDCS = value;
                        }

                        setValuesObject[setSettingNameDCS] = setSettingValueDCS;
                    }
                    else{
                        var result = new Object();
                        result.method = "setBuffered";
                        result.status = -1994391502;
                        result.message = "Not Supported.";
                        result.family = this.buffer[i][1];
                        result.key = this.buffer[i][2];
                        result.option = this.buffer[i][3];

                        resultArray.push(result);
                    }
                }
    	    }

    	    if(getBuffer.length > 0){
    	        //console.log("getBuffer: " + getBuffer.toString());

    	        var paramsObject = new Object();
	            paramsObject.device = "dcs.scanner.imager";
	            paramsObject.names = getBuffer;
	            //console.log("paramsObject: " + paramsObject.names.toString());

	            var request = new Object();
	            request.id = getId;
	            request.jsonrpc = "2.0";
	            request.method = "device.getConfig";
	            request.params = paramsObject;

	            getDCSJSON = JSON.stringify(request);
	            //console.log("getDCSJSON: " + getDCSJSON);

    	    }
    	    else{
    	        //console.log("getBuffer empty");
    	    }

    	    if(objectLength(setValuesObject) > 0){
    	        //console.log("setValuesObject: " + setValuesObject.toString());

                var paramsObject = new Object();
                paramsObject.device = "dcs.scanner.imager";
                paramsObject.values = setValuesObject;

                var request = new Object();
                request.id = setId;
                request.jsonrpc = "2.0";
                request.method = "device.setConfig";
                request.params = paramsObject;

                setDCSJSON = JSON.stringify(request);
                //console.log("setDCSJSON: " + setDCSJSON);

    	    }
    	    else{
    	        //console.log("setValuesObject empty");
    	    }

    	    //
    	    //Execute DCS Command
    	    //
            if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                var xmlhttpGet=new XMLHttpRequest();
            }

            xmlhttpGet.onreadystatechange=function(){
                if (xmlhttpGet.readyState==4 && xmlhttpGet.status==200){
                    //console.log("xmlhttpGet.responseText: " + xmlhttpGet.responseText);
                    getResultDCS = JSON.parse(xmlhttpGet.responseText);

                    if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                        var xmlhttpSet=new XMLHttpRequest();
                    }

                    xmlhttpSet.onreadystatechange=function(){
                        if (xmlhttpSet.readyState==4 && xmlhttpSet.status==200){
                            //console.log("xmlhttpSet.responseText: " + xmlhttpSet.responseText);
                            setResultDCS = JSON.parse(xmlhttpSet.responseText);

                            //
                            //Build response to user...
                            //

                            //
                            //Get
                            //
                            if(getId == getResultDCS.id){

                                if(objectLength(getResultDCS.result.retrieved) > 0){
                                    //Iterate through applied settings...

                                    for( var property in getResultDCS.result.retrieved ) {
                                        if( getResultDCS.result.retrieved.hasOwnProperty(property) ) {
                                            var rawGetDCSValue = getResultDCS.result.retrieved[property];

                                            for(var myMapKey in DCSCommandMap) {
                                                if(DCSCommandMap[myMapKey].name == property){
                                                    //console.log("myMapKey: " + myMapKey + " property: " + property + " rawGetDCSValue: " + rawGetDCSValue);
                                                    var arrayOfStrings = myMapKey.split(".");

                                                    var result = new Object();
                                                    result.method = "getBuffered";
                                                    result.status = 0;
                                                    result.message = "Operation completed successfully.";
                                                    result.family = arrayOfStrings[0];
                                                    result.key = arrayOfStrings[1];
                                                    result.option = arrayOfStrings[2];

                                                    if(DCSCommandMap[myMapKey].dataType == "enum"){
                                                        for(var myMapProperty in DCSCommandMap[myMapKey]) {
                                                            var myMapValue = DCSCommandMap[myMapKey][myMapProperty];
                                                            if(myMapValue == rawGetDCSValue){
                                                                result.value = myMapProperty;
                                                            }
                                                        }
                                                    }
                                                    else if(DCSCommandMap[myMapKey].dataType == "other"){
                                                        if(myMapKey == "BarcodeReader.Settings.HardwareTrigger"){
                                                            if(rawGetDCSValue == "hardware"){
                                                                result.value = "true";
                                                            }
                                                            else if(rawGetDCSValue == "emulated"){
                                                                result.value = "false";
                                                            }
                                                        }
                                                    }
                                                    else{
                                                        result.value = rawGetDCSValue.toString();
                                                    }

                                                    resultArray.push(result);
                                                }
                                            }
                                        }
                                    }
                                }
                                else if(objectLength(getResultDCS.result.failed) > 0){
                                    //Iterate through applied settings...

                                    for( var property in getResultDCS.result.failed ) {
                                        if( getResultDCS.result.failed.hasOwnProperty(property) ) {
                                            var rawGetDCSValue = getResultDCS.result.failed[property];

                                            for(var myMapKey in DCSCommandMap) {
                                                if(DCSCommandMap[myMapKey].name == property){
                                                    //console.log("myMapKey: " + myMapKey + " property: " + property + " rawGetDCSValue: " + rawGetDCSValue);
                                                    var arrayOfStrings = myMapKey.split(".");

                                                    var result = new Object();
                                                    result.method = "getBuffered";
                                                    result.status = -1994389925;
                                                    result.message = "Function Failed.";
                                                    result.family = arrayOfStrings[0];
                                                    result.key = arrayOfStrings[1];
                                                    result.option = arrayOfStrings[2];

                                                    resultArray.push(result);
                                                }
                                            }
                                        }
                                    }
                                }
                                else{
                                    //Unknown Failure...
                                    var result = new Object();
                                    result.status = -1994389925;
                                    result.message = "Function Failed.";

                                    setTimeout(function(){onCommitComplete(result);},0);
                                }
                            }

                            //
                            //Set
                            //
                            if(setId == setResultDCS.id){

                                if(objectLength(setResultDCS.result.applied) > 0){
                                    //Iterate through applied settings...

                                        for( var property in setResultDCS.result.applied ) {
                                            if( setResultDCS.result.applied.hasOwnProperty(property) ) {
                                                var rawSetDCSValue = setResultDCS.result.applied[property];

                                                for(var myMapKey in DCSCommandMap) {
                                                    if(DCSCommandMap[myMapKey].name == property){
                                                        //console.log("myMapKey: " + myMapKey + " property: " + property + " rawSetDCSValue: " + rawGetDCSValue);
                                                    var arrayOfStrings = myMapKey.split(".");

                                                    var result = new Object();
                                                    result.method = "setBuffered";
                                                    result.status = 0;
                                                    result.message = "Operation completed successfully.";
                                                    result.family = arrayOfStrings[0];
                                                    result.key = arrayOfStrings[1];
                                                    result.option = arrayOfStrings[2];

                                                    resultArray.push(result);
                                                }
                                            }
                                        }
                                    }
                                }
                                else if(objectLength(setResultDCS.result.failed) > 0){
                                    //Iterate through failed settings...

                                    for( var property in setResultDCS.result.failed ) {
                                        if( setResultDCS.result.failed.hasOwnProperty(property) ) {
                                            var rawSetDCSValue = setResultDCS.result.failed[property];

                                            for(var myMapKey in DCSCommandMap) {
                                                if(DCSCommandMap[myMapKey].name == property){
                                                    //console.log("myMapKey: " + myMapKey + " property: " + property + " rawSetDCSValue: " + rawGetDCSValue);
                                                var arrayOfStrings = myMapKey.split(".");

                                                var result = new Object();
                                                result.method = "setBuffered";
                                                result.status = -1994389925;
                                                result.message = "Function Failed.";
                                                result.family = arrayOfStrings[0];
                                                result.key = arrayOfStrings[1];
                                                result.option = arrayOfStrings[2];

                                                resultArray.push(result);
                                            }
                                        }
                                    }
                                }
                            }
                                else{
                                    //Unknown Failure...
                                    var result = new Object();
                                    result.status = -1994389925;
                                    result.message = "Function Failed.";

                                    setTimeout(function(){onCommitComplete(result);},0);
                                }
                            }

                            setTimeout(function(){onCommitComplete(resultArray);},0);
                        }
                    }

                    xmlhttpSet.open("POST","http://127.0.0.1:8080/jsonrpc/datacollection",true);
                    xmlhttpSet.send(setDCSJSON);
                }
            }

            xmlhttpGet.open("POST","http://127.0.0.1:8080/jsonrpc/datacollection",true);
            xmlhttpGet.send(getDCSJSON);
    	}
    }
}




/*********************
 ****** HELPERS ******
 *********************/

/**
 * objectLenth
 *
 * @param {object} object the object to find the length of
 * @return {integer} length the length of the object
 */
function objectLength( object ) {
    var length = 0;
    for( var key in object ) {
        if( object.hasOwnProperty(key) ) {
            ++length;
        }
    }
    return length;
};

/**
 * getRandomInt
 *
 * @param {integer} min floor of the random number
 * @param {integer} max max of the random number
 * @return {integer} value the random number
 */
function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * setConfigCreateJSON
 *
 * @param {integer} id id for the JSON
 * @param {integer} family family for the setConfig request
 * @param {integer} key key for the setConfig request
 * @param {integer} option option for the setConfig request
 * @param {integer} value value for the setConfig request
 * @return {string} DCSJSON the JSON for the DCS
 */
function setConfigCreateJSON(id, family, key, option, value){
	var settingNameDCS;
	var settingValueDCS;
	var myID = id;

	var myKey = family + "." + key + "." + option;

	if (myKey in DCSCommandMap){
		settingNameDCS = DCSCommandMap[myKey].name;

		if(DCSCommandMap[myKey].dataType == "boolean"){
			//convert to boolean
			if(value == "true"){
				settingValueDCS = true;
			}
			else if(value == "false"){
				settingValueDCS = false;
			}
			else{
			    return "Not Supported";
			}
		}
		else if(DCSCommandMap[myKey].dataType == "int"){
			//convert to int
			settingValueDCS = parseInt(value);
		}
        else if(DCSCommandMap[myKey].dataType == "enum"){
            //convert to proper enum name
            if(DCSCommandMap[myKey].hasOwnProperty(value)){
                    settingValueDCS = DCSCommandMap[myKey][value];
            }
        }
        else if(DCSCommandMap[myKey].dataType == "other"){
            if(myKey == "BarcodeReader.Settings.HardwareTrigger"){
                if(value == "true"){
                    settingValueDCS = "hardware";
                }
                else if(value == "false"){
                    settingValueDCS = "emulated";
                }
            }
        }
		else{
			//must be string...do nothing...
			settingValueDCS = value;
		}
	}
	else{
	    return "Not Supported";
	}

	var valuesObject = new Object();
	valuesObject[settingNameDCS] = settingValueDCS;

	var paramsObject = new Object();
	paramsObject.device = "dcs.scanner.imager";
	paramsObject.values = valuesObject;

	var request = new Object();
	request.id = myID;
	request.jsonrpc = "2.0";
	request.method = "device.setConfig";
	request.params = paramsObject;

	var DCSJSON = JSON.stringify(request);

	return DCSJSON;
}

/**
 * getConfigCreateJSON
 *
 * @param {integer} id id for the JSON
 * @param {integer} family family for the setConfig request
 * @param {integer} key key for the setConfig request
 * @param {integer} option option for the setConfig request
 * @return {string} DCSJSON the JSON for the DCS
 */
function getConfigCreateJSON(id, family, key, option){
	var settingNameDCS;
	var settingValueDCS
	var myID = id;

	var myKey = family + "." + key + "." + option;

	if (myKey in DCSCommandMap){
		settingNameDCS = DCSCommandMap[myKey].name;
	}
	else{
        return "Not Supported";
    }

	var paramsObject = new Object();
	paramsObject.device = "dcs.scanner.imager";
	paramsObject.names = [settingNameDCS];

	var request = new Object();
	request.id = myID;
	request.jsonrpc = "2.0";
	request.method = "device.getConfig";
	request.params = paramsObject;

	var DCSJSON = JSON.stringify(request);

	return DCSJSON;
}

/**
 * DCSCommandMap
 */
var DCSCommandMap = {};

//AustralianPost
DCSCommandMap['Symbology.AustralianPost.Enable'] = {"name":"australianPostEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.AustralianPost.Codemark'] = {"name":"australianPostCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.AustralianPost.UserDefinedSymbologyId'] = {"name":"australianPostUdsi", "dataType":"string"};

//Aztec
DCSCommandMap['Symbology.Aztec.Enable'] = {"name":"aztecEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Aztec.Codemark'] = {"name":"aztecCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Aztec.UserDefinedSymbologyId'] = {"name":"aztecUdsi", "dataType":"string"};
DCSCommandMap['Symbology.Aztec.StructuredAppendMode'] = {"name":"aztecStructuredAppendEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Aztec.Runes'] = {"name":"aztecRunesEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Aztec.GS1_128Emulation'] = {"name":"aztecEan128EmulationEnabled", "dataType":"boolean"};

//BPO
DCSCommandMap['Symbology.BPO.Enable'] = {"name":"bpoEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.BPO.Codemark'] = {"name":"bpoCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.BPO.UserDefinedSymbologyId'] = {"name":"bpoUdsi", "dataType":"string"};
DCSCommandMap['Symbology.BPO.TransmitCheckDigit'] = {"name":"bpoCheckDigitTransmissionEnabled", "dataType":"boolean"};

//CanadaPost
DCSCommandMap['Symbology.CanadaPost.Enable'] = {"name":"canadaPostEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.CanadaPost.Codemark'] = {"name":"canadaPostCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.CanadaPost.UserDefinedSymbologyId'] = {"name":"canadaPostUdsi", "dataType":"string"};

//Codabar
DCSCommandMap['Symbology.Codabar.Enable'] = {"name":"codabarEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Codabar.Codemark'] = {"name":"codabarCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Codabar.UserDefinedSymbologyId'] = {"name":"codabarUdsi", "dataType":"string"};
DCSCommandMap['Symbology.Codabar.TransmitCheckDigit'] = {"name":"codabarCheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Codabar.VerifyCheckDigit'] = {"name":"codabarCheckDigitVerificationEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Codabar.LengthMode'] = {"name":"codabarLengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Codabar.Length1'] = {"name":"codabarLength1", "dataType":"int"};
DCSCommandMap['Symbology.Codabar.Length2'] = {"name":"codabarLength2", "dataType":"int"};
DCSCommandMap['Symbology.Codabar.Length3'] = {"name":"codabarLength3", "dataType":"int"};
DCSCommandMap['Symbology.Codabar.Concatenation'] = {"name":"codabarConcatenationTransmission", "dataType":"enum", "Disable":"disabled", "TransmitConcatenatedOnly":"concatenatedCodesOnly", "TransmitConcatenatedOrSingle":"concatenatedCodesOrSingleCodes"};
DCSCommandMap['Symbology.Codabar.StartStopTransmit'] = {"name":"codabarStartStopTransmission", "dataType":"enum", "Disable":"disabled", "a,b,c,d":"a,b,c,d", "A,B,C,D":"A,B,C,D", "a,b,c,d/t,n,*,e":"a,b,c,d/t,n,*,e", "DC1,DC2,DC3,DC4":"DC1,DC2,DC3,DC4"};
DCSCommandMap['Symbology.Codabar.CLSILibrary'] = {"name":"codabarClsiLibrarySystemEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Codabar.ConcatenationMode'] = {"name":"codabarConcatenationMode", "dataType":"enum", "NoRestriction":"noRestriction", "SecondCodeStartEqualsFirstCodeStop":"secondCodeStartEqualsFirstCodeStop", "AmericanBloodCommission":"americanBloodCommission"};

//CodablockA
DCSCommandMap['Symbology.CodablockA.Enable'] = {"name":"codablockAEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.CodablockA.Codemark'] = {"name":"codablockACodeMark", "dataType":"string"};
DCSCommandMap['Symbology.CodablockA.UserDefinedSymbologyId'] = {"name":"codablockAUdsi", "dataType":"string"};

//CodablockF
DCSCommandMap['Symbology.CodablockF.Enable'] = {"name":"codablockFEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.CodablockF.Codemark'] = {"name":"codablockFCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.CodablockF.UserDefinedSymbologyId'] = {"name":"codablockFUdsi", "dataType":"string"};

//Code11
DCSCommandMap['Symbology.Code11.Enable'] = {"name":"code11Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code11.Codemark'] = {"name":"code11CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Code11.UserDefinedSymbologyId'] = {"name":"code11Udsi", "dataType":"string"};
DCSCommandMap['Symbology.Code11.TransmitCheckDigit'] = {"name":"code11CheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code11.VerifyCheckDigit'] = {"name":"code11CheckDigitVerification", "dataType":"enum", "1Digit":"oneDigit", "2Digit":"twoDigits"};
DCSCommandMap['Symbology.Code11.LengthMode'] = {"name":"code11LengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Code11.Length1'] = {"name":"code11Length1", "dataType":"int"};
DCSCommandMap['Symbology.Code11.Length2'] = {"name":"code11Length2", "dataType":"int"};
DCSCommandMap['Symbology.Code11.Length3'] = {"name":"code11Length3", "dataType":"int"};

//Code39
DCSCommandMap['Symbology.Code39.Enable'] = {"name":"code39Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code39.Codemark'] = {"name":"code39CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Code39.UserDefinedSymbologyId'] = {"name":"code39Udsi", "dataType":"string"};
DCSCommandMap['Symbology.Code39.TransmitCheckDigit'] = {"name":"code39CheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code39.VerifyCheckDigit'] = {"name":"code39CheckDigitVerification", "dataType":"enum", "Disable":"disable", "Modulo43":"modulo43", "FrenchCIP":"frenchCip", "ItalianCPI":"italianCpi", "HIBC":"hibc", "AIAG":"aiag"};
DCSCommandMap['Symbology.Code39.LengthMode'] = {"name":"code39LengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Code39.Length1'] = {"name":"code39Length1", "dataType":"int"};
DCSCommandMap['Symbology.Code39.Length2'] = {"name":"code39Length2", "dataType":"int"};
DCSCommandMap['Symbology.Code39.Length3'] = {"name":"code39Length3", "dataType":"int"};
DCSCommandMap['Symbology.Code39.ReadingRange'] = {"name":"code39ReadingRange", "dataType":"enum", "Normal":"normal", "Extended":"extended"};
DCSCommandMap['Symbology.Code39.ReadingTolerance'] = {"name":"code39ReadingTolerance", "dataType":"enum", "High":"high", "Medium":"medium", "Low":"low"};
DCSCommandMap['Symbology.Code39.EnableTriopticCode39'] = {"name":"triopticCode39Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code39.UnconventionalCode39'] = {"name":"unconventionalCode39Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code39.StartStopTransmission'] = {"name":"code39StartStopTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code39.StartCharacter'] = {"name":"code39AcceptedStartCharacter", "dataType":"enum", "$ only":"$", "* only":"*", "$ and *":"$*"};
DCSCommandMap['Symbology.Code39.FullAscii'] = {"name":"code39FullAsciiConversion", "dataType":"enum", "Disable":"disable", "Mixed":"mixed", "Strict":"strict"};

//Code93
DCSCommandMap['Symbology.Code93.Enable'] = {"name":"code93Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code93.Codemark'] = {"name":"code93CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Code93.UserDefinedSymbologyId'] = {"name":"code93Udsi", "dataType":"string"};
DCSCommandMap['Symbology.Code93.LengthMode'] = {"name":"code93LengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Code93.Length1'] = {"name":"code93Length1", "dataType":"int"};
DCSCommandMap['Symbology.Code93.Length2'] = {"name":"code93Length2", "dataType":"int"};
DCSCommandMap['Symbology.Code93.Length3'] = {"name":"code93Length3", "dataType":"int"};

//Code128
DCSCommandMap['Symbology.Code128.EnableCode128'] = {"name":"code128Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code128.Code128Codemark'] = {"name":"code128CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Code128.Code128UserDefinedSymbologyId'] = {"name":"code128Udsi", "dataType":"string"};
DCSCommandMap['Symbology.Code128.LengthMode'] = {"name":"code128LengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Code128.Length1'] = {"name":"code128Length1", "dataType":"int"};
DCSCommandMap['Symbology.Code128.Length2'] = {"name":"code128Length2", "dataType":"int"};
DCSCommandMap['Symbology.Code128.Length3'] = {"name":"code128Length3", "dataType":"int"};
DCSCommandMap['Symbology.Code128.ReadingRange'] = {"name":"code128ReadingRange", "dataType":"enum", "Normal":"normal", "Extended":"extended"};
DCSCommandMap['Symbology.Code128.VerifyCheckDigit'] = {"name":"code128CheckDigitVerificationEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code128.ReadingTolerance'] = {"name":"code128ReadingTolerance", "dataType":"enum", "High":"high", "Medium":"medium", "Low":"low"};
DCSCommandMap['Symbology.Code128.ISBTConcatenationTransmit'] = {"name":"code128ConcatenationTransmission", "dataType":"enum", "Disable":"disabled", "ConcatCodes":"concatenatedCodesOnly", "ConcatOrSingleCodes":"concatenatedCodesOrSingleCodes"};
DCSCommandMap['Symbology.Code128.EnableISBT_128'] = {"name":"isbtEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code128.EnableGS1_128'] = {"name":"gs1-128Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code128.UnconventionalGS1_128'] = {"name":"unconventionalGs1-128Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code128.GS1_128Codemark'] = {"name":"gs1-128CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Code128.Fnc1Conversion'] = {"name":"code128Fnc1SeperatorCharacter", "dataType":"string"};
DCSCommandMap['Symbology.Code128.GS1_128UserDefinedSymbologyId'] = {"name":"gs1-128Udsi", "dataType":"string"};
DCSCommandMap['Symbology.Code128.GS1_128Identifier'] = {"name":"gs1-128IdentifierEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code128.ConcatenateISBTCodes'] = {"name":"isbtConcatenationEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Code128.GTINCompliant'] = {"name":"gs1-128GtinProcessingEnabled", "dataType":"boolean"};

//DataMatrix
DCSCommandMap['Symbology.DataMatrix.Enable'] = {"name":"dataMatrixEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.DataMatrix.Codemark'] = {"name":"dataMatrixCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.DataMatrix.UserDefinedSymbologyId'] = {"name":"dataMatrixUdsi", "dataType":"string"};
DCSCommandMap['Symbology.DataMatrix.MirroredLabels'] = {"name":"dataMatrixMirroredLabelsEnabled", "dataType":"boolean"};

//DutchPost
DCSCommandMap['Symbology.DutchPost.Enable'] = {"name":"dutchPostEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.DutchPost.Codemark'] = {"name":"dutchPostCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.DutchPost.UserDefinedSymbologyId'] = {"name":"dutchPostUdsi", "dataType":"string"};

//EANUPC
DCSCommandMap['Symbology.EANUPC.EnableUPCA'] = {"name":"upcAEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EnableUPCE'] = {"name":"upcEEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EnableEAN8'] = {"name":"ean8Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EnableEAN13'] = {"name":"ean13Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EAN13ToISBN'] = {"name":"ean13IsbnConversionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.AddOn2DigitsActive'] = {"name":"upcEanAddOn2Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.AddOn5DigitsActive'] = {"name":"upcEanAddOn5Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.UPCACodemark'] = {"name":"upcACodeMark", "dataType":"string"};
DCSCommandMap['Symbology.EANUPC.UPCECodemark'] = {"name":"upcECodeMark", "dataType":"string"};
DCSCommandMap['Symbology.EANUPC.EAN8Codemark'] = {"name":"ean8CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.EANUPC.EAN13Codemark'] = {"name":"ean13CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.EANUPC.EnableUPC_E1'] = {"name":"upcE1Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.UPCACheckDigit'] = {"name":"upcACheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.UPCECheckDigit'] = {"name":"upcECheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EAN8CheckDigit'] = {"name":"ean8CheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EAN13CheckDigit'] = {"name":"ean13CheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.UPCANumberSys'] = {"name":"upcANumberSystemTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.UPCENumberSys'] = {"name":"upcENumberSystemTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.UPCAXmitAsEAN13'] = {"name":"upcATransmittedAsEan13Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.UPCEXmitAsUPCA'] = {"name":"upcETransmittedAsUpcAEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EAN8XmitAsEAN13'] = {"name":"ean8TransmittedAsEan13Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.AddOnDigits'] = {"name":"upcEanAddOnDigits", "dataType":"enum", "TransmitIfFound":"notRequiredButTransmittedIfRead", "ControlledByAddOnDigits":"requiredAndTransmitted"};
DCSCommandMap['Symbology.EANUPC.GTINCompliant'] = {"name":"upcEanGtinProcessingEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EAN13ToISMN'] = {"name":"ean13IsmnConversionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.EAN13ToISSN'] = {"name":"ean13IssnConversionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.EANUPC.UPCAUserDefinedSymbologyId'] = {"name":"upcAUdsi", "dataType":"string"};
DCSCommandMap['Symbology.EANUPC.UPCEUserDefinedSymbologyId'] = {"name":"upcEUdsi", "dataType":"string"};
DCSCommandMap['Symbology.EANUPC.EAN8UserDefinedSymbologyId'] = {"name":"ean8Udsi", "dataType":"string"};
DCSCommandMap['Symbology.EANUPC.EAN13UserDefinedSymbologyId'] = {"name":"ean13Udsi", "dataType":"string"};
DCSCommandMap['Symbology.EANUPC.ReadingRange'] = {"name":"upcEanReadingRange", "dataType":"enum", "Normal":"normal", "Extended":"extended"};
DCSCommandMap['Symbology.EANUPC.AddOnSecurity'] = {"name":"upcEanAddOnDigitSecurity", "dataType":"int"};

//GS1Composite
DCSCommandMap['Symbology.GS1Composite.LinearOnlyXmitMode'] = {"name":"gs1CompositeLinearOnlyTransmissionModeEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.GS1Composite.UnconventionalGS1Composite'] = {"name":"gs1CompositeRemoveAutoAimIdentifierEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.GS1Composite.EAN_UPCCompMsgDecode'] = {"name":"gs1CompositeMessageDecodingMode", "dataType":"enum", "Never Linked":"neverLinked", "Always Linked":"alwaysLinked", "Auto-discriminate":"autodiscriminate"};
DCSCommandMap['Symbology.GS1Composite.Enable_AB'] = {"name":"gs1CompositeABEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.GS1Composite.AB_Codemark'] = {"name":"gs1CompositeABCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.GS1Composite.AB_UserDefinedSymbologyId'] = {"name":"gs1CompositeABUdsi", "dataType":"string"};
DCSCommandMap['Symbology.GS1Composite.Enable_C'] = {"name":"gs1CompositeCEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.GS1Composite.C_Codemark'] = {"name":"gs1CompositeCCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.GS1Composite.C_UserDefinedSymbologyId'] = {"name":"gs1CompositeCUdsi", "dataType":"string"};
DCSCommandMap['Symbology.GS1Composite.GS1CompositeGS1_128Emulation'] = {"name":"gs1CompositeGs1128EmulationEnabled", "dataType":"boolean"};

//GS1DataBarExpanded
DCSCommandMap['Symbology.GS1DataBarExpanded.Enable'] = {"name":"gs1DataBarExpandedEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.GS1DataBarExpanded.Codemark'] = {"name":"gs1DataBarExpandedCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.GS1DataBarExpanded.UserDefinedSymbologyId'] = {"name":"gs1DataBarExpandedUdsi", "dataType":"string"};

//GS1DataBarLimited
DCSCommandMap['Symbology.GS1DataBarLimited.Enable'] = {"name":"gs1DataBarLimitedEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.GS1DataBarLimited.Codemark'] = {"name":"gs1DataBarLimitedCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.GS1DataBarLimited.UserDefinedSymbologyId'] = {"name":"gs1DataBarLimitedUdsi", "dataType":"string"};

//GS1DataBarOmniDirectional
DCSCommandMap['Symbology.GS1DataBarOmniDirectional.Enable'] = {"name":"gs1DataBarOmnidirectionalEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.GS1DataBarOmniDirectional.Codemark'] = {"name":"gs1DataBarOmnidirectionalCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.GS1DataBarOmniDirectional.UserDefinedSymbologyId'] = {"name":"gs1DataBarOmnidirectionalUdsi", "dataType":"string"};

//Infomail
DCSCommandMap['Symbology.Infomail.Enable'] = {"name":"infomailEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Infomail.Codemark'] = {"name":"infomailCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Infomail.UserDefinedSymbologyId'] = {"name":"infomailUdsi", "dataType":"string"};

//IntelligentMail
DCSCommandMap['Symbology.IntelligentMail.Enable'] = {"name":"intelligentMailEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.IntelligentMail.Codemark'] = {"name":"intelligentMailCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.IntelligentMail.UserDefinedSymbologyId'] = {"name":"intelligentMailUdsi", "dataType":"string"};

//Interleaved2of5
DCSCommandMap['Symbology.Interleaved2of5.Enable'] = {"name":"interleaved2of5Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Interleaved2of5.Codemark'] = {"name":"interleaved2of5CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Interleaved2of5.UserDefinedSymbologyId'] = {"name":"interleaved2of5Udsi", "dataType":"string"};
DCSCommandMap['Symbology.Interleaved2of5.LengthMode'] = {"name":"interleaved2of5LengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Interleaved2of5.Length1'] = {"name":"interleaved2of5Length1", "dataType":"int"};
DCSCommandMap['Symbology.Interleaved2of5.Length2'] = {"name":"interleaved2of5Length2", "dataType":"int"};
DCSCommandMap['Symbology.Interleaved2of5.Length3'] = {"name":"interleaved2of5Length3", "dataType":"int"};
DCSCommandMap['Symbology.Interleaved2of5.TransmitCheckDigit'] = {"name":"interleaved2of5CheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Interleaved2of5.ReadingRange'] = {"name":"interleaved2of5ReadingRange", "dataType":"enum", "Normal":"normal", "Extended":"extended"};
DCSCommandMap['Symbology.Interleaved2of5.ReadingTolerance'] = {"name":"interleaved2of5ReadingTolerance", "dataType":"enum", "High":"high", "Medium":"medium", "Low":"low"};
DCSCommandMap['Symbology.Interleaved2of5.VerifyCheckDigit'] = {"name":"interleaved2of5CheckDigitVerification", "dataType":"enum", "Disable":"disable", "Modulo10":"modulo10", "FrenchCIP":"frenchCip", "CaseCode":"caseCode"};

//JapanPost
DCSCommandMap['Symbology.JapanPost.Enable'] = {"name":"japanPostEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.JapanPost.Codemark'] = {"name":"japanPostCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.JapanPost.UserDefinedSymbologyId'] = {"name":"japanPostUdsi", "dataType":"string"};
DCSCommandMap['Symbology.JapanPost.TransmitCheckDigit'] = {"name":"japanPostCheckDigitTransmissionEnabled", "dataType":"boolean"};

//Matrix2of5
DCSCommandMap['Symbology.Matrix2of5.Enable'] = {"name":"matrix2of5Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Matrix2of5.Codemark'] = {"name":"matrix2of5CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Matrix2of5.UserDefinedSymbologyId'] = {"name":"matrix2of5Udsi", "dataType":"string"};
DCSCommandMap['Symbology.Matrix2of5.LengthMode'] = {"name":"matrix2of5LengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Matrix2of5.Length1'] = {"name":"matrix2of5Length1", "dataType":"int"};
DCSCommandMap['Symbology.Matrix2of5.Length2'] = {"name":"matrix2of5Length2", "dataType":"int"};
DCSCommandMap['Symbology.Matrix2of5.Length3'] = {"name":"matrix2of5Length3", "dataType":"int"};
DCSCommandMap['Symbology.Matrix2of5.TransmitStartStop'] = {"name":"matrix2of5StartStopTransmissionMode", "dataType":"enum", "Regular":"regular", "ChinaPost":"chinaPost"};

//Maxicode
DCSCommandMap['Symbology.Maxicode.Enable'] = {"name":"maxicodeEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Maxicode.Codemark'] = {"name":"maxicodeCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Maxicode.UserDefinedSymbologyId'] = {"name":"maxicodeUdsi", "dataType":"string"};
DCSCommandMap['Symbology.Maxicode.Mode0Enabled'] = {"name":"maxicodeMode0Enabled", "dataType":"boolean"};

//MicroPDF417
DCSCommandMap['Symbology.MicroPDF417.Enable'] = {"name":"microPdf417Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.MicroPDF417.Codemark'] = {"name":"microPdf417CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.MicroPDF417.UserDefinedSymbologyId'] = {"name":"microPdf417Udsi", "dataType":"string"};
DCSCommandMap['Symbology.MicroPDF417.MicroPDFCode128Emulation'] = {"name":"pdf417Code128EmulationEnabled", "dataType":"boolean"};

//MSI
DCSCommandMap['Symbology.MSI.Enable'] = {"name":"msiEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.MSI.Codemark'] = {"name":"msiCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.MSI.UserDefinedSymbologyId'] = {"name":"msiUdsi", "dataType":"string"};
DCSCommandMap['Symbology.MSI.LengthMode'] = {"name":"msiLengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.MSI.Length1'] = {"name":"msiLength1", "dataType":"int"};
DCSCommandMap['Symbology.MSI.Length2'] = {"name":"msiLength2", "dataType":"int"};
DCSCommandMap['Symbology.MSI.Length3'] = {"name":"msiLength3", "dataType":"int"};
DCSCommandMap['Symbology.MSI.VerifyCheckDigit'] = {"name":"msiCheckDigitVerification", "dataType":"enum", "Modulo10":"modulo10", "DoubleModulo10":"doubleModulo10", "Modulo11Plus10":"modulo11Plus10"};
DCSCommandMap['Symbology.MSI.TransmitCheckDigit'] = {"name":"msiCheckDigitTransmissionEnabled", "dataType":"boolean"};

//PDF417
//Note: C++ PDFWithDataLengthID0 not in DCS
DCSCommandMap['Symbology.PDF417.Enable'] = {"name":"pdf417Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.PDF417.Codemark'] = {"name":"pdf417CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.PDF417.UserDefinedSymbologyId'] = {"name":"pdf417Udsi", "dataType":"string"};
DCSCommandMap['Symbology.PDF417.ControlHeaderTransmission'] = {"name":"pdf417StructuredAppendHeaderTransmissionEnabled", "dataType":"boolean"};

//Planet
DCSCommandMap['Symbology.Planet.Enable'] = {"name":"planetEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Planet.Codemark'] = {"name":"planetCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Planet.UserDefinedSymbologyId'] = {"name":"planetUdsi", "dataType":"string"};
DCSCommandMap['Symbology.Planet.TransmitCheckDigit'] = {"name":"planetCheckDigitTransmissionEnabled", "dataType":"boolean"};

//Plessey
DCSCommandMap['Symbology.Plessey.Enable'] = {"name":"plesseyEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Plessey.Codemark'] = {"name":"plesseyCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Plessey.UserDefinedSymbologyId'] = {"name":"plesseyUdsi", "dataType":"string"};
DCSCommandMap['Symbology.Plessey.LengthMode'] = {"name":"plesseyLengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Plessey.Length1'] = {"name":"plesseyLength1", "dataType":"int"};
DCSCommandMap['Symbology.Plessey.Length2'] = {"name":"plesseyLength2", "dataType":"int"};
DCSCommandMap['Symbology.Plessey.Length3'] = {"name":"plesseyLength3", "dataType":"int"};
DCSCommandMap['Symbology.Plessey.TransmitCheckDigit'] = {"name":"plesseyCheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Plessey.UnconventionalStop'] = {"name":"plesseyUnconventionalStopEnabled", "dataType":"boolean"};

//Postnet
DCSCommandMap['Symbology.Postnet.Enable'] = {"name":"postnetEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Postnet.Codemark'] = {"name":"postnetCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Postnet.UserDefinedSymbologyId'] = {"name":"postnetUdsi", "dataType":"string"};
DCSCommandMap['Symbology.Postnet.TransmitCheckDigit'] = {"name":"postnetCheckDigitTransmissionEnabled", "dataType":"boolean"};

//QRCode
DCSCommandMap['Symbology.QRCode.Enable'] = {"name":"qrCodeEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.QRCode.Codemark'] = {"name":"qrCodeCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.QRCode.UserDefinedSymbologyId'] = {"name":"qrCodeUdsi", "dataType":"string"};
DCSCommandMap['Symbology.QRCode.EnableMicroQRCode'] = {"name":"microQrCodeEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.QRCode.ReverseVideo'] = {"name":"qrCodeInverseVideoMode", "dataType":"enum", "Normal":"normal", "Inverse":"inverse", "Automatic":"automatic"};

//Standard2of5
DCSCommandMap['Symbology.Standard2of5.Enable'] = {"name":"standard2of5Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Standard2of5.Codemark'] = {"name":"standard2of5CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Standard2of5.UserDefinedSymbologyId'] = {"name":"standard2of5Udsi", "dataType":"string"};
DCSCommandMap['Symbology.Standard2of5.LengthMode'] = {"name":"standard2of5LengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Standard2of5.Length1'] = {"name":"standard2of5Length1", "dataType":"int"};
DCSCommandMap['Symbology.Standard2of5.Length2'] = {"name":"standard2of5Length2", "dataType":"int"};
DCSCommandMap['Symbology.Standard2of5.Length3'] = {"name":"standard2of5Length3", "dataType":"int"};
DCSCommandMap['Symbology.Standard2of5.TransmitCheckDigit'] = {"name":"standard2of5CheckDigitTransmissionEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Standard2of5.VerifyCheckDigit'] = {"name":"standard2of5CheckDigitVerification", "dataType":"enum", "Disable":"disabled", "Modulo10":"modulo10"};
DCSCommandMap['Symbology.Standard2of5.Format'] = {"name":"standard2of5Format", "dataType":"enum", "Identicon":"identicon", "CompIdentics":"computerIdentics"};

//SwedenPost
DCSCommandMap['Symbology.SwedenPost.Enable'] = {"name":"swedenPostEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.SwedenPost.Codemark'] = {"name":"swedenPostCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.SwedenPost.UserDefinedSymbologyId'] = {"name":"swedenPostUdsi", "dataType":"string"};

//Telepen
DCSCommandMap['Symbology.Telepen.Enable'] = {"name":"telepenEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.Telepen.Codemark'] = {"name":"telepenCodeMark", "dataType":"string"};
DCSCommandMap['Symbology.Telepen.UserDefinedSymbologyId'] = {"name":"telepenUdsi", "dataType":"string"};
DCSCommandMap['Symbology.Telepen.LengthMode'] = {"name":"telepenLengthMode", "dataType":"enum", "Length1Minimum":"length1MinimumLength", "Lengths123Fixed":"fixedLengths", "Length1MinLength2Max":"length1MinimumLength2Maximum"};
DCSCommandMap['Symbology.Telepen.Length1'] = {"name":"telepenLength1", "dataType":"int"};
DCSCommandMap['Symbology.Telepen.Length2'] = {"name":"telepenLength2", "dataType":"int"};
DCSCommandMap['Symbology.Telepen.Length3'] = {"name":"telepenLength3", "dataType":"int"};
DCSCommandMap['Symbology.Telepen.Format'] = {"name":"telepenFormat", "dataType":"enum", "ASCII":"ascii", "Numeric":"numeric"};

//TLC39
DCSCommandMap['Symbology.TLC39.Enable'] = {"name":"tlc39Enabled", "dataType":"boolean"};
DCSCommandMap['Symbology.TLC39.Codemark'] = {"name":"tlc39CodeMark", "dataType":"string"};
DCSCommandMap['Symbology.TLC39.UserDefinedSymbologyId'] = {"name":"tlc39Udsi", "dataType":"string"};
DCSCommandMap['Symbology.TLC39.LinearOnly'] = {"name":"tlc39LinearOnlyTransmissionModeEnabled", "dataType":"boolean"};
DCSCommandMap['Symbology.TLC39.ECISecurity'] = {"name":"tlc39EciSecurity", "dataType":"int"};

//Symbology > Options
DCSCommandMap['Symbology.Options.SymbologyId'] = {"name":"symbologyIdentifier", "dataType":"enum", "Disable":"disable", "Codemark":"codeMark", "AIM_ISO_IEC":"aimFormat", "UserDefined":"udsi"};
DCSCommandMap['Symbology.Options.Preamble'] = {"name":"preamble", "dataType":"string"};
DCSCommandMap['Symbology.Options.Postamble'] = {"name":"postamble", "dataType":"string"};

//BarcodeReader > Settings
DCSCommandMap['BarcodeReader.Settings.TriggerMode'] = {"name":"triggerMode", "dataType":"enum", "Level":"level", "Pulse":"pulse", "Flashing":"flashing", "Autostand":"autostand", "Toggle":"toggle"}; //Note: C++ has an extra enum values (0 = continuous, and 6 = presentation)
DCSCommandMap['BarcodeReader.Settings.HardwareTrigger'] = {"name":"triggerEnabled", "dataType":"other"}; //Note: C++ is Boolean... Put in fix to treat as bool from customer perspective...
DCSCommandMap['BarcodeReader.Settings.TriggerTimeout'] = {"name":"triggerTimeout", "dataType":"int"};
DCSCommandMap['BarcodeReader.Settings.AimerMode'] = {"name":"aimerMode", "dataType":"enum", "Typical":"standard", "OnePullAimAndRead":"onePullAimAndRead", "OnePullSecondPullRead":"onePullAimSecondPullRead"};
DCSCommandMap['BarcodeReader.Settings.GoodReadTurnoff'] = {"name":"turnOffAfterGoodReadEnabled", "dataType":"boolean"};
DCSCommandMap['BarcodeReader.Settings.AimingDuration'] = {"name":"aimerDuration", "dataType":"int"};
DCSCommandMap['BarcodeReader.Settings.AutoTriggerDelay'] = {"name":"retriggerDelay", "dataType":"int"};

//DecodeSecurity
DCSCommandMap['DecodeSecurity..CenterDecoding'] = {"name":"centerDecodingEnabled", "dataType":"boolean"};
DCSCommandMap['DecodeSecurity..CenterDecodingTolerance'] = {"name":"centerDecodingTolerance", "dataType":"int"};
DCSCommandMap['DecodeSecurity..ConsecutiveDataValidation'] = {"name":"consecutiveDataValidation", "dataType":"int"};
DCSCommandMap['DecodeSecurity..DiffConsecutiveTimeout'] = {"name":"differentConsecutiveBarcodesTimeout", "dataType":"int"};
DCSCommandMap['DecodeSecurity..IdenticalConsecutiveTimeout'] = {"name":"identicalConsecutiveBarcodesTimeout", "dataType":"int"};

//Multicode (Note: Not in DCS...)


var bcrPlugin;
var usePlugin = false;
var useDCS = false;
//var barcodeReaders = null;
var embedNode;
var bcrDCS;

/**
 * Creates a namespaceObj.BarcodeReaders object where the default value of the
 * namespaceObj is the window object.
 * @constructor
 */
namespaceObj.BarcodeReaders = function( onComplete )
{
    //barcodeReaders = this;
    if( typeof(embedNode) == "undefined" )
    {
       try
       {
          //Try the Plugin First...
          embedNode = document.createElement( "embed" );
          embedNode.setAttribute( "id", "bcrPlugin" );
          embedNode.setAttribute( "width", "0" );
          embedNode.setAttribute( "height", "0" );
          embedNode.setAttribute( "type", "application/x-npBarcodeReaderPlugin" );
          document.body.appendChild( embedNode );

          bcrPlugin = document.getElementById( "bcrPlugin" );
          bcrPlugin.ITCLogString( "Constructing BarcodeReaders object" );
          usePlugin = true;
          bcrPlugin.SetupScanning( onComplete );
       }
       catch(err)
       {
          //Error with Plugin. Try the DCS
          if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
              var xmlhttp=new XMLHttpRequest();
          }

          xmlhttp.onreadystatechange=function(){
              if (xmlhttp.readyState==4){
                  if(xmlhttp.status==200){
                      //Success with DCS
                      bcrDCS = DCS.create("datacollection");
                      useDCS = true;
                      setTimeout(function(){onComplete({"status":0,"message":"BarcodeReaders() complete"});},0);
                  }
                  else{
                      //Failed on DCS as well
                      setTimeout(function(){onComplete({"status":1,"message":"BarcodeReaders() Failed"});},0);
                  }
              }
          }

          xmlhttp.open("POST","http://127.0.0.1:8080/jsonrpc/datacollection",true); //true (asynchronous) or false (synchronous)
          xmlhttp.send();

       }
    }  //endif( typeof(embedNode) == "undefined" )
    else
    {
       onComplete({"status":0, "message":"BarcodeReaders() complete"});
    }
}

namespaceObj.BarcodeReaders.prototype =
{
    dcs : null,
    /**
     * @this {BarcodeReaders}
     * @param {object} scanners array of data for each connected scanner
     * @param {callback} onSuccess the success callback
     * @param {callback} onError the error callback
     */
    getAvailableBarcodeReaders : function()
    {
    	var scannerNames = [];

        if(usePlugin){
        	scannerNames = bcrPlugin.GetAvailableBarcodeReaders();
        }
        else if(useDCS){

            if (window.XMLHttpRequest) { // code for IE7+, Firefox, Chrome, Opera, Safari
                var xmlhttp=new XMLHttpRequest();
            }

            var myRequest = JSON.stringify({"id":32543,"jsonrpc":"2.0","method" : "device.listDevices"});
            xmlhttp.open("POST","http://127.0.0.1:8080/jsonrpc/datacollection",false);
            xmlhttp.send(myRequest);

            if (xmlhttp.responseText != null && xmlhttp.responseText.length > 0)
            {
                var responseDCS = JSON.parse( xmlhttp.responseText );
                for( var i=0; i<responseDCS.result.length; i++ )
                {
                    scannerNames[i] = responseDCS.result[i].device;
                }
            }
        }

        return scannerNames;
    },

    /**
     * @this {BarcodeReaders}
     * @param {string} message data to output to event log
     */
    ITCLogString : function( message )
    {
        if(usePlugin){
            bcrPlugin.ITCLogString( message );
        }
        else if(useDCS){
            //alert( message );
        }
    }
}

// Android DCS helpers and public interface
var DCS = {

    create : function(serviceName){
        // Private properties
        var methodUrl = "http://127.0.0.1:8080/jsonrpc/" + serviceName;
        var eventUrl = methodUrl + "/events";
        var eventsEnabled = false;
        var session = null;
        var id = 1;
        var eventCallback = function(){};
        var eventErrorCallback = function(){};
        var commLogger = null;

        var barcodeDataReadyListeners = [];

        function log(header, obj){
            if (pub.logCallback) {
                if (typeof obj === "object") {
                    pub.logCallback(header, JSON.stringify(obj, null, " "));
                } else {
                    pub.logCallback(header, obj);
                }
            }
        }

        var enableEvents = function(enable) {
            if (enable != eventsEnabled) {
                eventsEnabled = enable;
                if (enable) {
                    requestEvents();
                }
            }
        }

        // request events from the server
        var requestEvents = function(){
            var bcrDataReadyListeners = barcodeDataReadyListeners;
            var xhr = new XMLHttpRequest();
            xhr.open("POST", eventUrl, true);
            xhr.setRequestHeader("Content-Type","application/json");

            // response to the getEvent RPC call
            xhr.onreadystatechange = function() {
                var resp;
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        try {
                            resp = JSON.parse(xhr.responseText);

                            //console.log("Response, " + resp);

                            if (resp.result)
                            {
                                // save the session identifier
                                var s = resp.result.session;
                                if (s){
                                    session = s;
                                }
                                if (resp.result.events){
                                    if( resp.result.events.length > 0 )
                                    {
                                        //console.log("Barcode event response, " + resp);
                                    }
                                    var i, event;
                                    for (i=0; i<resp.result.events.length; i++){
                                        event = resp.result.events[i];
                                        if( event.method == "scanner.barcodeEvent" )
                                        {
                                            // Finds the barcodeDataReady listeners list for the proper device.
                                            if (bcrDataReadyListeners[event.params.device] instanceof Array)
                                            {
                                                var listeners = bcrDataReadyListeners[event.params.device];

                                                for (var i=0, len=listeners.length; i < len; i++)
                                                {
                                                	listeners[i](event.params.barcode.data,
                                                			event.params.barcode.symbology, event.params.barcode.timestamp);
                                                }
                                            }
                                        }
                                    }
                                } else if (resp.result.method){
                                    //log("Method response", resp);
                                    eventCallback(resp.result.method, resp.result.params);
                                }

                                if (eventsEnabled){
                                    requestEvents();
                                }
                            } else if (resp.error){
                                eventErrorCallback(resp.error.code, resp.error.message);
                                eventsEnabled = false;
                            }
                        } catch(err) {
                            //log("Failed to handle response", xhr.responseText);
                            eventErrorCallback(-1, err.message);
                            eventsEnabled = false;
                        }
                    } else {
                        //log("HTTP error", "status " + xhr.status + " " + xhr.statusText);
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
                    }
                };
            if (session){
                command.params.session = session;
            }

            // Post the call to get events
            try {
                //log("Post", command);
                xhr.send(JSON.stringify(command));
            }
            catch(err){
                eventErrorCallback(xhr.status, xhr.statusText)
                eventsEnabled = false;
            }
        } // var requestEvents = function()



        // Public interface
        var pub = {};

        // Debug logger
        pub.logCallback = null;

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
            eventCallback = settings.event ? settings.event : null;
            eventErrorCallback = settings.error ? settings.error : null;
            enableEvents(true);
        }

        pub.stopSession = function() {
            enableEvents(false);
        }

        pub.addBarcodeDataReadyListener = function (aDeviceName, aListener)
        {
            if (typeof barcodeDataReadyListeners[aDeviceName] == "undefined")
            {
                barcodeDataReadyListeners[aDeviceName] = [];
            }

            barcodeDataReadyListeners[aDeviceName].push(aListener);
        }

        pub.removeBarcodeDataReadyListener = function (aDeviceName, aListener)
        {
            if (barcodeDataReadyListeners[aDeviceName] instanceof Array)
            {
                var listeners = barcodeDataReadyListeners[aDeviceName];

                for (var i=0, len=listeners.length; i < len; i++)
                {
                    if (listeners[i] === aListener)
                    {
                        listeners.splice(i, 1);
                        break;
                    }
                }
            }
        }

        // Remote procedure call
        //   method: name of the method to call
        //   params: parameters for method
        //   handler: async return handler: function(error, result)
        //     error: {code:number, message:string}, or falsy if success
        //     result: response value, or falsy if error
        //
        pub.doRpc = function(method, params, handler){
            var xhr = new XMLHttpRequest();
            xhr.open("POST", methodUrl, true);
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.onreadystatechange = function(){
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        var resp = JSON.parse(xhr.responseText);
                        log("Response", resp);
                        handler(resp.error, resp.result);
                    } else {
                        var error = {code:xhr.status, message:xhr.statusText};
                        log("Response error", error);
                        handler(error, null);
                    }
                }
            };

            var command = {
                id: id++,
                jsonrpc : "2.0",
                method : method,
                params : params
            }
            try {
                log("Post", command);
                xhr.send(JSON.stringify(command));
            }
            catch(err){
                handler({code:xhr.status, message:err.message}, null);
            }
        }
        return pub;
    } // create : function(serviceName)
} // var DCS =
})(this); // End of anonymous function closure. The customer may replace 'this' parameter with other object for a namespace.


