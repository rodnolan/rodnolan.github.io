/**
 * transforms static script tags into an array of objects whose properties describe the tag's attributes
 *
 * @param html {string} html source code containing one or more static script tags
 * @returns {array} an array of objects that describe the attributes of each script tag
 */
function extractScriptAttributes(html) {
  const regex = /<script\s+src="([^"]+)"(?:\s+type="module")?(?:\s+defer)?>\s*<\/script>/g;
  const scriptObjects = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    scriptObjects.push({
      src: match[1],
      isModule: match[0].includes('type="module"'),
      isDefer: match[0].includes('defer')
    });
  }

  console.log(`extracted script objects: ${JSON.stringify(scriptObjects)}`);
  return scriptObjects;
};

module.exports = (targetOptions, indexHtml) => {
  console.log('\nTransforming the HTML code in the index page to replace the angular-related script tags with a javascript function call that loads those scripts dynamically at runtime.');
  console.log(indexHtml);
  /* the default angular builder injects the script tags just before the </body> tag in index.html
    <app-root></app-root>
    <script src="runtime.js" type="module"></script><script src="polyfills.js" type="module"></script><script src="styles.js" type="module"></script><script src="scripts.js" defer></script><script src="vendor.js" type="module"></script><script src="main.js" type="module"></script>
    </body>
    </html>
  */

  const indexOfFirstAngularScriptTag = indexHtml.indexOf('<script src="');

  // this is everything up to, but not including, the angular scripts
  const indexFront = indexHtml.slice(0, indexOfFirstAngularScriptTag);

  // this is everything after the end of the list of angular script tags
  const indexBack = indexHtml.slice(indexHtml.indexOf('</body>'));

  console.log(`\nPRE-PROCESSING:\n\n${indexHtml.slice(indexOfFirstAngularScriptTag)}`);
  const scriptObjects = extractScriptAttributes(indexHtml);
  const scriptsAsJSONString = JSON.stringify(scriptObjects);

  const theScriptsThatCircumventTheWhiteScreenProblem = `

        <!-- pre-flight-check.js contains the functions that evaluate the browser and implement -->
        <!-- the conditional logic to render either the angular app or the browser upgrade prompt -->
        <!-- most importantly, it contains the startHere function, which is invoked below -->
        <!-- this file must be included as is (not transpiled) so put it in the assets folder -->
        <script type="text/javascript" src="assets/pre-flight-check.js"></script>

        <script>
            function begin() {
                try {
                  // the startHere() function is defined in pre-flight-check.js
                  // the value for the argument is resolved into a JSON string at compile not, not runtime
                  startHere(${scriptsAsJSONString});
                } catch (e) {
                  console.log("There was an error loading the page: " + e);
                }
            }
            document.addEventListener("DOMContentLoaded", begin);
        </script>

    `;

  const transformedIndexHtml = `
        ${indexFront}
        ${theScriptsThatCircumventTheWhiteScreenProblem}
        ${indexBack}
    `;

//  console.log(`\nPOST-PROCESSING:\n\n${transformedIndexHtml.slice(transformedIndexHtml.indexOf('<script type="text/javascript"'))}`);
  console.log(`\nPOST-PROCESSING:\n\n${transformedIndexHtml}`);

  return transformedIndexHtml;
};
