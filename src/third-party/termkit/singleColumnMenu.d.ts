import {
  SingleColumnMenuOptions,
  SingleColumnMenuResponse
} from "terminal-kit/Terminal";

export = singleColumnMenu;
declare function singleColumnMenu(
  s: string[],
  opts: SingleColumnMenuOptions,
  callback: (err: any, r: any) => any
): any;
