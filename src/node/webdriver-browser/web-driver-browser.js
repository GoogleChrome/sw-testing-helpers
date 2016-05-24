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

const fs = require('fs');
const webdriver = require('selenium-webdriver');

/**
 * <p>A base class that is designed to be extended to handle browser specific
 * values.</p>
 *
 * <p>An instance of this class helps find and start browsers using selenium.</p>
 *
 * <p>Instances of this class are returned by
 * [automatedBrowserTesting.getDiscoverableBrowsers()]{@link AutomatedBrowserTesting#getDiscoverableBrowsers}</p>
 */
class WebDriverBrowser {
  /**
   * <p>This constructor will throw an error should any of the inputs be
   * invalid / unexpected.</p>
   *
   * @param  {String} prettyName        A user friendly name of the browser
   * @param  {String} release           Release type of browser (can be either
   * 'stable', 'beta' or 'unstable')
   * @param  {String} seleniumBrowserId An id of the browser that will be
   * accepted by selenium (either 'chrome' or 'firefox')
   * @param  {SeleniumOptions} seleniumOptions   This is an instance of either
   * `selenium-webdriver/firefox` or `selenium-webdriver/chrome`
   */
  constructor(prettyName, release, seleniumBrowserId, seleniumOptions) {
    if (release !== 'stable' && release !== 'beta' && release !== 'unstable') {
      throw new Error('Unexpected browser release given: ', release);
    }

    if (seleniumBrowserId !== 'chrome' && seleniumBrowserId !== 'firefox') {
      throw new Error('Unexpected browser ID given: ', seleniumBrowserId);
    }

    this._prettyName = prettyName;
    this._release = release;
    this._seleniumBrowserId = seleniumBrowserId;
    this._seleniumOptions = seleniumOptions;
    this._executablePath = this._getExecutablePath(release);

    if (seleniumOptions.setChromeBinaryPath) {
      seleniumOptions.setChromeBinaryPath(this._executablePath);
    } else if (seleniumOptions.setBinary) {
      seleniumOptions.setBinary(this._executablePath);
    } else {
      throw new Error('Unknown selenium options object');
    }
  }

  _getExecutablePath() {
    throw new Error('_getExecutablePath() must be overriden by subclasses');
  }

  /**
   * <p>This method returns true if the instance can produce a valid
   * selenium driver that will launch the expected browser.</p>
   *
   * <p>A scenario where it will be unable to produce a valid selenium driver
   * is if the browsers executable path can't be found.</p>
   *
   * @return {Boolean} True if a selenium driver can be produced
   */
  isValidWebDriver() {
    if (!this._executablePath) {
      return false;
    }

    try {
      // This will throw if it's not found
      fs.lstatSync(this._executablePath);

      return true;
    } catch (error) {}

    return false;
  }

  /**
   * A user friendly name for the browser
   * @return {String} A user friendly name for the browser
   */
  getPrettyName() {
    return this._prettyName;
  }

  /**
   * <p>The release name for this browser, either 'stable', 'beta',
   * 'unstable'.</p>
   *
   * <p>Useful if you only want to test <i>or</i> not test on a particular release
   * type.</p>
   * @return {String} Release name of browser. 'stable', 'beta' or 'unstable'
   */
  getReleaseName() {
    return this._release;
  }

  /**
   * This returns the browser ID that Selenium recognises.
   *
   * @return {String} The Selenium ID of this browser
   */
  getSeleniumBrowserId() {
    return this._seleniumBrowserId;
  }

  /**
   * The selenium options passed to webdriver's `Builder` method. This
   * will have the executable path set for the browser so you should
   * manipulate these options rather than create entirely new objects.
   *
   * @return {SeleniumOptions} An instance of either
   * `selenium-webdriver/firefox` or `selenium-webdriver/chrome`
   */
  getSeleniumOptions() {
    return this._seleniumOptions;
  }

  /**
   * If changes are made to the selenium options, call this method to
   * set them before calling {@link getSeleniumDriver}.
   * @param {SeleniumOptions} options An instance of
   * `selenium-webdriver/firefox` or `selenium-webdriver/chrome`
   */
  setSeleniumOptions(options) {
    this._seleniumOptions = options;
  }

  /**
   * <p>This method creates a webdriver instance of this browser.</p>
   *
   * <p>For more info, see:
   * {@link http://selenium.googlecode.com/git/docs/api/javascript/class_webdriver_WebDriver.html | WebDriver Docs}</p>
   *
   * @return {WebDriver} [description]
   */
  getSeleniumDriver() {
    return new webdriver
      .Builder()
      .forBrowser(this.getSeleniumBrowserId())
      .setChromeOptions(this.getSeleniumOptions())
      .setFirefoxOptions(this.getSeleniumOptions())
      .build();
  }
}

module.exports = WebDriverBrowser;
