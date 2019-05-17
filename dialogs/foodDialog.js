// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { AttachmentLayoutTypes, CardFactory } = require('botbuilder');
const { ChoicePrompt, ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog } = require('botbuilder-dialogs');
const AdaptiveCard = require('../resources/adaptiveCard.json');

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const fs = require('fs');
    

function getRandomInt(min, max, n) {
    var currentIndices = [];
    min = Math.ceil(min);
    max = Math.floor(max);
        
    while ( currentIndices.length != n ) {
        var randInt = Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
        if ( !currentIndices.includes(randInt) ) {
            currentIndices.push(randInt);
        }
    }
    
    return currentIndices;
}

function filterJSON(budget, area, type) {
    console.log('Current directory: ' + process.cwd());
    let rawdata = fs.readFileSync(process.cwd() + '\/dialogs\/db.json');
    var json_file = JSON.parse(rawdata);

    if (!budget) {
        budget = 'ppp';
    }

    if (!area) {
        area = ['piazza', 'upper mckinley', 'tuscany', 'robinsons']
    }
    else {
        area = [].concat(area)
    }

    if (!type) {
        type = ['resto', 'fast food']
    }
    else {
        type = [].concat(type)
    }

    var filtered_list = [];
    for (var key in json_file) {
        if (json_file.hasOwnProperty(key)) {
            var json_budget = json_file[key].Budget.toLowerCase();
            var json_area = json_file[key].Area.toLowerCase();
            var json_type = json_file[key].Type.toLowerCase();
            if (json_budget == budget || json_budget.indexOf(budget)) {
                if (area.indexOf(json_area) >= 0) {
                    if (type.indexOf(json_type) >= 0) {
                        console.log(key + " -> " + json_file[key].Budget + "\n\t" + json_file[key].Area + "\n\t" + json_file[key].Type);
                        filtered_list.push(key);
                    }
                }
            }
        }
    }

    return filtered_list;
}

function getMajorityVote(vote_results) {

    // defaults:
    var majority_price = "PPP";
    var majority_area = '';
    var majority_type = '';

    var majority_price_count = 0;
    var majority_area_count = 0;
    var majority_type_count = 0;

    var price_count_map = {};
    var area_count_map = {};
    var type_count_map = {};

    for (var user in vote_results['price']) {
        var price_option = vote_results['price'][user];
        price_count_map[price_option] = (price_count_map[price_option] || 0) + 1;
    }

    for (var user in vote_results['area']) {
        var area_option = vote_results['area'][user];
        area_count_map[area_option] = (area_count_map[area_option] || 0) + 1;
    }

    for (var user in vote_results['type']) {
        var type_option = vote_results['type'][user];
        type_count_map[type_option] = (type_count_map[type_option] || 0) + 1;
    }

    // Now get the majority
    for ( var option in price_count_map ) {
        if (price_count_map[option] > majority_price_count) {
            majority_price = option;
            majority_price_count = price_count_map[option];
        }
        else if (price_count_map[option] == majority_price_count) {
            if (majority_price.length < option) {
                majority_price = option;
            }
		}
    }

    for ( var option in area_count_map ) {
        if (area_count_map[option] > majority_area_count) {
            majority_area = option;
            majority_area_count = area_count_map[option];
        }
        else if (area_count_map[option] == majority_area_count) {
			majority_area = [].concat(majority_area);
			majority_area = majority_area.concat(option);
		}
    }

    for ( var option in type_count_map ) {
        if (type_count_map[option] > majority_type_count) {
            majority_type = option;
            majority_type_count = type_count_map[option];
        }
        else if (type_count_map[option] == majority_type_count) {
			majority_type = [].concat(majority_type);
			majority_type = majority_type.concat(option);
		}
    }

    return [majority_price, majority_area, majority_type];
}

