/**
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* eslint-env browser */

// The test counter ensures a unique scope between each test.
// testTime is used to ensure a unique scope between runs of
// the test suite - useful if manual testing parts of the
// suite in different tabs at the same time.
var testCounter = 0;
var testTime = new Date().getTime();

function onStateChangePromise(registration, desiredState) {
  return new Promise((resolve, reject) => {
    if (registration.installing === null) {
      throw new Error('Service worker is not installing.');
    }

    var serviceWorker = registration.installing;

    // We unregister all service workers after each test - this should
    // always trigger an install state change
    var stateChangeListener = function() {
      if (this.state === desiredState) {
        serviceWorker.removeEventListener('statechange', stateChangeListener);
        resolve();
        return;
      }

      if (this.state === 'redundant') {
        serviceWorker.removeEventListener('statechange', stateChangeListener);

        // Must call reject rather than throw error here due to this
        // being inside the scope of the callback function stateChangeListener
        reject(new Error('Installing servier worker became redundant'));
        return;
      }
    };

    serviceWorker.addEventListener('statechange', stateChangeListener);
  });
}

window.goog = window.goog || {};
window.goog.SWHelper = window.goog.SWHelper || {
  // Each service worker that is registered should be given a unique
  // scope. To achieve this we register it with a scope the same as
  // an iframe's src that is unique for each test.
  // Service workers will then be made to claim pages on this scope -
  // i.e. the iframe
  getIframe: function() {
    return new Promise(resolve => {
      var existingIframe = document.querySelector('.js-test-iframe');
      if (existingIframe) {
        return resolve(existingIframe);
      }

      // This will be used as a unique service worker scope
      testCounter++;

      var newIframe = document.createElement('iframe');
      newIframe.classList.add('js-test-iframe');
      newIframe.src = `/test/iframe/${testTime}${testCounter}`;
      newIframe.addEventListener('load', () => {
        resolve(newIframe);
      });
      document.body.appendChild(newIframe);
    });
  },

  unregisterAllRegistrations: function() {
    return navigator.serviceWorker.getRegistrations()
      .then(registrations => {
        return Promise.all(registrations.map(registration => {
          return registration.unregister();
        }));
      });
  },

  clearAllCaches: function() {
    return window.caches.keys()
      .then(cacheNames => {
        return Promise.all(cacheNames.map(cacheName => {
          return window.caches.delete(cacheName);
        }));
      });
  },

  // Waiting for a service worker to install is handy if you only care
  // about testing events that have occured in the install event
  installSW: function(swUrl) {
    return new Promise((resolve, reject) => {
      var iframe;
      this.getIframe()
      .then(newIframe => {
        var options = null;
        if (newIframe) {
          options = {scope: iframe.contentWindow.location.pathname};
          iframe = newIframe;
        }

        return navigator.serviceWorker.register(swUrl, options);
      })
      .then(registration => onStateChangePromise(registration, 'installed'))
      .then(() => resolve(iframe))
      .catch(err => reject(err));
    });
  },

  // To test fetch event behaviour in a service worker you will need to wait
  // for the service worker to activate
  activateSW: function(swUrl) {
    return new Promise((resolve, reject) => {
      var iframe;
      this.getIframe()
      .then(newIframe => {
        var options = null;
        if (newIframe) {
          options = {scope: newIframe.contentWindow.location.pathname};
          iframe = newIframe;
        }
        return navigator.serviceWorker.register(swUrl, options);
      })
      .then(registration => onStateChangePromise(registration, 'activated'))
      .then(() => resolve(iframe))
      .catch(err => reject(err));
    });
  },

  // This is a helper method that checks the cache exists before
  // getting all the cached responses.
  // This is limited to text at the moment.
  getAllCachedAssets: function(cacheName) {
    var cache = null;
    return window.caches.has(cacheName)
      .then(hasCache => {
        if (!hasCache) {
          throw new Error('Cache doesn\'t exist.');
        }

        return window.caches.open(cacheName);
      })
      .then(openedCache => {
        cache = openedCache;
        return cache.keys();
      })
      .then(cacheKeys => {
        return Promise.all(cacheKeys.map(cacheKey => {
          return cache.match(cacheKey);
        }));
      })
      .then(cacheResponses => {
        // This method extracts the response streams and pairs
        // them with a url.
        var output = {};
        cacheResponses.forEach(response => {
          output[response.url] = response;
        });
        return output;
      });
  },

  // Helper to unregister all service workers and clean all caches
  // This should be called before each test
  cleanState: function() {
    return Promise.all([
      this.unregisterAllRegistrations(),
      this.clearAllCaches()
    ])
    .then(() => {
      var iframeList = document.querySelectorAll('.js-test-iframe');
      for (var i = 0; i < iframeList.length; i++) {
        iframeList[i].parentElement.removeChild(iframeList[i]);
      }
    })
    .then(() => {
      this.messageListeners.forEach(function(listener) {
        navigator.serviceWorker.removeEventListener('message', listener);
      });
    });
  },

  messageListeners: [],

  addMessageListener: function(cb) {
    var messageListener = function(event) {
      cb(JSON.parse(event.data));
    };

    this.messageListeners.push(messageListener);

    navigator.serviceWorker.addEventListener('message', messageListener);
  }
};
