import { TargetOptions } from '@angular-builders/custom-webpack';

function extractScriptsSrc(inputString: string, startString: string = '<script src="', endString: string = '" type="module"></script>') {

  // Create a regular expression pattern with the global 'g' flag so that all matches are found
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

  return matches;
}

export default (targetOptions: TargetOptions, indexHtml: string) => {
  console.log("\nexcerpt of index.html before processing:\n"+ indexHtml.slice(-400));
  var scripts = extractScriptsSrc(indexHtml);
  var startIndex = indexHtml.indexOf('<script src="');
  var endIndex = indexHtml.lastIndexOf("</body>");
  var magic = `<script>
      document.addEventListener("DOMContentLoaded", () => storeAngularScripts(${JSON.stringify(scripts)}));
    </script>`;
  var transformedIndexHtml = `${indexHtml.slice(0, startIndex)}
    ${magic}
    ${indexHtml.slice(endIndex)}`;

    console.log("\nexcerpt of index.html after processing:\n"+transformedIndexHtml.slice(-400));
    return transformedIndexHtml;
};

/*
this is what the tail end of the file looks like with the default angular builder
<script src="runtime.1b5af9e61ae2ff40.js" type="module"></script>
<script src="polyfills.0e1ef76a6fbf2c82.js" type="module"></script>
<script src="main.15760814d6906cc0.js" type="module"></script>
</body>
*/
