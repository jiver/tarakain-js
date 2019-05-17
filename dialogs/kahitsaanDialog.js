// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { AttachmentLayoutTypes, CardFactory } = require('botbuilder');
const { ChoicePrompt, ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog } = require('botbuilder-dialogs');
const AdaptiveCard = require('../resources/adaptiveCard.json');

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

const fs = require('fs');


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

class KahitSaanDialog extends ComponentDialog {
    constructor(logger) {
        super('MainDialog');

        if (!logger) {
            logger = console;
            logger.log('[MainDialog]: logger not passed in, defaulting to console');
        }

        this.logger = logger;
        
        // Define the main dialog and its related components.
        this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
            this.showCardStep.bind(this)
        ]));

        // The initial child Dialog to run.
        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }
    

    async showCardStep(stepContext) {
        this.logger.log('MainDialog.showCardStep');
        console.log('Current directory: ' + process.cwd());
        let rawdata = fs.readFileSync(process.cwd() + '\/dialogs\/db.json');
        var json_file = JSON.parse(rawdata);

        var keys = Object.keys(json_file) 
        var len = keys.length;
        const rand_index = getRandomInt(0, len -1);

        
        // Give the user instructions about what to do next
        
        var response = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.0",
            "body": [
              {
                "type": "ColumnSet",
                "columns": [
                  {
                    "type": "Column",
                    "width": "auto",
                    "items": [
                      {
                        "type": "Image",
                        "url": "https://media.giphy.com/media/Nm8ZPAGOwZUQM/giphy.gif",
                        "size": "medium"
                      }
                    ]
                  },
                  {
                    "type": "TextBlock",
                    "horizontalAlignment": "center",
                    "wrap": false,
                    "size": "large",
                    "weight": "bolder",
                    "text": 'Suggestion: ' + keys[rand_index]
                  }
                ]
              }
            ]
          };
        await stepContext.context.sendActivity(response);
        
        return await stepContext.endDialog();
    }
}

module.exports.KahitSaanDialog = KahitSaanDialog;