class FoodDialog extends ComponentDialog {
    constructor(logger) {
        super('MainDialog');

        if (!logger) {
            logger = console;
            logger.log('[MainDialog]: logger not passed in, defaulting to console');
        }

        this.logger = logger;
        
        // Define the main dialog and its related components.
        this.addDialog(new ChoicePrompt('cardPromptPrice'));
	    this.addDialog(new ChoicePrompt('cardPromptArea'));
	    this.addDialog(new ChoicePrompt('cardPromptType'));
        this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
            this.choiceCardStepPrice.bind(this),
	        this.priceChoiceCardStep.bind(this),
            this.choiceCardStepArea.bind(this),
            this.areaChoiceCardStep.bind(this),
            this.choiceCardStepType.bind(this),
            this.typeChoiceCardStep.bind(this),
            this.showCardStep.bind(this)
        ]));

        // The initial child Dialog to run.
        this.initialDialogId = MAIN_WATERFALL_DIALOG;
        this.RESULT = {};
        this.RESULT['price'] = {};
        this.RESULT['area'] = {};
        this.RESULT['type'] = {};
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
        
        var user_msg = turnContext.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '').trim();
        if ( user_msg == 'saan' ) {
            this.RESULT = {};
            this.RESULT['price'] = {};
            this.RESULT['area'] = {};
            this.RESULT['type'] = {};
        }

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
    async choiceCardStepPrice(stepContext) {
        this.logger.log('MainDialog.choiceCardStep');

        // Create the PromptOptions which contain the prompt and re-prompt messages.
        // PromptOptions also contains the list of choices available to the user.
        const options = {
            prompt: 'Buget?',
            retryPrompt: 'Ayusin mo!',
            choices: this.getChoicesPrice()
        };

        // Prompt the user with the configured PromptOptions.
        return await stepContext.prompt('cardPromptPrice', options);
    }
    async choiceCardStepArea(stepContext) {
        this.logger.log('MainDialog.choiceCardStep');

        // Create the PromptOptions which contain the prompt and re-prompt messages.
        // PromptOptions also contains the list of choices available to the user.
        const options = {
            prompt: 'General Area?',
            retryPrompt: 'Ayusin mo!',
            choices: this.getChoicesArea()
        };

        // Prompt the user with the configured PromptOptions.
        return await stepContext.prompt('cardPromptArea', options);
    }
    async choiceCardStepType(stepContext) {
        this.logger.log('MainDialog.choiceCardStep');

        // Create the PromptOptions which contain the prompt and re-prompt messages.
        // PromptOptions also contains the list of choices available to the user.
        const options = {
            prompt: 'Fast Food or Fancy Restaurant?',
            retryPrompt: 'Ayusin mo!',
            choices: this.getChoicesType()
        };

        // Prompt the user with the configured PromptOptions.
        return await stepContext.prompt('cardPromptType', options);
    }
    
    async priceChoiceCardStep(stepContext) {
        const P = 'p';
        const PP = 'pp';
        const PPP = 'ppp';
        this.logger.log('MainDialog.priceChoiceCardStep');
    
        //await stepContext.repromptDialog()
        
        console.log(stepContext.context.activity)
        if (!this.RESULT || Object.keys(this.RESULT).length == 0) {
            this.RESULT['price'] = {};
        }
        
        var user_choice = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
        console.log(user_choice);
        switch (user_choice) {
        case P:
            this.RESULT['price'][stepContext.context.activity.from.name] = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
            break;
        case PP:
            this.RESULT['price'][stepContext.context.activity.from.name] = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
            break;
        case PPP:
            this.RESULT['price'][stepContext.context.activity.from.name] = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
            break;
        default:
            break;
        }
        
        console.log(this.RESULT);
        return await stepContext.next();
        
    }
    async areaChoiceCardStep(stepContext) {
        const Piazza = 'piazza';
        const Tuscany = 'tuscany';
        const Rob = 'robinsons';
        this.logger.log('MainDialog.areachoiceCardStep');
        
        //await stepContext.repromptDialog()

        console.log(stepContext.context.activity);
        if (!this.RESULT || Object.keys(this.RESULT).length == 0) {
            this.RESULT['area'] = {};
        }

        var user_choice = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
        console.log(user_choice);
        
        switch (user_choice) {
        case Piazza:
            this.RESULT['area'][stepContext.context.activity.from.name] = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
            break;
        case Tuscany:
            this.RESULT['area'][stepContext.context.activity.from.name] = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
            break;
        case Rob:
            this.RESULT['area'][stepContext.context.activity.from.name] = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
            break;
        default:
            break;
        }
        
        console.log(this.RESULT);
        return await stepContext.next();
        
    }
    
    async typeChoiceCardStep(stepContext) {
        const FastFood = 'fast food';
        const Resto = 'resto';
        this.logger.log('MainDialog.pricechoiceCardStep');
        
        //await stepContext.repromptDialog()
        
        console.log(stepContext.context.activity);
        if (!this.RESULT || Object.keys(this.RESULT).length == 0) {
            this.RESULT['type'] = {};
        }
        
        var user_choice = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
        console.log(user_choice);
        switch (user_choice) {
        case FastFood:
            this.RESULT['type'][stepContext.context.activity.from.name] = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
            break;
        case Resto:
            this.RESULT['type'][stepContext.context.activity.from.name] = stepContext.context.activity.text.toLowerCase().replace('<at>test</at> ', '').replace('<at>tara kain</at> ', '');
            break;
        default:
            break;
        }
        
        console.log(this.RESULT);
        return await stepContext.next();
    }
	
    async showCardStep(stepContext) {
        this.logger.log('MainDialog.showCardStep');
        
        var majorityResults = getMajorityVote(this.RESULT);
        var filteredResults = filterJSON(majorityResults[0], majorityResults[1], majorityResults[2]);
                
	    var randIndices = getRandomInt(0, filteredResults.length - 1, 5);
        	
        filteredResults = [filteredResults[randIndices[0]], filteredResults[randIndices[1]], filteredResults[randIndices[2]], filteredResults[randIndices[3]], filteredResults[randIndices[4]]]
                
	var content = {
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
			      "type": "TextBlock",
			      "text": "Suggestions:",
			      "weight": "bolder",
			      "size": "large"
			    },
			    {
			      "type": "TextBlock",
			      "text": "HERE ARE THE PLACES MATCHING YOUR FILTERS",
			      "size": "small"
			    }
			  ]
			}
		      ]
		    },
		    {
		      "type": "ColumnSet",
		      "separator": true,
		      "columns": []
		    }
		  ]
		}
	
        var return_msg = '';
        if (filteredResults.length > 0) {
	    for (var i = 0; i < filteredResults.length; i++) {
		content['body'][1]['columns'].push({
			  "type": "Column",
			  "width": "25%",
			  "items": [
			    {
			      "type": "Image",
			      "size": "medium",
			      "url": "https://media.giphy.com/media/3oKIP9Wt4MbrxwvV3W/giphy.gif",
			      "style": "person"
			    },
			    {
			      "type": "TextBlock",
			      "horizontalAlignment": "center",
			      "wrap": true,
			      "size": "medium",
			      "weight": "bolder",
			      "text": filteredResults[i]
			    }
			  ]
			});
	    }	
	}
        else {
            this.RESULT = {};
            this.RESULT['price'] = {};
            this.RESULT['area'] = {};
            this.RESULT['type'] = {};
	    content['body'][1]['columns'].push({
			  "type": "Column",
			  "width": "25%",
			  "items": [
			    {
			      "type": "TextBlock",
			      "horizontalAlignment": "center",
			      "wrap": true,
			      "size": "medium",
			      "weight": "bolder",
			      "text": "'Waley! Masyado kang choosy!"
			    }
			  ]
			});
        }         

        await stepContext.context.sendActivity({ attachments: [CardFactory.adaptiveCard(content)] });
        return await stepContext.endDialog();
    }
    
    /**
     * Create the choices with synonyms to render for the user during the ChoicePrompt.
     * (Indexes and upper/lower-case variants do not need to be added as synonyms)
     */
    getChoicesPrice() {
        const cardOptions = [
            {
                value: 'P',
                synonyms: ['P']
            },
            {
                value: 'PP',
                synonyms: ['PP']
            },
            {
                value: 'PPP',
                synonyms: ['PPP']
            }
        ];

        return cardOptions;
    }

    getChoicesArea() {
        const cardOptions = [
            {
                value: 'Piazza',
                synonyms: ['piazza']
            },
            {
                value: 'Tuscany',
                synonyms: ['tuscany']
            },
            {
                value: 'Robinsons',
                synonyms: ['robinsons']
            }
        ];

        return cardOptions;
    }

    getChoicesType() {
        const cardOptions = [
            {
                value: 'Fast Food',
                synonyms: ['fast food']
            },
            {
                value: 'Resto',
                synonyms: ['resto']
            }
        ];

        return cardOptions;
    }

    // ======================================
    // Helper functions used to create cards.
    // ======================================

    createAdaptiveCard() {
        return CardFactory.adaptiveCard(AdaptiveCard);
    }

    createAnimationCard() {
        return CardFactory.animationCard(
            'Microsoft Bot Framework',
            [
                { url: 'https://i.giphy.com/Ki55RUbOV5njy.gif' }
            ],
            [],
            {
                subtitle: 'Animation Card'
            }
        );
    }

    createAudioCard() {
        return CardFactory.audioCard(
            'I am your father',
            ['https://www.mediacollege.com/downloads/sound-effects/star-wars/darthvader/darthvader_yourfather.wav'],
            CardFactory.actions([
                {
                    type: 'openUrl',
                    title: 'Read more',
                    value: 'https://en.wikipedia.org/wiki/The_Empire_Strikes_Back'
                }
            ]),
            {
                subtitle: 'Star Wars: Episode V - The Empire Strikes Back',
                text: 'The Empire Strikes Back (also known as Star Wars: Episode V – The Empire Strikes Back) is a 1980 American epic space opera film directed by Irvin Kershner. Leigh Brackett and Lawrence Kasdan wrote the screenplay, with George Lucas writing the film\'s story and serving as executive producer. The second installment in the original Star Wars trilogy, it was produced by Gary Kurtz for Lucasfilm Ltd. and stars Mark Hamill, Harrison Ford, Carrie Fisher, Billy Dee Williams, Anthony Daniels, David Prowse, Kenny Baker, Peter Mayhew and Frank Oz.',
                image: 'https://upload.wikimedia.org/wikipedia/en/3/3c/SW_-_Empire_Strikes_Back.jpg'
            }
        );
    }

    createHeroCard() {
        return CardFactory.heroCard(
            'BotFramework Hero Card',
            CardFactory.images(['https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg']),
            CardFactory.actions([
                {
                    type: 'openUrl',
                    title: 'Get started',
                    value: 'https://docs.microsoft.com/en-us/azure/bot-service/'
                }
            ])
        );
    }

    createReceiptCard() {
        return CardFactory.receiptCard({
            title: 'John Doe',
            facts: [
                {
                    key: 'Order Number',
                    value: '1234'
                },
                {
                    key: 'Payment Method',
                    value: 'VISA 5555-****'
                }
            ],
            items: [
                {
                    title: 'Data Transfer',
                    price: '$38.45',
                    quantity: 368,
                    image: { url: 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png' }
                },
                {
                    title: 'App Service',
                    price: '$45.00',
                    quantity: 720,
                    image: { url: 'https://github.com/amido/azure-vector-icons/raw/master/renders/cloud-service.png' }
                }
            ],
            tax: '$7.50',
            total: '$90.95',
            buttons: CardFactory.actions([
                {
                    type: 'openUrl',
                    title: 'More information',
                    value: 'https://azure.microsoft.com/en-us/pricing/details/bot-service/'
                }
            ])
        });
    }

    createSignInCard() {
        return CardFactory.signinCard(
            'BotFramework Sign in Card',
            'https://login.microsoftonline.com',
            'Sign in'
        );
    }

    createThumbnailCard() {
        return CardFactory.thumbnailCard(
            'BotFramework Thumbnail Card',
            [{ url: 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg' }],
            [{
                type: 'openUrl',
                title: 'Get started',
                value: 'https://docs.microsoft.com/en-us/azure/bot-service/'
            }],
            {
                subtitle: 'Your bots — wherever your users are talking.',
                text: 'Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.'
            }
        );
    }

    createVideoCard() {
        return CardFactory.videoCard(
            '2018 Imagine Cup World Championship Intro',
            [{ url: 'https://sec.ch9.ms/ch9/783d/d57287a5-185f-4df9-aa08-fcab699a783d/IC18WorldChampionshipIntro2.mp4' }],
            [{
                type: 'openUrl',
                title: 'Lean More',
                value: 'https://channel9.msdn.com/Events/Imagine-Cup/World-Finals-2018/2018-Imagine-Cup-World-Championship-Intro'
            }],
            {
                subtitle: 'by Microsoft',
                text: 'Microsoft\'s Imagine Cup has empowered student developers around the world to create and innovate on the world stage for the past 16 years. These innovations will shape how we live, work and play.'
            }
        );
    }
}

module.exports.FoodDialog = FoodDialog;
