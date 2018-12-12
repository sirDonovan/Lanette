# Lanette (alpha)
[![Build Status](https://api.travis-ci.com/sirDonovan/Lanette.svg?branch=master)](https://travis-ci.com/sirDonovan/Lanette)

A bot for [Pokemon Showdown][1] written in [TypeScript][2].

  [1]: https://github.com/Zarel/Pokemon-Showdown
  [2]: https://www.typescriptlang.org/

## Installation
Lanette requires [Node.js][3] version 10.13.0 (latest LTS) or later and a command line (e.g. `Command Prompt` on Windows or `Terminal` on Mac OS/Linux) to run. Once you have compatible software, complete installation by following these steps:

1. Obtain a copy of Lanette

  You can do this through the [GitHub client][4] by clicking the "Clone or download" button on the home page of the repository and then clicking "Open in Desktop". You can also use the following [Git][5] command:
  
  `git clone https://github.com/sirDonovan/Lanette.git`

  [3]: https://nodejs.org/
  [4]: https://desktop.github.com/
  [5]: https://git-scm.com/

2. Navigate to the root directory

  The remaining steps will take place in the root directory of your Lanette files. Navigate there with the command:

  `cd DIRECTORY`
  
  Replace `DIRECTORY` with the filepath to your directory (e.g. `C:\Users\sirDonovan\Documents\GitHub\Lanette`).

3. Install dependencies

  Run the following command to install required dependencies:

  `npm install --production`

  If you plan to contribute to development, run the command without the `--production` flag to also install dependencies used for testing.

4. Set up the config file

  Copy and paste the `config-example.ts` file in the `src` folder, rename it to `config.ts`, and open it in your text editor to enter your desired information.

From this point on, you can start the bot by running the following command:

  `node app.js`

## Development

  Issues and pull requests will be welcomed once Lanette enters the beta phase! When submitting a pull request, be sure that you have installed development dependencies and ran `npm test` to check for errors in your code.

  If possible, it is best to use [Visual Studio Code][6] as your text editor when working on Lanette.

  [6]: https://code.visualstudio.com/

#### Credits

  * Quinton Lee ([@sirDonovan][7]) - Lead developer
  * [Pokemon Showdown][1]

  [7]: https://github.com/sirDonovan

## License

  Lanette is distributed under the terms of the [MIT License][8].

  [8]: https://github.com/sirDonovan/Lanette/blob/master/LICENSE
