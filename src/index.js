/**
    Copyright 2016 Michael Ihde. All Rights Reserved
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not
    use this file except in compliance with the License. A copy of the License
    is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed
    on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing
    permissions and limitations under the License.
*/

/**
 * App ID for the skill
 */
var APP_ID = "amzn1.echo-sdk-ams.app.38b0c1ee-24b5-40c6-aa7b-27cff8461da1";

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * askQrz is a child of AlexaSkill.
 */
var askQrz = function () {
    AlexaSkill.call(this, APP_ID);
};

/**
 * Load the dynamoDB interface
 */
var doc = require("dynamodb-doc");
var dynamo = new doc.DynamoDB();

/**
 * Load the request library to make requests to the FCC database.
 */
var request = require('request');

////////////////////////////////////////////////////////////////////////////////
// Extend AlexaSkill
askQrz.prototype = Object.create(AlexaSkill.prototype);
askQrz.prototype.constructor = askQrz;

askQrz.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("QRZ onSessionStarted requestId: " + 
                sessionStartedRequest.requestId +
                ", sessionId: " + 
                session.sessionId);
    // any initialization logic goes here
};

askQrz.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("QRZ onLaunch requestId: " + 
                launchRequest.requestId + 
                ", sessionId: " + 
                session.sessionId);

    var speechOutput = "Welcome to Q.R.Z., you can ask me about F.C.C. radio callsigns!";
    var repromptText = "What callsign do you want to lookup?";
    response.ask(speechOutput, repromptText);
};

