export type { Geom2 } from './geom-utils'
export {
  placeGeom2,
  extractGeom2Points,
  fmt,
  fmtVec2,
  formatPoints,
  ScriptShapeRegistry,
} from './geom-utils'
export {
  createRectangleSwitchGeom,
  buildRectangleSwitchScript,
  createCherryMxOpenableGeom,
  buildCherryMxOpenableScript,
  isRectangleSwitchType,
  type SwitchCutoutOptions,
} from './switch-cutouts'
export {
  createStabGeoms,
  buildStabScript,
  createMxBasicStabGeoms,
  buildMxBasicStabScript,
  createMxSpecStabGeoms,
  buildMxSpecStabScript,
  createAlpsStabGeoms,
  buildAlpsStabScript,
  type StabCutoutOptions,
  type StabType,
} from './stabilizer-cutouts'
export { createCircleHoleGeom, buildCircleHoleScript } from './hole-cutouts'
export {
  createCherryMxSnapNotchCuts,
  createStabBacksideCut,
  STAB_BACKSIDE_OVERHANGS,
  type StabBacksideOverhang,
  type BacksideCut3D,
  type Geom3,
} from './backside-features'
