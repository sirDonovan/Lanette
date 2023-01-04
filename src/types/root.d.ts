export type RunOptionNames = 'offline' | 'incrementalBuild' | 'modules' | 'games' | 'gameSeed' | 'mochaRuns' | 'script' |
    'grep' | 'ci' | 'noBuild' | 'noRemote' | 'noSha';
export type RunOptions = PartialKeyedDict<RunOptionNames, string>;

export type InputFolderNames = 'root' | 'private' | 'src' | 'web';

export type InputFolders = KeyedDict<InputFolderNames, IInputMetadata>;

export interface IInputMetadata {
    buildPath: string;
    inputPath: string;
    tsConfig?: string;
}