askQrz.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("askQrz onSessionEnded requestId: " + 
                sessionEndedRequest.requestId + 
                ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

askQrz.prototype.intentHandlers = {
    // register custom intent handlers
    "GetQRZ": handleQrzIntent,

    // Built-in Intents
    "AMAZON.HelpIntent": function (intent, session, response) {
        if (session.attributes.stage === "retry") {
            response.ask("I wasn't able to find the callsign you requested.  You can say exit or ask for another callsign.  What callsign do you want to lookup?",
                         "What callsign do you want to lookup?");
        } else if (session.attributes.stage === "details") {
            response.ask("Say yes if you want more details or say no to exit.  Would you like more details?",
                         "Would you like more details?");
        } else {
            response.ask("You can ask me about F.C.C. radio callsigns!  What callsign do you want to lookup?",
                         "What callsign do you want to lookup?");
        }
    },
    
    "AMAZON.StopIntent": function (intent, session, response) {
        console.log("Received stop response");
        response.tell("Goodbye.");
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        console.log("Received cancel response");
        response.tell("Goodbye.");
    },
    "AMAZON.NoIntent": function (intent, session, response) {
        console.log("Received no response");
        response.tell("Ok");
    },
    "AMAZON.YesIntent": function (intent, session, response) {
        console.log("Received yes response.");
        if (session.attributes.stage === "retry") {
            handleQrzIntent(intent, session, response);
        } else if ((session.attributes.stage === "details") && session.attributes.license) {
            handleQrzDetails(intent, session, response);
        } else {
            response.tell("I'm sorry, I don't know how to handle your request");
        }
    }
};

////////////////////////////////////////////////////////////////////////////////
// Functions

/**
 * Handles the GetQRZ intent.
 *
 * @param intent
 *     the Alexa Skills Intent object
 * @param sesssion
 *     the Alexa Skills session
 * @param response
 *     the Alexa Skills response handler
 */
function handleQrzIntent(intent, session, response) {
    console.log("Session stage: " + session.attributes.stage);
    if (session.attributes.stage === "details") {
        if (intent.slots && intent.slots.CallSignA && (intent.slots.CallSignA.value === "yes")) {
            handleQrzDetails(intent, session, response);
        } else if (intent.slots && intent.slots.CallSignA && (intent.slots.CallSignA.value === "no")) {
            response.tell("Goodbye.");
        } else {
            response.ask("Say yes if you want more details, or you can say no to exit?",
                         "Say yes if you want more details, or you can say no to exit?");
        }
    } else {
        // Extract the callSign; the callSignSpeech is the same but
        // in SSML
        var callSign = "", callSignSpeech = "";
        var callSignSlotSuffixes = ["A", "B", "C", "D", "E", "F"];

        // FCC call signs are one of three types:
        //    Sequential 3 to 6 letters:
        //       Prefix K, N, W, AA-AL, KA-KZ, NA-NZ, WA-WZ
        //       Number
        //       Suffix 1-3 letters
        //    Special Event: 3 char
        //       Prefix K, N, W
        //       Number
        //       Letter
        for (var i=0; i<callSignSlotSuffixes.length; i++) {
            var suffix = callSignSlotSuffixes[i];
            var slot = intent.slots["CallSign"+suffix];
            if (slot && slot.value) {
                console.log("Slot " + suffix + " = " + slot.value);
                var value = slot.value.toUpperCase();
                var charc = value.charCodeAt(0);
                // Alexa will give you words that aren't in the custom slot type, so handle some commonly
                // mis-heard words
                if (value === "for") {
                    value = "4";
                }
                // If Alexa accidentially puts a stop word in a slot
                if ((value === "stop") || (value === "please") || (value === "over") || (value === "is")) {
                    break;
                }
                // sometimes Alexa will insert punction into a slot,
                // so skip over it
                if (((charc >= 48) && (charc <= 57)) || ((charc >= 65) && (charc <= 90))) {
                    callSign = callSign + value.substring(0, 1);
                }
            }
        }

        var speechOutput = "I'm sorry, there was an unexpected error";
        var repromptText = "";

        // Error checking
        if (!callSign || (callSign.length < 3)) {
            speechOutput = "I'm sorry, I didn't catch what callsign you wanted to lookup.  What callsign do you want to lookup?";
            repromptText = "What callsign do you want to lookup?";
            response.ask(speechOutput, repromptText);
            return;
        }

        session.attributes.stage = "lookup";
        session.attributes.callsign = callSign;
        handleQrzLookup(intent, session, response);
    }
}

/**
 * Handles the qrzLookup
 *
 * @param intent
 *     the Alexa Skills Intent object
 * @param sesssion
 *     the Alexa Skills session
 * @param response
 *     the Alexa Skills response handler
 */
function handleQrzLookup(intent, session, response) {
    console.log("Looking up details for: " + session.attributes.callsign);
   
    // Wrap the call sign in SSML 
    var callsignSpeech = "<say-as interpret-as='spell-out'>" + session.attributes.callsign + "</say-as>";

    // Define the handler the completion of the lookup
    var onLookupComplete = function (err, license) {
        var speech = "I'm sorry, there was an unexpected error with the lookup for " + callsignSpeech;
        var repromptText = "";
        var cardText = "";
        if (license) {
            console.log("Retrieved license: " + JSON.stringify(license));
            // Conver the Last, First Middle format to First Middle Last
            if (license.licName) {
                var name = license.licName.split(",");
                if (name.length === 2) {
                    license.licName = name[1] + " " + name[0];
                }
            }

            // Add this information to the session
            cardText = "Call sign " + session.attributes.callsign + " is registered to " + license.licName + ".";
            speech = "The call sign " + callsignSpeech + " is registered to " + license.licName + ". " + 
                     "Would you like more details?";
            repromptText = "Would you like more details about " + callsignSpeech + "?";

            // We are now in details stage
            session.attributes.stage = "details";
            session.attributes.license = license;
        } else if (err) {
            console.log(err);
            speech = "I'm sorry, there was an error during the lookup of " + callsignSpeech;
        } else {
            session.attributes.stage = "retry";
            speech = "I'm sorry, I couldn't lookup a license for " + callsignSpeech + ". Maybe I heard you incorrectly. What was the callsign again?";
            repromptText = "What was the callsign again?";
        }

        // Wrap the speech in SSML markup

        // Provide the response
        console.log("Responding with: " + speech);
        if (speech && repromptText) {
            speech = "<speak>" + speech + "</speak>";
            repromptText = "<speak>" + repromptText + "</speak>";
            if (cardText) {
                response.askWithCard(speech, repromptText, "QRZ", cardText, "SSML");
            } else {
                response.ask(speech, repromptText, "SSML");
            }
        } else if (speech) {
            speech = "<speak>" + speech + "</speak>";
            if (cardText) {
                response.tellWithCard(speech, "QRZ", cardText, "SSML");
            } else {
                response.tell(speech, "SSML");
            }
        } else {
            response.tell("I'm sorry, I have nothing to say. This is unexpected.");
        }
    };

    lookupLicense(session.attributes.callsign, onLookupComplete);
}

/**
 * Handles the 'yes' response for details after the GetQRZ intent.
 *
 * @param intent
 *     the Alexa Skills Intent object
 * @param sesssion
 *     the Alexa Skills session; expects session.license to be set
 * @param response
 *     the Alexa Skills response handler
 */
function handleQrzDetails(intent, session, response) {
    if (session.attributes.license) {
        var cardText = "Call sign " + session.attributes.license.callsign + " is registered to " + session.attributes.license.licName + ".\n" +
                   "This is a " + session.attributes.license.categoryDesc + " license for " + session.attributes.license.serviceDesc + ".\n" +
                   "The license is " + session.attributes.license.statusDesc + " and expires on " + session.attributes.license.expiredDate + ".";

        var callSignSpeech = "<say-as interpret-as='spell-out'>" + session.attributes.license.callsign + "</say-as>";
        var expiresSpeech = "<say-as interpret-as='date' format='mdy'>" + session.attributes.license.expiredDate + "</say-as>";

        var speech = "Call sign " + callSignSpeech + " is registered to " + session.attributes.license.licName + ". " +
                     "This is a " + session.attributes.license.categoryDesc + " license for " + session.attributes.license.serviceDesc + ". " +
                     "The license is " + session.attributes.license.statusDesc + " and expires on " + expiresSpeech + ".";

        // TODO add reprompt to ask if the the registered address is desired
        // TODO add add lookup of license class
        speech = "<speak>" + speech + "</speak>";
        response.tellWithCard(speech, "QRZ", cardText, "SSML");
    } else {
        response.tell("I'm sorry, an unexpected error occurred");
    }
}


/**
 * Looks up license information, first checking the DynamoDB table
 * then falling back to the FCC REST API.
 *
 * @param callSign
 *     The callSign to query
 * @param callback
 *     A callback that accepts (err, license)
 */
function lookupLicense(callSign, callback) {

    // See if we have a result in DynamoDB
    var queryParams = {
        TableName: "qrz",
        IndexName: "callsign-index",
        KeyConditionExpression: "callsign = :v_callsign",
        ExpressionAttributeValues: {
            ":v_callsign": callSign
        }
    };

    dynamo.query(queryParams, function(err, data) {
        var cachedLicense;
        var now = Math.floor(Date.now() / 1000);
        if (data && data.Items && data.Items.length > 0) {
            console.log("Found " + data.Items.length + " matching licenses");
            if (data.Items.length === 1) {
                cachedLicense = data.Items[0];
                if (cachedLicense && cachedLicense.expireAt) {
                    console.log("Cached license expires in " + (cachedLicense.expireAt - now) + " seconds");
                }
            } else {
                console.log("unexpected error looking up license from DB");
            }
        }

        if (cachedLicense && (cachedLicense.expireAt > now)) {
            console.log("Using cached license information");
            callback(null, cachedLicense);
        } else {
            // Log if there was a dynanmo DB error, but then continue on
            // to perform the FCC lookup
            if (err) {
                console.log(err);
            }
            console.log("Couldn't find license information in DynamoDB, using FCC lookup");
            lookupLicenseFromFCC(callSign, function(err, license) {
                if (license) {
                    storeLicense(license, callback);
                } else {
                    // If there was an error, then try to proceed
                    // with the cached license, even it has expired
                    if (cachedLicense) {
                        callback(null, cachedLicense);
                    } else {
                        callback(err);
                    }
                }
            });
        }
    });
}

/**
 * Store the license in DyanmoDB and then calls the provided callback.
 */
function storeLicense(license, callback) {
    if (!license || !license.licenseID) {
        console.log("Cowardly refusing to cache a license without a licenseID");
    } else {
        // Expire in one day by default
        license.expireAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
        // Setup the put parameters
        var putParams = {
            TableName: "qrz",
            Item: license
        };
        // Store the item
        console.log("Putting dynamoDB item");
        dynamo.putItem(putParams, function(err, data) {
            if (err) {
                console.log("Failed to add item: " + JSON.stringify(err));
            } else {
                console.log("Succeessfully added item");
            }
            callback(null, license);
        });
    }
}

/**
 * Performs a REST call on the FCC API to lookup license information by callsign.
 */
function lookupLicenseFromFCC(callSign, callback) {
    // Make the HTTP request
    var url = "http://data.fcc.gov/api/license-view/basicSearch/getLicenses?format=json&searchValue=" + callSign;

    // create the JSON response
    var handleResponse = function (err, result) {
        console.log("Lookup complete: " + JSON.stringify(result));
        if (err) {
            console.log(err);
            callback("unexpected error looking up license information");
        } else if (result.Errors && result.Errors.Err) {
            var errors = result.Errors.Err;
            console.log("error length " + errors.length);
            if ((errors.length === 1) && errors[0].msg) {
                if (errors[0].code === "110") {
                    callback(null, null);
                } else {
                    callback(errors[0].msg);
                }
            } else if (errors.length > 1) {
                callback("multiple errors were encountered with the request");
            } else {
                callback("unknown error was encountered with the request");
            }
        } else if (result.Licenses && result.Licenses.License) {
            var licenses = result.Licenses.License;
            var license;
            if (licenses.length >= 1) {
                for (var i=0; i<licenses.length; i++) {
                    if (licenses[i].callsign == callSign) {
                        license = licenses[i];
                        break;
                    }
                }
            } 
           
            if (license) {
                callback(null, license);
            } else {
                callback(null, null);
            }
        } else {
            callback("Invalid response received");
        }
    };

    // Handle the HTTP request
    request(url, function (err, httpresp, body) {
        if (!err && httpresp.statusCode === 200) {
            var result = JSON.parse(body);
            handleResponse(null, result);
        } else {
            callback(err);
        }
    });
}

////////////////////////////////////////////////////////////////////////////////
// Module
exports.handler = function (event, context) {
    // Create an instance of the askQrz skill.
    var qrz = new askQrz();
    qrz.execute(event, context);
};

