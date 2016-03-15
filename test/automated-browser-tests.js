/*
  Copyright 2016 Google Inc. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

'use strict';

// These tests make use of selenium-webdriver. You can find the relevant
// documentation here: http://selenium.googlecode.com/git/docs/api/javascript/index.html

require('chai').should();
const path = require('path');
const SWTestingHelpers = require('../src/node-helpers/index.js');
const automatedBrowserTesting = SWTestingHelpers.automatedBrowserTesting;
const testServer = SWTestingHelpers.testServer;

describe('Perform Browser Tests', function() {
  // Browser tests can be slow
  this.timeout(60000);

  let globalDriverReference = null;
  let testServerURL;

  before(function() {
    return testServer.startServer(path.join(__dirname, '..'))
    .then(portNumber => {
      testServerURL = `http://localhost:${portNumber}`;
    });
  });

  after(function() {
    testServer.killServer();
  });

  afterEach(function() {
    this.timeout(10000);

    return automatedBrowserTesting.killWebDriver(globalDriverReference);
  });

  const queueUnitTest = browserInfo => {
    it(`should pass all tests in ${browserInfo.prettyName}`, () => {
      globalDriverReference = browserInfo.getSeleniumDriver();

      return automatedBrowserTesting.runMochaTests(
        browserInfo.prettyName,
        globalDriverReference,
        `${testServerURL}/test/browser-tests/`
      )
      .then(testResults => {
        automatedBrowserTesting.manageTestResults(testResults);
      });
    });
  };

  const automatedBrowsers = automatedBrowserTesting.getAutomatedBrowsers();
  automatedBrowsers.forEach(browserInfo => {
    queueUnitTest(browserInfo);
  });
});
