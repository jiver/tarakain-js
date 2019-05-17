// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { AttachmentLayoutTypes, CardFactory } = require('botbuilder');
const { ChoicePrompt, ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog } = require('botbuilder-dialogs');
const AdaptiveCard = require('../resources/adaptiveCard.json');

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

const USER_PROFILE = 'USER_PROFILE';

class UserProfile {
    constructor(name, vote) {
        this.name = name;
        this.vote = vote;
    }
}

const LargeWeatherCard = require('../resources/LargeWeatherCard.json');

const GGG = '<at>Tara Kain</at> Gora';
const PASS = '<at>Tara Kain</at> Pass';
const PABILI = '<at>Tara Kain</at> Pabili';

const CHOICE_INDEX = {
	'<at>Tara Kain</at> Gora': 0,
	'<at>Tara Kain</at> Pass': 1,
	'<at>Tara Kain</at> Pabili': 2
};

function deepCopy(src) {
  let target = Array.isArray(src) ? [] : {};
  for (let key in src) {
    let v = src[key];
    if (v) {
      if (typeof v === "object") {
        target[key] = deepCopy(v);
      } else {
        target[key] = v;
      }
    } else {
      target[key] = v;
    }
  }

  return target;
}

class MainDialog extends ComponentDialog {
    constructor(logger) {
        super('MainDialog');
        
        //this.userProfile = userState.createProperty(USER_PROFILE);

        if (!logger) {
            logger = console;
            logger.log('[MainDialog]: logger not passed in, defaulting to console');
        }

        this.logger = logger;

        // Define the main dialog and its related components.
        this.addDialog(new ChoicePrompt('cardPrompt'));

        this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
            this.choiceCardStep.bind(this),
	    this.showCardStep.bind(this)
        ]));

        // The initial child Dialog to run.
        this.initialDialogId = MAIN_WATERFALL_DIALOG;
        //this.initialDialogId = 'cardPrompt'
		
		this.RESULT = {};
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

    /**
     * 1. Prompts the user if the user is not in the middle of a dialog.
     * 2. Re-prompts the user when an invalid input is received.
     *
     * @param {WaterfallStepContext} stepContext
     */
    async choiceCardStep(stepContext) {
        this.logger.log('MainDialog.choiceCardStep');

        // Create the PromptOptions which contain the prompt and re-prompt messages.
        // PromptOptions also contains the list of choices available to the user.
        const options = {
            prompt: 'Tara Kain?',
            retryPrompt: 'Paki-ayos',
            choices: this.getChoices()
        };
		
		//await stepContext.repromptDialog()
		
		console.log(stepContext.context.activity)
		switch (stepContext.context.activity.text) {
        case GGG:
			this.RESULT[stepContext.context.activity.from.name] = stepContext.context.activity.text;
            break;
        case PASS:
			this.RESULT[stepContext.context.activity.from.name] = stepContext.context.activity.text;
            break;
        case PABILI:
			this.RESULT[stepContext.context.activity.from.name] = stepContext.context.activity.text;
            break;
        default:
            break;
        }
		
		console.log(this.RESULT)
		
		
		return await stepContext.prompt('cardPrompt', options);

        // Prompt the user with the configured PromptOptions.
        //return await stepContext.repromptDialog()
    }

    /**
     * This method is only called when a valid prompt response is parsed from the user's response to the ChoicePrompt.
     * @param {WaterfallStepContext} stepContext
     */
    async showCardStep(stepContext) {
		
		console.log(stepContext.context.activity)
		switch (stepContext.context.activity.text) {
        case GGG:
			this.RESULT[stepContext.context.activity.from.name] = stepContext.context.activity.text;
            break;
        case PASS:
			this.RESULT[stepContext.context.activity.from.name] = stepContext.context.activity.text;
            break;
        case PABILI:
			this.RESULT[stepContext.context.activity.from.name] = stepContext.context.activity.text;
            break;
        default:
            break;
        }
		
		var contents = deepCopy(LargeWeatherCard);
		console.log(contents);
		console.log(contents['body'][1]['columns'])
		
		for (const [key, value] of Object.entries(this.RESULT)) {
			console.log(key, value);
			console.log(CHOICE_INDEX);
			console.log(CHOICE_INDEX[value]);
			contents['body'][1]['columns'][CHOICE_INDEX[value]]['items'].push({
                "type": "TextBlock",
                "horizontalAlignment": "center",
                "wrap": false,
                "text": key
              });
		}
		
		await stepContext.context.sendActivity({ attachments: [CardFactory.adaptiveCard(contents)] });
	    	//await stepContext.context.sendActivity({ attachments: [CardFactory.adaptiveCard(AdaptiveCard)] });
		return await stepContext.endDialog();
       /* this.logger.log('MainDialog.showCardStep');*/
        
        console.log(stepContext)
        console.log(stepContext.result)
	}
    /**
     * Create the choices with synonyms to render for the user during the ChoicePrompt.
     * (Indexes and upper/lower-case variants do not need to be added as synonyms)
     */
    getChoices() {
        const cardOptions = [
            {
                value: 'Gora',
                synonyms: ['gora']
            },
            {
                value: 'Pass',
                synonyms: ['pass']
            },
            {
                value: 'Pabili',
                synonyms: ['pabili']
            }
        ];

        return cardOptions;
    }

}


module.exports.MainDialog = MainDialog;
