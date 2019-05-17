// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');

/**
 * This IBot implementation can run any type of Dialog. The use of type parameterization is to allows multiple different bots
 * to be run at different endpoints within the same project. This can be achieved by defining distinct Controller types
 * each with dependency on distinct IBot types, this way ASP Dependency Injection can glue everything together without ambiguity.
 * The ConversationState is used by the Dialog system. The UserState isn't, however, it might have been used in a Dialog implementation,
 * and the requirement is that all BotState objects are saved at the end of a turn.
 */
class DialogBot extends ActivityHandler {
    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     * @param {any} logger object for logging events, defaults to console if none is provided
     */
    constructor(conversationState, userState, dialog, food_dialog, logger) {
        super();
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');
        if (!logger) {
            logger = console;
            logger.log('[DialogBot]: logger not passed in, defaulting to console');
        }

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.food_dialog = food_dialog;
        this.logger = logger;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.onMessage(async (context, next) => {
            this.logger.log('Running dialog with Message Activity.');
            
            var user_msg = context.activity.text.toLowerCase();
            user_msg = user_msg.trim();
            user_msg = user_msg.replace('<at>tara kain</at> ', '');
            user_msg = user_msg.replace('<at>test</at> ', '');
            const g_options = ['g', 'pass', 'pabili'];
            const saan_options_price = ['p', 'pp', 'ppp'];
            const saan_options_area = ['piazza', 'upper mckinley', 'robinsons', 'tuscany'];
            const saan_options_type = ['fast food', 'resto'];

            // Run the Dialog with the new message Activity.
            if ( user_msg == 'g' || g_options.includes(user_msg)) {
                await this.dialog.run(context, this.dialogState);
            }
            else if ( user_msg == 'saan' || saan_options_price.includes(user_msg) || saan_options_area.includes(user_msg) || saan_options_type.includes(user_msg)) {
                await this.food_dialog.run(context, this.dialogState);   
            }
            else {
                await context.sendActivity('Invalid option. Valid commands are \'G\' or \'Saan\'.');
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.DialogBot = DialogBot;
