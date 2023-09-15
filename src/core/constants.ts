import { Vec3 } from "src/shared/libs/vectors";

/** синус углового размера солнца (половина угла) */
export const SUN_DISC_ANGLE_SIN = 0.5*0.01745;
/** цвет солнца */
export const SUN_COLOR = Vec3.ONE;// new Vec3(0.9420, 1.0269, 1.0241);
/** ускорение свободного падения */
export const GRAVITATION = 0.;// 9.81