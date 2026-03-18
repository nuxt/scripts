// Mock Custom Script for Playground Demo
(function() {
  'use strict';

  // Create a mock API that simulates a real third-party script
  window.MyCustomScript = {
    events: [],
    isInitialized: false,

    init: function(apiKey) {
      this.apiKey = apiKey;
      this.isInitialized = true;
      console.log('[MyCustomScript] Initialized with API key:', apiKey);

      // Simulate some initialization time
      setTimeout(() => {
        console.log('[MyCustomScript] Ready for tracking!');
      }, 500);
    },

    track: function(event, data) {
      if (!this.isInitialized) {
        console.warn('[MyCustomScript] Not initialized. Call init() first.');
        return;
      }

      const eventData = {
        event: event,
        data: data || {},
        timestamp: new Date().toISOString(),
        apiKey: this.apiKey
      };

      this.events.push(eventData);
      console.log('[MyCustomScript] Tracked event:', eventData);
    },

    identify: function(userId) {
      if (!this.isInitialized) {
        console.warn('[MyCustomScript] Not initialized. Call init() first.');
        return;
      }

      this.userId = userId;
      console.log('[MyCustomScript] User identified:', userId);
    },

    getEvents: function() {
      return this.events;
    }
  };

  console.log('[MyCustomScript] Script loaded successfully');
})();