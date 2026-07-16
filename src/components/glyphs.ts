import type { Letter } from '../types';


export interface LetterPaths {
  uppercase: Path2D;
  lowercase: Path2D;
  guideWidth: number;
  toleranceWidth: number;
  top: number;
  bottom: number;
}

function glyphPath(letter: Letter, lower: boolean, left: number, top: number, width: number, height: number) {
  const path = new Path2D();
  const x = (value: number) => left + value * width;
  const y = (value: number) => top + value * height;
  const move = (px: number, py: number) => path.moveTo(x(px), y(py));
  const line = (px: number, py: number) => path.lineTo(x(px), y(py));
  const curve = (a: number, b: number, c: number, d: number, e: number, f: number) =>
    path.bezierCurveTo(x(a), y(b), x(c), y(d), x(e), y(f));
  const ellipse = (cx: number, cy: number, rx: number, ry: number, start = 0, end = Math.PI * 2) =>
    path.ellipse(x(cx), y(cy), rx * width, ry * height, 0, start, end);

  if (!lower) {
    switch (letter) {
      case 'A':
        move(.06, 1); line(.5, 0); line(.94, 1); move(.23, .6); line(.77, .6); break;
      case 'B':
        move(.12, 0); line(.12, 1); move(.12, .02); curve(.92, -.02, .96, .48, .12, .5); move(.12, .5); curve(.98, .47, .96, 1.03, .12, .98); break;
      case 'C':
        move(.92, .15); curve(.67, -.05, .08, .02, .08, .5); curve(.08, .98, .67, 1.05, .92, .85); break;
      case 'D':
        move(.12, 0); line(.12, 1); move(.12, .02); curve(.96, .02, .96, .98, .12, .98); break;
      case 'E':
        move(.86, .02); line(.14, .02); line(.14, .98); line(.88, .98); move(.14, .5); line(.72, .5); break;
      case 'F':
        move(.14, 1); line(.14, .02); line(.88, .02); move(.14, .49); line(.72, .49); break;
      case 'G':
        move(.92, .16); curve(.65, -.04, .08, .03, .08, .5); curve(.08, .98, .69, 1.04, .92, .78); line(.92, .55); line(.6, .55); break;
      case 'H':
        move(.12, 0); line(.12, 1); move(.88, 0); line(.88, 1); move(.12, .5); line(.88, .5); break;
      case 'I':
        move(.22, .02); line(.78, .02); move(.5, .02); line(.5, .98); move(.22, .98); line(.78, .98); break;
      case 'J':
        move(.18, .02); line(.88, .02); move(.7, .02); line(.7, .74); curve(.7, 1.04, .18, 1.05, .12, .73); break;
      case 'K':
        move(.12, 0); line(.12, 1); move(.9, .02); line(.12, .58); move(.43, .37); line(.92, .98); break;
      case 'L':
        move(.16, 0); line(.16, .98); line(.88, .98); break;
      case 'M':
        move(.06, 1); line(.06, 0); line(.5, .58); line(.94, 0); line(.94, 1); break;
      case 'N':
        move(.1, 1); line(.1, 0); line(.9, 1); line(.9, 0); break;
      case 'O':
        ellipse(.5, .5, .43, .49); break;
      case 'P':
        move(.14, 1); line(.14, .02); move(.14, .03); curve(.92, -.02, .96, .56, .14, .54); break;
      case 'Q':
        ellipse(.5, .48, .42, .47); move(.57, .67); line(.94, 1.04); break;
      case 'R':
        move(.14, 1); line(.14, .02); move(.14, .03); curve(.92, -.02, .96, .55, .14, .53); move(.48, .53); line(.94, 1); break;
      case 'S':
        move(.9, .13); curve(.62, -.06, .12, .03, .13, .3); curve(.14, .5, .87, .46, .87, .72); curve(.87, 1.03, .28, 1.07, .08, .83); break;
      case 'T':
        move(.06, .02); line(.94, .02); move(.5, .02); line(.5, 1); break;
      case 'U':
        move(.1, 0); line(.1, .67); curve(.1, 1.08, .9, 1.08, .9, .67); line(.9, 0); break;
      case 'V':
        move(.05, 0); line(.5, 1); line(.95, 0); break;
      case 'W':
        move(.02, 0); line(.24, 1); line(.5, .45); line(.76, 1); line(.98, 0); break;
      case 'X':
        move(.08, .02); line(.92, .98); move(.92, .02); line(.08, .98); break;
      case 'Y':
        move(.06, .02); line(.5, .52); line(.94, .02); move(.5, .52); line(.5, 1); break;
      case 'Z':
        move(.08, .02); line(.92, .02); line(.08, .98); line(.92, .98); break;
      case 'Æ':
        move(.02, 1); line(.28, 0); line(.53, 1); move(.13, .58); line(.46, .58); move(.28, 0); line(.94, 0); move(.5, 0); line(.5, 1); line(.96, 1); move(.5, .5); line(.88, .5); break;
      case 'Ø':
        ellipse(.5, .5, .43, .49); move(.12, 1.02); line(.88, -.02); break;
      case 'Å':
        move(.06, 1); line(.5, .12); line(.94, 1); move(.23, .62); line(.77, .62); ellipse(.5, -.04, .14, .13); break;
    }

    return path;
  }

  switch (letter) {
    case 'A':
      ellipse(.42, .57, .31, .3); move(.73, .29); line(.73, .88); break;
    case 'B':
      move(.18, -.08); line(.18, .88); move(.18, .43); curve(.35, .18, .84, .22, .84, .58); curve(.84, .95, .36, 1.02, .18, .75); break;
    case 'C':
      move(.84, .35); curve(.62, .12, .14, .2, .14, .58); curve(.14, .96, .62, 1.02, .84, .78); break;
    case 'D':
      move(.82, -.08); line(.82, .9); move(.82, .42); curve(.63, .17, .16, .2, .16, .58); curve(.16, .96, .64, 1.02, .82, .74); break;
    case 'E':
      move(.18, .57); line(.82, .57); curve(.8, .17, .18, .15, .15, .55); curve(.12, .96, .66, 1.03, .86, .77); break;
    case 'F':
      move(.72, .04); curve(.51, -.18, .26, -.04, .27, .25); line(.27, .95); move(.08, .33); line(.64, .33); break;
    case 'G':
      ellipse(.43, .52, .3, .28); move(.73, .3); line(.73, .97); curve(.73, 1.28, .2, 1.34, .12, 1.08); break;
    case 'H':
      move(.18, -.08); line(.18, .94); move(.18, .5); curve(.31, .19, .79, .2, .79, .54); line(.79, .94); break;
    case 'I':
      ellipse(.5, .04, .035, .04); move(.5, .31); line(.5, .92); break;
    case 'J':
      ellipse(.61, .04, .035, .04); move(.61, .31); line(.61, 1.04); curve(.61, 1.26, .28, 1.3, .16, 1.08); break;
    case 'K':
      move(.18, -.08); line(.18, .94); move(.79, .31); line(.18, .65); move(.43, .52); line(.83, .94); break;
    case 'L':
      move(.5, -.08); line(.5, .92); break;
    case 'M':
      move(.1, .92); line(.1, .32); move(.1, .49); curve(.17, .2, .44, .2, .44, .5); line(.44, .92); move(.44, .49); curve(.51, .2, .82, .2, .82, .5); line(.82, .92); break;
    case 'N':
      move(.15, .92); line(.15, .32); move(.15, .5); curve(.28, .2, .8, .2, .8, .55); line(.8, .92); break;
    case 'O':
      ellipse(.5, .58, .34, .31); break;
    case 'P':
      move(.18, 1.25); line(.18, .32); move(.18, .47); curve(.37, .18, .84, .22, .84, .58); curve(.84, .94, .38, 1.0, .18, .76); break;
    case 'Q':
      ellipse(.43, .57, .3, .29); move(.74, .31); line(.74, 1.24); break;
    case 'R':
      move(.2, .92); line(.2, .32); move(.2, .51); curve(.31, .22, .66, .2, .78, .36); break;
    case 'S':
      move(.81, .35); curve(.63, .14, .18, .2, .19, .47); curve(.2, .66, .8, .58, .8, .79); curve(.8, 1.02, .31, 1.05, .14, .84); break;
    case 'T':
      move(.5, .03); line(.5, .75); curve(.5, .98, .75, .99, .85, .84); move(.24, .34); line(.78, .34); break;
    case 'U':
      move(.16, .32); line(.16, .7); curve(.16, 1.03, .72, 1.02, .8, .7); line(.8, .32); break;
    case 'V':
      move(.12, .32); line(.5, .94); line(.88, .32); break;
    case 'W':
      move(.06, .32); line(.27, .94); line(.5, .52); line(.73, .94); line(.94, .32); break;
    case 'X':
      move(.14, .32); line(.86, .94); move(.86, .32); line(.14, .94); break;
    case 'Y':
      move(.12, .32); line(.49, .9); line(.86, .32); move(.49, .9); curve(.42, 1.23, .18, 1.28, .1, 1.1); break;
    case 'Z':
      move(.14, .33); line(.86, .33); line(.14, .93); line(.86, .93); break;
    case 'Æ':
      ellipse(.29, .58, .23, .29); move(.52, .3); line(.52, .9); move(.52, .57); line(.94, .57); curve(.92, .18, .54, .18, .52, .55); curve(.5, .95, .84, 1.02, .96, .78); break;
    case 'Ø':
      ellipse(.5, .58, .34, .31); move(.18, .94); line(.82, .25); break;
    case 'Å':
      ellipse(.42, .58, .3, .29); move(.72, .3); line(.72, .9); ellipse(.48, .02, .11, .11); break;
  }

  return path;
}

export function getLetterPaths(letter: Letter, width: number, height: number): LetterPaths {
  const minimum = Math.min(width, height);
  const upperTop = height * .33;
  const upperSize = height * .49;
  const lowerTop = height * .42;
  const lowerSize = height * .34;

  // Keep X and Y on the same scale. The canvas may change shape when toolbars
  // are added or the tablet rotates, but the glyphs must never be stretched.
  const upperLeft = width * .28 - upperSize * .5;
  const lowerLeft = width * .70 - lowerSize * .5;

  return {
    uppercase: glyphPath(letter, false, upperLeft, upperTop, upperSize, upperSize),
    lowercase: glyphPath(letter, true, lowerLeft, lowerTop, lowerSize, lowerSize),
    guideWidth: Math.max(4, minimum * .0065),
    toleranceWidth: Math.max(28, minimum * .062),
    top: upperTop,
    bottom: height * .9
  };
}

export function strokeLetterPaths(context: CanvasRenderingContext2D, paths: LetterPaths, lineWidth: number, strokeStyle: string) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = lineWidth;
  context.strokeStyle = strokeStyle;
  context.stroke(paths.uppercase);
  context.stroke(paths.lowercase);
  context.restore();
}
