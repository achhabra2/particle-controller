'use strict';

const apiai = require('apiai');
const uuid = require('node-uuid');
const request = require('request');

module.exports = class SparkBot {

    get apiaiService() {
        return this._apiaiService;
    }

    set apiaiService(value) {
        this._apiaiService = value;
    }

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig, webhookUrl) {
        this._botConfig = botConfig;
        var apiaiOptions = {
            language: botConfig.apiaiLang,
            requestSource: "spark"
        };

        this._apiaiService = apiai(botConfig.apiaiAccessToken, apiaiOptions);
        this._sessionIds = new Map();

        this._webhookUrl = webhookUrl;
        console.log('Starting bot on ' + this._webhookUrl);

        this.loadProfile()
            .then((profile) => {
                if (profile.displayName) {
                    this._botName = profile.displayName.replace("(bot)", "").trim();
                    console.log("BotName:", this._botName);
                }
            });
    }

    setupWebhook() {
        // https://developer.ciscospark.com/endpoint-webhooks-post.html

        request.post("https://api.ciscospark.com/v1/webhooks",
            {
                auth: {
                    bearer: this._botConfig.sparkToken
                },
                json: {
                    event: "created",
                    name: "BotWebhook",
                    resource: "messages",
                    targetUrl: this._webhookUrl
                }
            }, (err, resp) => {
                if (err) {
                    console.error("Error while setup webhook", err);
                    return;
                }

                if (resp.statusCode > 200) {
                    let message = resp.statusMessage;
                    if (resp.body && resp.body.message) {
                        message += ", " + resp.body.message;
                    }
                    console.error("Error while setup webhook", message);
                    return;
                }

                console.log("Webhook result", resp.body);
            });
    }

    loadProfile() {
        return new Promise((resolve, reject) => {
            request.get("https://api.ciscospark.com/v1/people/me",
                {
                    auth: {
                        bearer: this._botConfig.sparkToken
                    }
                }, (err, resp, body) => {
                    if (err) {
                        console.error('Error while reply:', err);
                        reject(err);
                    } else if (resp.statusCode != 200) {
                        console.log('LoadMessage error:', resp.statusCode, body);
                        reject('LoadMessage error: ' + body);
                    } else {

                        if (this._botConfig.devConfig) {
                            console.log("profile", body);
                        }

                        let result = JSON.parse(body);
                        resolve(result);
                    }
                });
        });
    }

    /**
     Process message from Spark
     details here https://developer.ciscospark.com/webhooks-explained.html
     */
    processMessage(req, res) {
        if (this._botConfig.devConfig) {
            //console.log("body", req.body);
        }

        let updateObject = req.body;
        if (updateObject.resource == "messages" &&
            updateObject.data &&
            updateObject.data.id) {

            if (updateObject.data.personEmail && updateObject.data.personEmail.endsWith("@sparkbot.io"))
            {
                console.log("Message from bot. Skipping.");
                return;
            }

            this.loadMessage(updateObject.data.id)
                .then((msg)=> {
                    let messageText = msg.text;
                    let chatId = msg.roomId;

                    if (messageText && chatId) {
                        console.log(chatId, messageText);

                        // to remove bot name from message
                        if (this._botName) {
                            messageText = messageText.replace(this._botName, '');
                        }

                        if (!this._sessionIds.has(chatId)) {
                            this._sessionIds.set(chatId, uuid.v1());
                        }

                        let apiaiRequest = this._apiaiService.textRequest(messageText,
                            {
                                sessionId: this._sessionIds.get(chatId)
                            });

                        apiaiRequest.on('response', (response) => {
                            if (SparkBot.isDefined(response.result)) {
                                let responseText = response.result.fulfillment.speech;

                                if (SparkBot.isDefined(responseText)) {
                                    //console.log('Response as text message');
                                    this.reply(chatId, responseText)
                                        .then((answer) => {
                                            console.log('Reply answer:', answer.markdown);
                                        })
                                        .catch((err) => {
                                            console.error(err);
                                        });
                                    SparkBot.createResponse(res, 200, 'Reply sent');

                                } else {
                                    console.log('Received empty speech');
                                    SparkBot.createResponse(res, 200, 'Received empty speech');
                                }
                            } else {
                                console.log('Received empty result');
                                SparkBot.createResponse(res, 200, 'Received empty result');
                            }
                        });

                        apiaiRequest.on('error', (error) => {
                            console.error('Error while call to api.ai', error);
                            SparkBot.createResponse(res, 200, 'Error while call to api.ai');
                        });
                        apiaiRequest.end();
                    }
                })
                .catch((err) => {
                    console.error("Error while loading message:", err)
                });
        }

    }

    reply(roomId, text) {
        return new Promise((resolve, reject) => {
            request.post("https://api.ciscospark.com/v1/messages",
                {
                    auth: {
                        bearer: this._botConfig.sparkToken
                    },
                    json: {
                        roomId: roomId,
                        markdown: text
                    }
                }, (err, resp, body) => {
                    if (err) {
                        console.error('Error while reply:', err);
                        reject('Error while reply: ' + err.message);
                    } else if (resp.statusCode != 200) {
                        console.log('Error while reply:', resp.statusCode, body);
                        reject('Error while reply: ' + body);
                    } else {
                        //console.log("reply answer body", body);
                        resolve(body);
                    }
                });
        });
    }

    loadMessage(messageId) {
        return new Promise((resolve, reject) => {
            request.get("https://api.ciscospark.com/v1/messages/" + messageId,
                {
                    auth: {
                        bearer: this._botConfig.sparkToken
                    }
                }, (err, resp, body) => {
                    if (err) {
                        console.error('Error while reply:', err);
                        reject(err);
                    } else if (resp.statusCode != 200) {
                        console.log('LoadMessage error:', resp.statusCode, body);
                        reject('LoadMessage error: ' + body);
                    } else {
                        //console.log("message body", body);
                        let result = JSON.parse(body);
                        resolve(result);
                    }
                });
        });
    }

    static createResponse(resp, code, message) {
        return resp.status(code).json({
            status: {
                code: code,
                message: message
            }
        });
    }

    static isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }
}