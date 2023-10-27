import { TargetOptions } from '@angular-builders/custom-webpack';

function extractScriptsSrc(inputString: string, startString: string = '<script src="', endString: string = '" type="module"></script>') {

  // const inputString: string = "This is a [start]first[end] example and a [start]second[end] example.";

  // Create a regular expression pattern with the global 'g' flag
  const pattern: RegExp = new RegExp(`${escapeRegExp(startString)}(.*?)${escapeRegExp(endString)}`, 'g');

  // Function to escape special characters in a string to use in a regular expression
  function escapeRegExp(str: string): string {
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  // Use the RegExp exec method in a loop to find all matching substrings
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(inputString)) !== null) {
    matches.push(match[1]);
  }

  if (matches.length > 0) {
    console.log("Extracted strings:", matches);
  } else {
    console.log("No matches found.");
  }
}

export default (targetOptions: TargetOptions, indexHtml: string) => {
  console.log("before\n"+ indexHtml);
  var scripts = extractScriptsSrc(indexHtml);
  console.log(scripts);
  var startIndex = indexHtml.indexOf('<script src="');
  var endIndex = indexHtml.lastIndexOf("</body>");
  var magic = `<script>
      function loadScript(url, callback) {
        var script = document.createElement("script");
        script.type = "module"; // or 'text/javascript' for non-module scripts
        script.src = url;
        // script.async = true;
        // script.onload = callback;

        document.body.appendChild(script);
        console.log("done");
      }
      function loadAngular() {
        var scripts = [${scripts}];
        for (var i=0; i< scripts.length; i++) {
          console.log('Going to attempt to load ' + scripts[i]);
          loadScript(scripts[i]);
        }
      }
      document.addEventListener("DOMContentLoaded", loadAngular);
    </script>`;
  return `${indexHtml.slice(0, startIndex)}
    ${magic}
    ${indexHtml.slice(endIndex)}`;
};

/*

<script src="runtime.1b5af9e61ae2ff40.js" type="module"></script>
<script src="polyfills.0e1ef76a6fbf2c82.js" type="module"></script>
<script src="main.15760814d6906cc0.js" type="module"></script>
</body>
*/
