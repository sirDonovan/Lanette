/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IHexColor {
	"White": any;
	"Black": any;
	"Dark Yellow": any;
	"Orange": any;
	"Blue": any;
	"Yellow": any;
	"Light Pink": any;
	"Green": any;
	"Light Blue": any;
	"Red": any;
	"Dark Pink": any;
	"Light Brown": any;
	"Light Purple": any;
	"Pink": any;
	"Light Green": any;
	"Brown": any;
	"Dark Purple": any;
	"Purple": any;
	"Light Gray": any;
	"Dark Brown": any;
}
/* eslint-enable */

export type HexColor = keyof IHexColor;
