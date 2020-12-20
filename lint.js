const { ESLint } = require("eslint");

// adapted from https://eslint.org/docs/developer-guide/nodejs-api
module.exports = (async () => {
  // 1. Create an instance.
  const eslint = new ESLint({
	  cache: true,
  });

  // 2. Lint files.
  const results = await eslint.lintFiles(["src/**/*.ts"]);

  // 3. Format the results.
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  // 4. Output it.
  console.log(resultText);

  for (const result of results) {
	  if (result.errorCount) process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});