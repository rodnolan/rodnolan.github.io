/**
 * This defines the most popular browsers and the minimum version
 * of each required to run an angular application (tested against
 * angular 16)
 */
var minimumBrowserVersions = {
  chrome: 85,
  firefox: 90,
  edge: 85,
  safari: 14,
};

/**
 * checks the browser to ensure it is angular compatible and loads
 * the application source scripts if the browser is not too old
 *
 * This project uses a custom webpack build plugin that calls this
 * function to load and start the app dynamically at runtime. This
 * custom build plugin is required to prevent the white screen of
 * death in browsers that are too old to run a modern angular app.
 *
 * The plugin works by replacing the static <script> tags with a
 * script that calls this function, passing it an array of objects
 * that define the attributes of those static scripts. This enables
 * us to inject the scripts into the page ON DEMAND only AFTER the
 * browser is verified to be capable of running a modern angular
 * application without crashing.
 *
 * The transformation is implemented in `./index-html-transformer.ts`
 * The relevant configuration in `./angular.json` can be found at
 *  "projects" > {project-name} > "architect" > "build" > "builder"
 *  "projects" > {project-name} > "architect" > "build" > "options" > "indexTransform"
 *
 * @param scripts {array} an array of objects defining the properties
 * of the various compiled scripts that comprise the angular app
 */
function startHere(scripts) {
  checkBrowser(scripts);
}

/**
 * This function is called to load the source scripts for the angular app
 * this happens ONLY IF AND AFTER we determine that the browser will run
 * the app without crashing
 *
 * @param scripts {array} an array of objects defining the properties
 * of the various compiled scripts that comprise the angular app
 */
function loadAngular(scripts) {
  if (scripts.length == 0) {
    throw new Error('there are no source scripts to load... the application can NOT be bootstrapped');
  }

  function loadScript(scriptObject) {
    var scriptElement = document.createElement("script");

    if (scriptObject.isModule) {
      scriptElement.type = "module";
    }
    if (scriptObject.isDefer) {
      scriptElement.defer = true;
    }
    scriptElement.src = scriptObject.src;
    document.body.appendChild(scriptElement);
  }

  for (var i = 0; i < scripts.length; i++) {
    log('Loading ' + JSON.stringify(scripts[i]));
    loadScript(scripts[i]);
  }
}

/**
 * Opens a URL in a new window
 *
 * @param url {string} the url to open
 */
function openLink(url) {
  window.open(url, "_blank");
}

/**
 * uses XMLHttpRequest to retrieve the translations file
 *
 * @param url {string} the file to request
 * @param errorHandler {function} the function to call to handle request errors
 * @param resultHandler {function} the function to call to process the file
 * @returns {undefined} JSON data from the file is passed to the caller via the resultHandler callback function
 */
function fetchTranslations(url, errorHandler, resultHandler) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.responseType = "text";
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send();

  xhr.onload = function () {
    log("xhr.responseText: " + xhr.responseText);

    resultHandler(JSON.parse(xhr.responseText));
  };

  xhr.onerror = function (e) {
    errorHandler(e);
  };

  xhr.onprogress = function (event) {
    log("Received " + event.loaded + " of " + event.total);
  };
}

/**
 * validates the locale string
 * all translation file names follow the convention: xx-XX.json
 * so the locale string must match the 'xx-XX' format and it
 * must be one of the locales we support
 *
 * @param locale {string} a five character string representing the user's locale
 * @returns {boolean}
 */
function isValidLocale(locale) {
  var validLocales = [
    "cs-CZ", "da-DK", "de-DE", "el-GR", "en-US", "es-ES", "es-MX", "fr-CA", "fr-FR", "he-IL", "hr-HR", "hu-HU",
    "it-IT", "ja-JP", "ko-KR", "nl-NL", "pl-PL", "pt-BR", "pt-PT", "ru-RU", "sl-SL", "sv-SE", "tr-TR", "zh-CN"
  ];
  var idx = -1;

  for (var i = 0; i < validLocales.length; ++i) {
    try {
      var foundMatch =
        validLocales[i].toLowerCase() === locale.toLowerCase();
      if (foundMatch) {
        idx = i;
        break;
      }
    } catch (e) {
      break;
    }
  }
  return idx > -1;
}

