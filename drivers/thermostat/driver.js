'use strict';

const Homey = require('homey');
const { OAuth2Driver } = require('homey-oauth2app');

const WEBHOOK_ID = Homey.env.WEBHOOK_ID;
const WEBHOOK_SECRET = Homey.env.WEBHOOK_SECRET;

module.exports = class ThermoSmartDriver extends OAuth2Driver {

	async onOAuth2Init() {
		await this.registerFlowCards();
		await this.registerWebhook();
	}

	async onPairListDevices({ oAuth2Client }) {
		const { thermostatId } = oAuth2Client.getToken();
		if (!thermostatId)
			return [];

		const { name } = await oAuth2Client.getThermostat({ thermostatId });

		return [{
			name,
			data: {
				id: thermostatId,
			}
		}];
	}

	async triggerPaused(device, paused) {
		if (paused) {
			return this._flowTriggerPaused.trigger(device);
		} else {
			return this._flowTriggerUnpaused.trigger(device);
		}

	}

	async registerFlowCards() {
		this.homey.flow.getConditionCard('is_paused')
			.registerRunListener(async ({ device }) => {
				const thermostat = await device.getThermostat();
				return thermostat.source === 'pause';
			});

		this.homey.flow.getActionCard('set_pause_true')
			.registerRunListener(async ({ device }) => {
				await device.setThermostatPause(true);
			});

		this.homey.flow.getActionCard('set_pause_false')
			.registerRunListener(async ({ device }) => {
				await device.setThermostatPause(false);
			});

		this.homey.flow.getActionCard('set_outside_temperature')
			.registerRunListener(async ({ device }) => {
				await device.setThermostat({
					outside_temperature: args.outside_temperature
				});
			});

		this.homey.flow.getActionCard('unset_outside_temperature')
			.registerRunListener(async ({ device }) => {
				await device.setThermostat({
					outside_temperature: 'auto'
				});
			});
	}

	/*
		Webhook methods
	*/
	async registerWebhook() {
		if (this._webhook) {
			await this.unregisterWebhook().catch(this.error);
		}

		// Create an array of ThermoSmart IDs
		const thermosmart_id = this.getDevices().map(device => {
			const { id } = device.getData();
			return id;
		});

		this._webhook = await this.homey.cloud.createWebhook(WEBHOOK_ID, WEBHOOK_SECRET, { thermosmart_id });
		this._webhook.on('message', this._onWebhookMessage.bind(this));

		this.log('Webhook registered for', thermosmart_id);
	}

	async unregisterWebhook() {
		if (this._webhook) {
			await this._webhook.unregister();
			this.log('Webhook unregistered');
		}
	}

	_onWebhookMessage({ body }) {
		this.log('_onWebhookMessage', body);
		if (!body) return;

		const {
			thermostat: thermostatId,
			room_temperature,
			target_temperature,
			source,
		} = body;
		if (!thermostatId) return;

		const device = this.getDevices().find(device => device.getData().id === thermostatId);

		if (!device)
			return this.error('Got webhook for unknown device');

		if (typeof room_temperature === 'number') {
			device.setCapabilityValue('measure_temperature', room_temperature).catch(this.error);
		}

		if (typeof target_temperature === 'number') {
			device.setCapabilityValue('target_temperature', target_temperature).catch(this.error);
		}

		if (typeof source === 'string') {
			this.triggerPaused(device, source === 'pause').catch(this.error)
		}
	}

}