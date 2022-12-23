export type RunOptionNames = 'offline' | 'incrementalBuild' | 'modules' | 'games' | 'gameSeed' | 'mochaRuns' | 'script' |
    'grep' | 'ci' | 'noBuild' | 'noRemote' | 'noSha';
export type RunOptions = PartialKeyedDict<RunOptionNames, string>;