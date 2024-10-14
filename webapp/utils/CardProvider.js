
sap.ui.define([
    "sap/ui/base/Object",
    "sap/base/Log",
    "sap/insights/CardHelper",
    "sap/insights/CardsChannel",
    "sap/ui/model/json/JSONModel"
], function (BaseObject, Log, CardHelper, CardsChannel, JSONModel) {
    "use strict";

    return BaseObject.extend("shellpoc.utils.CardProvider", {
        /**
       * Initializing the card provider.
       *
       * @param id unique ID to be used for registering the provider
       * @param viewModel view model containing available cards
       */
        init: async function (id, viewModel) {
            const service = await CardHelper.getServiceAsync("UIService");
            const channel = await service.getCardsChannel();
            if (channel.isEnabled()) {
                this.channel = channel;
                this.id = id;
                this.model = viewModel;
                this.consumers = {};
                this.sharedCards = [];
                await this.registerProvider();
            }
        },

        onConsumerConnected: function (id) {
            if (!this.consumers[id]) {
                this.consumers[id] = true;
                this.shareAvailableCards(id);
            }
        },
        /**
    * Event handler called by the cards channel when a cards consumer e.g. SAP Collaboration Manager is not interested in cards anymore.
    *
    * @param id id of the requesting consumer
    */
        onConsumerDisconnected: function (id) {
            if (this.consumers[id]) {
                delete this.consumers[id];
            }
        },

        /**
         * Event handler called by the cards channel when a consumer is requesting a specific card.
         *
         * @param consumerId id of the requesting consumer
         * @param cardId unique ID of available card
         */
        onCardRequested: function (consumerId, cardId) {
            const cards = this.model.getObject("/myInsights/flexCards");
            const requestedCard = cards.find(card => card.id === cardId);
            if (requestedCard) {
                this.channel.publishCard(this.id, requestedCard, consumerId);
                Log.info(`Card ${this.id} published to ${consumerId}.`);
            } else {
                Log.error(`Could not find card ${this.id} requested by ${consumerId}.`);
            }
        },

        /**
         * Event handler called by the myhome controller when anything happened in the Insights section
         *
         * @param active true if the home page is currently being rendered
         */
        onViewUpdate: async function (active) {
            // register / unregister if the status of the home page changed
            if (this.registered !== active) {
                if (active) {
                    await this.registerProvider();
                    this.updateConsumers();
                } else {
                    this.unregisterProvider();
                }
            } else {
                if (this.registered) {
                    this.updateConsumers();
                }
            }
        },

        /**
         * Register this instance as a card provider.
         */
        registerProvider: async function () {
            if (this.channel) {
                await this.channel.registerProvider(this.id, this);
                this.registered = true;
            }
        },

        /**
         * Unregister this instance as a card provider.
         */
        unregisterProvider: async function () {
            if (this.channel) {
                await this.channel.unregister(this.id);
                this.registered = false;
                this.consumers = {};
                this.sharedCards = [];
            }
        },

        /**
         * Check if the available cards changed and if yes update registered consumers.
         */
        updateConsumers: function () {
            const cards = this.model.getObject("/myInsights/flexCards") || [];
            if (cards.length !== this.sharedCards.length) {
                this.sharedCards = cards.map((card) => {
                    return {
                        id: card.id,
                        title: card.descriptorContent["sap.card"].header.title,
                        parentAppId: card.descriptorContent["sap.insights"].parentAppId,
                        description: card.descriptorContent["sap.card"].header.subTitle
                            ? card.descriptorContent["sap.card"].header.subTitle
                            : ""
                    };
                });
                if (Object.keys(this.consumers).length > 0) {
                    this.shareAvailableCards();
                }
            }
        },

        /**
         * Share the list of available cards with all consumers or if provided, with a specific one.
         *
         * @param consumerId optional target consumer id. if not provided it will be broadcasted to all
         */
        shareAvailableCards: function (consumerId = "*") {
            this.channel.publishAvailableCards(this.id, this.sharedCards, consumerId);
        }
    });
});