/**
 * Sets a cookie with an optional expiry
 *
 * @param cookieName {string} the name of the cookie to set
 * @param didTestPass {boolean} the value for the cookie; indicates whether this browser should be capable of running an Angular 16 app
 * @param daysToExpire {number} indicates when in the future the cookie should expire
 */
function setBrowserCheckedCookie(cookieName, didTestPass, daysToExpire) {
  var expires = "";
  if (daysToExpire) {
    var date = new Date();
    date.setTime(date.getTime() + daysToExpire * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toGMTString();
  }
  document.cookie = cookieName + "=" + didTestPass + expires + "; path=/";
}

/**
 * retreive the value of the cookie named in the parameter
 *
 * @param cookieName {string} the name of the cookie to retrieve
 * @returns {string | undefined}
 */
function getCookieWithName(cookieName) {
  var searchFor = cookieName + "=";
  var cookies = document.cookie;
  var cookiesArr = document.cookie.split(";");
  for (var i = 0; i < cookiesArr.length; i++) {
    var cookie = cookiesArr[i];
    // strip out any/all leading spaces
    while (cookie.charAt(0) == " ") {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(searchFor) == 0) {
      return cookie.substring(searchFor.length, cookie.length);
    }
  }
  return undefined;
}

/**
 * get the user's preferred locale from either a cookie or the browser's language setting
 *
 * @param cookieName {string} the name of the cookie that may contain the user's locale preference
 * @returns {string}
 */
function getLocale(cookieName) {
  var cookieLocale = getCookieWithName(cookieName);
  if (cookieLocale) {
    return cookieLocale;
  } else {
    var navLang = navigator.language;
    // this could potentially be a 2-letter code
    // or a locale code that we don't support so...

    return isValidLocale(navLang) ? navLang : "en-US";
  }
}

/**
 * Retreives the translated string for the key provided
 *
 * @param key {string} the name of the property to read
 * @param translations {object} the object containing name/value pairs for all translations
 * @returns {string}
 */
function translate(key, translations) {
  return translations[key] || key;
}

/**
 * Inserts the text provided into the element with the id provided
 *
 * @param text {string} the text to display
 * @param id {string} the id of the element where the text should be displayed
 */
function inject(text, id) {
  document.getElementById(id).innerText = text;
}

/**
 * displays the "old browser warning" markup
 * and populates the page with translated strings
 *
 * @param isUserAgentGood {boolean} true or false based on whether the userAgent inspection passes
 * @param isFeatureSetGood {boolean} true or false based on whether the feature set inspection passes
 */
function displayBrowserWarning(isUserAgentGood, isFeatureSetGood) {
  var locale = getLocale("locale");
  var url = "assets/i18n/" + locale + ".json";
  loadBootstrapStylesheet();
  var errorHandler = function (error) {
    log(error);
  };
  var resultHandler = function (json) {
    var title = translate("UNSUPPORTED_BROWSER", json);
    var message = translate("UNSUPPORTED_BROWSER_TXT", json);
    var install = translate("UNSUPPORTED_BROWSER_INSTALL", json);

    displayUserAgent();

    inject(isUserAgentGood, "uaStatus");
    inject(isFeatureSetGood, "featuresStatus");
    inject(title, "unsupported-browser-title");
    inject(message, "unsupported-browser-message");
    inject(install, "unsupported-browser-install");
    document.getElementById("warning-message").style.display = "block";
  };

  fetchTranslations(url, errorHandler, resultHandler);
}

/**
 * estimates whether a modern Angular app should work in this browser
 * based on the features this browser supports
 * @returns {boolean}
 */
function hasRequiredFeatures() {
  var hasPromise = typeof Promise !== "undefined";
  var hasMap = typeof Map !== "undefined";
  var hasSet = typeof Set !== "undefined";
  var hasAssign = typeof Object.assign !== "undefined";
  var hasSymbol = typeof Symbol !== "undefined";
  var hasJSON = typeof JSON !== "undefined";

  return (
    hasPromise && hasMap && hasSet && hasAssign && hasSymbol && hasJSON
  );
}

/**
 * extracts the first part of version string (representing the MAJOR version number)
 * as an integer
 *
 * @param fullVersion {string} a string in the format {Major Version Number}.{d}.{d}.{d}
 * where {Major Version Number} and {d} are just numbers
 *
 * @returns {number} a number representing the {Major Version Number}
 */
function majorVersion(fullVersion) {
  return parseInt(fullVersion.split(".")[0]);
}

/**
 * inspects the userAgent string to determine whether the browser falls within a set of browsers
 * that are known to work with Angular 16 applications
 *
 * A false result from this call does not necessarily mean the browser is NOT Angular 16 capable
 *
 * @returns {boolean | undefined} false means the browser can not handle Angular 16; true means it can;
 * undefined means this browser wasn't tested so we don't know for sure, one way or the other
 */
function isKnownGoodBrowserVersion() {
  var userAgent = navigator.userAgent;
  log(userAgent);

  if (
    userAgent.indexOf("MSIE") !== -1 ||
    userAgent.indexOf("Trident") !== -1
  ) {
    var versionMatch = userAgent.match(/(MSIE|rv:|rv\:)([\d\.]+)/);
    if (versionMatch) {
      var version = versionMatch[2];
      var mVer = majorVersion(version);
      log("Internet Explorer version: " + mVer);
      return false; // no version of IE is Angular 16 capable
    }
  } else if (userAgent.indexOf("Edg") !== -1) {
    var versionMatch = userAgent.match(/Edg\/([\d\.]+)/);
    if (versionMatch) {
      var version = versionMatch[1];
      var mVer = majorVersion(version);
      log("Edge version: " + mVer + " must be at least " + minimumBrowserVersions.edge);
      var versionIsGood = mVer >= minimumBrowserVersions.edge;
      return versionIsGood;
    }
  } else if (userAgent.indexOf("Chrome") !== -1) {
    var versionMatch = userAgent.match(/Chrome\/([\d\.]+)/);
    if (versionMatch) {
      var version = versionMatch[1];
      var mVer = majorVersion(version);
      log("Chrome version: " + mVer + " must be at least " + minimumBrowserVersions.chrome);
      var versionIsGood = mVer >= minimumBrowserVersions.chrome;
      return versionIsGood;
    }
  } else if (userAgent.indexOf("Firefox") !== -1) {
    var versionMatch = userAgent.match(/Firefox\/([\d\.]+)/);
    if (versionMatch) {
      var version = versionMatch[1];
      var mVer = majorVersion(version);
      log("Firefox version: " + mVer + " must be at least " + minimumBrowserVersions.firefox);
      var versionIsGood = mVer >= minimumBrowserVersions.firefox;
      return versionIsGood;
    }
  } else if (
    userAgent.indexOf("Safari") !== -1 &&
    userAgent.indexOf("Version") !== -1
  ) {
    var versionMatch = userAgent.match(/Version\/([\d\.]+)/);
    if (versionMatch) {
      var version = versionMatch[1];
      var mVer = majorVersion(version);
      log("Safari version: " + mVer + " must be at least " + minimumBrowserVersions.safari);
      var versionIsGood = mVer >= minimumBrowserVersions.safari;
      return versionIsGood;
    }
  } else {
    log("Browser not recognized");
    // specifies that we haven't checked, so we don't really know one way or the other
    return undefined;
  }
}

/**
 * display the userAgent string to simplify data collection during testing
 */
function displayUserAgent() {
  document.getElementById("ua").innerText = navigator.userAgent;
}

/**
 * loads the stylesheet required to use bootstrap
 */
function loadBootstrapStylesheet() {
  var linkElement = document.createElement('link');
  linkElement.rel = 'stylesheet';
  linkElement.href = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css';
  linkElement.integrity = 'sha384-xOolHFLEh07PJGoPkLv1IbcEPTNtaed2xpHsD9ESMhqIYd0nLMwNLD69Npy4HI+N';
  linkElement.crossOrigin = 'anonymous';
  document.body.appendChild(linkElement);
}

/**
 * Loads the compiled scripts for the angular app and displays the <app-root> element
 *
 * @param scripts {array} an array of objects defining the properties
 * of the various compiled scripts that comprise the angular app
 */
function displayAngularApp(scripts) {
  loadAngular(scripts);
  document.getElementById("angularContainer").style.display = "block";
}

/**
 * Check for a cookie to determine whether the browser check has already been done
 *
 * @returns {boolean} true if cookie exists and is set to "yes"; false otherwise (check hasn't been done or has failed)
 */
function doCookieCheck() {
  var cookie = getCookieWithName("isBrowserAngular16Capable");
  return cookie == "yes";
}

// /**
//  * @returns {boolean} true if "?debugMode=yes" is present; false otherwise
//  */
// function getIsDebugMode() {
//     return getQueryStringValue("debugMode") == "yes";
// }

/**
 * stores a string value in a cookie to indicate whether this browser
 * should be capable of running an angular 16 app: "yes" or "no" accordingly
 *
 * @param isThisBrowserAngularCapable {boolean}
 */
function storeBrowserCheckStatus(isThisBrowserAngularCapable) {
  var currentCookieValue = getCookieWithName("isBrowserAngular16Capable");
  var cookieValue;
  if (isThisBrowserAngularCapable) {
    cookieValue = "yes";
  } else {
    cookieValue = "no";
  }

  if (currentCookieValue != cookieValue) {
    log("setting browser status cookie to " + cookieValue + " so the browser capabilities check can be skipped on future visits");
    setBrowserCheckedCookie("isBrowserAngular16Capable", cookieValue, 30);
  }
}

/**
 * evaluates browser features and userAgent string to determine whether this browser should be able to render an Angular 16 application
 * stores test results in a cookie to enable future checks to be skipped
 *
 * @returns {boolean} true if both browser features are present and the userAgent string appears to be adequate; false otherwise
 */
function evaluateBrowser() {
  var goodVersion = isKnownGoodBrowserVersion();
  var goodFeatures = hasRequiredFeatures();
  log("Version check: ", goodVersion);
  log("Feature check: ", goodFeatures);
  var isThisBrowserAngularCapable = (goodVersion == true) || (goodVersion == undefined && goodFeatures);
  storeBrowserCheckStatus(isThisBrowserAngularCapable);

  return {
    isThisBrowserAngularCapable: isThisBrowserAngularCapable,
    goodUA: goodVersion,
    goodFeatures: goodFeatures
  };

  isThisBrowserAngularCapable;
}

/**
 * displays the warning for unsupported browsers or
 * loads the angular app for modern browsers
 *
 * @param scripts {array} an array of objects defining the properties
 * of the various compiled scripts that comprise the angular app
 */
function checkBrowser(scripts) {

  var isThisBrowserAngularCapable;
  var cookie = getCookieWithName('isBrowserAngular16Capable');
  var didCookieCheckPass = doCookieCheck();
  log("<checkBrowser> cookie: " + cookie + ", didCookieCheckPass: " + didCookieCheckPass);

  if (didCookieCheckPass) {
    log("<checkBrowser> cookie is (" + cookie + ") so this browser has already been verified; skipping the browser check and redirecting to the angular app");
    displayAngularApp(scripts);
  } else {
    log("<checkBrowser> cookie is (" + cookie + ") so browser has failed the check or has not been checked yet... proceeding with browser evaluation");
    var browserDetails = evaluateBrowser();
    isThisBrowserAngularCapable = browserDetails.isThisBrowserAngularCapable;
    var directTraffic = function (isAble) {
      log("<directTraffic>");
      if (isAble) {
        displayAngularApp(scripts);
      } else {
        displayBrowserWarning(browserDetails.goodUA, browserDetails.goodFeatures);
      }
    };
    setTimeout(function () {
      directTraffic(isThisBrowserAngularCapable);
    });
  }
}


/**
 * a utility function to log to the console only on non-production instances
 * insert whatever logic you want to limit this
 * @param message {string} the message to log to the console
 */
function log(message) {
  console.log(message);
}
